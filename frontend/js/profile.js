import {
  connectWallet,
  autoConnect,
  loadRoyalBalance,
  provider
} from "./wallet.js";

import {
  CASINO_POOL_ADDRESS,
  poolABI
} from "./config.js";

import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/* HELPERS */

function shortAddr(addr) {
  if (!addr) return "Not connected";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

/* UI */

function setAddress(addr) {
  const el = document.getElementById("walletAddress");
  if (el) el.innerText = shortAddr(addr);
}

function setConnectBtn(addr) {
  const btn = document.getElementById("connectBtn");
  if (!btn) return;

  btn.innerText = addr ? shortAddr(addr) : "Connect";
}

/* ETH BALANCE */

async function loadETH() {
  try {
    if (!provider) return;

    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    const bal = await provider.getBalance(address);
    const ethFormatted = Number(
      ethers.formatEther(bal)
    ).toFixed(4);

    const el = document.getElementById("ethBalance");
    if (el) el.innerText = ethFormatted + " ETH";

  } catch (e) {
    console.log("ETH load error:", e);
  }
}

/* ================= HISTORY (REAL) ================= */

async function loadHistory(address) {

  if (!provider || !address) return;

  const historyEl = document.getElementById("history");
  if (!historyEl) return;

  historyEl.innerText = "Loading...";

  try {

    const pool = new ethers.Contract(
      CASINO_POOL_ADDRESS,
      poolABI,
      provider
    );

    /* COIN FLIP EVENTS */
    const flipFilter = pool.filters.CoinFlipPlayed(address);
    const flips = await pool.queryFilter(flipFilter, -20000);

    /* ROULETTE EVENTS */
    const roulFilter = pool.filters.RoulettePlayed(address);
    const rouls = await pool.queryFilter(roulFilter, -20000);

    const events = [...flips, ...rouls]
      .sort((a, b) =>
        Number(b.blockNumber) - Number(a.blockNumber)
      );

    if (events.length === 0) {
      historyEl.innerText = "No games yet";
      return;
    }

    historyEl.innerHTML = "";

    for (let e of events) {

      const div = document.createElement("div");
      div.style.marginBottom = "8px";

      if (e.eventName === "CoinFlipPlayed") {
        const { amount, win } = e.args;

        div.innerText =
          `🪙 CoinFlip — ${win ? "WIN" : "LOSE"} ` +
          `${Number(ethers.formatUnits(amount, 18)).toFixed(2)} ROYAL`;
      }

      if (e.eventName === "RoulettePlayed") {
        const { number, result, win } = e.args;

        div.innerText =
          `🎡 Roulette — ${win ? "WIN" : "LOSE"} ` +
          `Bet:${number} Result:${result}`;
      }

      historyEl.appendChild(div);
    }

  } catch (err) {
    console.error(err);
    historyEl.innerText = "Error loading history";
  }
}

/* ================= CONNECT ================= */

async function handleConnect() {
  const addr = await connectWallet();
  if (!addr) return;

  setAddress(addr);
  setConnectBtn(addr);

  await loadRoyalBalance(addr);
  await loadETH();
  await loadHistory(addr);
}

/* ================= INIT ================= */

window.addEventListener("DOMContentLoaded", async () => {

  const btn = document.getElementById("connectBtn");
  if (btn) btn.onclick = handleConnect;

  /* AUTO CONNECT */
  const addr = await autoConnect();

  if (addr) {
    setAddress(addr);
    setConnectBtn(addr);

    await loadRoyalBalance(addr);
    await loadETH();
    await loadHistory(addr);
  }

  /* ACCOUNT CHANGE */
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {

      if (accounts.length === 0) {
        setAddress(null);
        setConnectBtn(null);
        return;
      }

      const newAddr = accounts[0];

      setAddress(newAddr);
      setConnectBtn(newAddr);

      await loadRoyalBalance(newAddr);
      await loadETH();
      await loadHistory(newAddr);
    });
  }
});