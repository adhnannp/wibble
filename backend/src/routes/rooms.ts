import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Room from '../models/Room';
import { requireJWT } from '../middleware/authJWT';

const router = express.Router();

router.post('/create', requireJWT, async (req:any, res)=>{
  const uid = req.auth.uid;
  const roomId = uuidv4();
  await Room.create({ roomId, ownerId: uid, members: [] });
  res.json({ ok:true, roomId });
});

router.get('/my', requireJWT, async (req:any,res)=>{
  const rooms = await Room.find({ ownerId: req.auth.uid });
  res.json({ ok:true, rooms });
});

export default router;
