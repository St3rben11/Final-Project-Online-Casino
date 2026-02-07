const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const tokenAddress = "0xaED0575441cC6c06CE031003Ba84BD179CAe0665";
  console.log("Using existing RoyalToken:", tokenAddress);


  const CasinoPool = await hre.ethers.getContractFactory("CasinoPool");
  const pool = await CasinoPool.deploy(tokenAddress);
  await pool.waitForDeployment();

  const poolAddress = await pool.getAddress();
  console.log("CasinoPool deployed to:", poolAddress);


  const token = await hre.ethers.getContractAt("RoyalToken", tokenAddress);


  console.log("Sending tokens to pool...");


  const amount = hre.ethers.parseUnits("100000", 18);

  const tx = await token.transfer(poolAddress, amount);
  await tx.wait();

  console.log("Pool funded with tokens!");
  console.log("DONE ✅");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});