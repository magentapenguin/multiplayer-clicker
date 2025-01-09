import type { ShopItem } from './types';
export default class Shop {
    constructor(public element: HTMLElement, private buyHook: Function) {}
    setup(data: Record<string, ShopItem>) {
        for (const item of Object.values(data)) {
            const button = document.createElement('button');
            button.textContent = item.name;
            button.onclick = () => this.buy(item);
            this.element.appendChild(button);
        }
    }
    buy(item: ShopItem) {
        this.buyHook(item);
    }
}