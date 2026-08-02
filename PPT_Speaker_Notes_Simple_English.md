# Blockchain Drive - Complete PPT Speaker Notes in Simple English
### From Introduction to Thank You - Guide Ready

This document explains each slide in very simple English. You can read this during presentation. Your guide and external examiner will easily understand.

---

### **SLIDE 1: TITLE SLIDE**
**What to say:**
"Good morning everyone.
Our project title is Blockchain Drive – Securing Data using Ethereum and IPFS.
It is a decentralized alternative to Google Drive.
Instead of storing files on Google's servers, we store encrypted files on IPFS and ownership proof on Ethereum blockchain.
I am [Your Name] from CSE department, under guidance of [Guide Name]."

**Simple Explanation for Guide:**
Think Google Drive but without Google company controlling it.

---

### **SLIDE 2: AGENDA**
**What to say:**
"Today I will cover 13 points. Starting from why centralized storage is risky, what our objectives are, what other researchers did, our 3-layer architecture, all core features like encryption, IPFS, steganography, ZKP, DAO, The Graph, then demo, security, results, and conclusion."

**Why this slide:**
So guide knows structure. Makes you look organized.

---

### **SLIDE 3: INTRODUCTION**
**In Simple Words:**
"Blockchain Drive is like Google Drive + WhatsApp Encryption + Blockchain Proof + Invisible Ink all combined.
- Google Drive part = store files
- WhatsApp Encryption part = only you can read files, not even server
- Blockchain Proof part = blockchain remembers who owns file forever, no one can delete record
- Invisible Ink part = we can hide file inside an image so no one knows you uploaded a file.

Flow: User selects file -> File gets encrypted in browser (laptop itself) -> Encrypted file goes to IPFS (1000s of computers) -> Blockchain stores hash (receipt)."

**Explain to non-technical guide:**
"Even if Filebase company that stores file wants to see your marksheet, they see only random letters like 'aIj7s...', useless."

---

### **SLIDE 4: PROBLEM STATEMENT**
**What problem we solve:**

"Normal cloud like Google Drive has 5 big problems:
1. Honeypot – one company stores crores of files, hackers target them – one hack leaks all.
2. Privacy – Google scans your files for ads or policy.
3. Censorship – They can delete your account anytime.
4. Ownership – No proof who uploaded first.
5. Downtime – If Google server down, you cannot access.

Also IPFS alone is not enough – if you upload file to IPFS without encryption, anyone with link can download it. Like public Google Drive link.

Real incidents: Dropbox 2023 leaked 100M files.

We need system where even if storage hacked, data useless, and no company can block you."

---

### **SLIDE 5: OBJECTIVES**
**Read one by one in simple words:**

"1. Build Google Drive without Google – user owns data.
2. Encrypt file with AES-256 BEFORE upload – military grade, server has zero knowledge.
3. Store on IPFS via Filebase – decentralized.
4. Store only small hash on Ethereum – low cost, permanent.
5. No password – user signs with MetaMask wallet, key auto created – no need to remember password, but key is 256-bit super strong, not like 'password123'.
6. Secure sharing – encrypt key with receiver's public key using X25519 – like lock box only receiver can open.
7. Advanced privacy – hide file inside image (steganography), and prove file is valid without revealing key (ZKP).
8. Fast dashboard using The Graph – like Google indexing.
9. Make contract upgradeable via proxy and controlled by DAO community, not single developer.
10. Save gas – optimize from loop O(n) to mapping O(1) – saves 90% cost."

**Tip:** Say "In simple words, we want privacy + ownership + low cost + community control."

---

### **SLIDE 6: LITERATURE SURVEY**
**Simple explanation of each paper:**

"Paper 1 – Zheng IEEE 2017 – Told us blockchain is good for proof but storage is expensive. So don't store file on blockchain, store only hash.

Paper 2 – IoTChain 2018 – Said centralized IoT fails. Access control should be on smart contract. We followed.

Paper 3 – Guo 2021 – Built medical records on Blockchain + IPFS. Big files on IPFS, small audit on blockchain. We adopted same.

Paper 4 – Zhang 2020 – Used Proxy Re-Encryption which is powerful but gas heavy (costly). We used simpler X25519 + AES which is cheaper, faster.

