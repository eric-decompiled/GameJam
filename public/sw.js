const CACHE_NAME = 'platformer-v2';

// Only cache heavy assets (models, audio) - not code/html
const ASSETS_TO_CACHE = [
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

// Install - cache heavy assets only
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

// Fetch - network first, cache fallback for assets only
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isAsset = url.pathname.startsWith('/models/') || url.pathname.startsWith('/audio/');

    if (isAsset) {
        // For heavy assets: cache first, network fallback
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            })
        );
    } else {
        // For everything else: network first, no caching
        event.respondWith(fetch(event.request));
    }
});
