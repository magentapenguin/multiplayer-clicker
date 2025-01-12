import z from "zod";

const ShopMessage = z.object({
  type: z.literal("shop"),
  item: z.string(),
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
const ReadyMessage = z.object({
  type: z.literal("ready"),
});
export const Message = z.union([ShopMessage, ClickMessage, ChatMessage, CursorMessage, ReadyMessage]);
export interface ShopItem {
  name: string;
  price: number;
  priceScale: number;
  priceType: "clicks" | "points";
  description: string;
  action: "addPoints" | "addClicks" | "unlockItem" | "buyItem" | "none";
  value?: number | string;
  id: string;
}
export interface ToastOptions {
    duration?: number;
    type?: 'info' | 'success' | 'warning' | 'danger' | 'none';
    elem?: HTMLElement | null;
    icon?: string;
}

