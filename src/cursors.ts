import type PartySocket from "partysocket";

// https://stackoverflow.com/a/52171480
const cyrb53 = (str: string, seed: number = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

function usernameColor(username: string, seed: number = 0) {
    const hue = cyrb53(username, seed) % 360
    return `hsl(${hue}, 50%, 50%)`;
}

export default function init(party: PartySocket, cursors: HTMLElement) {
    party.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "cursor") {
            let cursor = document.getElementById("cursor-" + data.sender)
            if (!cursor) {
                cursor = document.createElement("div");
                cursor.id = "cursor-" + data.sender;
                cursor.className = "cursor";
                cursor.style.color = usernameColor(data.sender);
                cursor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="icon"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 55.2L0 426c0 12.2 9.9 22 22 22c6.3 0 12.4-2.7 16.6-7.5L121.2 346l58.1 116.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9L179.8 320l118.1 0c12.2 0 22.1-9.9 22.1-22.1c0-6.3-2.7-12.3-7.4-16.5L38.6 37.9C34.3 34.1 28.9 32 23.2 32C10.4 32 0 42.4 0 55.2z"/></svg>
                ${data.sender}`;
                cursors.appendChild(cursor);
            }
            cursor.style.left = data.x + "px";
            cursor.style.top = data.y + "px";
        } else if (data.type === "leave") {
            let cursor = document.getElementById("cursor-" + data.id);
            if (cursor) {
                cursor.remove();
            }
        }
    });
    document.addEventListener("mousemove", (event) => {
        party.send(JSON.stringify({ type: "cursor", x: event.clientX, y: event.clientY }));
        
    });
}