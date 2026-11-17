/// <reference lib="webworker" />
// The app's background helper: offline cache, phone notifications, and updates.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// Car photos: show the saved copy instantly, refresh it in the background.
registerRoute(
  ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
  new StaleWhileRevalidate({ cacheName: 'car-photos', plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 })] }),
)

// The "Update" button in the pop-up sends this to switch to the new version.
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

interface CarPush { title: string; body: string; url: string; image?: string; tag?: string }

self.addEventListener('push', (event) => {
  const data: CarPush = (() => { try { return event.data!.json() } catch { return { title: 'Cars Uganda', body: event.data?.text() ?? 'New update', url: '/' } } })()
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const visible = tabs.find((c) => (c as WindowClient).visibilityState === 'visible')
    if (visible) {
      // App is open on screen: let the app show its own pop-up and play the chime (if the user allows sound).
      visible.postMessage({ type: 'NEW_CAR', ...data })
      return
    }
    // App closed or in background: a real phone notification (uses the phone's own sound).
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag,
      data: { url: data.url },
      ...(data.image ? { image: data.image } : {}),
      renotify: true,
    } as NotificationOptions)
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const t of tabs) {
      if ('focus' in t) { await (t as WindowClient).navigate(url); return (t as WindowClient).focus() }
    }
    return self.clients.openWindow(url)
  })())
})
