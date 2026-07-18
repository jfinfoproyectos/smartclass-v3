"use client";

import { useEffect, useState, useCallback } from "react";

// Helper to convert VAPID public key from URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionState = NotificationPermission | "unsupported";

export function useWebPush() {
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if Push is supported and check current subscription status
  const checkSubscription = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPermission("unsupported");
      setLoading(false);
      return;
    }

    try {
      setPermission(Notification.permission);

      if (Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const activeSub = await registration.pushManager.getSubscription();
        setSubscription(activeSub);
        setIsSubscribed(!!activeSub);
      }
    } catch (err: any) {
      console.error("Error checking push subscription:", err);
      setError(err.message || "Error al verificar suscripción");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Request permission and subscribe the user
  const subscribe = async () => {
    if (permission === "unsupported") {
      throw new Error("Las notificaciones push no están soportadas en este navegador.");
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Request Notification Permission
      const userPermission = await Notification.requestPermission();
      setPermission(userPermission);

      if (userPermission !== "granted") {
        throw new Error("Permiso de notificaciones denegado.");
      }

      // 2. Wait for Service Worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // 3. Prepare public VAPID key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("Falta la llave pública VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // 4. Subscribe with push service provider (Google, Apple, Mozilla, etc.)
      const pushSub = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required for security/privacy by browsers
        applicationServerKey: applicationServerKey,
      });

      // 5. Send subscription to our backend database
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription: pushSub }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al enviar la suscripción al servidor.");
      }

      setSubscription(pushSub);
      setIsSubscribed(true);
      return pushSub;
    } catch (err: any) {
      console.error("Error during push subscription registration:", err);
      setError(err.message || "Error al registrar notificaciones push");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe the user
  const unsubscribe = async () => {
    if (!subscription) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Unsubscribe from the push service
      const success = await subscription.unsubscribe();
      if (!success) {
        console.warn("Unsubscription returned false from browser PushManager.");
      }

      // 2. Remove subscription from our database
      const response = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      if (!response.ok) {
        console.error("Failed to delete subscription on database backend.");
      }

      setSubscription(null);
      setIsSubscribed(false);
    } catch (err: any) {
      console.error("Error unsubscribing:", err);
      setError(err.message || "Error al desuscribirse de notificaciones");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    subscription,
    loading,
    error,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
  };
}
