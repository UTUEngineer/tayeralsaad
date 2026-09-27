import type { Request, Response } from 'express';
import mongoose from 'mongoose';

import { UserModel } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendOk } from '../utils/apiResponse.js';
import { NotFoundError, ValidationError } from '../utils/httpError.js';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.auth?.userId);
  if (!user) throw new NotFoundError('USER_MISSING', 'لا يوجد مستخدم', 'User missing.');
  sendOk(res, user);
});

export const patchMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.auth?.userId);
  if (!user) throw new NotFoundError();
  Object.assign(user, req.body);
  await user.save();
  sendOk(res, user);
});

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.auth?.userId);
  if (!user) throw new NotFoundError();
  user.defaultAddresses.push(req.body);
  await user.save();
  sendOk(res, user);
});

// Partial-update allowlist, mirroring the address subdocument in models/User.ts.
const ADDRESS_UPDATABLE_FIELDS = ['label', 'city', 'area', 'street', 'building', 'notes', 'location'] as const;

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.auth?.userId);
  if (!user) throw new NotFoundError();

  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('NOT_FOUND', 'العنوان غير موجود', 'Address not found.');
  }

  // Owner-scoped: we only look inside the authenticated user's own subdocument array,
  // so an id owned by someone else is simply not found here -> 404, never updated.
  const address = user.defaultAddresses.id(id);
  if (!address) {
    throw new NotFoundError('NOT_FOUND', 'العنوان غير موجود', 'Address not found.');
  }

  // Partial update: keep only fields defined on the address subdocument schema; ignore the rest.
  const body = (req.body ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  for (const field of ADDRESS_UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field) && body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('لا توجد حقول قابلة للتحديث', 'No updatable fields to apply.');
  }

  Object.assign(address, updates);

  try {
    await user.save();
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      throw new ValidationError('بيانات العنوان غير صالحة', 'Invalid address data.');
    }
    throw err;
  }

  sendOk(res, user);
});

export const removeAddress = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.auth?.userId);
  if (!user) throw new NotFoundError();
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('معرّف غير صالح', 'Invalid address id.');
  }
  const before = user.defaultAddresses.length;
  user.defaultAddresses.pull({ _id: new mongoose.Types.ObjectId(id) });
  if (user.defaultAddresses.length === before) throw new ValidationError('العنوان غير موجود', 'Address not found.');
  await user.save();
  sendOk(res, user);
});

export const savePushToken = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserModel.findById(req.auth?.userId);
  if (!user) throw new NotFoundError();
  const token = req.body?.token;
  if (typeof token === 'string' && token.trim()) {
    user.pushToken = token.trim();
    await user.save();
  }
  sendOk(res, { success: true });
});
