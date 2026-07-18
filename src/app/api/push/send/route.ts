import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import prisma from "@/lib/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn("VAPID keys are missing from environment variables.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription, title, body: notificationBody, icon, url } = body;

    const payload = JSON.stringify({
      title: title || "Nueva Notificación",
      body: notificationBody || "",
      icon: icon || "/logo.png",
      url: url || "/dashboard",
    });

    let targetSubscriptions: any[] = [];

    if (subscription) {
      targetSubscriptions = [subscription];
    } else if (userId) {
      targetSubscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
      });
    } else {
      return NextResponse.json(
        { error: "Recipient (userId or subscription) is required" },
        { status: 400 }
      );
    }

    if (targetSubscriptions.length === 0) {
      return NextResponse.json(
        { success: false, message: "No active subscriptions found for this user." },
        { status: 404 }
      );
    }

    const results = await Promise.all(
      targetSubscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { endpoint: sub.endpoint, status: "success" };
        } catch (error: any) {
          console.error(
            `Error sending push notification to endpoint ${sub.endpoint}:`,
            error
          );

          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Deleting invalid subscription: ${sub.endpoint}`);
            await prisma.pushSubscription.deleteMany({
              where: { endpoint: sub.endpoint },
            });
            return { endpoint: sub.endpoint, status: "deleted" };
          }

          return { endpoint: sub.endpoint, status: "failed", error: error.message };
        }
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
