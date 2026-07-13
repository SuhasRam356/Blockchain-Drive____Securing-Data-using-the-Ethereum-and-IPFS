// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract UploadUpgradeableV6 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    struct FileInfo {
        string url;
        string category;
        address sender; // Identifies who sent the file to prevent spam/phishing
    }

    struct Access {
        address user;
        bool access;
    }

    // Events for indexing
    event FileAdded(address indexed user, address indexed sender, string url, string category);
    event FileDeleted(address indexed user, string url);
    event AccessGranted(address indexed owner, address indexed user, uint256 durationInMinutes);
    event AccessRevoked(address indexed owner, address indexed user);
    event FileSigned(address indexed signer, string url, bytes32 fileHash);
    event PublicKeyPublished(address indexed user, string publicKey);
    event FileUpdated(address indexed user, string oldUrl, string newUrl);

    // Main file storage
    mapping(address => FileInfo[]) private value;
    
    // Access control
    mapping(address => mapping(address => bool)) public ownership;
    mapping(address => mapping(address => uint256)) public accessExpiry;

    // Enumerable-style set for O(1) removals and gas-efficient sharing lists
    mapping(address => address[]) private accessList;
    mapping(address => mapping(address => uint256)) private accessListIndex;
    mapping(address => mapping(address => bool)) private isInAccessList;

    // --- V2 STORAGE ADDITIONS ---
    // Mapping of IPFS url to its digital signature
    mapping(string => bytes) public fileSignatures;
    // Mapping of IPFS url to its raw file SHA256 hash
    mapping(string => bytes32) public fileHashes;

    // --- V4 STORAGE ADDITIONS ---
    // Mapping of address to encryption public key
    mapping(address => string) public encryptionPublicKeys;
    // Mapping of IPFS url to its encrypted AES key
    mapping(string => string) public encryptedAESKeys;

    // --- V5 STORAGE ADDITIONS ---
    struct Version {
        string url;
        uint256 timestamp;
    }
    // Mapping of currentUrl to its originalUrl (FileID)
    mapping(string => string) public originalUrls;
    // Mapping of originalUrl (FileID) to its historical versions
    mapping(string => Version[]) public fileVersions;

    // --- NONCE STORAGE FOR REPLAY PROTECTION ---
    mapping(address => uint256) public encryptionKeyNonces;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __Ownable_init(msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    // --- V5 FUNCTIONS ---
    function updateFile(
        string calldata currentUrl,
        string calldata newUrl,
        bytes32 newFileHash,
        bytes calldata newSignature,
        string calldata newEncryptedKey
    ) external {
        FileInfo[] storage userFiles = value[msg.sender];
        bool found = false;
        
        for (uint i = 0; i < userFiles.length; i++) {
            if (keccak256(bytes(userFiles[i].url)) == keccak256(bytes(currentUrl))) {
                userFiles[i].url = newUrl;
                found = true;
                break;
            }
        }
        require(found, "File not found");

        string memory origUrl = originalUrls[currentUrl];
        if (bytes(origUrl).length == 0) {
            origUrl = currentUrl;
            originalUrls[currentUrl] = origUrl;
            fileVersions[origUrl].push(Version({
                url: currentUrl,
                timestamp: block.timestamp - 1 // approximate original timestamp
            }));
        }
        
        originalUrls[newUrl] = origUrl;
        fileVersions[origUrl].push(Version({
            url: newUrl,
            timestamp: block.timestamp
        }));

        fileHashes[newUrl] = newFileHash;
        fileSignatures[newUrl] = newSignature;
        encryptedAESKeys[newUrl] = newEncryptedKey;

        emit FileUpdated(msg.sender, currentUrl, newUrl);
    }

    function getFileHistory(string calldata currentUrl) external view returns (Version[] memory) {
        string memory origUrl = originalUrls[currentUrl];
        if (bytes(origUrl).length == 0) {
            Version[] memory history = new Version[](1);
            history[0] = Version({
                url: currentUrl,
                timestamp: 0 
            });
            return history;
        }
        return fileVersions[origUrl];
    }

    // --- V4 FUNCTIONS ---
    function setEncryptionPublicKey(string calldata key, bytes calldata signature) external {
        uint256 currentNonce = encryptionKeyNonces[msg.sender];
        string memory message = string.concat("Confirm E2EE Public Key: ", key, " Nonce: ", Strings.toString(currentNonce));
        bytes32 messageHash = MessageHashUtils.toEthSignedMessageHash(bytes(message));
        address signer = ECDSA.recover(messageHash, signature);
        require(signer == msg.sender, "Invalid signature: signer does not match sender");
        
        encryptionKeyNonces[msg.sender]++;
        encryptionPublicKeys[msg.sender] = key;
        emit PublicKeyPublished(msg.sender, key);
    }

    function addWithE2EE(
        string calldata url, 
        string calldata category, 
        bytes32 fileHash, 
        bytes calldata signature,
        string calldata encryptedKey
    ) external {
        value[msg.sender].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        
        fileHashes[url] = fileHash;
        fileSignatures[url] = signature;
        encryptedAESKeys[url] = encryptedKey;
        
        emit FileAdded(msg.sender, msg.sender, url, category);
        emit FileSigned(msg.sender, url, fileHash);
    }

    function sendFileToReceiverWithE2EE(
        address receiver, 
        string calldata url, 
        string calldata category, 
        bytes32 fileHash, 
        bytes calldata signature,
        string calldata encryptedKey
    ) external {
        require(receiver != msg.sender, "Use addWithE2EE() for your own files");
        
        value[receiver].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        
        fileHashes[url] = fileHash;
        fileSignatures[url] = signature;
        encryptedAESKeys[url] = encryptedKey;
        
        emit FileAdded(receiver, msg.sender, url, category);
        emit FileSigned(msg.sender, url, fileHash);
    }


    // Existing functions ...
    function addWithSignature(string calldata url, string calldata category, bytes32 fileHash, bytes calldata signature) external {
        value[msg.sender].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        
        fileHashes[url] = fileHash;
        fileSignatures[url] = signature;
        
        emit FileAdded(msg.sender, msg.sender, url, category);
        emit FileSigned(msg.sender, url, fileHash);
    }

    function sendFileToReceiverWithSignature(address receiver, string calldata url, string calldata category, bytes32 fileHash, bytes calldata signature) external {
        require(receiver != msg.sender, "Use addWithSignature() for your own files");
        
        value[receiver].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        
        fileHashes[url] = fileHash;
        fileSignatures[url] = signature;
        
        emit FileAdded(receiver, msg.sender, url, category);
        emit FileSigned(msg.sender, url, fileHash);
    }

    function add(string calldata url, string calldata category) external {
        value[msg.sender].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        emit FileAdded(msg.sender, msg.sender, url, category);
    }

    function addBatch(string[] calldata urls, string calldata category) external {
        for (uint i = 0; i < urls.length; i++) {
            value[msg.sender].push(FileInfo({
                url: urls[i],
                category: category,
                sender: msg.sender
            }));
            emit FileAdded(msg.sender, msg.sender, urls[i], category);
        }
    }

    function sendFileToReceiver(address receiver, string calldata url, string calldata category) external {
        require(receiver != msg.sender, "Use add() for your own files");
        
        value[receiver].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        emit FileAdded(receiver, msg.sender, url, category);
    }

    function sendFileToReceiverBatch(address receiver, string[] calldata urls, string calldata category) external {
        require(receiver != msg.sender, "Use addBatch() for your own files");
        
        for (uint i = 0; i < urls.length; i++) {
            value[receiver].push(FileInfo({
                url: urls[i],
                category: category,
                sender: msg.sender
            }));
            emit FileAdded(receiver, msg.sender, urls[i], category);
        }
    }

    function allow(address user, uint256 durationInMinutes) external {
        require(user != msg.sender, "Cannot share with yourself");
        
        ownership[msg.sender][user] = true;
        
        if (durationInMinutes > 0) {
            accessExpiry[msg.sender][user] = block.timestamp + (durationInMinutes * 1 minutes);
        } else {
            accessExpiry[msg.sender][user] = 0; // 0 means no expiry
        }

        if (!isInAccessList[msg.sender][user]) {
            accessList[msg.sender].push(user);
            accessListIndex[msg.sender][user] = accessList[msg.sender].length - 1;
            isInAccessList[msg.sender][user] = true;
        }
        
        emit AccessGranted(msg.sender, user, durationInMinutes);
    }

    function disallow(address user) external {
        require(ownership[msg.sender][user], "User does not have access");
        ownership[msg.sender][user] = false;
        
        // O(1) removal from array (swap and pop)
        if (isInAccessList[msg.sender][user]) {
            uint256 idx = accessListIndex[msg.sender][user];
            uint256 lastIdx = accessList[msg.sender].length - 1;
            address lastUser = accessList[msg.sender][lastIdx];
            
            // Swap
            accessList[msg.sender][idx] = lastUser;
            accessListIndex[msg.sender][lastUser] = idx;
            
            // Pop
            accessList[msg.sender].pop();
            
            isInAccessList[msg.sender][user] = false;
            delete accessListIndex[msg.sender][user];
        }
        
        emit AccessRevoked(msg.sender, user);
    }

    function display(address _user) external view returns (FileInfo[] memory) {
        bool hasAccess = ownership[_user][msg.sender] && 
            (accessExpiry[_user][msg.sender] == 0 || accessExpiry[_user][msg.sender] > block.timestamp);
            
        require(_user == msg.sender || hasAccess, "You don't have access");
        return value[_user];
    }

    function getFileCount(address _user) external view returns (uint256) {
        bool hasAccess = ownership[_user][msg.sender] && 
            (accessExpiry[_user][msg.sender] == 0 || accessExpiry[_user][msg.sender] > block.timestamp);
            
        require(_user == msg.sender || hasAccess, "You don't have access");
        return value[_user].length;
    }

    function displayPage(address _user, uint256 offset, uint256 limit) external view returns (FileInfo[] memory) {
        bool hasAccess = ownership[_user][msg.sender] && 
            (accessExpiry[_user][msg.sender] == 0 || accessExpiry[_user][msg.sender] > block.timestamp);
            
        require(_user == msg.sender || hasAccess, "You don't have access");
        
        uint256 totalFiles = value[_user].length;
        if (offset >= totalFiles) {
            return new FileInfo[](0);
        }
        
        uint256 end = offset + limit;
        if (end > totalFiles) {
            end = totalFiles;
        }
        
        uint256 size = end - offset;
        FileInfo[] memory page = new FileInfo[](size);
        for (uint256 i = 0; i < size; i++) {
            page[i] = value[_user][offset + i];
        }
        return page;
    }

    function shareAccess() external view returns (Access[] memory) {
        address[] memory users = accessList[msg.sender];
        Access[] memory activeAccess = new Access[](users.length);
        
        for (uint i = 0; i < users.length; i++) {
            address u = users[i];
            bool hasAccess = ownership[msg.sender][u] && 
                (accessExpiry[msg.sender][u] == 0 || accessExpiry[msg.sender][u] > block.timestamp);
            activeAccess[i] = Access(u, hasAccess);
        }
        return activeAccess;
    }

    function deleteFile(string calldata url) external {
        FileInfo[] storage userFiles = value[msg.sender];
        for (uint i = 0; i < userFiles.length; i++) {
            if (keccak256(bytes(userFiles[i].url)) == keccak256(bytes(url))) {
                userFiles[i] = userFiles[userFiles.length - 1];
                userFiles.pop();
                
                emit FileDeleted(msg.sender, url);
                break;
            }
        }
    }
}
