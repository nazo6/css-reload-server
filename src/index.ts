#!/usr/bin/env node

import * as path from "path";
import * as fs from "fs/promises";
import { watchFile } from "fs";

import Fastify from "fastify";
import websocket from "@fastify/websocket";

class CssFileWatcher {
  subscriber: ((content: string) => void)[];
  constructor(private path: string) {
    this.path = path;
    this.subscriber = [];
  }
  subscribe(cb: (content: string) => void) {
    this.subscriber.push(cb);
    if (this.subscriber.length === 1) {
      this.watch();
    }
  }
  async watch() {
    try {
      watchFile(this.path, { interval: 1000 }, async () => {
        const content = await fs.readFile(this.path, "utf8");
        console.log("File changed");
        this.subscriber.forEach((cb) => cb(content));
      });
    } catch (e) {
      console.error(e);
    }
  }
  async read() {
    const content = await fs.readFile(this.path, "utf8");
    return content;
  }
}

main();

async function main() {
  if (!process.argv[2]) {
    console.error("Please provide css path");
    process.exit(1);
  }

  const cssPath = path.resolve(process.argv[2]);
  const clientScriptPath = path.resolve(__dirname, "../client/index.js");
  const clientScript = await fs.readFile(clientScriptPath, "utf8");

  const watcher = new CssFileWatcher(cssPath);

  const fastify = Fastify({
    logger: true,
  });
  await fastify.register(websocket);

  fastify.get("/", async (request, reply) => {
    reply.type("text/javascript").code(200);
    const script = clientScript.replace(
      "{{wsUrl}}",
      `ws://${request.hostname}/ws`,
    );
    return script;
  });

  fastify.get("/ws", { websocket: true }, async (connection, req) => {
    connection.socket.send(
      JSON.stringify({ type: "css", content: await watcher.read() }),
    );
    watcher.subscribe((content) => {
      connection.socket.send(JSON.stringify({ type: "css", content }));
    });
  });

  fastify.listen({ port: 3010 }, (err, address) => {
    if (err) throw err;
    // Server is now listening on ${address}
  });
}
