import WebSocket from 'ws';
import { User } from '../types';

const users: Map<string, User> = new Map();

export const addUser = (id: string, username: string, ws: WebSocket): User => {
  const user: User = { id, username, ws, pairedWith: null };
  users.set(id, user);
  return user;
};

export const getUser = (id: string): User | undefined => {
  return users.get(id);
};

export const removeUser = (id: string): void => {
  users.delete(id);
};

export const getAvailableUsers = (excludeId: string): User[] => {
  return Array.from(users.values()).filter(
    (user) => user.id !== excludeId && user.pairedWith === null
  );
};

export const setUserPair = (userId: string, pairedUserId: string | null): void => {
  const user = users.get(userId);
  if (user) {
    user.pairedWith = pairedUserId;
  }
};