// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import "./lib/PythPriceLib.sol";

/**
 * @title OrderManager
 * @notice Trustless stop-loss / take-profit order manager backed by Pyth price oracle.
 *         Users escrow Coins tokens and specify USD-level SL/TP. Anyone can execute when
 *         ETH/USD crosses the thresholds by supplying Pyth Hermes update data. An optional
 *         executor tip in basis points can incentivize keepers.
 */
contract OrderManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ------------------------
    // Errors
    // ------------------------
    error InvalidAmount();
    error InvalidBounds();
    error AlreadyClosed();
    error NotOrderOwner();
    error NotTriggered();
    error TipTooHigh();

    // ------------------------
    // Events
    // ------------------------
    event OrderCreated(
        uint256 indexed id,
        address indexed user,
        uint256 amount,
        uint256 stopLossPrice18,
        uint256 takeProfitPrice18,
        uint256 executorTipBps
    );

    event OrderCancelled(uint256 indexed id, address indexed user);
    event OrderExecuted(
        uint256 indexed id,
        address indexed user,
        uint256 executionPrice18,
        address indexed executor,
        uint256 tipPaid
    );

    // ------------------------
    // Storage
    // ------------------------
    struct Order {
        address user;
        uint256 amount; // escrowed token amount
        uint256 stopLossPrice18; // USD price with 18 decimals
        uint256 takeProfitPrice18; // USD price with 18 decimals
        uint256 executorTipBps; // tip in basis points (max 1000 = 10%)
        bool open;
    }

    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId;

    IERC20 public immutable coins;
    IPyth public immutable pyth;
    bytes32 public immutable ethPriceId;
    uint256 public immutable maxConfBps; // e.g., 50 = 0.5%
    uint256 public immutable maxPriceAgeSecs; // e.g., 60 seconds

    constructor(
        address _coins,
        address _pyth,
        bytes32 _ethPriceId,
        uint256 _maxConfBps,
        uint256 _maxPriceAgeSecs
    ) {
        require(_coins != address(0) && _pyth != address(0), "zero addr");
        coins = IERC20(_coins);
        pyth = IPyth(_pyth);
        ethPriceId = _ethPriceId;
        maxConfBps = _maxConfBps;
        maxPriceAgeSecs = _maxPriceAgeSecs;
    }

    // ------------------------
    // User actions
    // ------------------------

    /**
     * @notice Create a new SL/TP order by escrowing tokens.
     * @param amount Amount of Coins tokens to escrow (18 decimals)
     * @param stopLossPrice18 Stop-loss trigger price in 18 decimals USD (must be > 0)
     * @param takeProfitPrice18 Take-profit trigger price in 18 decimals USD (must be > 0)
     * @param executorTipBps Optional tip to executor in bps (max 1000 = 10%)
     * @return id Newly created order id
     */
    function createOrder(
        uint256 amount,
        uint256 stopLossPrice18,
        uint256 takeProfitPrice18,
        uint256 executorTipBps
    ) external nonReentrant returns (uint256 id) {
        if (amount == 0) revert InvalidAmount();
        if (stopLossPrice18 == 0 || takeProfitPrice18 == 0 || stopLossPrice18 >= takeProfitPrice18) {
            revert InvalidBounds();
        }
        if (executorTipBps > 1000) revert TipTooHigh();

        // Pull tokens from user
        coins.safeTransferFrom(msg.sender, address(this), amount);

        id = nextOrderId++;
        orders[id] = Order({
            user: msg.sender,
            amount: amount,
            stopLossPrice18: stopLossPrice18,
            takeProfitPrice18: takeProfitPrice18,
            executorTipBps: executorTipBps,
            open: true
        });

        emit OrderCreated(id, msg.sender, amount, stopLossPrice18, takeProfitPrice18, executorTipBps);
    }

    /**
     * @notice Cancel an open order and withdraw escrowed tokens.
     * @param id Order id
     */
    function cancelOrder(uint256 id) external nonReentrant {
        Order storage o = orders[id];
        if (!o.open) revert AlreadyClosed();
        if (o.user != msg.sender) revert NotOrderOwner();

        o.open = false;
        uint256 amt = o.amount;
        o.amount = 0;

        coins.safeTransfer(o.user, amt);
        emit OrderCancelled(id, o.user);
    }

    // ------------------------
    // Execution
    // ------------------------

    /**
     * @notice Execute an order if ETH/USD has crossed SL or TP.
     *         Optionally updates Pyth on-chain prices using Hermes update data.
     * @param id Order id
     * @param priceUpdateData Hermes base64 decoded bytes[] for Pyth update (can be empty if recent on-chain price exists)
     */
    function executeOrder(uint256 id, bytes[] calldata priceUpdateData) external payable nonReentrant {
        Order storage o = orders[id];
        if (!o.open) revert AlreadyClosed();

        // If caller provided update data, forward exact required fee to Pyth and refund surplus.
        if (priceUpdateData.length > 0) {
            uint256 fee = pyth.getUpdateFee(priceUpdateData);
            if (fee > 0) {
                require(msg.value >= fee, "insufficient pyth fee");
                pyth.updatePriceFeeds{value: fee}(priceUpdateData);
                // Refund any extra ETH sent
                if (msg.value > fee) {
                    (bool ok, ) = msg.sender.call{value: (msg.value - fee)}("");
                    require(ok, "refund failed");
                }
            } else {
                // No fee required by Pyth, return any msg.value
                if (msg.value > 0) {
                    (bool ok2, ) = msg.sender.call{value: msg.value}("");
                    require(ok2, "refund2 failed");
                }
            }
        } else {
            // No update; ensure no stray ETH
            if (msg.value > 0) {
                (bool ok3, ) = msg.sender.call{value: msg.value}("");
                require(ok3, "refund3 failed");
            }
        }

        // Read a recent ETH/USD price and validate confidence
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(ethPriceId, maxPriceAgeSecs);
        (uint256 price18, ) = PythPriceLib.getValidatedPrice(p, maxConfBps);

        bool slHit = price18 <= o.stopLossPrice18;
        bool tpHit = price18 >= o.takeProfitPrice18;

        if (!(slHit || tpHit)) revert NotTriggered();

        // Close and payout
        o.open = false;

        uint256 amt = o.amount;
        o.amount = 0;

        uint256 tip = (o.executorTipBps > 0) ? (amt * o.executorTipBps) / 10000 : 0;
        uint256 toUser = amt - tip;

        if (tip > 0) {
            coins.safeTransfer(msg.sender, tip);
        }
        coins.safeTransfer(o.user, toUser);

        emit OrderExecuted(id, o.user, price18, msg.sender, tip);
    }

    // ------------------------
    // Views
    // ------------------------

    /**
     * @notice Helper to fetch current ETH price (18 decimals) using stored on-chain Pyth price.
     * @dev Will revert if price is older than maxPriceAgeSecs.
     */
    function getCurrentEthPrice18() external view returns (uint256 price18, uint256 conf18, uint256 publishTime) {
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(ethPriceId, maxPriceAgeSecs);
        (price18, conf18) = PythPriceLib.scaleTo1e18(p.price, p.conf, p.expo);
        publishTime = p.publishTime;
    }

    receive() external payable {}
}
