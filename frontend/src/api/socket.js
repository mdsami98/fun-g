import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:1001';

export function createGameSocket(token) {
  return io(API_URL, {
    transports: ['websocket'],
    autoConnect: false,
    auth: token ? { token } : {},
  });
}

export function createChatSocket(token) {
  return io(API_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: token ? { token } : {},
  });
}

