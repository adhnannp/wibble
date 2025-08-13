import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { createClient } from 'redis';
import type { Request, Response } from 'express';

const router = express.Router();

const RegisterSchema = z.object({
  fullName: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6)
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  deviceId: z.string().min(1)
});

function tokenFor(uid:string, username:string){
  return jwt.sign({ uid, username }, process.env.JWT_SECRET || 'jwtsecret', { expiresIn: '7d' });
}

router.post('/register', async (req:Request, res:Response)=>{
  try{
    const data = RegisterSchema.parse(req.body);
    const exists = await User.findOne({ username: data.username });
    if (exists) return res.status(400).json({ error: 'Username taken' });
    const hash = await bcrypt.hash(data.password, 10);
    const user = await User.create({ fullName: data.fullName, username: data.username, passwordHash: hash });
    const token = tokenFor(user._id.toString(), user.username);
    res.json({ ok:true, token, user: { id: user._id, fullName: user.fullName, username: user.username } });
  }catch(err:any){
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req:Request, res:Response)=>{
  try{
    const data = LoginSchema.parse(req.body);
    const user = await User.findOne({ username: data.username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = tokenFor(user._id.toString(), user.username);

    // Redis: track device sessions
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = createClient({ url: redisUrl });
    await client.connect();
    const key = `user:${user._id.toString()}:sessions`;
    const alreadyCount = await client.sCard(key);
    const isNewDevice = !(await client.sIsMember(key, data.deviceId));
    await client.sAdd(key, data.deviceId);
    await client.quit();

    res.json({ ok:true, token, user: { id: user._id, fullName: user.fullName, username: user.username }, alreadyActiveElsewhere: alreadyCount>0 && isNewDevice });
  }catch(err:any){
    res.status(400).json({ error: err.message });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwtsecret') as { uid: string, username: string };

    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'Device ID required' });

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = createClient({ url: redisUrl });
    await client.connect();

    const key = `user:${decoded.uid}:sessions`;
    await client.sRem(key, deviceId);

    await client.quit();
    res.json({ ok: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


export default router;
