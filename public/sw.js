const CACHE_NAME = 'platformer-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/models/idle.glb',
    '/models/Walk.glb',
    '/models/run.glb',
    '/models/jump.glb',
    '/models/p2_idle.glb',
    '/models/p2_walk.glb',
    '/models/p2_run.glb',
    '/models/p2_jump.glb',
    '/models/monster.glb',
    '/models/coin.glb',
    '/models/chest.glb',
    '/models/Platform_mk1.glb',
    '/audio/menu_music.wav',
    '/audio/level_music.mp3',
    '/audio/escape_music.mp3',
    '/audio/monster_roar.mp3',
    '/audio/victory.mp3',
    '/audio/coin.mp3'
];

// Install - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                // Don't cache non-ok responses or non-same-origin
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Cache the fetched resource
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        })
    );
});
