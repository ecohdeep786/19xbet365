import { WebSocketServer } from "ws";

let wss = null;
const clients = new Set();

export function attachWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => { socket.isAlive = true; });
    socket.on("close", () => clients.delete(socket));
    clients.add(socket);
    socket.send(JSON.stringify({ type: "hello", message: "19X live channel connected", at: new Date().toISOString() }));
  });
  const interval = setInterval(() => {
    for (const socket of clients) {
      if (!socket.isAlive) { socket.terminate(); clients.delete(socket); continue; }
      socket.isAlive = false;
      socket.ping();
    }
  }, 30000);
  interval.unref?.();
  return wss;
}

export function broadcast(payload) {
  if (!clients.size) return;
  const text = JSON.stringify({ ...payload, at: new Date().toISOString() });
  for (const socket of clients) {
    if (socket.readyState === 1) socket.send(text);
  }
}
