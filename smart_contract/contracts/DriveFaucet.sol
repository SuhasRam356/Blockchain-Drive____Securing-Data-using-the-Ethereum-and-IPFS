// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DriveFaucet is Ownable {
    IERC20 public driveToken;
    
    uint256 public claimAmount;
    uint256 public cooldownTime;
    
    mapping(address => uint256) public nextClaimTime;

    event TokensDispensed(address indexed to, uint256 amount);
    event ClaimAmountUpdated(uint256 newAmount);
    event CooldownTimeUpdated(uint256 newTime);
    event FaucetDrained(address indexed owner, uint256 amount);

    constructor(address _tokenAddress, uint256 _claimAmount, uint256 _cooldownTime) Ownable(msg.sender) {
        require(_tokenAddress != address(0), "Invalid token address");
        driveToken = IERC20(_tokenAddress);
        claimAmount = _claimAmount;
        cooldownTime = _cooldownTime;
    }

    function requestTokens() external {
        require(block.timestamp >= nextClaimTime[msg.sender], "Cooldown period has not elapsed");
        require(driveToken.balanceOf(address(this)) >= claimAmount, "Faucet has insufficient funds");

        nextClaimTime[msg.sender] = block.timestamp + cooldownTime;
        
        require(driveToken.transfer(msg.sender, claimAmount), "Token transfer failed");

        emit TokensDispensed(msg.sender, claimAmount);
    }

    function setClaimAmount(uint256 _newAmount) external onlyOwner {
        claimAmount = _newAmount;
        emit ClaimAmountUpdated(_newAmount);
    }

    function setCooldownTime(uint256 _newTime) external onlyOwner {
        cooldownTime = _newTime;
        emit CooldownTimeUpdated(_newTime);
    }

    function drain() external onlyOwner {
        uint256 balance = driveToken.balanceOf(address(this));
        require(driveToken.transfer(owner(), balance), "Token transfer failed");
        emit FaucetDrained(owner(), balance);
    }
}
