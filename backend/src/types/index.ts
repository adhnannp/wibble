import type { WebSocket } from 'ws';

export type User = {
  id: string;
  username: string;
  ws: WebSocket;
  pairedWith: string | null;
};

export type Message = {
  sender: string;
  text: string;
};

export type SignalingMessage = {
  type: "offer" | "answer" | "candidate" | "disconnect" | "next";
  senderId: string;
  receiverId: string;
  data?: any;
};
