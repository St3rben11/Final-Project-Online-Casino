export function renderBalance(ethBalance) {
  const el = document.getElementById("ethBalance");
  if (el) {
    el.innerText = "ETH: " + ethBalance;
  }
}
