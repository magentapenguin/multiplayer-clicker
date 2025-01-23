import type * as Party from "partykit/server";
import obscenity from "obscenity";
import { Message } from "./types";
import type { ShopItem } from "./types";


const rateLimit = 50;

const profanityFilter = new obscenity.RegExpMatcher({
  ...obscenity.englishDataset.build(),
  ...obscenity.englishRecommendedTransformers,
});
const profanityCensor = new obscenity.TextCensor();
export default class Server implements Party.Server {
  users: number;
  clicks: number;
  points: number;
  unlockedItems: Record<string, boolean>;
  purchasedItems: Record<string, number>;
  stats: {
    rateLimit: number;
    clickPerSecond: number;
    clickPower: number
  };

  constructor(readonly room: Party.Room) {
    this.users = 0;
    this.clicks = -1;
    this.points = 0;
    this.stats = {
      rateLimit: 0,
      clickPerSecond: 0,
      clickPower: 1,
    };
    this.unlockedItems = {
      "1-point": true,
    };
    this.purchasedItems = {};
  }

  shopItems = [
    {
      name: "1 Point",
      price: 5,
      priceScale: 1.1,
      priceType: "clicks",
      description: "Convert 5 clicks into 1 point",
      action: "addPoints",
      id: "1-point",
      value: 1
    },
    {
      name: "Autoclicker",
      price: 20,
      priceScale: 1.4,
      priceType: "points",
      description: "Automatically click once per second",
      action: "buyItem",
      value: "auto-clicker",
      id: "auto-clicker",
    },
    {
      name: "Click Power",
      price: 50,
      priceScale: 1.2,
      priceType: "points",
      description: "Increase your click power by 1",
      action: "upStats",
      value: "clickPower",
      id: "click-power",
    },
    // TODO: Add more shop items
   ] as ShopItem[];
  
  getScaledPrice(item: ShopItem) {
    return item.price * Math.pow(item.priceScale, this.purchasedItems[item.id] ?? 0);
  }

  onConnect(
    connection: Party.Connection<{ lastMsg: number }>,
    ctx: Party.ConnectionContext
  ) {
    this.users++;
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
    connection.setState({ lastMsg: performance.now() });
  }
  onClose(connection: Party.Connection) {
    this.users--;
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
    this.room.broadcast(JSON.stringify({ type: "leave", id: connection.id }));
  }

  onError(connection: Party.Connection, error: Error): void | Promise<void> {
    this.users--;
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
    this.room.broadcast(JSON.stringify({ type: "leave", id: connection.id }));
    console.error(error);
  }
  applyStats() {
    this.stats.clickPerSecond = 0;
    this.stats.clickPower = 1;
    if (this.purchasedItems["auto-clicker"]) {
      this.stats.clickPerSecond += 1;
    }
    if (this.purchasedItems["click-power"]) {
      this.stats.clickPower += this.purchasedItems["click-power"];
    }
    this.room.broadcast(JSON.stringify({ type: "stats", stats: this.stats }));
  }
  rateLimit(connection: Party.Connection<{ lastMsg: number }>) {
    const now = performance.now();
    if (connection.state?.lastMsg && connection.state?.lastMsg > now - (rateLimit-this.stats.rateLimit)) { 
      connection.send(
        JSON.stringify({
          type: "error",
          errortype: "ratelimit",
          message: "Rate limited",
          retryIn: Math.ceil(
            (connection.state.lastMsg + (rateLimit-this.stats.rateLimit) - now) / 1000
          ).toString(),
        })
      );
      connection.setState({ lastMsg: now });
      return false;
    }
    connection.setState({ lastMsg: now });
    return true;
  }

  async onMessage(
    message: string,
    sender: Party.Connection<{ lastMsg: number }>
  ) {
    const result = Message.safeParse(JSON.parse(message));
    if (!result.success) {
      console.error(result.error);
      sender.send(
        JSON.stringify({
          type: "error",
          errortype: "invalidMessage",
          message: result.error.errors,
        })
      );
      return;
    }
    const data = result.data;
    if (data.type === "click") {
      if (!this.rateLimit(sender)) return;
      this.clicks++;
      this.room.broadcast(
        JSON.stringify({ type: "clicks", clicks: this.clicks })
      );
      await this.syncStorage(true);
    } else if (data.type === "shop") {
      if (this.rateLimit(sender)) return;
      const item = this.shopItems.find((item) => item.id === data.item);
      if (!item) {
        return;
      }
      const action = (item: ShopItem) => {
        if (item.action === "addPoints") {
          if (typeof item.value !== "number") return;
          this.points += item.value;
        } else if (item.action === "unlockItem") {
          if (typeof item.value !== "string") return;
          this.unlockedItems[item.value] = true;
        } else if (item.action === "upStats") {
          this.purchasedItems[item.id] = (this.purchasedItems[item.id] ?? 0) + 1;
          this.applyStats();
        }
      }
      const price = this.getScaledPrice(item);
      if (item.priceType === "clicks") {
        if (this.clicks < price) {
          sender.send(
            JSON.stringify({
              type: "error",
              errortype: "insufficientFunds",
              message: "Insufficient funds",
            })
          );
          return;
        }
        this.clicks -= price;
        action(item);
      } else if (item.priceType === "points") {
        if (this.points < price) {
          sender.send(
            JSON.stringify({
              type: "error",
              errortype: "insufficientFunds",
              message: "Insufficient funds",
            })
          );
          return;
        }
        this.points -= price;
        action(item);
      }
    } else if (data.type === "chat") {
      if (!this.rateLimit(sender)) return;
      const message = profanityCensor.applyTo(data.message, profanityFilter.getAllMatches(data.message));
      // prevent xss
      const safemessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      this.room.broadcast(JSON.stringify({ type: "chat", safemessage, sender: sender.id}), [sender.id]);
    } else if (data.type === "ready") {
      sender.send(JSON.stringify({ type: "clicks", clicks: this.clicks }));

      sender.send(
        JSON.stringify({ type: "shopData", items: this.shopItems, unlockedItems: this.unlockedItems, purchasedItems: this.purchasedItems })
      );
    } else if (data.type === "cursor") {
      this.room.broadcast(JSON.stringify({ ...data, sender: sender.id }), [sender.id]);
    }
  }

  async onStart() {
    await this.syncStorage();
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
    this.room.broadcast(
      JSON.stringify({ type: "clicks", clicks: this.clicks })
    );
  }

  async syncStorage(overwrite: boolean = false) {
    const clicks = await this.room.storage.get("clicks");
    if (overwrite || clicks === null || clicks === undefined) {
      await this.room.storage.put("clicks", this.clicks);
    } else {
      this.clicks = clicks as number;
    }
    const points = await this.room.storage.get("points");
    if (overwrite || points === null || points === undefined) {
      await this.room.storage.put("points", this.points);
    } else {
      this.points = points as number;
    }
    const unlockedItems = await this.room.storage.get("unlockedItems");
    if (overwrite || unlockedItems === null || unlockedItems === undefined) {
      await this.room.storage.put("unlockedItems", this.unlockedItems);
    } else {
      this.unlockedItems = unlockedItems as Record<string, boolean>;
    }
    const purchasedItems = await this.room.storage.get("purchasedItems");
    if (overwrite || purchasedItems === null || purchasedItems === undefined) {
      await this.room.storage.put("purchasedItems", this.purchasedItems);
    } else {
      this.purchasedItems = purchasedItems as Record<string, number>;
    }
  }
}

Server satisfies Party.Worker;
