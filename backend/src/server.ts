import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'https';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { SignalingMessage, Message } from './types';
import { addUser, getUser, removeUser, getAvailableUsers, setUserPair } from './models/userModel';

export const handleConnection = (ws: WebSocket): void => {
    console.log("reaching here")
  const userId = uuidv4();
  const username = `User_${userId.slice(0, 8)}`;
  const user = addUser(userId, username, ws);

  ws.send(JSON.stringify({ type: 'welcome', userId, username }));

  ws.on('message', (data: string) => {
    try {
      const message: SignalingMessage | any = JSON.parse(data);
      handleMessage(userId, message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    handleDisconnect(userId);
  });
};

const handleMessage = (userId: string, message: any): void => {
  const user = getUser(userId);
  if (!user) return;

  switch (message.type) {
    case 'connect':
      pairUser(userId);
      break;
    case 'offer':
    case 'answer':
    case 'candidate':
      forwardSignalingMessage(userId, message);
      break;
    case 'chat':
      sendChatMessage(userId, message.text);
      break;
    case 'next':
      handleNext(userId);
      break;
    case 'disconnect':
      handleDisconnect(userId);
      break;
  }
};

const pairUser = (userId: string): void => {
  const user = getUser(userId);
  if (!user || user.pairedWith) return;

  const availableUsers = getAvailableUsers(userId);
  if (availableUsers.length === 0) {
    user.ws.send(JSON.stringify({ type: 'system', text: 'No available users. Waiting...' }));
    return;
  }

  const stranger = availableUsers[Math.floor(Math.random() * availableUsers.length)];
  setUserPair(userId, stranger.id);
  setUserPair(stranger.id, userId);

  user.ws.send(
    JSON.stringify({
      type: 'system',
      text: 'You are now connected with a random stranger.',
      strangerId: stranger.id,
    })
  );
  stranger.ws.send(
    JSON.stringify({
      type: 'system',
      text: 'You are now connected with a random stranger.',
      strangerId: userId,
    })
  );
};

const forwardSignalingMessage = (senderId: string, message: SignalingMessage): void => {
  const sender = getUser(senderId);
  if (!sender || !sender.pairedWith) return;

  const receiver = getUser(sender.pairedWith);
  if (receiver) {
    receiver.ws.send(
      JSON.stringify({
        type: message.type,
        senderId: message.senderId,
        data: message.data,
      })
    );
  }
};

const sendChatMessage = (senderId: string, text: string): void => {
  const sender = getUser(senderId);
  if (!sender || !sender.pairedWith) return;

  const message: Message = { sender: sender.username, text };
  const receiver = getUser(sender.pairedWith);
  if (receiver) {
    receiver.ws.send(JSON.stringify({ type: 'chat', message }));
    sender.ws.send(JSON.stringify({ type: 'chat', message }));
  }
};

const handleNext = (userId: string): void => {
  const user = getUser(userId);
  if (!user || !user.pairedWith) return;

  const oldStranger = getUser(user.pairedWith);
  if (oldStranger) {
    oldStranger.ws.send(
      JSON.stringify({ type: 'system', text: 'Stranger disconnected.' })
    );
    setUserPair(oldStranger.id, null);
  }

  setUserPair(userId, null);
  pairUser(userId);
};

const handleDisconnect = (userId: string): void => {
  const user = getUser(userId);
  if (!user) return;

  if (user.pairedWith) {
    const stranger = getUser(user.pairedWith);
    if (stranger) {
      stranger.ws.send(
        JSON.stringify({ type: 'system', text: 'Stranger disconnected.' })
      );
      setUserPair(stranger.id, null);
    }
  }

  removeUser(userId);
};

// Start the HTTPS WebSocket server
const server = createServer({
    cert: readFileSync('/run/media/adhnannp/adhnan/PROGRAMMING/wibble/ssl/cert.pem'),
    key: readFileSync('/run/media/adhnannp/adhnan/PROGRAMMING/wibble/ssl/key.pem'),
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection established');
  handleConnection(ws);
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

server.listen(3001, '0.0.0.0', () => {
  console.log('WebSocket server running on wss://10.0.14.210:3001');
});