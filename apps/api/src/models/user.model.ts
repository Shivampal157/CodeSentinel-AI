import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const userSchema = new Schema(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    login: { type: String, required: true, index: true },
    name: { type: String },
    email: { type: String },
    avatarUrl: { type: String },
    accessToken: { type: String, required: true },
    refreshTokenHash: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const UserModel = model('User', userSchema);
