// Push notifications have been permanently disabled across the entire application for all roles

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification(_userId: string, _data: PushPayload): Promise<void> {
  return;
}
