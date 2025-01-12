import type { ShopItem } from './types';
export default class Shop {
    purchasedItems: Record<string, number> = {};
    items: ShopItem[] = [];
    constructor(public element: HTMLElement, private buyHook: (itemId: string)=>void) {}
    setup(data: ShopItem[]) {
        this.element.innerHTML = '';
        this.items = data;
        for (const item of data) {
            const container = document.createElement("div");
            container.className = "shop-item";
            container.innerHTML = `
                <div class="shop-item-title">${item.name}</div>
                <div class="shop-item-description">${item.description}</div>
                <div class="shop-item-cost">Cost: ${this.getScaledPrice(item)} ${item.priceType} (${Math.pow(item.priceScale, this.purchasedItems[item.id] ?? 0)*100-100}% more)</div>
                <div class="spacer"></div>
                <div class="shop-item-purchases">Owned: ${this.purchasedItems[item.id] ?? 0}</div>
                <button class="shop-item-buy">Buy</button>
            `;
            container.id = item.id;
            const buyButton = container.querySelector("button");
            buyButton?.addEventListener("click", () => this.buy(item.id));
            this.element.appendChild(container);
        }
    }
    receiveData(unlocks: Record<string, boolean>, purchasedItems: Record<string, number>) {
        this.purchasedItems = purchasedItems;
        if (this.element.children.length === 0) return;
        for (const item of this.element.children) {
            const id = item.id;
            const buyButton = item.querySelector("button");
            if (!buyButton) continue;
            const unlocked = unlocks[id];
            item.classList.toggle("unlocked", unlocked);
            const shopItem = this.items.find((i) => i.id === id) as ShopItem;
            if (unlocked) {
                buyButton.removeAttribute("disabled");
            } else {
                buyButton.setAttribute("disabled", "disabled");
            }
            const purchases = item.querySelector(".shop-item-purchases");
            if (purchases) {
                purchases.textContent = `Owned: ${this.purchasedItems[id] ?? 0}`;
            }
            const cost = item.querySelector(".shop-item-cost");
            if (cost) {
                cost.textContent = `Cost: ${this.getScaledPrice(shopItem)} ${shopItem.priceType} (${Math.pow(shopItem.priceScale, this.purchasedItems[shopItem.id] ?? 0)*100-100}% more)`;
            }
        }
    }

    static humanize(value: number) {
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    buy(item: string) {
        this.buyHook(item);
    }
    getScaledPrice(item: ShopItem) {
        return item.price * Math.pow(item.priceScale, this.purchasedItems[item.id] ?? 0);
    }
}
