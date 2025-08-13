import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

export type IUser = {
  _id: string;
  fullName: string;
  username: string;
  passwordHash: string;
};

export default mongoose.model('User', UserSchema);
