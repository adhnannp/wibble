import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import { setupSignaling } from './sockets/signaling';
import { cleanupEmptyRoomsWorker } from './utils/cleanup';

dotenv.config();

const app = express();
app.use(express.json());

const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4000';
app.use(cors({ origin: ORIGIN, credentials: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGIN, credentials: true } });

// DB connect
const MONGO = process.env.MONGO_URL || 'mongodb://localhost:27017/videochat';
mongoose.connect(MONGO).then(()=>console.log('Mongo connected')).catch(console.error);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);

// Sockets
setupSignaling(io);

// Cleanup worker
cleanupEmptyRoomsWorker();

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`Server on :${PORT}`));
