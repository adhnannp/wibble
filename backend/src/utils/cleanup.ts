import Room from '../models/Room';
import { ROOM_EMPTY_TTL_MINUTES } from '../config';

export function cleanupEmptyRoomsWorker(){
  setInterval(async ()=>{
    try{
      const cutoff = new Date(Date.now() - ROOM_EMPTY_TTL_MINUTES * 60 * 1000);
      const res = await Room.deleteMany({ members: { $size: 0 }, lastEmptyAt: { $lte: cutoff } });
      if (res.deletedCount) console.log('[cleanup] deleted empty rooms:', res.deletedCount);
    }catch(err){
      console.error('[cleanup] error', err);
    }
  }, 60_000);
}
