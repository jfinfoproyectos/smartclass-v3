import webpush from "web-push";
import prisma from "@/lib/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn("VAPID keys are missing for background pushes.");
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushNotification(userId: string, data: PushPayload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      icon: "/logo.png",
      url: data.url || "/dashboard",
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
        } catch (error: any) {
          console.error(
            `Error sending push notification to endpoint ${sub.endpoint}:`,
            error
          );
          // Auto clean-up invalid/expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.deleteMany({
              where: { endpoint: sub.endpoint },
            });
          }
        }
      })
    );
  } catch (error) {
    console.error("Error dispatching push notification helper:", error);
  }
}
