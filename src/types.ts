import z from "zod";

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
export const Message = z.union([ShopMessage, ClickMessage, ChatMessage, CursorMessage]);
export interface ShopItem {
  name: string;
  price: number;
  priceType: "clicks" | "points";
  description: string;
  action: "addPoints" | "addClicks" | "unlockItem" | "buyItem";
  value: number | string;
}
export interface ToastOptions {
    duration?: number;
    type?: 'info' | 'success' | 'warning' | 'danger' | 'none';
    elem?: HTMLElement | null;
    icon?: string;
}

