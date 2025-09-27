// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Coins
 * @dev Simple ERC20 with one-time faucet claim of 100 tokens per address.
 *      Intended for demo/testing to onboard users with tokens upon wallet connect.
 */
contract Coins is ERC20, ReentrancyGuard {
    uint256 public constant FAUCET_AMOUNT = 100e18;

    mapping(address => bool) private _claimed;

    event Claimed(address indexed user, uint256 amount);

    constructor() ERC20("Coins", "COIN") {}

    /**
     * @notice Claim faucet tokens once per address.
     * @dev Mints FAUCET_AMOUNT to msg.sender. Reverts if already claimed.
     */
    function claim() external nonReentrant {
        require(!_claimed[msg.sender], "Coins: already claimed");
        _claimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Claimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @notice Check if an address has already claimed the faucet.
     */
    function hasClaimed(address account) external view returns (bool) {
        return _claimed[account];
    }
}
