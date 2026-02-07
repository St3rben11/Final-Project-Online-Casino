
import {
  ROYAL_TOKEN_ADDRESS,
  CASINO_POOL_ADDRESS,
  tokenABI,
  poolABI
} from "./config.js";

import * as wallet from "./wallet.js";
import { autoConnect } from "./wallet.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

/* 
   STATE
 */
let selectedSide = null;
let spinning = false;

/* 
   AUTO CONNECT
*/
window.addEventListener("DOMContentLoaded", async () => {

  if (!window.ethereum) {
    alert("Install MetaMask");
    return;
  }

  const address = await autoConnect();

  if (address) {
    await updateRoyalBalance();
    await loadCoinflipHistory();
  }
});

/* =======================
   ACCOUNT CHANGE
======================= */
if (window.ethereum) {
  window.ethereum.on("accountsChanged", async () => {
    await updateRoyalBalance();
    await loadCoinflipHistory();
  });
}

/* =======================
   BALANCE
======================= */
async function updateRoyalBalance(){
  try{
    if (!wallet.provider) return;

    const signer = await wallet.provider.getSigner();
    const userAddress = await signer.getAddress();

    const token = new ethers.Contract(
      ROYAL_TOKEN_ADDRESS,
      tokenABI,
      signer
    );

    const balance = await token.balanceOf(userAddress);
    const formatted = ethers.formatUnits(balance, 18);

    const balEl = document.getElementById("royalBalance");
    if (balEl) balEl.innerText = Number(formatted).toFixed(2);

  }catch(e){
    console.log("Balance update error", e);
  }
}

/* =======================
   REAL HISTORY
======================= */
async function loadCoinflipHistory(){
  try {
    if (!wallet.provider) return;

    const signer = await wallet.provider.getSigner();
    const address = await signer.getAddress();

    const pool = new ethers.Contract(
      CASINO_POOL_ADDRESS,
      poolABI,
      wallet.provider
    );

    const filter = pool.filters.CoinFlipPlayed(address);
    const events = await pool.queryFilter(filter, -20000);

    const list = document.getElementById("historyList");
    if (!list) return;

    list.innerHTML = "";

    events.reverse().forEach(ev => {
      const { amount, win } = ev.args;

      const amt = Number(
        ethers.formatUnits(amount, 18)
      ).toFixed(2);

      const li = document.createElement("li");

      li.innerText = win
        ? `WIN +${amt} ROYAL`
        : `LOSE -${amt} ROYAL`;

      list.appendChild(li);
    });

  } catch (e) {
    console.log("History error", e);
  }
}

/* =======================
   BLOCKCHAIN BET
======================= */
async function placeRoyalBet(amountRoyal, sideBool){
  try {

    if (!wallet.provider) {
      alert("Connect wallet first");
      return null;
    }

    const signer = await wallet.provider.getSigner();

    const token = new ethers.Contract(
      ROYAL_TOKEN_ADDRESS,
      tokenABI,
      signer
    );

    const pool = new ethers.Contract(
      CASINO_POOL_ADDRESS,
      poolABI,
      signer
    );

    const amount = ethers.parseUnits(amountRoyal, 18);

    const userAddress = await signer.getAddress();
    const balance = await token.balanceOf(userAddress);

    if (amount > balance) {
      alert("Not enough ROYAL");
      return null;
    }

    const allowance = await token.allowance(
      userAddress,
      CASINO_POOL_ADDRESS
    );

    if (allowance < amount) {
      const approveTx = await token.approve(
        CASINO_POOL_ADDRESS,
        amount
      );
      await approveTx.wait();
    }

    const tx = await pool.placeBet(amount, sideBool);
    const receipt = await tx.wait();

    /* ===== READ EVENT ===== */
    for (const log of receipt.logs) {
      try {
        const parsed = pool.interface.parseLog(log);

        if (parsed.name === "CoinFlipPlayed") {
          return {
            win: parsed.args.win,
            result: parsed.args.result
          };
        }
      } catch {}
    }

    return null;

  } catch (err) {
    console.error(err);
    alert("Transaction failed");
    return null;
  }
}

/* =======================
   UI HELPERS
======================= */
function addBet(x){
  const input = document.getElementById("betAmount");
  if (!input) return;

  let current = Number(input.value);
  if (isNaN(current)) current = 0;

  current += x;

  if (current < 0) current = 0;
  if (current > 100000) current = 100000;

  input.value = current;
}

function selectSide(side){
  selectedSide = side;
  clearActiveButtons();

  const btn = document.getElementById(
    side === "heads" ? "btnHeads" : "btnTails"
  );

  if (btn) btn.classList.add("active");
}

function clearActiveButtons(){
  const h = document.getElementById("btnHeads");
  const t = document.getElementById("btnTails");

  if (h) h.classList.remove("active");
  if (t) t.classList.remove("active");
}

/* =======================
   FLIP
======================= */
async function flipCoin(){

  if (spinning) return;
  if (!wallet.provider) return alert("Connect wallet");
  if (!selectedSide) return alert("Choose side");

  const betInput = document.getElementById("betAmount");
  if (!betInput) return;

  const bet = Number(betInput.value);
  if (!bet || bet <= 0) return alert("Invalid bet");

  const coin = document.getElementById("coin");
  const resultText = document.getElementById("resultText");

  spinning = true;
  resultText.innerText = "Waiting blockchain...";

  const sideBool = selectedSide === "heads";
  const result = await placeRoyalBet(bet.toString(), sideBool);

  if (!result){
    spinning = false;
    resultText.innerText = "";
    return;
  }

  /* ===== VISUAL FROM CONTRACT ===== */
  const deg = 6 * 360 + (result.result ? 0 : 180);
  if (coin) coin.style.transform = `rotateY(${deg}deg)`;

  setTimeout(async ()=>{

    resultText.innerText =
      result.win ? "YOU WIN 🎉" : "YOU LOSE ❌";

    betInput.value = "";
    clearActiveButtons();
    selectedSide = null;

    await updateRoyalBalance();
    await loadCoinflipHistory();

    spinning = false;

  }, 2000);
}

/* =======================
   GLOBAL
======================= */
window.flipCoin = flipCoin;
window.addBet = addBet;
window.selectSide = selectSide;