// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Upload {
    struct Access {
        address user;
        bool access;
    }

    address public admin;

    struct FileInfo {
        string url;
        string category;
    }

    mapping(address => FileInfo[]) value;
    mapping(address => mapping(address => bool)) ownership;
    mapping(address => Access[]) accessList;
    mapping(address => mapping(address => bool)) previousData;
    mapping(address => mapping(address => uint256)) public accessExpiry;

    constructor() {
        admin = msg.sender;
    }

    function add(address _user, string calldata url, string calldata category) external {
        require(msg.sender == _user, "You can only add files to your own account");
        value[_user].push(FileInfo(url, category));
    }

    function sendFileToReceiver(address receiver, string calldata url, string calldata category) external {
        value[receiver].push(FileInfo(url, category));
    }

    function allow(address user, uint256 durationInMinutes) external {
        ownership[msg.sender][user] = true;
        if (durationInMinutes > 0) {
            accessExpiry[msg.sender][user] = block.timestamp + (durationInMinutes * 1 minutes);
        } else {
            accessExpiry[msg.sender][user] = 0; // 0 means no expiry
        }

        if (previousData[msg.sender][user]) {
            for (uint i = 0; i < accessList[msg.sender].length; i++) {
                if (accessList[msg.sender][i].user == user) {
                    accessList[msg.sender][i].access = true;
                }
            }
        } else {
            accessList[msg.sender].push(Access(user, true));
            previousData[msg.sender][user] = true;
        }
    }

    function disallow(address user) external {
        ownership[msg.sender][user] = false;
        for (uint i = 0; i < accessList[msg.sender].length; i++) {
            if (accessList[msg.sender][i].user == user) {
                accessList[msg.sender][i].access = false;
            }
        }
    }

    function display(address _user) external view returns (FileInfo[] memory) {
        bool hasAccess = ownership[_user][msg.sender] && (accessExpiry[_user][msg.sender] == 0 || accessExpiry[_user][msg.sender] > block.timestamp);
        require(_user == msg.sender || hasAccess || msg.sender == admin, "You don't have access");
        return value[_user];
    }

    function shareAccess() external view returns (Access[] memory) {
        return accessList[msg.sender];
    }

    function deleteFile(string calldata url) external {
        FileInfo[] storage userFiles = value[msg.sender];
        for (uint i = 0; i < userFiles.length; i++) {
            if (keccak256(bytes(userFiles[i].url)) == keccak256(bytes(url))) {
                // Swap with the last element and pop
                userFiles[i] = userFiles[userFiles.length - 1];
                userFiles.pop();
                break;
            }
        }
    }
}
