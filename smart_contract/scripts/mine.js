const { network } = require("hardhat");

async function main() {
  await network.provider.send("evm_mine");
  console.log("1 block mined successfully!");
}

main().catch(console.error);
