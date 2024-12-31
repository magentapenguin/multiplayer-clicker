import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import type * as Party from "partykit/server";

const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 1,
});
export default class Server implements Party.Server {
  users: number;
  clicks: number;

  constructor(readonly room: Party.Room) {
    this.users = 0;
    this.clicks = -1;
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    this.users++;
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
    conn.send(JSON.stringify({ type: "clicks", clicks: this.clicks }));
    conn.setState({ ip: ctx.request.headers.get("cf-connecting-ip") });
  }
  onClose(conn: Party.Connection) {
    this.users--;
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
  }
  onError(connection: Party.Connection, error: Error): void | Promise<void> {
      this.users--;
      this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
      console.error(error);
  }

  onMessage(message: string, sender: Party.Connection<{ ip: string }>) {
    rateLimiter.consume(sender.state?.ip as string).then((rateLimiterRes)=>{
      sender.send(JSON.stringify({ type: "rateLimit", cp: rateLimiterRes.consumedPoints, rp: rateLimiterRes.remainingPoints, msbn: rateLimiterRes.msBeforeNext }));
      const data = JSON.parse(message);
      if (data.type === "click") {
        this.clicks++;
        this.room.broadcast(JSON.stringify({ type: "clicks", clicks: this.clicks }));
        this.syncStorage(true);
      }
      this.room.broadcast(message, [sender.id]);
    }).catch((rateLimiterRes: RateLimiterRes) => {
      sender.send(JSON.stringify({ type: "rateLimit", cp: rateLimiterRes.consumedPoints, rp: rateLimiterRes.remainingPoints, msbn: rateLimiterRes.msBeforeNext, error: "Rate limit exceeded" }));
      return
    });
  }
  async onStart() {
    await this.syncStorage();
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
    this.room.broadcast(JSON.stringify({ type: "clicks", clicks: this.clicks }));
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
