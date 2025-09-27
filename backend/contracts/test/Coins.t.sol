// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Coins.sol";

contract CoinsTest is Test {
    Coins internal coin;
    address internal user;

    function setUp() public {
        coin = new Coins();
        user = address(0xBEEF);
        vm.deal(user, 1 ether);
    }

    function testClaimMints100e18Once() public {
        vm.prank(user);
        coin.claim();

        assertEq(coin.balanceOf(user), coin.FAUCET_AMOUNT(), "balance should be 100e18");
        bool claimed = coin.hasClaimed(user);
        assertTrue(claimed, "hasClaimed should be true after first claim");
    }

    function testClaimTwiceReverts() public {
        vm.startPrank(user);
        coin.claim();

        vm.expectRevert(bytes("Coins: already claimed"));
        coin.claim();
        vm.stopPrank();
    }
}
