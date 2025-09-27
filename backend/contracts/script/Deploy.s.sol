// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SafeExitVault.sol";
import "../src/Coins.sol";

/**
 * @title Deploy
 * @dev Deployment script for SafeExitVault
 */
contract Deploy is Script {
    // Pyth contract addresses for different networks
    address constant PYTH_SEPOLIA = 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21;
    address constant PYTH_ETHEREUM = 0x4305FB66699C3B2702D4d05CF36551390A4c69C6;
    
    // ETH/USD price feed ID (same across networks)
    bytes32 constant ETH_USD_FEED_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    function run() external {
        uint256 deployerPrivateKey = uint256(vm.envBytes32("PRIVATE_KEY"));
        
        vm.startBroadcast(deployerPrivateKey);

        // Determine which network we're on and use appropriate Pyth address
        address pythAddress = getPythAddress();
        
        // Deploy SafeExitVault
        SafeExitVault vault = new SafeExitVault(pythAddress, ETH_USD_FEED_ID);
        // Deploy Coins (faucet ERC20)
        Coins coin = new Coins();
        
        console.log("SafeExitVault deployed to:", address(vault));
        console.log("Coins deployed to:", address(coin));
        console.log("Pyth contract:", pythAddress);
        console.log("Feed ID:", vm.toString(ETH_USD_FEED_ID));
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        vm.stopBroadcast();
    }

    function getPythAddress() internal view returns (address) {
        uint256 chainId = block.chainid;
        
        if (chainId == 11155111) { // Sepolia
            return PYTH_SEPOLIA;
        } else if (chainId == 1) { // Ethereum Mainnet
            return PYTH_ETHEREUM;
        } else {
            // Default to Sepolia for testing
            console.log("Unknown chain ID, defaulting to Sepolia Pyth address");
            return PYTH_SEPOLIA;
        }
    }
}
