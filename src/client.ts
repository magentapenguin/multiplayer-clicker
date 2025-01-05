import "./styles.css";
import toast from "./toast";
import cursorinit from "./cursors";

import PartySocket from "partysocket";
import { customAlphabet } from "nanoid";

declare const PARTYKIT_HOST: string;

const alphabet = '6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz';
const nanoid = customAlphabet(alphabet, 8);

const party = new PartySocket({
  host: PARTYKIT_HOST,
  room: "clicker",
  id: nanoid()
});
cursorinit(party, document.getElementById("mp-cursors") as HTMLElement);



function createTicker() {
  const ticker = document.createElement("div");
  const tickerContainer = document.createElement("div");
  tickerContainer.className = "ticker";
  tickerContainer.appendChild(ticker);
  ticker.className = "ticker-track";
  ticker.innerHTML = "0123456789".split("").map((n) => `<span>${n}</span>`).join("");
  tickerContainer.ariaHidden = "true";
  return tickerContainer;
}
function setTickerValue(ticker: HTMLElement, value: number) {
  const tt = ticker.querySelector('.ticker-track') as HTMLElement;
  if (tt) {
    tt.style.transform = `translateY(-${value * 10}%)`;
    tt.dataset.value = value.toString();
  }
}
function createTickers(n: number, target: HTMLElement, addCommas = false) {
  const tickers = Array.from({ length: n }, createTicker);
  tickers.forEach((ticker) => target.appendChild(ticker));
  tickers.reverse();
  if (addCommas) {
    for (let i = 2; i < tickers.length; i += 3) {
      const comma = document.createElement("div");
      comma.className = "comma";
      comma.innerHTML = ",";
      comma.ariaHidden = "true";
      target.insertBefore(comma, tickers[i]);
    }
  }
  return tickers;
}
function setTickersValue(tickers: HTMLElement[], value: number) {
  tickers.forEach((ticker, i) => {
    setTickerValue(ticker, Math.floor(value / 10 ** i) % 10);
  });
}

const clickCount = document.getElementById("click-count");
let clicks = 1;
let tickers: HTMLElement[] = [];

if (clickCount) {
  tickers = createTickers(10, clickCount, true);
  setTickersValue(tickers, clicks);
}

function click(event: MouseEvent) {
  clicks++;
  setTickersValue(tickers, clicks);
  if (clickCount) {
    clickCount.ariaLabel = clicks.toString();
  }
  let t = event.target as HTMLButtonElement;
  party.send(JSON.stringify({ type: "click", x: event.clientX - t.offsetLeft, y: event.clientY - t.offsetTop }));
  let clickRipple = document.createElement("div");
  clickRipple.className = "click-ripple";
  clickRipple.style.setProperty("--x", `${event.clientX - t.offsetLeft}px`);
  clickRipple.style.setProperty("--y", `${event.clientY - t.offsetTop}px`);
  t.appendChild(clickRipple);
  setTimeout(() => clickRipple.remove(), 600);
}

party.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
  if (data.type === "clicks") {
    clicks = data.clicks;
    setTickersValue(tickers, clicks);
  } else if (data.type === "users") {
    const users = document.getElementById("users");
    if (users) {
      users.textContent = data.users.toString() + " online";
    }
  } else if (data.type === "error" && data.errortype === "ratelimit") {
    toast("Error", data.message, { duration: parseInt(data.retryIn) * 1000, type: "danger", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon"><!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>` });
    if (clickButton) {
      clickButton.disabled = true;
      setTimeout(() => {
        clickButton.disabled = false;
      }, parseInt(data.retryIn) * 1000);
    }
  }
});
function updateConnection() {
  document.body.classList.toggle("loading", party.readyState === PartySocket.CONNECTING);
  document.body.classList.toggle("connected", party.readyState === PartySocket.OPEN);
  document.body.classList.toggle("disconnected", party.readyState === PartySocket.CLOSED || party.readyState === PartySocket.CLOSING);
}
party.addEventListener("close", updateConnection);
party.addEventListener("open", updateConnection);
party.addEventListener("error", updateConnection);
updateConnection();


const clickButton = document.getElementById("click-button") as HTMLButtonElement;
clickButton.addEventListener("click", click);

const resetButton = document.getElementById("reset-button") as HTMLButtonElement;
const model = document.getElementById("reset-dialog") as HTMLDialogElement;
resetButton.addEventListener("click", () => {
  model.showModal();
});
model.addEventListener("close", () => {
  if (model.returnValue === "reset") {
    party.send(JSON.stringify({ type: "reset-request" }));
  }
});
