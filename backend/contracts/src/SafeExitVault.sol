// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "./lib/PythPriceLib.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SafeExitVault
 * @dev On-Chain Price-Triggered Safe-Exit Vault using Pyth Network
 * Users can deposit ETH, set stop-loss/take-profit triggers, and have positions
 * automatically executed when price conditions are met using Pyth's pull oracle.
 */
contract SafeExitVault is ReentrancyGuard, Pausable, Ownable {
    using PythPriceLib for *;

    // State variables
    IPyth public immutable pyth;
    bytes32 public immutable feedId;
    
    // Position struct
    struct Position {
        uint256 amountETH;          // Amount of ETH deposited
        uint256 stopLossPrice18;    // Stop-loss price (18 decimals)
        uint256 takeProfitPrice18;  // Take-profit price (18 decimals)
        bool active;                // Whether triggers are active
        uint256 depositTime;       // When position was created
    }
    
    // Mappings
    mapping(address => Position) public positions;
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event TriggersSet(
        address indexed user, 
        uint256 stopLossPrice18, 
        uint256 takeProfitPrice18,
        uint256 timestamp
    );
    event Executed(
        address indexed user, 
        uint256 price18, 
        uint256 amount,
        string triggerType,
        uint256 timestamp
    );
    event Withdrawn(address indexed user, uint256 amount, uint256 timestamp);
    event PriceUpdated(bytes32 indexed feedId, uint256 price18, uint256 conf18, uint256 timestamp);
    
    // Errors
    error SafeExitVault__InsufficientDeposit();
    error SafeExitVault__NoActivePosition();
    error SafeExitVault__InvalidTriggerRange();
    error SafeExitVault__InsufficientFee();
    error SafeExitVault__NoTriggerConditionMet();
    error SafeExitVault__TransferFailed();
    error SafeExitVault__PositionAlreadyActive();

    /**
     * @dev Constructor
     * @param pythAddress The Pyth contract address for the network
     * @param _feedId The Pyth price feed ID (e.g., ETH/USD)
     */
    constructor(address pythAddress, bytes32 _feedId) {
        pyth = IPyth(pythAddress);
        feedId = _feedId;
    }

    /**
     * @dev Deposit ETH to create a position
     */
    function deposit() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) {
            revert SafeExitVault__InsufficientDeposit();
        }
        
        Position storage pos = positions[msg.sender];
        if (pos.active) {
            revert SafeExitVault__PositionAlreadyActive();
        }
        
        // Add to existing position or create new one
        pos.amountETH += msg.value;
        pos.depositTime = block.timestamp;
        
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Set stop-loss and take-profit triggers
     * @param stopLossPrice18 Stop-loss price in 18 decimals
     * @param takeProfitPrice18 Take-profit price in 18 decimals
     */
    function setTriggers(
        uint256 stopLossPrice18, 
        uint256 takeProfitPrice18
    ) external nonReentrant whenNotPaused {
        Position storage pos = positions[msg.sender];
        
        if (pos.amountETH == 0) {
            revert SafeExitVault__NoActivePosition();
        }
        
        if (stopLossPrice18 >= takeProfitPrice18) {
            revert SafeExitVault__InvalidTriggerRange();
        }
        
        pos.stopLossPrice18 = stopLossPrice18;
        pos.takeProfitPrice18 = takeProfitPrice18;
        pos.active = true;
        
        emit TriggersSet(msg.sender, stopLossPrice18, takeProfitPrice18, block.timestamp);
    }

    /**
     * @dev Update price feeds and execute triggers in one transaction
     * This is the core function that demonstrates Pyth's pull oracle pattern
     * @param priceUpdate Array of price update data from Hermes
     * @param maxStaleSecs Maximum age of price data in seconds
     * @param maxConfBps Maximum confidence in basis points (e.g., 50 = 0.5%)
     * @param user The user whose position to check and execute
     */
    function updateAndExecute(
        bytes[] calldata priceUpdate,
        uint256 maxStaleSecs,
        uint256 maxConfBps,
        address user
    ) external payable nonReentrant whenNotPaused {
        // Step 1: Calculate and validate fee
        uint256 fee = pyth.getUpdateFee(priceUpdate);
        if (msg.value < fee) {
            revert SafeExitVault__InsufficientFee();
        }

        // Step 2: Update price feeds on-chain
        pyth.updatePriceFeeds{value: fee}(priceUpdate);

        // Step 3: Get fresh price data
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(feedId, maxStaleSecs);
        
        // Step 4: Validate confidence and get scaled price
        (uint256 price18, uint256 conf18) = PythPriceLib.getValidatedPrice(p, maxConfBps);
        
        emit PriceUpdated(feedId, price18, conf18, block.timestamp);

        // Step 5: Check and execute triggers
        Position storage pos = positions[user];
        if (!pos.active || pos.amountETH == 0) {
            revert SafeExitVault__NoActivePosition();
        }

        string memory triggerType = "";
        bool shouldExecute = false;

        if (price18 <= pos.stopLossPrice18) {
            triggerType = "STOP_LOSS";
            shouldExecute = true;
        } else if (price18 >= pos.takeProfitPrice18) {
            triggerType = "TAKE_PROFIT";
            shouldExecute = true;
        }

        if (!shouldExecute) {
            revert SafeExitVault__NoTriggerConditionMet();
        }

        // Step 6: Execute the position
        uint256 amount = pos.amountETH;
        pos.amountETH = 0;
        pos.active = false;

        // Transfer ETH back to user
        (bool success, ) = payable(user).call{value: amount}("");
        if (!success) {
            revert SafeExitVault__TransferFailed();
        }

        emit Executed(user, price18, amount, triggerType, block.timestamp);

        // Step 7: Refund any excess ETH sent for fees
        uint256 refund = msg.value - fee;
        if (refund > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: refund}("");
            if (!refundSuccess) {
                revert SafeExitVault__TransferFailed();
            }
        }
    }

    /**
     * @dev Withdraw ETH from inactive position
     */
    function withdraw() external nonReentrant whenNotPaused {
        Position storage pos = positions[msg.sender];
        
        if (pos.amountETH == 0) {
            revert SafeExitVault__NoActivePosition();
        }
        
        if (pos.active) {
            // Deactivate triggers first
            pos.active = false;
        }
        
        uint256 amount = pos.amountETH;
        pos.amountETH = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert SafeExitVault__TransferFailed();
        }
        
        emit Withdrawn(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Cancel active triggers without withdrawing
     */
    function cancelTriggers() external nonReentrant {
        Position storage pos = positions[msg.sender];
        
        if (!pos.active) {
            revert SafeExitVault__NoActivePosition();
        }
        
        pos.active = false;
        pos.stopLossPrice18 = 0;
        pos.takeProfitPrice18 = 0;
    }

    /**
     * @dev Get current price from Pyth (view function)
     * @param maxStaleSecs Maximum staleness in seconds
     * @return price18 Current price in 18 decimals
     * @return conf18 Current confidence in 18 decimals
     */
    function getCurrentPrice(uint256 maxStaleSecs) 
        external 
        view 
        returns (uint256 price18, uint256 conf18) 
    {
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(feedId, maxStaleSecs);
        return PythPriceLib.scaleTo1e18(p.price, p.conf, p.expo);
    }

    /**
     * @dev Get user position details
     * @param user User address
     * @return position The user's position struct
     */
    function getPosition(address user) external view returns (Position memory) {
        return positions[user];
    }

    /**
     * @dev Calculate fee for price update
     * @param priceUpdate Price update data
     * @return fee Required fee in wei
     */
    function getUpdateFee(bytes[] calldata priceUpdate) external view returns (uint256) {
        return pyth.getUpdateFee(priceUpdate);
    }

    // Admin functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw function (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) {
            revert SafeExitVault__TransferFailed();
        }
    }

    // Receive function to accept ETH
    receive() external payable {}
}
