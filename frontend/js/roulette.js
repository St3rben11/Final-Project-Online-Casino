
import { autoConnect, connectWallet } from "./wallet.js";
import * as wallet from "./wallet.js";
import {
  ROYAL_TOKEN_ADDRESS,
  CASINO_POOL_ADDRESS,
  tokenABI,
  poolABI
} from "./config.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";


const WHEEL_NUMBERS = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,
  8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,
  28,12,35,3,26
];

const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

let spinning = false;
let betType = "number";


function getBetTypeId(){
  if (betType === "number") return 0;
  if (betType === "red") return 1;
  if (betType === "black") return 2;
  if (betType === "even") return 3;
  if (betType === "odd") return 4;
  return 0;
}

function shortAddr(addr){
  if (!addr) return "Connect";
  return addr.slice(0,6) + "..." + addr.slice(-4);
}

function rand(arr){
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/* =======================
   BALANCE NAV
======================= */
async function updateRoyalBalance(){
  try{
    if (!wallet.provider) return;

    const signer = await wallet.provider.getSigner();
    const addr = await signer.getAddress();

    const token = new ethers.Contract(
      ROYAL_TOKEN_ADDRESS,
      tokenABI,
      signer
    );

    const bal = await token.balanceOf(addr);

    const formatted = Number(
      ethers.formatUnits(bal,18)
    ).toFixed(2);

    const nav = document.getElementById("royalBalanceNav");
    if (nav) nav.innerText = "ROYAL: " + formatted;

  }catch(e){
    console.log("Balance error", e);
  }
}

/* =======================
   HISTORY
======================= */
function addHistory(text){
  const box = document.getElementById("rouletteHistory");
  if (!box) return;

  if (box.innerText === "No games yet")
    box.innerHTML = "";

  const div = document.createElement("div");
  div.innerText = text;
  box.prepend(div);
}

/* =======================
   TYPE SELECT
======================= */
window.selectType = function(type){
  betType = type;

  document
    .querySelectorAll(".bet-types button")
    .forEach(btn => btn.classList.remove("active"));

  const activeBtn = document.getElementById(`bet-${type}`);
  if (activeBtn) activeBtn.classList.add("active");

  const valueInput = document.getElementById("value");
  if (valueInput){
    valueInput.disabled = type !== "number";
    if (type !== "number") valueInput.value = "";
  }
};

/* =======================
   DOM READY
======================= */
window.addEventListener("DOMContentLoaded", async () => {

  if (!window.ethereum){
    alert("Install MetaMask");
    return;
  }

  const connectBtn = document.getElementById("connectBtn");

  const address = await autoConnect();
  if (address && connectBtn){
    connectBtn.innerText = shortAddr(address);
    await updateRoyalBalance();
  }

  if (connectBtn){
    connectBtn.onclick = async () => {
      const addr = await connectWallet();
      if (addr){
        connectBtn.innerText = shortAddr(addr);
        await updateRoyalBalance();
      }
    };
  }

  window.ethereum.on("accountsChanged", async (accounts)=>{
    if (accounts.length){
      connectBtn.innerText = shortAddr(accounts[0]);
      await updateRoyalBalance();
    }
  });

  const wheelEl   = document.getElementById("wheel");
  const numbersEl = document.getElementById("numbers");
  const resultEl  = document.getElementById("result");

  if (!wheelEl || !numbersEl || !resultEl) return;

  /* ===== NUMBERS ===== */
  function generateNumbers(){
    numbersEl.innerHTML = "";
    const radius = 150;
    const slice = 360 / WHEEL_NUMBERS.length;

    WHEEL_NUMBERS.forEach((num,i)=>{
      const angle = slice*i + slice/2 - 90;

      const el = document.createElement("div");
      el.className = "number";
      el.innerText = num;

      el.style.left="50%";
      el.style.top="50%";

      el.style.transform =
        `rotate(${angle}deg)
         translate(${radius}px)
         rotate(${-angle}deg)
         translate(-50%,-50%)`;

      numbersEl.appendChild(el);
    });
  }

  /* ===== ANIMATION ===== */
  function spinWheelToNumber(number){
    const index = WHEEL_NUMBERS.indexOf(number);
    if (index === -1) return;

    const slice = 360 / WHEEL_NUMBERS.length;
    const spins = 6*360;
    const finalAngle = spins + (360 - index*slice - slice/2);

    wheelEl.style.transition =
      "transform 5s cubic-bezier(.17,.67,.83,.67)";
    wheelEl.style.transform =
      `rotate(${finalAngle}deg)`;
  }

  /* ===== BET NUMBER ===== */
  function getNumberForBet(val){
    const num = Number(val);

    if (betType==="number"){
      if (!isNaN(num)&&num>=0&&num<=36) return num;
      return null;
    }

    if (betType==="red") return rand(RED);
    if (betType==="black") return rand(BLACK);
    if (betType==="even") return rand(WHEEL_NUMBERS.filter(n=>n!==0&&n%2===0));
    if (betType==="odd") return rand(WHEEL_NUMBERS.filter(n=>n!==0&&n%2!==0));

    return null;
  }

  /* ===== BLOCKCHAIN ===== */
  async function placeRouletteBet(amountRoyal, chosenNumber){
    try{
      if (!wallet.provider){
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

      const amount = ethers.parseUnits(amountRoyal,18);
      const addr = await signer.getAddress();

      const balance = await token.balanceOf(addr);
      if (balance < amount){
        alert("Not enough ROYAL");
        return null;
      }

      const allowance = await token.allowance(addr,CASINO_POOL_ADDRESS);
      if (allowance < amount){
        const tx = await token.approve(CASINO_POOL_ADDRESS,amount);
        await tx.wait();
      }

      const betTypeId = getBetTypeId();

      const tx = await pool.placeRoulette(
        amount,
        betTypeId,
        chosenNumber
      );

      const receipt = await tx.wait();

      for (const log of receipt.logs){
        try{
          const parsed = pool.interface.parseLog(log);
          if (parsed.name==="RoulettePlayed"){
            return {
              result:Number(parsed.args.result),
              win:parsed.args.win
            };
          }
        }catch{}
      }

      return null;

    }catch(e){
      console.log(e);
      alert("Transaction failed");
      return null;
    }
  }

  /* ===== SPIN ===== */
  window.spin = async function(){

    if (spinning) return;

    const betInput = document.getElementById("betAmount");
    const valueInput = document.getElementById("value");

    const bet = Number(betInput?.value);
    if (!bet || bet<=0) return alert("Invalid bet");

    const chosenNumber = getNumberForBet(valueInput?.value);
    if (chosenNumber===null) return alert("0–36");

    spinning=true;
    resultEl.innerText="Waiting blockchain...";

    const outcome = await placeRouletteBet(
      bet.toString(),
      chosenNumber
    );

    if (!outcome){
      spinning=false;
      resultEl.innerText="";
      return;
    }

    spinWheelToNumber(outcome.result);

    setTimeout(async ()=>{

      if (outcome.win){
        resultEl.innerText=`WIN ✔ Number ${outcome.result}`;
        addHistory(`WIN — ${outcome.result}`);
      } else {
        resultEl.innerText=`LOSE ✖ Number ${outcome.result}`;
        addHistory(`LOSE — ${outcome.result}`);
      }

      if (betInput) betInput.value="";
      if (valueInput){
        valueInput.value="";
        valueInput.disabled=false;
      }

      betType="number";

      document
        .querySelectorAll(".bet-types button")
        .forEach(btn=>btn.classList.remove("active"));

      await updateRoyalBalance();

      spinning=false;

    },5000);
  };

  generateNumbers();
});  