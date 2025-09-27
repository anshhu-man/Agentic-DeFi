// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";

/**
 * @title UpdateMockPyth
 * @dev Push a fresh ETH/USD price into MockPyth so local testing (anvil) has recent data.
 *
 * Env variables required:
 * - PRIVATE_KEY      : Deployer key (use anvil default for local)
 * - PYTH_CONTRACT    : Address of deployed MockPyth
 * - PRICE_INT64      : Desired price as int64 in 1e8 units (e.g., 2000 * 1e8)
 *
 * Optional:
 * - CONF_1E6         : Confidence in 1e6 units (default 50 * 1e6 = $0.50)
 * - EXPO             : Exponent (default -8)
 * - FEED_ID          : ETH/USD feed id (default: standard Pyth ETH/USD id)
 */
contract UpdateMockPyth is Script {
    // Default ETH/USD price feed id (same across EVMs)
    bytes32 constant DEFAULT_FEED_ID =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address pythAddr = vm.envAddress("PYTH_CONTRACT");

        int256 priceInt = vm.envInt("PRICE_INT64");
        int64 price = int64(priceInt);

        uint64 conf = uint64(vm.envOr("CONF_1E6", uint256(50 * 1e6)));
        int32 expo = int32(int256(vm.envOr("EXPO", int256(-8))));

        bytes32 feedId = vm.envOr("FEED_ID", DEFAULT_FEED_ID);

        MockPyth mock = MockPyth(pythAddr);

        // Using the same price/conf for ema for simplicity
        int64 emaPrice = price;
        uint64 emaConf = conf;
        uint64 publishTime = uint64(block.timestamp);

        bytes memory update = mock.createPriceFeedUpdateData(
            feedId,
            price,
            conf,
            expo,
            emaPrice,
            emaConf,
            publishTime
        );

        bytes[] memory updates = new bytes[](1);
        updates[0] = update;

        vm.startBroadcast(pk);
        mock.updatePriceFeeds{value: 0}(updates);
        vm.stopBroadcast();

        console.log("MockPyth updated");
        console.log("  contract:", pythAddr);
        console.log("  feedId:", vm.toString(feedId));
        console.log("  price(int64, 1e8 units):", price);
        console.log("  conf(1e6 units):", conf);
        console.log("  expo:", expo);
        console.log("  publishTime:", publishTime);
    }
}
