/**
 * Service Worker - 最適化版
 * なずなポータルサイト用
 * パフォーマンス最適化済み
 */

// =====================================
// キャッシュ設定
// =====================================

const CACHE_VERSION = 30;
const CACHE_NAME = `nazuna-portal-optimized-v${CACHE_VERSION}`;
const CACHE_PREFIX = 'nazuna-portal-optimized-v';

// 必須リソース（即座にキャッシュ）
const CRITICAL_RESOURCES = [
    '/',
    'index.html',
    'css/style-optimized.css',
    'js/app-optimized.js',
    'js/config.js',
    'manifest.json',
    'images/icon-192x192.png'
];

// 重要リソース（バックグラウンドでキャッシュ）
const IMPORTANT_RESOURCES = [
    'council.html',
    'clubs.html',
    'forum.html',
    'news.html',
    'survey.html',
    'js/supabase-queries.js',
    'js/news-loader.js',
    'images/icon-512x512.png'
];

// 動的キャッシュパターン
const DYNAMIC_CACHE_PATTERNS = [
    /^https:\/\/fonts\.googleapis\.com/,
    /^https:\/\/fonts\.gstatic\.com/,
    /^https:\/\/cdnjs\.cloudflare\.com/,
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/
];

// キャッシュしないパターン
const NO_CACHE_PATTERNS = [
    /\/api\//,
    /supabase\.co/,
    /googleapis\.com\/.*\/messages/,
    /firebase\.googleapis\.com/,
    /\.json$/ // JSONファイルは動的に取得
];

// =====================================
// インストール
// =====================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing optimized Service Worker version', CACHE_VERSION);
    
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                
                // 必須リソースを即座にキャッシュ
                const criticalPromises = CRITICAL_RESOURCES.map(async (url) => {
                    try {
                        const response = await fetch(url, { 
                            cache: 'reload',
                            headers: {
                                'Cache-Control': 'no-cache'
                            }
                        });
                        if (response.ok) {
                            await cache.put(url, response);
                            console.log(`[SW] Cached critical: ${url}`);
                            return true;
                        }
                        return false;
                    } catch (error) {
                        console.warn(`[SW] Failed to cache critical ${url}:`, error.message);
                        return false;
                    }
                });
                
                const criticalResults = await Promise.all(criticalPromises);
                const criticalSuccess = criticalResults.filter(Boolean).length;
                
                console.log(`[SW] Critical resources cached: ${criticalSuccess}/${CRITICAL_RESOURCES.length}`);
                
                // 重要リソースをバックグラウンドでキャッシュ
                self.skipWaiting();
                
                // バックグラウンドで重要リソースをキャッシュ
                setTimeout(async () => {
                    const importantPromises = IMPORTANT_RESOURCES.map(async (url) => {
                        try {
                            const response = await fetch(url);
                            if (response.ok) {
                                await cache.put(url, response);
                                console.log(`[SW] Cached important: ${url}`);
                                return true;
                            }
                            return false;
                        } catch (error) {
                            console.warn(`[SW] Failed to cache important ${url}:`, error.message);
                            return false;
                        }
                    });
                    
                    const importantResults = await Promise.all(importantPromises);
                    const importantSuccess = importantResults.filter(Boolean).length;
                    
                    console.log(`[SW] Important resources cached: ${importantSuccess}/${IMPORTANT_RESOURCES.length}`);
                }, 1000);
                
            } catch (error) {
                console.error('[SW] Installation failed:', error);
            }
        })()
    );
});

// =====================================
// アクティベート
// =====================================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating optimized Service Worker version', CACHE_VERSION);
    
    event.waitUntil(
        (async () => {
            try {
                // 古いキャッシュを削除
                const cacheNames = await caches.keys();
                const deletePromises = cacheNames
                    .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
                    .map(name => {
                        console.log(`[SW] Deleting old cache: ${name}`);
                        return caches.delete(name);
                    });
                
                await Promise.all(deletePromises);
                
                // クライアントを制御
                await self.clients.claim();
                
                console.log('[SW] Optimized Service Worker activated');
                
            } catch (error) {
                console.error('[SW] Activation failed:', error);
            }
        })()
    );
});

// =====================================
// フェッチ
// =====================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // キャッシュしないパターンをチェック
    if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
        return; // ネットワークリクエストをそのまま通す
    }
    
    event.respondWith(
        (async () => {
            try {
                // キャッシュファースト戦略（静的リソース）
                if (isStaticResource(request)) {
                    return await cacheFirst(request);
                }
                
                // ネットワークファースト戦略（動的コンテンツ）
                if (isDynamicContent(request)) {
                    return await networkFirst(request);
                }
                
                // ストール・リバリ戦略（API呼び出し）
                if (isAPIRequest(request)) {
                    return await staleWhileRevalidate(request);
                }
                
                // デフォルト：ネットワークファースト
                return await networkFirst(request);
                
            } catch (error) {
                console.error('[SW] Fetch failed:', error);
                
                // フォールバック：オフライン用ページ
                if (request.destination === 'document') {
                    const cache = await caches.open(CACHE_NAME);
                    const offlinePage = await cache.match('/offline.html');
                    if (offlinePage) {
                        return offlinePage;
                    }
                }
                
                throw error;
            }
        })()
    );
});

