import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || undefined;

let socket: Socket | null = null;

export function getSocket(token?: string | null): Socket {
  if (!socket) {
    socket = io(SOCKET_URL ?? '/', {
      autoConnect: false,
      withCredentials: true,
      auth: { token },
      path: '/socket.io',
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
