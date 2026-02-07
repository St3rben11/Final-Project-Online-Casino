import {
  ROYAL_TOKEN_ADDRESS,
  CASINO_POOL_ADDRESS,
  tokenABI,
  poolABI
} from "./config.js";

let provider;
let signer;
let poolContract;
let tokenContract;

async function initContracts() {
  if (!window.ethereum) {
    alert("Install MetaMask");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();

  poolContract = new ethers.Contract(
    CASINO_POOL_ADDRESS,
    poolABI,
    signer
  );

  tokenContract = new ethers.Contract(
    ROYAL_TOKEN_ADDRESS,
    tokenABI,
    signer
  );

  console.log("Contracts initialized");
}

window.initContracts = initContracts;

export function getContract() {
  return poolContract;
}