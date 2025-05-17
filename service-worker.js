const cacheName = 'pockit-v1';
const staticAssets = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './images/logo.png', // Make sure these paths are correct
    './images/favicon.ico'  // Once you have the images
];

self.addEventListener('install', async event => {
    const cache = await caches.open(cacheName);
    await cache.addAll(staticAssets);
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => {
        return Promise.all(keys
            .filter(key => key !== cacheName)
            .map(key => caches.delete(key))
        );
    }));
});

self.addEventListener('fetch', event => {
    event.respondWith(caches.match(event.request).then(response => {
        return response || fetch(event.request);
    }));
});