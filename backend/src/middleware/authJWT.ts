import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type JwtPayload = { uid: string, username: string };

export function requireJWT(req: Request, res: Response, next: NextFunction){
  try{
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: 'Missing Authorization header' });
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'Invalid Authorization header' });
    const data = jwt.verify(token, process.env.JWT_SECRET || 'jwtsecret') as JwtPayload;
    (req as any).auth = data;
    return next();
  }catch(e:any){
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
