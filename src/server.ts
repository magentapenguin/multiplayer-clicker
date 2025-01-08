import type * as Party from "partykit/server";
import z from "zod";
import obscenity from "obscenity";


const ShopMessage = z.object({
  type: z.literal("shop"),
  item: z.string(),
  action: z.literal("buy"),
});
const ClickMessage = z.object({
  type: z.literal("click"),
});
const ChatMessage = z.object({
  type: z.literal("chat"),
  message: z.string(),
});
const CursorMessage = z.object({
  type: z.literal("cursor"),
  x: z.number(),
  y: z.number(),
});
const Message = z.union([ShopMessage, ClickMessage, ChatMessage, CursorMessage]);

interface ShopItem {
  name: string;
  price: number;
  priceType: "clicks" | "points";
  description: string;
  action: "addPoints" | "addClicks" | "unlockItem" | "buyItem";
  value: number | string;
}

const rateLimit = 100;

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

  constructor(readonly room: Party.Room) {
    this.users = 0;
    this.clicks = -1;
    this.points = 0;
    this.unlockedItems = {
      "1-point": true,
    };
    this.purchasedItems = {};
  }

  shopItems = {
    "1-point": {
      "name": "1 Point",
      "price": 5,
      "priceType": "clicks",
      "description": "Convert 5 clicks into 1 point",
      "action": "addPoints",
      "value": 1
    },
    // TODO: Add more shop items
  } as Record<string, ShopItem>; 

  onConnect(
    connection: Party.Connection<{ lastMsg: number }>,
    ctx: Party.ConnectionContext
  ) {
    this.users++;
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
    connection.send(JSON.stringify({ type: "clicks", clicks: this.clicks }));
    connection.setState({ lastMsg: performance.now() });
    connection.send(
      JSON.stringify({ type: "shopData", items: this.shopItems, unlockedItems: this.unlockedItems, purchasedItems: this.purchasedItems })
    );
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
  rateLimit(connection: Party.Connection<{ lastMsg: number }>) {
    const now = performance.now();
    if (connection.state?.lastMsg && connection.state?.lastMsg > now - rateLimit) {
      console.log("Rate limited");
      connection.send(
        JSON.stringify({
          type: "error",
          errortype: "ratelimit",
          message: "Rate limited",
          retryIn: Math.ceil(
            (connection.state.lastMsg + rateLimit - now) / 1000
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
      const item = this.shopItems[data.item];
      if (!item) {
        return;
      }
      if (item.priceType === "clicks") {
        if (this.clicks < item.price) {
          return;
        }
        this.clicks -= item.price;
      }
    } else if (data.type === "chat") {
      if (!this.rateLimit(sender)) return;
      const message = profanityCensor.applyTo(data.message, profanityFilter.getAllMatches(data.message));
      this.room.broadcast(JSON.stringify({ type: "chat", message, sender: sender.id}), [sender.id]);
      return;
    }
    message = JSON.stringify({ ...data, sender: sender.id });
    this.room.broadcast(message, [sender.id]);
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
  }
}

Server satisfies Party.Worker;
