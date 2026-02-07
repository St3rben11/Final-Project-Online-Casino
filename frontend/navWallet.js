import { autoConnect, connectWallet } from "./wallet.js";
import * as wallet from "./wallet.js";
import { ROYAL_TOKEN_ADDRESS, tokenABI } from "./config.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/+esm";

function shortAddr(addr){
  if (!addr) return "Connect";
  return addr.slice(0,6) + "..." + addr.slice(-4);
}

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
    const formatted =
      Number(ethers.formatUnits(bal,18)).toFixed(2);

    const nav = document.getElementById("royalBalanceNav");
    if (nav) nav.innerText = "ROYAL: " + formatted;

  }catch(e){
    console.log("Balance error", e);
  }
}

window.addEventListener("DOMContentLoaded", async ()=>{

  if (!window.ethereum) return;

  const btn = document.getElementById("connectBtn");

  const addr = await autoConnect();

  if (addr && btn){
    btn.innerText = shortAddr(addr);
    await updateRoyalBalance();
  }

  if (btn){
    btn.onclick = async ()=>{
      const newAddr = await connectWallet();
      if (newAddr){
        btn.innerText = shortAddr(newAddr);
        await updateRoyalBalance();
      }
    };
  }

  window.ethereum.on("accountsChanged", async (accounts)=>{
    if (accounts.length && btn){
      btn.innerText = shortAddr(accounts[0]);
      await updateRoyalBalance();
    }
  });
});