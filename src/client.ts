import "./styles.css";
import toast from "./toast";

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
const app = document.getElementById("app");

function createTicker() {
  const ticker = document.createElement("div");
  const tickerContainer = document.createElement("div");
  tickerContainer.className = "ticker";
  tickerContainer.appendChild(ticker);
  ticker.className = "ticker-track";
  ticker.innerHTML = "0123456789".split("").map((n) => `<span>${n}</span>`).join("");
  return tickerContainer;
}
function setTickerValue(ticker: HTMLElement, value: number) {
  const tt = ticker.querySelector('.ticker-track') as HTMLElement;
  if (tt) {
    tt.style.transform = `translateY(-${value * 10}%)`;
    let prevValue = parseInt(tt.dataset.value || "0", 10);
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
  let t = event.target as HTMLElement;
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
  } else if (data.type === "click") {
    let t = document.getElementById("click-button");
    if (!t) {
      return;
    }
    let clickRipple = document.createElement("div");
    clickRipple.className = "click-ripple";
    clickRipple.style.setProperty("--x", `${data.x}px`);
    clickRipple.style.setProperty("--y", `${data.y}px`);
    t.appendChild(clickRipple);
    setTimeout(() => clickRipple.remove(), 600);
  } else if (data.type === "error" && data.errortype === "ratelimit") {
    toast("Error", data.message, { duration: parseInt(data.retryIn) * 1000, type: "danger" });
    if (clickButton) {
      clickButton.disabled = true;
      setTimeout(() => {
        clickButton.disabled = false;
      }, parseInt(data.retryIn) * 1000);
    }
  }
});

const clickButton = document.getElementById("click-button") as HTMLButtonElement | null;
if (clickButton) {
  clickButton.addEventListener("click", click);
}