Paper 5 – OpenZeppelin Proxy – Taught us how to upgrade contract without losing data via UUPS proxy. We used.

Paper 6 – Buterin EIP-712 – Typed signing to prevent phishing – we used for secure signature.

GAP: No one combined E2EE + HD keys + Steganography + ZKP + DAO + The Graph together in one working app. We did – that's our uniqueness."

---

### **SLIDE 7: PROPOSED SOLUTION OVERVIEW**
**Explain in steps like story:**

"Imagine Alice wants to upload resume.

Client Side (her laptop):
- She connects MetaMask.
- App asks her to SIGN a message – 'Derive cryptographic master key'. She signs.
- Signature -> SHA256 -> 32 byte master secret key. Stored only in memory, not server.
- From master, we make sub-keys: Work key = SHA256(master + 'Work'), Personal key = SHA256(master + 'Personal'). So if she shares Work key, Personal still safe. This is HD derivation.
- File read as base64, generate convergent AES key = SHA256(file). Same file always gives same key, helps deduplication.
- Encrypt file with AES key -> ciphertext gibberish.
- Encrypt AES key with her category public key -> encryptedAES.

Storage:
- Ciphertext blob uploaded to Filebase S3 API -> pinned to IPFS -> returns CID like QmX...
- Anyone opening IPFS link sees gibberish.

Blockchain:
- Contract stores: URL, category, encryptedAES, sender.
- Emits event FileAdded.
- Cheap because only small data stored.

Indexing:
- The Graph listens events and indexes – dashboard loads fast.
- DAO votes to upgrade logic."

---

### **SLIDE 8: SYSTEM ARCHITECTURE – 3 LAYERS**
**Very important slide – explain with analogy:**

"3 Layers like 3 floors of building.

Layer 1 – Client / Frontend (React App):
- Where user works. All encryption happens here in browser. Private key never leaves device.
- Technologies: React.js, Vite (fast), Tailwind (beautiful UI), Ethers.js (talk to Ethereum), CryptoJS AES, eth-sig-util X25519, Apollo GraphQL.
- Analogy: You lock file in box at HOME before sending to warehouse. So warehouse can't open.

