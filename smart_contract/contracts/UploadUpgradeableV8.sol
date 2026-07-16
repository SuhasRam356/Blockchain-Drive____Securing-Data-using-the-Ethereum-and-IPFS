// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract UploadUpgradeableV8 is Initializable, OwnableUpgradeable, PausableUpgradeable, UUPSUpgradeable {
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

    // --- V2 STORAGE ADDITIONS (DEPRECATED) ---
    mapping(string => bytes) public fileSignatures; // DEPRECATED: Use userFileSignatures
    mapping(string => bytes32) public fileHashes; // DEPRECATED: Use userFileHashes

    // --- V4 STORAGE ADDITIONS ---
    mapping(address => string) public encryptionPublicKeys;
    mapping(string => string) public encryptedAESKeys; // DEPRECATED: Use userEncryptedAESKeys

    // --- V5 STORAGE ADDITIONS ---
    struct Version {
        string url;
        uint256 timestamp;
    }
    mapping(string => string) public originalUrls; // DEPRECATED: Use userOriginalUrls
    mapping(string => Version[]) public fileVersions; // DEPRECATED: Use userFileVersions

    // --- NONCE STORAGE FOR REPLAY PROTECTION ---
    mapping(address => uint256) public encryptionKeyNonces;

    // --- V7 STORAGE ADDITIONS (DEPRECATED) ---
    mapping(string => mapping(address => string)) public sharedEncryptedAESKeys; // DEPRECATED

    // =======================================================
    // --- V8 STORAGE ADDITIONS (Fixing Mapping Collisions) ---
    // =======================================================
    mapping(address => mapping(string => bytes)) public userFileSignatures;
    mapping(address => mapping(string => bytes32)) public userFileHashes;
    mapping(address => mapping(string => string)) public userEncryptedAESKeys;
    mapping(address => mapping(string => string)) public userOriginalUrls;
    mapping(address => mapping(string => Version[])) private _userFileVersions;
    mapping(address => mapping(string => mapping(address => string))) public userSharedEncryptedAESKeys;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __Ownable_init(msg.sender);
        __Pausable_init();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    // --- V8 PAUSABILITY CONTROLS ---
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- V8 HELPER FUNCTIONS ---
    function _ownsFile(address owner, string memory url) internal view returns (bool) {
        FileInfo[] storage files = value[owner];
        for (uint i = 0; i < files.length; i++) {
            if (keccak256(bytes(files[i].url)) == keccak256(bytes(url))) {
                return true;
            }
        }
        return false;
    }

    // --- V8 COMPATIBILITY GETTERS ---
    function getFileSignature(address owner, string calldata url) external view returns (bytes memory) {
        bytes memory sig = userFileSignatures[owner][url];
        if (sig.length > 0) return sig;
        return fileSignatures[url];
    }

    function getFileHash(address owner, string calldata url) external view returns (bytes32) {
        bytes32 hash = userFileHashes[owner][url];
        if (hash != bytes32(0)) return hash;
        return fileHashes[url];
    }

    function getEncryptedAESKey(address owner, string calldata url) external view returns (string memory) {
        string memory key = userEncryptedAESKeys[owner][url];
        if (bytes(key).length > 0) return key;
        return encryptedAESKeys[url];
    }

    function getSharedEncryptedAESKey(address owner, string calldata url, address receiver) external view returns (string memory) {
        string memory key = userSharedEncryptedAESKeys[owner][url][receiver];
        if (bytes(key).length > 0) return key;
        return sharedEncryptedAESKeys[url][receiver];
    }

    function getOriginalUrl(address owner, string calldata currentUrl) external view returns (string memory) {
        string memory orig = userOriginalUrls[owner][currentUrl];
        if (bytes(orig).length > 0) return orig;
        orig = originalUrls[currentUrl];
        if (bytes(orig).length > 0) return orig;
        return currentUrl;
    }

    function getFileHistory(address owner, string calldata currentUrl) external view returns (Version[] memory) {
        string memory origUrl = userOriginalUrls[owner][currentUrl];
        bool isV8 = true;
        if (bytes(origUrl).length == 0) {
            origUrl = originalUrls[currentUrl];
            isV8 = false;
        }
        
        if (bytes(origUrl).length == 0) {
            Version[] memory history = new Version[](1);
            history[0] = Version({
                url: currentUrl,
                timestamp: 0 
            });
            return history;
        }

        if (isV8) {
            return _userFileVersions[owner][origUrl];
        } else {
            return fileVersions[origUrl];
        }
    }

    // --- UPDATED V8 FUNCTIONS ---

    function updateFile(
        string calldata currentUrl,
        string calldata newUrl,
        bytes32 newFileHash,
        bytes calldata newSignature,
        string calldata newEncryptedKey
    ) external whenNotPaused {
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

        string memory origUrl = userOriginalUrls[msg.sender][currentUrl];
        if (bytes(origUrl).length == 0) {
            origUrl = originalUrls[currentUrl]; // Check legacy
        }

        if (bytes(origUrl).length == 0) {
            origUrl = currentUrl;
            userOriginalUrls[msg.sender][currentUrl] = origUrl;
            _userFileVersions[msg.sender][origUrl].push(Version({
                url: currentUrl,
                timestamp: block.timestamp - 1
            }));
        }
        
        userOriginalUrls[msg.sender][newUrl] = origUrl;
        _userFileVersions[msg.sender][origUrl].push(Version({
            url: newUrl,
            timestamp: block.timestamp
        }));

        userFileHashes[msg.sender][newUrl] = newFileHash;
        userFileSignatures[msg.sender][newUrl] = newSignature;
        userEncryptedAESKeys[msg.sender][newUrl] = newEncryptedKey;

        emit FileUpdated(msg.sender, currentUrl, newUrl);
    }

    function setEncryptionPublicKey(string calldata key, bytes calldata signature) external whenNotPaused {
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
    ) external whenNotPaused {
        value[msg.sender].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        
        userFileHashes[msg.sender][url] = fileHash;
        userFileSignatures[msg.sender][url] = signature;
        userEncryptedAESKeys[msg.sender][url] = encryptedKey;
        
        emit FileAdded(msg.sender, msg.sender, url, category);
        emit FileSigned(msg.sender, url, fileHash);
    }

    function shareFileKeysForUser(address user, string[] calldata urls, string[] calldata keys) external whenNotPaused {
        require(urls.length == keys.length, "Arrays length mismatch");
        for (uint i = 0; i < urls.length; i++) {
            // CRITICAL FIX: Access Control ensures msg.sender actually owns the file before sharing
            require(_ownsFile(msg.sender, urls[i]), "Not owner of file");
            userSharedEncryptedAESKeys[msg.sender][urls[i]][user] = keys[i];
        }
    }

    function shareFileKeysForMultipleUsers(string calldata url, address[] calldata users, string[] calldata keys) external whenNotPaused {
        require(users.length == keys.length, "Arrays length mismatch");
        // CRITICAL FIX: Access Control ensures msg.sender actually owns the file before sharing
        require(_ownsFile(msg.sender, url), "Not owner of file");
        for (uint i = 0; i < users.length; i++) {
            userSharedEncryptedAESKeys[msg.sender][url][users[i]] = keys[i];
        }
    }

    function sendFileToReceiverWithE2EE(
        address receiver, 
        string calldata url, 
        string calldata category, 
        bytes32 fileHash, 
        bytes calldata signature,
        string calldata encryptedKey
    ) external whenNotPaused {
        require(receiver != msg.sender, "Use addWithE2EE() for your own files");
        
        value[receiver].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        
        userFileHashes[receiver][url] = fileHash;
        userFileSignatures[receiver][url] = signature;
        userEncryptedAESKeys[receiver][url] = encryptedKey;
        
        emit FileAdded(receiver, msg.sender, url, category);
        emit FileSigned(msg.sender, url, fileHash);
    }

    function addWithSignature(string calldata url, string calldata category, bytes32 fileHash, bytes calldata signature) external whenNotPaused {
        value[msg.sender].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        
        userFileHashes[msg.sender][url] = fileHash;
        userFileSignatures[msg.sender][url] = signature;
        
        emit FileAdded(msg.sender, msg.sender, url, category);
        emit FileSigned(msg.sender, url, fileHash);
    }

    function sendFileToReceiverWithSignature(address receiver, string calldata url, string calldata category, bytes32 fileHash, bytes calldata signature) external whenNotPaused {
        require(receiver != msg.sender, "Use addWithSignature() for your own files");
        
        value[receiver].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        
        userFileHashes[receiver][url] = fileHash;
        userFileSignatures[receiver][url] = signature;
        
        emit FileAdded(receiver, msg.sender, url, category);
        emit FileSigned(msg.sender, url, fileHash);
    }

    function add(string calldata url, string calldata category) external whenNotPaused {
        value[msg.sender].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        emit FileAdded(msg.sender, msg.sender, url, category);
    }

    function addBatch(string[] calldata urls, string calldata category) external whenNotPaused {
        for (uint i = 0; i < urls.length; i++) {
            value[msg.sender].push(FileInfo({
                url: urls[i],
                category: category,
                sender: msg.sender
            }));
            emit FileAdded(msg.sender, msg.sender, urls[i], category);
        }
    }

    function sendFileToReceiver(address receiver, string calldata url, string calldata category) external whenNotPaused {
        require(receiver != msg.sender, "Use add() for your own files");
        
        value[receiver].push(FileInfo({
            url: url,
            category: category,
            sender: msg.sender
        }));
        emit FileAdded(receiver, msg.sender, url, category);
    }

    function sendFileToReceiverBatch(address receiver, string[] calldata urls, string calldata category) external whenNotPaused {
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

    function allow(address user, uint256 durationInMinutes) external whenNotPaused {
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

    function disallow(address user) external whenNotPaused {
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

    function deleteFile(string calldata url) external whenNotPaused {
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
