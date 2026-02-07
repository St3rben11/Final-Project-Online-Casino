import { loadRoyalBalance, connectWallet, provider, autoConnect } from "./wallet.js";
import { renderBalance } from "./ui.js";
import { formatETH } from "./utils.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

import {
  CASINO_POOL_ADDRESS,
  poolABI
} from "./config.js";

/* HELPERS  */

function shortAddr(addr) {
  if (!addr) return "Connect";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function setWalletUI(addr) {
  const btn = document.getElementById("connectBtn");
  if (btn) btn.innerText = shortAddr(addr);
}

/* ETH BALANCE  */

async function loadBalance() {
  try {
    if (!provider) return;

    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const bal = await provider.getBalance(address);

    renderBalance(formatETH(bal));

  } catch (e) {
    console.log("ETH balance error", e);
  }
}

/* ================= BUY ROYAL ================= */

async function buyRoyal() {
  try {
    if (!provider) {
      alert("Connect wallet first");
      return;
    }

    const ethInput = document.getElementById("buyAmount");
    if (!ethInput) return;

    const ethAmount = ethInput.value;

    if (!ethAmount || Number(ethAmount) <= 0) {
      alert("Enter ETH amount");
      return;
    }

    const signer = await provider.getSigner();

    // === КОНТРАКТ ПУЛА ===
    const poolContract = new ethers.Contract(
      CASINO_POOL_ADDRESS,
      poolABI,
      signer
    );

    // === ПОКУПКА ROYAL ===
    const tx = await poolContract.buyRoyal({
      value: ethers.parseEther(ethAmount)
    });

    await tx.wait();
    alert("ROYAL purchased!");

    const address = await signer.getAddress();

    await loadRoyalBalance(address);
    await loadBalance();

    ethInput.value = "";

  } catch (err) {
    console.error(err);
    alert("Transaction failed");
  }
}

/* ================= CARD TILT ================= */

function initCardTilt() {
  const cards = document.querySelectorAll(".card");

  cards.forEach(card => {
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rotateX = (y / rect.height - 0.5) * 12;
      const rotateY = (x / rect.width - 0.5) * -12;

      card.style.transform =
        `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform =
        "perspective(600px) rotateX(0) rotateY(0) scale(1)";
    });
  });
}

/* ================= CONNECT ================= */

async function handleConnect() {
  const address = await connectWallet();
  if (!address) return;

  setWalletUI(address);

  await loadRoyalBalance(address);
  await loadBalance();
}

/* ================= INIT ================= */

window.addEventListener("DOMContentLoaded", async () => {

  initCardTilt();

  const connectBtn = document.getElementById("connectBtn");
  const buyBtn = document.getElementById("buyBtn");

  if (connectBtn) connectBtn.onclick = handleConnect;
  if (buyBtn) buyBtn.onclick = buyRoyal;

  /* AUTO CONNECT */
  const address = await autoConnect();

  if (address) {
    setWalletUI(address);
    await loadRoyalBalance(address);
    await loadBalance();
  }

  /* ACCOUNT CHANGE */
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
      if (accounts.length === 0) {
        setWalletUI(null);
        return;
      }

      const addr = accounts[0];
      setWalletUI(addr);

      await loadRoyalBalance(addr);
      await loadBalance();
    });
  }
});