Layer 2 – Storage / IPFS via Filebase:
- IPFS = distributed warehouse with 1000s of nodes. File address = hash of content (CID). If file tampered, CID changes, so tampering caught.
- We use Filebase as S3 gateway to IPFS. Upload returns ipfs://...
- Role: Stores encrypted blobs. Can't read.
- Plus Steganography: Encrypted text hidden inside noise image via LSB (change last bit of pixel – human eye can't see).

Layer 3 – Blockchain / Ethereum:
- Judge + record keeper. Stores who owns what, who can access.
- Contract: UploadUpgradeableV9.sol upgradeable via UUPS.
- Sepolia Testnet for free testing.
- Functions: add, allow, disallow, display, etc.
- Ownable + Pausable – emergency stop if bug found.
- DAO – DriveDAO.sol + DriveToken + Faucet – community governance.
- The Graph Subgraph reads events for fast dashboard."

---

### **SLIDE 9: TECHNOLOGY STACK**
**Explain why we chose each:**

"Frontend we chose React + Vite because fastest, industry standard.

Blockchain Solidity + Hardhat because Hardhat lets us test, deploy easily, and Solidity is main language for Ethereum.

Cryptography: CryptoJS AES-256 because same used by banks. eth-sig-util X25519 because MetaMask uses it, secure for public key encryption.

Storage: Filebase because S3 compatible, easy, free tier, pins to IPFS.

Indexing: The Graph Protocol because without it, reading 500 files from blockchain would be very slow – The Graph makes it 100ms like Google search.

Governance: DriveDAO + DriveToken ERC20 + Faucet – so users can claim free tokens and vote.

All choices were because – widely used, secure, free for students, good docs."

---

### **SLIDE 10: SMART CONTRACT EVOLUTION V1 to V10**
**Tell story of improvement – guide loves this:**

"V1-V2 – Simple: mapping address->string[] – store list of URLs per user, functions add, allow, disallow, display. But no encryption, and access check looped through array O(n) – wasted gas.

V3-V4 – Added struct FileInfo with url, category, sender – now we know who sent file – prevents spam. Added encryptionPublicKeys + encryptedAESKeys – start of E2EE security.

V5 – File Versioning: Like GitHub for files. originalUrls + fileVersions mapping – user can updateFile(), history kept with timestamp. If you upload resume v2, v1 still saved.

V6 – Batch upload: addBatchWithE2EE() – upload 10 files in one transaction – saves time + gas.

V7 – Secure Sharing: sharedEncryptedAESKeys – when you allow user, you also share AES key encrypted with their public key. So they can decrypt.

V8 – Security fixes: Added nonce + ECDSA signature check when publishing public key – prevents attacker replacing your public key. Also pausable – emergency stop. And O(1) array removal via swap & pop – gas saved.

V9 – Fixed big bug: Old code used url as key directly – if two users uploaded same CID, mapping collided and overwrote. New code userEncryptedAESKeys[owner][url] – isolated per owner – safe. This is our main deployed version on Sepolia proxy 0x5b3e...

V10 – Gas Optimization: Added fileOwnership mapping for O(1) ownership check. Old _ownsFile looped O(n) – if user had 500 files, every share looped 500 times – huge gas. Now constant time single read – 90% gas saved – this is mentioned as key contribution in paper.

Also DriveDAO, DriveToken, Faucet – full governance."

---

### **SLIDE 11: E2EE ENCRYPTION FLOW**
**Explain upload vs download – most important technical slide:**

"UPLOAD (Lock):

1. User selects marksheet.pdf
2. Read as Base64 data URL
3. Generate AES key: aesKey = SHA256(file) – convergent – same file same key – helps deduplication
4. Encrypt: ciphertext = AES.encrypt(file, aesKey) – now gibberish
5. Get Master Key: User signs EIP-712 message in MetaMask – domain includes app name, chainId, contract address – prevents replay on other websites or chains. Signature -> SHA256 -> 32 byte master key – cached in memory, user signs only once per session.
6. Derive Category Key: categorySecret = SHA256(master + 'Personal') – Work vs Personal isolated.
7. Encrypt AES key with Category Public Key using X25519 -> encryptedAES
8. Upload ciphertext to Filebase -> IPFS -> CID
9. Call addWithE2EE(url, category, hash, signature, encryptedAES) -> blockchain.

DOWNLOAD (Unlock):
1. Frontend queries Subgraph -> list of files
2. Fetch IPFS URL -> download .enc text
3. Get encryptedAES from contract
4. Decrypt AES key using my category secret -> aesKey
5. Decrypt file: AES.decrypt(ciphertext, aesKey) -> original
6. If stego enabled: First extract text from noisy PNG via canvas LSB reading, then decrypt.

Why secure:
Filebase sees only encrypted text, blockchain sees only encrypted key, key never leaves browser except encrypted form, 256-bit entropy impossible to brute force, even if wallet signature stolen, need IPFS file."

---

### **SLIDE 12: FILE SHARING WORKFLOW**
**Use Alice-Bob story:**

"Alice to Bob:

Step1: Alice uploaded resume already.

Step2: She goes Share tab, enters Bob address 0x123..., selects 60 min expiry.

Step3: allow(Bob, 60) – blockchain stores ownership true + expiry = now + 60 min + adds to accessList.

Step4: She must give AES key securely:
 - Fetches encrypted AES key for her file (encrypted with her category key)
 - Decrypts locally with her category secret -> plain aesKey
 - Fetches Bob's public key from contract.encryptionPublicKeys(Bob) – Bob must have connected app once to publish key, otherwise error 'Bob has not published public key'
 - Re-encrypts aesKey with Bob's public key -> encryptedForBob
 - Calls shareFileKeysForMultipleUsers(url, [Bob], [encryptedForBob]) -> stores mapping Alice[url][Bob]

Step5: Bob logs in, Shared With Me tab – sees file because allow true + not expired + subgraph query.

Step6: Bob clicks Download – gets encryptedForBob, decrypts with his secret (derived from his wallet signature) -> aesKey -> decrypts file.

Step7: Alice disallows – ownership false + O(1) removal from array – Bob instant lose access.

Note: Bob doesn't need Alice online after share – keys already on-chain. Direct share function sendFileToReceiverWithE2EE can push file directly to receiver's list at upload time.

File: Share.jsx handles this."

---

### **SLIDE 13: IPFS STORAGE**
**Explain IPFS like torrent:**

"What is IPFS?
Like BitTorrent + Git. File address = hash of content, not location. If file changes 1 byte, CID changes – tamper proof. Many nodes store copies – no single failure.

How we use:
- Filebase S3 PutObject -> bucket -> returns ipfs://CID -> we convert to https://ipfs.io/ipfs/CID gateway.
- Limit 10MB frontend for demo.
- LocalStorage saves size for dashboard.

Why not Ethereum for file?
Ethereum storage costs $10,000 per MB – too costly! IPFS cheap.

Security:
Even if IPFS node owner opens file, sees ciphertext random. No file name leaked in plaintext.

Deduplication:
Same file by two users gives same CID (if same encryption) – saves storage, but leaks that file exists – trade-off we accept for demo, future use random salt to avoid.

Gateways: Filebase, ipfs.io, Pinata all read same CID – permanent as long as pinned."

---

### **SLIDE 14: STEGANOGRAPHY**
**Invisible ink analogy:**

"Not just encryption hides content, steganography hides existence.

Our implementation in steganography.js:
- User toggles Stego ON during upload
- encodeStego():
  1. Generate organic noise image via Canvas – random pixels
  2. Convert ciphertext to binary
  3. Inject binary into LSB (Least Significant Bit) of each pixel RGB – changing LSB doesn't affect visual – image still looks noisy
  4. Export PNG – upload PNG instead of .enc text
- Category gets tag #Stego

Why useful?
If attacker checks IPFS gateway, sees image, not encrypted text – doesn't suspect file sharing.

Decode:
Download PNG, load canvas, read pixel data, collect LSBs -> binary -> ciphertext -> decrypt.

Limitations:
- Image bigger than text – overhead.
- Only small files optimal <1MB because need many pixels.
- Must keep PNG, if converted to JPEG, LSB lost.
- Use case: journalists, whistleblowers.

This is our advanced privacy feature – guide will be impressed."

---

### **SLIDE 15: ZERO KNOWLEDGE PROOFS**
**Explain very simple:**

"Imagine you want to prove you know password without telling password. ZKP allows prove true without revealing secret.

In our project – conceptual demo for now:
- When uploading, we generate ZKP commitment that AES key matches file
- Means prove 'I encrypted correctly' without showing AES key
- Currently mocked delay 800ms returning {conceptual: true} + toast 'ZKP Verified' + tag #ZKP-Verified badge in UI
- For production, use SnarkJS + Circom to generate real zk-SNARK proof, on-chain verification via verifyProof()
- Why important for research paper? Shows future scope – mathematical verification, not just encryption – prevents uploading garbage claiming encrypted.

In FileUpload.jsx: toast Generating ZKP... delay -> success.

Future work: Replace mock with snarkjs.groth16.fullProve() – mentioned in IEEE paper as next step."

---

### **SLIDE 16: THE GRAPH PROTOCOL**
**Explain indexing problem:**

"Problem without The Graph:
To show My Files, old method calls contract.display(user) – reads all files one by one from blockchain. If 200 files, scan 200 structs – slow, timeout.

Solution: Subgraph indexer:
- Subgraph listens blockchain events permanently.
- We deployed on Subgraph Studio – Sepolia – address 0x5b3e... proxy – startBlock 11394644.
- Events: FileAdded, FileDeleted, FileUpdated, AccessGranted, AccessRevoked, PublicKeyPublished.
- mapping.ts in AssemblyScript processes events -> saves entities: File, Access, UserMetric, ActivityEvent
- Provides GraphQL endpoint.

Frontend uses Apollo Client: Instead of contract call, do GraphQL query files(where: owner=me) – returns <100ms super fast – Dashboard.jsx shows total files, shared counters.

Benefits:
Fast, historical analytics, no gas for reading, decentralized indexing.

Steps to deploy: graph auth, npm run build, graph deploy, copy Query URL to client/src/main.jsx Apollo uri.

Files: subgraph/subgraph.yaml + schema.graphql + src/mapping.ts"

---

### **SLIDE 17: DAO GOVERNANCE**
**Community ownership:**

"DAO = Decentralized Autonomous Organization – no CEO, community votes.

Contracts: DriveDAO.sol (Governor), DriveToken.sol (ERC20), DriveFaucet.sol (free tokens).

Flow:
- User goes Governance tab
- First time click Faucet – calls claim() – gets 100 DRIVE free (Sepolia test)
- DRIVE is voting token
- Anyone creates proposal: 'Upgrade contract to V10 for gas saving' – proposal contains target address + calldata upgradeTo(newImplementation)
- Token holders vote For/Against
- After voting period, if quorum reached, execute – proxy upgrades logic but keeps storage

Why UUPS Proxy?
Normal contract immutable cannot fix bugs. UUPS – Proxy holds storage, implementation holds logic. Only DAO can authorize upgrade. We tested on Sepolia – upgraded V8->V9 without losing file data.

Faucet component shows balance + claim button + rate limit.

Governance component lists proposals, vote, execute buttons.

Security: Only DAO can pause/unpause in emergency – freezes all uploads if vulnerability.

Analogy: DRIVE token = share in company, more tokens more voting power, community decides future, true Web3.

This makes project complete Web3 ecosystem, not just storage."

---

### **SLIDE 18: ACCESS CONTROL & GAS OPTIMIZATION**
**Technical core – impress examiner:**

"Access Control:
- allow(user, duration): Sets ownership true, expiry now+duration*60, if 0 permanent, adds to accessList array + index mapping + isInAccessList flag, emits AccessGranted.
- disallow(user): Requires ownership true, sets false, O(1) removal via swap array element with last then pop – old method loop O(n) costly for 100+ shared users, emits AccessRevoked.
- display(user): Checks msg.sender == user OR (ownership[owner][msg.sender] && not expired). Else 'You don't have access'.
- displayPage(user, offset, limit): Pagination – returns slice for large lists – avoids gas limit.

Time-locked example: Allow Bob 60 min – after 60 min ownership still true but expiry check fails – auto revoked.

Gas Optimization V10 O(1) fix:
OLD: for i=0..files.length-1 if hash(files[i].url)==hash(url) return true – if 500 files loop 500 times every share – gas high (~300k)
NEW: mapping fileOwnership[owner][keccak(url)] bool – on add set true, on _ownsFile return mapping – single read ~80k gas – 90% saving + fallback loop for pre-V10 files for migration safety.

Result: shareFileKeys for 10 users old 400k new 120k – huge saving – key contribution in IEEE paper.

File: UploadUpgradeableV9.sol lines 110-130 – show in viva."

---

### **SLIDE 19: FRONTEND – USER INTERFACE FLOW**
**Explain each component:**

"Main files:

App.jsx: Entry – connects window.ethereum, creates provider, signer, contract. Detects version via contractVersion.js. Sets up E2EE PKI: if ver>=7 fetches encryptionPublicKeys – if not exists derives key via getDeterministicKey(), derives public key, signs message with nonce to prevent replay, calls setEncryptionPublicKey.

Navigation.jsx: Glass navbar – links to Home, Files, Share, Dashboard, Governance, Faucet – beautiful modern.

FileUpload.jsx: Core – file input, category dropdown (General, Work, Personal), receiver address optional, ENS support .eth resolved via cloudflare-eth, Stego toggle, cover image, progress bar, batch upload, ZKP toast.

Files.jsx: Shows My Files & Shared With Me – uses useBlockchainDrive hook – queries Subgraph first, fallback to contract – each file as FileCard with thumbnail, tags #Stego #ZKP, Download, Share, Delete, Update version.

FileCard.tsx: Handles decryption – fetch IPFS, detect if image, decode stego if needed, decrypt AES key via PasswordContext, decrypt file, download.

Dashboard.jsx: Uses Subgraph to show metrics: total files, shared, storage used from localStorage.

Share.jsx: Input address + duration + multi-file key sharing – encrypts AES key for allowed users.

SharedLinkView.jsx: Handles ?hash= param – direct file view via IPFS link.

PasswordContext.jsx: Holds cached secret key in memory so user signs once per session – good UX.

UI: Glassmorphism – backdrop-blur, gradient borders cyan->purple, dark slate – Web3 look.

State: useState for files, fileNames, isUploading, category, useStego.

Validation: 10MB max, address via ethers.utils.isAddress, ENS resolve."

---

### **SLIDE 20: DEMO & SCREENSHOTS**
**Tell how to demo for examiner:**

"HomePage screenshot: Big title Secure Decentralized Storage, subtitle, glass panel wallet status green dot, file upload box drag&drop, category, upload button, below Faucet, Dashboard charts, My Files & Shared With Me panels – dark with gradient blurs.

Share page screenshot: List of allowed addresses, status green active red expired, revoke button, input to allow new user with duration dropdown 30min,60min,Permanent, expiry countdown.

Additional to show viva:
- FileUpload with Stego ON showing noise image generated
- MetaMask popup EIP-712 signing – Derive cryptographic master key
- IPFS gateway opened showing encrypted text or PNG
- Etherscan Sepolia tx – FileAdded event
- Subgraph Studio query playground returning files
- Governance page proposals + vote

DEMO STEPS:
1. Open localhost:5050
2. Connect MetaMask Sepolia
3. Show wallet address
4. Upload small text file Personal category – show toasts encrypting, uploading, progress bar
5. My Files updates via Subgraph fast
6. Click Download – decrypts -> downloads original
7. Toggle Stego ON upload same – IPFS shows PNG noise image – still decodes
8. Share: Enter second account, allow 10 min – switch MetaMask account – Shared With Me appears
9. Second account downloads ok
10. First account Disallow – second refresh – access gone
11. Show Governance – claim DRIVE from faucet – create proposal – vote
12. Show docs/architecture.png

Tip: Keep two browsers Chrome+Firefox with two MetaMask accounts for live sharing demo – examiners love live demo."

---

### **SLIDE 21: THREAT MODEL**
**Be honest – guide respects honesty:**

"WHAT WE PROTECT (SAFE):
✅ Compromised Storage Provider hacked – sees only AES encrypted gibberish – E2EE guarantee
✅ Offline Dictionary Attacks – key from ECDSA signature 256 bits entropy – not human password – brute force 2^256 impossible
✅ Access Control Griefing – contract checks _ownsFile before sharing keys – attacker can't overwrite others keys – nonce signature verification
✅ Smart Contract Zero-Day – DAO can pause() freeze uploads/shares emergency time to patch upgrade via UUPS
✅ File Tampering – IPFS CID changes if tampered – blockchain hash check catches + stored fileHashes mapping

WHAT WE DO NOT PROTECT (OUT-OF-SCOPE – Say honestly in viva):
❌ Metadata Leaks – Blockchain public – anyone sees WHO uploaded WHEN, category, receiver – not anonymous – need Aztec privacy chain if need anonymity
❌ Compromised User Device – laptop malware reading browser memory during decryption can steal key + file – need antivirus
❌ Stolen MetaMask Private Key – if seed stolen, attacker signs auth message and decrypts ALL files – security collapses to wallet security – advise hardware wallet
❌ Lost Wallet = Lost Files – no recovery – seed lost key lost forever – future add social recovery
❌ IPFS Pinning Reliance – If Filebase unpins and no other node pins, file garbage collected – need multiple pinners or Filecoin

Saying limitations honestly impresses external – shows you understand real security, not just building."

---

### **SLIDE 22: TESTING & RESULTS**
**List tests executed:**

"Smart Contract Tests Hardhat:
DriveDAO.test.js – propose, vote, execute – only token holders vote
DriveFaucet.test.js – claim, rate limit, balance
V5.test.js – file versioning updateFile keeps history
V6.test.js – batch upload 5 files in 1 tx works
V8.test.js – pause, nonce replay protection, O(1) access removal
Run npx hardhat test – all pass local & Sepolia

Frontend Manual Tests:
Encryption test scratch/test-encryption.cjs – encrypt hello world with category key decrypt matches
File size 10MB limit – 11MB toast error prevents IPFS overload
Invalid address validation
ENS vitalik.eth resolved correctly via cloudflare-eth
Stego 100KB text into 500x500 image decoded matches
Convergent key same file same AES key deduplication works

Performance Sepolia:
Upload 1MB: Encryption 0.5s + IPFS 2s + Blockchain tx 15s Sepolia block time
Gas addWithE2EE ~180k (~$0.02 Sepolia)
After V10 O(1): shareFileKeys 10 users old 400k new 120k – 70% saving
Subgraph query <100ms vs contract display 2-3s for 50 files

Results:
✅ Proxy deployed 0x5b3e... Sepolia
✅ Subgraph indexing live from block 11394644
✅ Frontend Vite localhost:5050 connected Sepolia+Subgraph+Filebase
✅ Upload Download Share Revoke Versioning Governance all working end-to-end
✅ E2EE works – Filebase admin cannot read
✅ Stego noise image hides data successfully
✅ DAO voting upgrades contract without losing data storage preserved
✅ Dashboard fast via The Graph
✅ No critical vulnerabilities manual testing

Evidence for PPT: Screenshot Hardhat green ticks, Etherscan tx, Filebase bucket .enc files, Subgraph query returning files.

Note: Keep .env secure never push private keys."

---

### **SLIDE 23: ADVANTAGES**
**Compare with others:**

"vs Google Drive/Dropbox:
✅ You own data not company – true ownership via blockchain
✅ No one can see files – even storage provider
✅ Censorship resistant – no company can delete
✅ Transparent access log – blockchain shows who accessed when
✅ No password to remember – wallet signature is key less phishing
✅ Time-locked sharing – self-destructing link
✅ Decentralized – one IPFS node down others have copy

vs Other Blockchain Storage (Storj, Filecoin without encryption):
✅ E2EE built-in – others leave encryption to user
✅ Category isolation via HD keys – share Work not Personal
✅ Steganography & ZKP extra privacy
✅ Gas optimized O(1) cheaper
✅ DAO governance community upgrades

vs Academic Papers (EHR, IoT models):
✅ Practical implementation not just theory – full React DApp deployed Sepolia
✅ Complete flow upload to governance – others focus only access control
✅ Uses OpenZeppelin upgradeable audited
✅ Integrates The Graph for speed many papers ignore indexing bottleneck
✅ Faucet easy testing no need buy tokens
✅ Versioning like Git others don't have

For Viva points:
Military-grade AES-256 used by US government
EIP-712 signing prevents replay cross chains
Nonce+ECDSA prevents key takeover
Pausable emergency good devops
Batch upload saves user time gas"

---

### **SLIDE 24: LIMITATIONS & FUTURE SCOPE**
**Show you think beyond:**

"CURRENT LIMITATIONS (Honest):
• MetaMask only – no WalletConnect
• 10MB limit – larger needs chunking streaming
• No folder support – flat list category only – need hierarchical folders
• Convergent encryption leaks existence – same file same CID attacker can guess via dictionary
• Stego image size heavy – 1MB text needs ~2MB PNG
• ZKP mocked not real circuit need Circom+SnarkJS full
• Subgraph depends on The Graph centralized studio ideally self-hosted indexer
• No mobile app only web need React Native
• No search by content – encrypted content can't search easily
• If wallet lost data lost no recovery

FUTURE SCOPE:
• Real zk-SNARKs via Circom on-chain verification for integrity without revealing key
• File chunking streaming support 1GB videos via AES-CTR + IPFS chunking
• Folder NFT – Each folder as ERC721 with access control
• Social recovery Shamir split master key among trusted friends
• Decentralized identity ENS+Lens better UX
• Cross-chain deploy Polygon Arbitrum cheaper gas
• IPFS pinning incentive pay Filecoin long-term storage
• Searchable encryption SSE search encrypted without decrypting all
• Mobile app desktop sync like Dropbox daemon
• Enterprise version audit logs compliance GDPR delete need careful design since blockchain immutable
• AI classification auto categorize files locally not server
• Integration with Sign Protocol attestations

This shows you think beyond project – guide loves future scope – put 2-3 you will actually do next."

---

### **SLIDE 25: CONCLUSION**
**Final summary simple:**

"In Simple English Summary:

We started with problem centralized cloud owns our data can leak censor delete.

We built Blockchain Drive Web3 file storage where:
- User encrypts file at home browser AES-256 – key derived from wallet signature – no password remember but 256-bit super strong
- Encrypted file goes IPFS distributed no single owner content addressed tamper proof
- Only hash+encrypted key+access rules stored Ethereum cheap permanent transparent
- Sharing safe AES key re-encrypted with receiver public key X25519 receiver decrypts own wallet
- Extra privacy via Steganography hide encrypted file inside noise image looks random picture
- Fast dashboard via The Graph indexing blockchain events not scanning whole chain
- Community owned via DAO DRIVE token holders vote upgrade contract via UUPS proxy without losing data
- Gas optimized changed O(n) loops to O(1) mappings saves 70-90%

What we proved:
You CAN build Google Drive without Google – fully decentralized more private censorship resistant user owns data.

Testing on Sepolia shows works end-to-end upload download share revoke versioning governance.

This is not just project it's vision Web3 – data ownership back to user not corporation."

---

### **SLIDE 26: REFERENCES**
**List references – say each used for what:**

"[1] Zheng IEEE 2017 overview blockchain tech – used to understand immutability why not store files on-chain
[2] IoTChain IEEE Wireless 2018 – inspired access control via contract
[3] Guo IEEE Access 2021 EHR Blockchain+IPFS medical – adopted IPFS big files blockchain audit
[4] Zhang IEEE IoT 2020 Proxy Re-Encryption – compared PRE vs our X25519 hybrid we chose cheaper simpler
[5] OpenZeppelin Proxy UUPS 2023 – used upgradeable contract
[6] Buterin EIP-712 typed signing 2017 – secure wallet signature prevents phishing replay
[7] Benet IPFS whitepaper 2014 – IPFS content addressed versioned P2P
[8] Filebase docs – S3 API IPFS pinning
[9] The Graph docs – build Subgraph indexing
[10] CryptoJS eth-sig-util – AES X25519 implementations

Plus our GitHub repo."

---

### **SLIDE 27: THANK YOU**
**What to say:**

"Thank You!

Any Questions?

We are ready to show LIVE DEMO – Sepolia Testnet, IPFS, MetaMask, DAO Voting.

Project: Blockchain Drive – Securing Data using Ethereum and IPFS
Team: [Your Name] + Team
Guide: [Guide Name]
College: [Your College] CSE

Contact: your.email@college.com
GitHub: github.com/SuhasRam356/Blockchain-Drive

Special Thanks to OpenZeppelin, Filebase, The Graph, Alchemy & Ethereum Community"

**Tips for final:**
- Smile, make eye contact with guide and external
- Say 'We welcome questions'
- Keep demo ready in second tab
- If they ask limitations, answer honestly from Slide 21
- If they ask future scope, say 2-3 points confidently

---

### **Bonus: Viva Questions Guide May Ask + Simple Answers**

**Q: Why not store file directly on blockchain?**
A: Too costly – Ethereum storage $10,000 per MB. We store only hash.

**Q: What if Filebase deletes file?**
A: IPFS pinned multiple nodes, but we should add Filecoin incentive for long-term pinning – mentioned in future scope.

**Q: What if user loses wallet?**
A: Currently data lost forever – no recovery – future add social recovery Shamir splitting.

**Q: Why AES-256?**
A: Military grade, used by US government, unbreakable – 2^256 combos.

**Q: Why convergent encryption?**
A: Same file gives same key – deduplication saves storage – but leaks existence trade-off.

**Q: Difference between V9 and V10?**
A: V9 fixed mapping collision bug per user isolation. V10 added O(1) fileOwnership mapping to save gas from loop.

**Q: How does The Graph make fast?**
A: Instead of scanning blockchain every time, Subgraph listens events Once and indexes in database – query 100ms.

**Q: What is steganography LSB?**
A: Change last bit of pixel – human eye can't see – hide binary data – image looks same.

**Q: Is ZKP real?**
A: Currently conceptual mock for demo – future replace with real SnarkJS circuit – we are honest in paper.

**Q: How to prevent replay attack?**
A: EIP-712 domain with chainId + contract address + nonce + ECDSA signature verification.

---

**End of Speaker Notes – All the best for your presentation! You will impress your guide.**

