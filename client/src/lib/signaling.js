export class SignalingClient {
  constructor(url, roomId) {
    this.url = url;
    this.roomId = roomId;
    this.ws = null;
    this.handlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(e);

      ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        const callbacks = this.handlers.get(msg.type) || [];
        callbacks.slice().forEach((cb) => cb(msg.payload, msg));
      };

      ws.onclose = () => {
        (this.handlers.get('close') || []).slice().forEach((cb) => cb());
      };
    });
  }

  join() {
    this.send({ type: 'join' });
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ roomId: this.roomId, ...msg }));
    }
  }

  on(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(callback);
    return () => {
      const arr = this.handlers.get(type) || [];
      const i = arr.indexOf(callback);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  close() {
    try {
      this.ws && this.ws.close();
    } catch {
    }
  }
}
