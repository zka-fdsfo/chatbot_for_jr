import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://192.168.99.196:3000';

let socket = null;

export function connectSocket(auth = {}) {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    auth,
  });

  socket.on('connect', () => {
    console.info('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.info('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.connect();

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
