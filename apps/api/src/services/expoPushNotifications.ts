import { UserModel } from '../models/User.js';

export interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendExpoPushNotification(
  pushToken: string,
  payload: PushMessagePayload,
): Promise<boolean> {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
    // If not a standard Expo push token string format, skip silently or attempt sending anyway if token matches pattern
    if (!pushToken || pushToken.length < 10) return false;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('[expoPushNotifications] Push dispatch error:', err);
    return false;
  }
}

export async function notifyUserPush(
  userId: string,
  payload: PushMessagePayload,
): Promise<boolean> {
  try {
    const user = await UserModel.findById(userId).lean();
    if (!user || !user.pushToken) return false;
    return await sendExpoPushNotification(user.pushToken, payload);
  } catch {
    return false;
  }
}
