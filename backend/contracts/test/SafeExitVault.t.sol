// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/SafeExitVault.sol";
import "../lib/pyth-sdk-solidity/MockPyth.sol";
import "../lib/pyth-sdk-solidity/PythStructs.sol";

contract SafeExitVaultTest is Test {
    // Constants
    bytes32 constant ETH_USD_FEED_ID =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    // Actors
    address payable internal user = payable(address(0xBEEF));
    address payable internal keeper = payable(address(0xCAFE));

    // Contracts
    SafeExitVault internal vault;
    MockPyth internal mockPyth;

    // Mock settings
    uint internal validTimePeriod = 1 days;
    uint internal singleUpdateFee = 0.001 ether;

    function setUp() public {
        vm.deal(user, 10 ether);
        vm.deal(keeper, 10 ether);

        mockPyth = new MockPyth(validTimePeriod, singleUpdateFee);
        vault = new SafeExitVault(address(mockPyth), ETH_USD_FEED_ID);
    }

    // Helper to craft a single Hermes-like update payload for MockPyth
    function _makeUpdate(
        int64 price,
        uint64 conf,
        int32 expo,
        uint64 publishTime
    ) internal view returns (bytes memory) {
        return mockPyth.createPriceFeedUpdateData(ETH_USD_FEED_ID, price, conf, expo, price, conf, publishTime);
    }

    function _wrap(bytes memory one) internal pure returns (bytes[] memory arr) {
        arr = new bytes[](1);
        arr[0] = one;
    }

    function _fee(bytes[] memory updates) internal view returns (uint256) {
        return mockPyth.getUpdateFee(updates);
    }

    function testDepositAndSetTriggers() public {
        // user deposits 0.5 ETH
        vm.prank(user);
        vault.deposit{value: 0.5 ether}();

        // set triggers: stop < take
        uint256 stop = 1800 ether;
        uint256 take = 2200 ether;

        vm.prank(user);
        vault.setTriggers(stop, take);

        (uint256 amount, uint256 stopP, uint256 takeP, bool active, ) = vault.positions(user);
        assertEq(amount, 0.5 ether, "amount");
        assertEq(stopP, stop, "stop");
        assertEq(takeP, take, "take");
        assertTrue(active, "active");
    }

    function testSetTriggersInvalidRangeReverts() public {
        // deposit first
        vm.prank(user);
        vault.deposit{value: 0.1 ether}();

        // stop >= take -> revert
        vm.prank(user);
        vm.expectRevert(SafeExitVault.SafeExitVault__InvalidTriggerRange.selector);
        vault.setTriggers(2000 ether, 2000 ether);

        vm.prank(user);
        vm.expectRevert(SafeExitVault.SafeExitVault__InvalidTriggerRange.selector);
        vault.setTriggers(2100 ether, 2000 ether);
    }

    function testUpdateAndExecuteReverts_NoActivePosition() public {
        // No deposit and no triggers for 'keeper' address -> amountETH == 0
        // Prepare a fresh price update (price ~2000 USD with expo -8)
        bytes memory upd = _makeUpdate(int64(2000e8), uint64(1e6), int32(-8), uint64(block.timestamp));
        bytes[] memory updates = _wrap(upd);
        uint256 fee = _fee(updates);

        // Keeper tries to update+execute on an address with no position -> should revert
        vm.prank(keeper);
        vm.expectRevert();
        vault.updateAndExecute{value: fee}(updates, 60, 50, keeper);
    }

    function testUpdateAndExecuteReverts_InsufficientFee() public {
        // deposit and set triggers
        vm.prank(user);
        vault.deposit{value: 0.2 ether}();
        vm.prank(user);
        vault.setTriggers(1900 ether, 2100 ether);

        // prepare price update
        bytes memory upd = _makeUpdate(int64(2000e8), uint64(1e6), int32(-8), uint64(block.timestamp));
        bytes[] memory updates = _wrap(upd);

        uint256 fee = _fee(updates);
        // send fee - 1 wei to trigger insufficient fee revert
        vm.prank(keeper);
        vm.expectRevert(SafeExitVault.SafeExitVault__InsufficientFee.selector);
        vault.updateAndExecute{value: fee - 1}(updates, 60, 50, user);
    }

    function testUpdateAndExecuteReverts_StalePrice() public {
        // deposit and set triggers
        vm.prank(user);
        vault.deposit{value: 0.2 ether}();
        vm.prank(user);
        vault.setTriggers(1900 ether, 2100 ether);

        // price publish time far in past
        uint256 nowTs = block.timestamp;
        uint64 oldTs = nowTs > 10_000 ? uint64(nowTs - 10_000) : uint64(0);
        bytes memory upd = _makeUpdate(int64(2000e8), uint64(1e6), int32(-8), oldTs);
        bytes[] memory updates = _wrap(upd);
        uint256 fee = _fee(updates);

        // maxStaleSecs small => should revert in getPriceNoOlderThan
        vm.prank(keeper);
        vm.expectRevert(); // AbstractPyth emits custom StalePrice; selector not in this contract
        vault.updateAndExecute{value: fee}(updates, 60, 50, user);
    }

    function testUpdateAndExecuteReverts_HighConfidence() public {
        // deposit and set triggers
        vm.prank(user);
        vault.deposit{value: 0.2 ether}();
        vm.prank(user);
        vault.setTriggers(1900 ether, 2100 ether);

        // conf too high relative to price -> should fail in PythPriceLib.getValidatedPrice
        int64 price = int64(2000e8);
        // pick conf about 2% of price (maxConfBps we pass is 50 = 0.5%)
        uint64 conf = uint64(uint256(uint64(price)) / 50); // ~2%
        bytes memory upd = _makeUpdate(price, conf, int32(-8), uint64(block.timestamp));
        bytes[] memory updates = _wrap(upd);
        uint256 fee = _fee(updates);

        vm.prank(keeper);
        vm.expectRevert(); // library custom error; we accept generic revert
        vault.updateAndExecute{value: fee}(updates, 60, 50, user);
    }

    function testExecute_StopLoss() public {
        // user deposits and sets triggers around price=2000
        vm.prank(user);
        vault.deposit{value: 1 ether}();
        vm.prank(user);
        vault.setTriggers(1990 ether, 2100 ether); // stop just below 2000

        // Make price drop to 1985 -> STOP should trigger
        bytes memory upd = _makeUpdate(int64(1985e8), uint64(1e6), int32(-8), uint64(block.timestamp));
        bytes[] memory updates = _wrap(upd);
        uint256 fee = _fee(updates);

        uint256 userBalBefore = user.balance;

        vm.prank(keeper);
        vault.updateAndExecute{value: fee}(updates, 60, 50, user);

        // Position should be closed and funds returned to user
        (uint256 amount, , , bool active, ) = vault.positions(user);
        assertEq(amount, 0, "amount should be zero after execution");
        assertFalse(active, "inactive after execution");

        uint256 userBalAfter = user.balance;
        assertGe(userBalAfter, userBalBefore + 1 ether, "user received ETH back");
    }

    function testExecute_TakeProfit() public {
        // user deposits and sets triggers
        vm.prank(user);
        vault.deposit{value: 0.7 ether}();
        vm.prank(user);
        vault.setTriggers(1800 ether, 2005 ether); // take just above 2000

        // Make price rise to 2010 -> TAKE should trigger
        bytes memory upd = _makeUpdate(int64(2010e8), uint64(1e6), int32(-8), uint64(block.timestamp));
        bytes[] memory updates = _wrap(upd);
        uint256 fee = _fee(updates);

        uint256 userBalBefore = user.balance;

        vm.prank(keeper);
        vault.updateAndExecute{value: fee}(updates, 60, 50, user);

        (uint256 amount, , , bool active, ) = vault.positions(user);
        assertEq(amount, 0, "amount should be zero after execution");
        assertFalse(active, "inactive after execution");

        uint256 userBalAfter = user.balance;
        assertGe(userBalAfter, userBalBefore + 0.7 ether, "user received ETH back");
    }
}
