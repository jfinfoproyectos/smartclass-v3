"use client";

export type PushPermissionState = NotificationPermission | "unsupported";

export function useWebPush() {
  return {
    permission: "unsupported" as PushPermissionState,
    isSubscribed: false,
    subscription: null,
    loading: false,
    error: null,
    subscribe: async () => {},
    unsubscribe: async () => {},
  };
}
