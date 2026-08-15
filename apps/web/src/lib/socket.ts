import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token?: string | null): Socket {
  if (!socket) {
    socket = io('http://localhost:4000', {
      autoConnect: false,
      withCredentials: true,
      auth: { token },
    });
  } else {
    socket.auth = { token };
  }
  return socket;
}

export function connectSocket(token: string | null): Socket | null {
  if (!token) return null;
  const client = getSocket(token);
  client.auth = { token };
  if (!client.connected) client.connect();
  return client;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
