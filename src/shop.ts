import type { ShopItem } from './types';
export default class Shop {
    constructor(public element: HTMLElement, private buyHook: Function) {}
    setup(data: Record<string, ShopItem>) {
        this.element.innerHTML = "";
        for (const item of Object.values(data)) {
            const container = document.createElement("div");
            container.className = "shop-item";
            container.innerHTML = `
                <div class="shop-item-title">${item.name}</div>
                <div class="shop-item-description">${item.description}</div>
                <div class="shop-item-cost">Cost: ${item.price} ${item.priceType}</div>
                <button class="shop-item-buy">Buy</button>
            `;
            const buyButton = container.querySelector("button");
            buyButton?.addEventListener("click", () => this.buy(item));
            this.element.appendChild(container);
        }
    }
    static humanize(value: number) {
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    buy(item: ShopItem) {
        this.buyHook(item);
    }
}
