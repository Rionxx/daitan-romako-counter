import io, { Socket } from 'socket.io-client';
import { Entry } from './types';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling']
      });
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onEntryCreated(callback: (entry: Entry) => void): void {
    if (this.socket) {
      this.socket.on('entryCreated', callback);
    }
  }

  offEntryCreated(): void {
    if (this.socket) {
      this.socket.off('entryCreated');
    }
  }

  join(data: any): void {
    if (this.socket) {
      this.socket.emit('join', data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();