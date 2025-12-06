// Empty service worker to silence 404 errors from browser extensions
// that attempt to register MSW (Mock Service Worker)
self.addEventListener('fetch', () => {})
