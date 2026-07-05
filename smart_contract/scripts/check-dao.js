const { ethers } = require("hardhat");

async function main() {
  const code = await ethers.provider.getCode("0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6");
  console.log("Code length:", code.length);
}

main().catch(console.error);
