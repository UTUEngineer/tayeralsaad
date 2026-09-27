import type { HydratedDocument, InferRawDocType } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

const addressSchema = new Schema(
  {
    label: { type: String },
    city: { type: String, required: true },
    area: { type: String, required: true },
    street: { type: String },
    building: { type: String },
    notes: { type: String },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { _id: true },
);

const refreshSessionSchema = new Schema(
  {
    hashedJti: { type: String, default: null },
    familyId: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['sender', 'receiver', 'driver', 'admin'],
      default: 'sender',
    },
    preferredLanguage: {
      type: String,
      enum: ['ar', 'en'],
      default: 'ar',
    },
    avatarUrl: { type: String },
    pushToken: { type: String, default: null },
    defaultAddresses: { type: [addressSchema], default: [] },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    refreshSession: { type: refreshSessionSchema, default: () => ({}) },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const plain = ret as Record<string, unknown>;
    delete plain.refreshSession;
    plain.id = ret._id?.toString();
    delete plain._id;
    delete plain.__v;
    return plain as typeof ret;
  },
});

export type UserDocRaw = InferRawDocType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserDocRaw>;

export const UserModel = mongoose.model('User', userSchema);
