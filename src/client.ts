import "./styles.css";
import toast from "./toast";
import cursorinit from "./cursors";
import Shop from "./shop";
import type { ShopItem } from "./types";

import PartySocket from "partysocket";
import { customAlphabet } from "nanoid";

declare const PARTYKIT_HOST: string;

const alphabet = '789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz';
const nanoid = customAlphabet(alphabet, 8);

addEventListener("hashchange", () => {
  window.location.reload();
});

const party = new PartySocket({
  host: PARTYKIT_HOST,
  room: location.hash.slice(1) || "clicker",
  id: nanoid()
});
cursorinit(party, document.getElementById("mp-cursors") as HTMLElement);

const shop = new Shop(document.getElementById("shop-items") as HTMLElement, (itemId: string) => {
  party.send(JSON.stringify({ type: "shop", item: itemId }));
});


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
let clicks = 0;
let tickers: HTMLElement[] = [];

if (clickCount) {
  tickers = createTickers(10, clickCount, true);
  setTickersValue(tickers, clicks);
}

function click(event: MouseEvent) {
  let t = event.target as HTMLButtonElement;
  party.send(JSON.stringify({ type: "click" }));
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
    if (clickCount) {
      clickCount.ariaLabel = clicks.toString();
    }
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
  } else if (data.type === "chat") {
    toast(data.sender, data.message, { duration: -1, type: "none", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" class="icon"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M208 352c114.9 0 208-78.8 208-176S322.9 0 208 0S0 78.8 0 176c0 38.6 14.7 74.3 39.6 103.4c-3.5 9.4-8.7 17.7-14.2 24.7c-4.8 6.2-9.7 11-13.3 14.3c-1.8 1.6-3.3 2.9-4.3 3.7c-.5 .4-.9 .7-1.1 .8l-.2 .2s0 0 0 0s0 0 0 0C1 327.2-1.4 334.4 .8 340.9S9.1 352 16 352c21.8 0 43.8-5.6 62.1-12.5c9.2-3.5 17.8-7.4 25.2-11.4C134.1 343.3 169.8 352 208 352zM448 176c0 112.3-99.1 196.9-216.5 207C255.8 457.4 336.4 512 432 512c38.2 0 73.9-8.7 104.7-23.9c7.5 4 16 7.9 25.2 11.4c18.3 6.9 40.3 12.5 62.1 12.5c6.9 0 13.1-4.5 15.2-11.1c2.1-6.6-.2-13.8-5.8-17.9c0 0 0 0 0 0s0 0 0 0l-.2-.2c-.2-.2-.6-.4-1.1-.8c-1-.8-2.5-2-4.3-3.7c-3.6-3.3-8.5-8.1-13.3-14.3c-5.5-7-10.7-15.4-14.2-24.7c24.9-29 39.6-64.7 39.6-103.4c0-92.8-84.9-168.9-192.6-175.5c.4 5.1 .6 10.3 .6 15.5z"/></svg>` });
  } else if (data.type === "shopData") {
    shop.receiveData(data.unlockedItems, data.purchasedItems);
    shop.setup(data.items);
  }
});
function updateConnection() {
  document.body.classList.toggle("loading", party.readyState === PartySocket.CONNECTING);
  document.body.classList.toggle("connected", party.readyState === PartySocket.OPEN);
}
party.addEventListener("close", updateConnection);
party.addEventListener("open", updateConnection);
party.addEventListener("error", updateConnection);
updateConnection();

party.addEventListener("open", () => {
  party.send(JSON.stringify({ type: "ready" }));
  toast('Connected', 'Connected to room "'+party.room+'"')
});
party.addEventListener("close", () => {
  toast('Disconnected!', 'Disconnected from room "'+party.room+'" (retries: '+party.retryCount.toString()+')', { type: "danger", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon"><!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.--><path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>` });
});

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
const shopButton = document.getElementById("shop-button") as HTMLButtonElement;
const shopelm = document.getElementById("shop") as HTMLElement;
const shopbg = document.getElementById("shop-bg") as HTMLElement;
shopButton.addEventListener("click", () => {
  shopelm.hidden = false;
  shopbg.hidden = false;
});

const shopClose = document.getElementById("shop-close") as HTMLButtonElement;
shopClose.addEventListener("click", () => {
  shopelm.hidden = true;
  shopbg.hidden = true;
});
shopbg.addEventListener("click", () => {
  shopelm.hidden = true;
  shopbg.hidden = true;
});

const chat = document.getElementById("chat") as HTMLFormElement;
const chatInput = chat.querySelector("input") as HTMLInputElement;
document.addEventListener("keydown", (event) => {
  if (event.key === "/") {
    event.preventDefault();
    chat.hidden = false;
    chatInput.focus();
  }
});
chat.addEventListener("submit", (event) => {
  event.preventDefault();
  party.send(JSON.stringify({ type: "chat", message: chatInput.value }));
  toast(party.id+" (you)", chatInput.value, { duration: -1, type: "none", icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" class="icon"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M208 352c114.9 0 208-78.8 208-176S322.9 0 208 0S0 78.8 0 176c0 38.6 14.7 74.3 39.6 103.4c-3.5 9.4-8.7 17.7-14.2 24.7c-4.8 6.2-9.7 11-13.3 14.3c-1.8 1.6-3.3 2.9-4.3 3.7c-.5 .4-.9 .7-1.1 .8l-.2 .2s0 0 0 0s0 0 0 0C1 327.2-1.4 334.4 .8 340.9S9.1 352 16 352c21.8 0 43.8-5.6 62.1-12.5c9.2-3.5 17.8-7.4 25.2-11.4C134.1 343.3 169.8 352 208 352zM448 176c0 112.3-99.1 196.9-216.5 207C255.8 457.4 336.4 512 432 512c38.2 0 73.9-8.7 104.7-23.9c7.5 4 16 7.9 25.2 11.4c18.3 6.9 40.3 12.5 62.1 12.5c6.9 0 13.1-4.5 15.2-11.1c2.1-6.6-.2-13.8-5.8-17.9c0 0 0 0 0 0s0 0 0 0l-.2-.2c-.2-.2-.6-.4-1.1-.8c-1-.8-2.5-2-4.3-3.7c-3.6-3.3-8.5-8.1-13.3-14.3c-5.5-7-10.7-15.4-14.2-24.7c24.9-29 39.6-64.7 39.6-103.4c0-92.8-84.9-168.9-192.6-175.5c.4 5.1 .6 10.3 .6 15.5z"/></svg>` });
  chatInput.value = "";
  chat.hidden = true;
  chat.blur();
});
const chatClose = document.getElementById("chat-close") as HTMLButtonElement;
chatClose.addEventListener("click", () => {
  chat.hidden = true;
  chat.blur();
});
