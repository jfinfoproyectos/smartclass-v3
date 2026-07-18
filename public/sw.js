const CACHE_NAME = "smartclass-cache-v1";
const OFFLINE_URL = "/dashboard/help"; // Fallback URL for offline view

const ASSETS_TO_CACHE = [
  "/",
  "/dashboard",
  "/dashboard/help",
  "/logo.png",
  "/manifest.json"
];

// Install Event: Cache Shell Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell");
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("[Service Worker] Failed to cache some assets during install:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network First, Fallback to Cache
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Avoid intercepting auth requests, API calls or dynamic dev endpoints
  if (
    event.request.url.includes("/api/auth") || 
    event.request.url.includes("/signin") || 
    event.request.url.includes("/_next/") || 
    event.request.url.includes("webpack")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful requests dynamically
        if (response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is down
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If offline and request is document/page, redirect to help fallback
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Push Event: Handle background push notifications
self.addEventListener("push", (event) => {
  if (!event.data) {
    console.log("[Service Worker] Push event received but had no data.");
    return;
  }

  let payload = {
    title: "SmartClass",
    body: "Tienes una nueva notificación.",
    icon: "/logo.png",
    url: "/dashboard",
  };

  try {
    payload = event.data.json();
  } catch (err) {
    payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/logo.png",
    badge: payload.icon || "/logo.png",
    data: {
      url: payload.url || "/dashboard",
    },
    tag: "smartclass-push-tag",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification Click Event: Handle action clicking on the notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const baseTargetUrl = new URL(targetUrl, self.location.origin);
          if (clientUrl.pathname === baseTargetUrl.pathname && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
