import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import Room from '../models/Room'

type JwtPayload = { uid: string; username: string }

export function setupSignaling(io: Server) {
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers['authorization']?.split(' ')[1]
      if (token) {
        const data = jwt.verify(token, process.env.JWT_SECRET || 'jwtsecret') as JwtPayload
        ;(socket as any).auth = data
      } else {
        ;(socket as any).auth = { uid: `anon-${socket.id}`, username: 'Anonymous' }
      }
    } catch (e) {
      ;(socket as any).auth = { uid: `anon-${socket.id}`, username: 'Anonymous' }
    }
    next()
  })

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null

    socket.on('join-room', async ({ roomId }: { roomId: string }) => {
      try {
        const uid = (socket as any).auth.uid
        const username = (socket as any).auth.username

        await Room.updateOne({ roomId }, { $pull: { members: { userId: uid } } })

        const updated = await Room.findOneAndUpdate(
          { roomId, $expr: { $lt: [{ $size: '$members' }, 4] } },
          {
            $push: { members: { userId: uid, username, socketId: socket.id, joinedAt: new Date() } },
            $unset: { lastEmptyAt: 1 },
          },
          { new: true }
        )

        if (!updated) {
          const exists = await Room.exists({ roomId })
          if (!exists) {
            socket.emit('error', 'Room not found')
          } else {
            socket.emit('room-full')
          }
          return
        }

        currentRoomId = roomId
        socket.join(roomId)

        io.to(roomId).emit('room-members', { members: updated.members })

        updated.members.forEach((member: { userId: string; username: string; socketId: string }) => {
          if (member.userId !== uid) {
            socket.emit('initiate-peer', { userId: member.userId, username: member.username })
          }
        })

        socket.to(roomId).emit('user-joined', { userId: uid, username })
      } catch (err) {
        socket.emit('error', 'Failed to join room')
      }
    })

    socket.on('signal', async ({ to, data }: { to: string; data: any }) => {
      if (to) {
        const room = await Room.findOne({ roomId: currentRoomId, 'members.userId': to })
        const targetSocketId = room?.members.find((m: { userId: string }) => m.userId === to)?.socketId
        if (targetSocketId) {
          socket.to(targetSocketId).emit('signal', { from: (socket as any).auth.uid, data })
        }
      }
    })

    socket.on('leave-room', async ({ roomId }: { roomId: string }) => {
      try {
        const uid = (socket as any).auth.uid
        const updated = await Room.findOneAndUpdate(
          { roomId },
          { $pull: { members: { userId: uid } } },
          { new: true }
        )

        socket.leave(roomId)
        socket.to(roomId).emit('user-left', { userId: uid })

        if (updated && updated.members.length === 0) {
          await Room.updateOne({ roomId }, { $set: { lastEmptyAt: new Date() } })
        }
      } catch (err) {}
    })

    socket.on('disconnect', async () => {
      try {
        const uid = (socket as any).auth.uid
        const rooms = await Room.find({ 'members.userId': uid }, { roomId: 1 })
        for (const r of rooms) {
          const after = await Room.findOneAndUpdate(
            { roomId: r.roomId },
            { $pull: { members: { userId: uid } } },
            { new: true }
          )

          socket.to(r.roomId).emit('user-left', { userId: uid })

          if (after && after.members.length === 0) {
            await Room.updateOne({ roomId: r.roomId }, { $set: { lastEmptyAt: new Date() } })
          }
        }
      } catch (err) {}
    })
  })
}