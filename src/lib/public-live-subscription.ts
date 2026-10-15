type PublicLiveSubscriptionOptions = {
  url: string;
  onOpen: () => void;
  onMessage: (data: unknown) => void;
};

// Keep one current connection per subscription. Replaced sockets can still
// dispatch queued events, so every callback checks its connection identity.
export function subscribePublicLive({
  url,
  onOpen,
  onMessage,
}: PublicLiveSubscriptionOptions): () => void {
  let disposed = false;
  let active: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let reconnectDelay = 1_000;

  function scheduleReconnect() {
    if (disposed || reconnectTimer !== undefined) return;
    const delay = reconnectDelay;
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  }

  function connect() {
    if (disposed) return;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }
    active = socket;
    socket.onopen = () => {
      if (disposed || active !== socket) return;
      reconnectDelay = 1_000;
      onOpen();
    };
    socket.onmessage = (event) => {
      if (disposed || active !== socket) return;
      onMessage(event.data);
    };
    socket.onclose = () => {
      if (disposed || active !== socket) return;
      active = null;
      scheduleReconnect();
    };
  }

  connect();
  return () => {
    if (disposed) return;
    disposed = true;
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    const socket = active;
    active = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.close();
    }
  };
}
