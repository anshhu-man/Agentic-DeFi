// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import "../src/Coins.sol";
import "../src/OrderManager.sol";

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";

/**
 * @title DeployOrders
 * @dev Deployment script for Coins (faucet token) and OrderManager with Pyth integration.
 * - Uses known Pyth addresses on Ethereum/Sepolia
 * - For unknown chain IDs (e.g., local anvil), deploys MockPyth and seeds an initial ETH/USD price
 */
contract DeployOrders is Script {
    // Pyth contract addresses for different networks
    address constant PYTH_SEPOLIA = 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21;
    address constant PYTH_ETHEREUM = 0x4305FB66699C3B2702D4d05CF36551390A4c69C6;

    // ETH/USD price feed ID (same across networks)
    bytes32 constant ETH_USD_FEED_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    // OrderManager risk params
    uint256 constant MAX_CONF_BPS = 50;     // 0.5% max confidence
    uint256 constant MAX_PRICE_AGE = 60;    // 60s staleness tolerance

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address pythAddress;
        bool usingMock = false;

        // Determine which network we're on and use appropriate Pyth address or deploy a mock for local
        uint256 chainId = block.chainid;
        if (chainId == 11155111) { // Sepolia
            pythAddress = PYTH_SEPOLIA;
        } else if (chainId == 1) { // Ethereum Mainnet
            pythAddress = PYTH_ETHEREUM;
        } else {
            // Local / unknown chain: deploy MockPyth with 0 fee and 300s valid time period
            MockPyth mock = new MockPyth(300, 0);
            pythAddress = address(mock);
            usingMock = true;

            // Seed an initial ETH/USD price in the mock
            // Pyth typical formatting: expo -8, price in 1e8 units
            int64 price = int64(2000 * 1e8);      // $2000
            uint64 conf = uint64(50 * 1e6);       // $0.50 confidence (example)
            int32 expo = -8;
            int64 emaPrice = price;
            uint64 emaConf = conf;
            uint64 publishTime = uint64(block.timestamp);

            bytes memory update = mock.createPriceFeedUpdateData(
                ETH_USD_FEED_ID,
                price,
                conf,
                expo,
                emaPrice,
                emaConf,
                publishTime
            );

            bytes[] memory updates = new bytes[](1);
            updates[0] = update;
            mock.updatePriceFeeds{value: 0}(updates);
        }

        // Deploy Coins faucet token
        Coins coins = new Coins();

        // Deploy OrderManager with configured parameters
        OrderManager om = new OrderManager(
            address(coins),
            pythAddress,
            ETH_USD_FEED_ID,
            MAX_CONF_BPS,
            MAX_PRICE_AGE
        );

        console.log("DeployOrders Summary");
        console.log("--------------------");
        console.log("Chain ID:", chainId);
        console.log("Pyth contract:", pythAddress);
        console.log("Using MockPyth:", usingMock);
        console.log("ETH/USD Feed ID:", vm.toString(ETH_USD_FEED_ID));
        console.log("Coins address:", address(coins));
        console.log("OrderManager address:", address(om));
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        vm.stopBroadcast();
    }
}
