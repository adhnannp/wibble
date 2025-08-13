import mongoose, { Schema, Document } from 'mongoose'

interface Member {
  userId: string
  username: string
  socketId: string
  joinedAt: Date
}

interface RoomDocument extends Document {
  roomId: string
  members: Member[]
  lastEmptyAt?: Date
}

const memberSchema = new Schema<Member>({
  userId: { type: String, required: true },
  username: { type: String, required: true, default: 'Anonymous' },
  socketId: { type: String, required: true },
  joinedAt: { type: Date, required: true },
})

const roomSchema = new Schema<RoomDocument>({
  roomId: { type: String, required: true, unique: true },
  members: [memberSchema],
  lastEmptyAt: { type: Date },
})

export default mongoose.models.Room || mongoose.model<RoomDocument>('Room', roomSchema)