import type * as Party from "partykit/server";

const rateLimit = 100;

export default class Server implements Party.Server {
  users: number;
  clicks: number;

  constructor(readonly room: Party.Room) {
    this.users = 0;
    this.clicks = -1;
  }

  onConnect(
    connection: Party.Connection<{ lastMsg: number }>,
    ctx: Party.ConnectionContext
  ) {
    this.users++;
    this.room.broadcast(JSON.stringify({ type: "users", users: this.users }));
    connection.send(JSON.stringify({ type: "clicks", clicks: this.clicks }));
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

  async onMessage(
    message: string,
    sender: Party.Connection<{ lastMsg: number }>
  ) {
    const data = JSON.parse(message);
    const now = performance.now();
    if (data.type === "click") {
      if (sender.state?.lastMsg && sender.state?.lastMsg > now - rateLimit) {
        console.log("Rate limited");
        sender.send(
          JSON.stringify({
            type: "error",
            errortype: "ratelimit",
            message: "Rate limited",
            retryIn: Math.ceil(
              (sender.state.lastMsg + rateLimit - now) / 1000
            ).toString(),
          })
        );
        sender.setState({ lastMsg: now });
        return;
      }
      this.clicks++;
      this.room.broadcast(
        JSON.stringify({ type: "clicks", clicks: this.clicks })
      );
      await this.syncStorage(true);
      sender.setState({ lastMsg: now });
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
