import { ROYAL_TOKEN_ADDRESS, tokenABI, NETWORK_ID } from "./config.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

export let provider = null;
export let signer = null;

/*  CONNECT WALLET  */

export async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("MetaMask not installed");
      return null;
    }

    provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();

    const address = accounts[0];

    localStorage.setItem("wallet", address);

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== NETWORK_ID) {
      alert("Switch to Sepolia Network");
    }

    return address;

  } catch (err) {
    console.error("Connect error:", err);
    return null;
  }
}

/* ================= ROYAL BALANCE ================= */

export async function loadRoyalBalance(userAddress) {
  try {
    if (!provider || !userAddress) return;

    const tokenContract = new ethers.Contract(
      ROYAL_TOKEN_ADDRESS,
      tokenABI,
      provider // ВАЖНО: provider, не signer
    );

    const balance = await tokenContract.balanceOf(userAddress);
    const formatted = ethers.formatUnits(balance, 18);

    const el = document.getElementById("royalBalance");
    if (el) {
      el.innerText = `ROYAL: ${Number(formatted).toFixed(2)}`;
    }

  } catch (err) {
    console.error("ROYAL balance error:", err);
  }
}

/* ================= AUTO CONNECT ================= */

export async function autoConnect() {
  try {
    if (!window.ethereum) return null;

    const accounts = await window.ethereum.request({
      method: "eth_accounts"
    });

    if (accounts.length === 0) return null;

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    const address = accounts[0];

    localStorage.setItem("wallet", address);

    return address;

  } catch (err) {
    console.error("Auto connect error:", err);
    return null;
  }
}

/* ================= DISCONNECT ================= */

export function disconnectWallet() {
  localStorage.removeItem("wallet");
  provider = null;
  signer = null;

  const el = document.getElementById("royalBalance");
  if (el) el.innerText = "ROYAL: 0";
}

/* ================= EVENTS ================= */

if (window.ethereum) {

  window.ethereum.on("accountsChanged", () => {
    localStorage.removeItem("wallet");
    location.reload();
  });

  window.ethereum.on("chainChanged", () => {
    location.reload();
  });

}