// =====================================
// キャッシュ戦略
// =====================================

// キャッシュファースト戦略
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // バックグラウンドで更新
        updateCacheInBackground(request, cache);
        return cachedResponse;
    }
    
    // キャッシュにない場合はネットワークから取得
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
}

// ネットワークファースト戦略
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // ネットワークエラーの場合はキャッシュから取得
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// ストール・リバリ戦略
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // バックグラウンドで更新
    const networkPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => null);
    
    // キャッシュがあれば即座に返し、なければネットワークを待つ
    return cachedResponse || networkPromise;
}

// バックグラウンドでキャッシュを更新
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse);
        }
    } catch (error) {
        // バックグラウンド更新の失敗は無視
        console.warn('[SW] Background cache update failed:', error.message);
    }
}

// =====================================
// リソース分類
// =====================================

function isStaticResource(request) {
    const url = new URL(request.url);
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.ico', '.woff', '.woff2'];
    const isStaticFile = staticExtensions.some(ext => url.pathname.endsWith(ext));
    const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
    const isCDN = url.hostname.includes('cdnjs.cloudflare.com');
    
    return isStaticFile || isFont || isCDN;
}

function isDynamicContent(request) {
    const url = new URL(request.url);
    return url.pathname.endsWith('.html') && !url.pathname.includes('admin');
}

function isAPIRequest(request) {
    const url = new URL(request.url);
    return url.pathname.includes('/api/') || 
           url.hostname.includes('supabase.co') ||
           url.hostname.includes('script.google.com');
}

// =====================================
// メッセージ処理
// =====================================

self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_URLS':
            cacheUrls(payload.urls);
            break;
            
        case 'CLEAR_CACHE':
            clearCache();
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;
            
        default:
            console.log('[SW] Unknown message type:', type);
    }
});

// URLリストをキャッシュ
async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAME);
    const promises = urls.map(async (url) => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log(`[SW] Cached URL: ${url}`);
                return true;
            }
            return false;
        } catch (error) {
            console.warn(`[SW] Failed to cache URL ${url}:`, error.message);
            return false;
        }
    });
    
    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;
    console.log(`[SW] Cached ${successCount}/${urls.length} URLs`);
}

// キャッシュをクリア
async function clearCache() {
    try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
            .filter(name => name.startsWith(CACHE_PREFIX))
            .map(name => caches.delete(name));
        
        await Promise.all(deletePromises);
        console.log('[SW] Cache cleared');
    } catch (error) {
        console.error('[SW] Failed to clear cache:', error);
    }
}

// キャッシュステータスを取得
async function getCacheStatus() {
    try {
        const cacheNames = await caches.keys();
        const cacheStatus = {};
        
        for (const name of cacheNames) {
            if (name.startsWith(CACHE_PREFIX)) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                cacheStatus[name] = {
                    size: keys.length,
                    urls: keys.map(request => request.url)
                };
            }
        }
        
        return cacheStatus;
    } catch (error) {
        console.error('[SW] Failed to get cache status:', error);
        return {};
    }
}

// =====================================
// プッシュ通知
// =====================================

self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const options = {
            body: data.body || '新しいお知らせがあります',
            icon: data.icon || '/images/icon-192x192.png',
            badge: '/images/badge-72x72.png',
            tag: data.tag || 'nazuna-notification',
            data: data.data || {},
            actions: data.actions || [
                {
                    action: 'view',
                    title: '確認する',
                    icon: '/images/icon-192x192.png'
                },
                {
                    action: 'close',
                    title: '閉じる'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'なずなポータル', options)
        );
        
    } catch (error) {
        console.error('[SW] Push notification error:', error);
        
        // フォールバック通知
        event.waitUntil(
            self.registration.showNotification('なずなポータル', {
                body: '新しいお知らせがあります',
                icon: '/images/icon-192x192.png'
            })
        );
    }
});

// 通知クリック処理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data || {};
    
    if (action === 'close') {
        return;
    }
    
    const urlToOpen = data.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // 既存のウィンドウで開く
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // 新しいウィンドウで開く
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// =====================================
// バックグラウンド同期
// =====================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        console.log('[SW] Background sync started');
        
        // 重要なリソースを更新
        const cache = await caches.open(CACHE_NAME);
        const importantPromises = IMPORTANT_RESOURCES.map(async (url) => {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    console.log(`[SW] Background sync updated: ${url}`);
                }
            } catch (error) {
                console.warn(`[SW] Background sync failed for ${url}:`, error.message);
            }
        });
        
        await Promise.all(importantPromises);
        console.log('[SW] Background sync completed');
        
    } catch (error) {
        console.error('[SW] Background sync error:', error);
    }
}

// =====================================
// エラーハンドリング
// =====================================

self.addEventListener('error', (event) => {
    console.error('[SW] Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Optimized Service Worker loaded');
