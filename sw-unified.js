/**
 * Service Worker Unified - 統合Service Worker
 * sw.js + sw-optimized.js + sw-v2.js の統合版
 * シンプル・確実・高速なキャッシュ戦略
 */

// =====================================
// 設定
// =====================================

const CACHE_VERSION = 2;
const CACHE_NAME = `nazuna-portal-unified-${CACHE_VERSION}`;
const CACHE_PREFIX = 'nazuna-portal-unified-';

// 必須リソース（即座にキャッシュ）
const CRITICAL_RESOURCES = [
    '/',
    'index.html',
    'css/style.css',
    'js/app-unified.js',
    'js/config-unified.js',
    'manifest.json',
    'images/icon.png'
];

// 重要リソース（バックグラウンドでキャッシュ）
const IMPORTANT_RESOURCES = [
    'council.html',
    'clubs.html',
    'forum.html',
    'news.html',
    'survey.html',
    'admin.html',
    'js/supabase-unified.js',
    'js/notification-unified.js',
    'js/pwa-unified.js'
];

// 動的キャッシュ対象
const DYNAMIC_PATTERNS = [
    /\.(css|js|png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/,
    /^https:\/\/fonts\.googleapis\.com/,
    /^https:\/\/fonts\.gstatic\.com/,
    /^https:\/\/cdnjs\.cloudflare\.com/
];

// キャッシュしないパターン
const NO_CACHE_PATTERNS = [
    /\/api\//,
    /supabase\.co/,
    /googleapis\.com\/.*\/messages/,
    /firebase\.googleapis\.com/,
    /\.json$/,
    /manifest\.json$/
];

// =====================================
// インストール
// =====================================

self.addEventListener('install', (event) => {
    console.log('[SW Unified] Installing Service Worker version', CACHE_VERSION);
    
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
                            console.log(`[SW Unified] Cached critical: ${url}`);
                            return true;
                        }
                        return false;
                    } catch (error) {
                        console.warn(`[SW Unified] Failed to cache critical ${url}:`, error.message);
                        return false;
                    }
                });
                
                const criticalResults = await Promise.all(criticalPromises);
                const criticalSuccess = criticalResults.filter(Boolean).length;
                
                console.log(`[SW Unified] Critical resources cached: ${criticalSuccess}/${CRITICAL_RESOURCES.length}`);
                
                // 即座にアクティブ化
                await self.skipWaiting();
                
                // バックグラウンドで重要リソースをキャッシュ
                setTimeout(async () => {
                    const importantPromises = IMPORTANT_RESOURCES.map(async (url) => {
                        try {
                            const response = await fetch(url);
                            if (response.ok) {
                                await cache.put(url, response);
                                console.log(`[SW Unified] Cached important: ${url}`);
                                return true;
                            }
                            return false;
                        } catch (error) {
                            console.warn(`[SW Unified] Failed to cache important ${url}:`, error.message);
                            return false;
                        }
                    });
                    
                    const importantResults = await Promise.all(importantPromises);
                    const importantSuccess = importantResults.filter(Boolean).length;
                    
                    console.log(`[SW Unified] Important resources cached: ${importantSuccess}/${IMPORTANT_RESOURCES.length}`);
                }, 1000);
                
            } catch (error) {
                console.error('[SW Unified] Installation failed:', error);
            }
        })()
    );
});

// =====================================
// アクティベート
// =====================================

self.addEventListener('activate', (event) => {
    console.log('[SW Unified] Activating Service Worker version', CACHE_VERSION);
    
    event.waitUntil(
        (async () => {
            try {
                // 古いキャッシュを削除
                const cacheNames = await caches.keys();
                const deletePromises = cacheNames
                    .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
                    .map(name => {
                        console.log(`[SW Unified] Deleting old cache: ${name}`);
                        return caches.delete(name);
                    });
                
                await Promise.all(deletePromises);
                
                // クライアントを制御
                await self.clients.claim();
                
                console.log('[SW Unified] Service Worker activated');
                
            } catch (error) {
                console.error('[SW Unified] Activation failed:', error);
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
    
    // GETリクエストのみ処理
    if (request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        (async () => {
            try {
                // ナビゲーションリクエスト（HTMLページ）
                if (request.mode === 'navigate') {
                    return await handleNavigationRequest(request);
                }
                
                // 静的リソース
                if (isStaticResource(request)) {
                    return await cacheFirst(request);
                }
                
                // その他のリソース
                return await networkFirst(request);
                
            } catch (error) {
                console.error('[SW Unified] Fetch failed:', error);
                
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

/**
 * ナビゲーションリクエスト処理
 */
async function handleNavigationRequest(request) {
    try {
        // ネットワークから取得を試みる
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.ok) {
            // 成功した場合はキャッシュに保存
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('[SW Unified] Network failed, trying cache:', request.url);
        
        // ネットワークが失敗した場合はキャッシュから取得
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // キャッシュにもない場合はindex.html
        return cache.match('/index.html');
    }
}

/**
 * キャッシュファースト戦略
 */
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

/**
 * ネットワークファースト戦略
 */
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

/**
 * バックグラウンドでキャッシュを更新
 */
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse);
            console.log(`[SW Unified] Cache updated in background: ${request.url}`);
        }
    } catch (error) {
        // バックグラウンド更新の失敗は無視
        console.log(`[SW Unified] Background update failed: ${request.url}`);
    }
}

/**
 * 静的リソースかどうか判定
 */
function isStaticResource(request) {
    const url = new URL(request.url);
    return DYNAMIC_PATTERNS.some(pattern => pattern.test(url.href));
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
        console.error('[SW Unified] Push notification error:', error);
        
        // フォールバック通知
        event.waitUntil(
            self.registration.showNotification('なずなポータル', {
                body: '新しいお知らせがあります',
                icon: '/images/icon-192x192.png'
            })
        );
    }
});

// =====================================
// 通知クリック
// =====================================

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
// メッセージ処理
// =====================================

self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            clearCache();
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;
            
        case 'CACHE_URLS':
            cacheUrls(payload.urls);
            break;
            
        case 'GET_SYSTEM_INFO':
            getSystemInfo().then(info => {
                event.ports[0].postMessage(info);
            });
            break;
            
        default:
            console.log('[SW Unified] Unknown message type:', type);
    }
});

/**
 * キャッシュクリア
 */
async function clearCache() {
    try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
            .filter(name => name.startsWith(CACHE_PREFIX))
            .map(name => caches.delete(name));
        
        await Promise.all(deletePromises);
        console.log('[SW Unified] Cache cleared');
    } catch (error) {
        console.error('[SW Unified] Failed to clear cache:', error);
    }
}

/**
 * キャッシュステータス取得
 */
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
        console.error('[SW Unified] Failed to get cache status:', error);
        return {};
    }
}

/**
 * URLリストをキャッシュ
 */
async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAME);
    const promises = urls.map(async (url) => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log(`[SW Unified] Cached URL: ${url}`);
                return true;
            }
            return false;
        } catch (error) {
            console.warn(`[SW Unified] Failed to cache URL ${url}:`, error.message);
            return false;
        }
    });
    
    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;
    console.log(`[SW Unified] Cached ${successCount}/${urls.length} URLs`);
}

/**
 * システム情報取得
 */
async function getSystemInfo() {
    try {
        const info = {
            version: CACHE_VERSION,
            cacheName: CACHE_NAME,
            criticalResources: CRITICAL_RESOURCES.length,
            importantResources: IMPORTANT_RESOURCES.length,
            cacheStatus: await getCacheStatus(),
            timestamp: Date.now()
        };
        
        return info;
    } catch (error) {
        console.error('[SW Unified] Failed to get system info:', error);
        return { error: error.message };
    }
}

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
        console.log('[SW Unified] Background sync started');
        
        // 重要なリソースを更新
        const cache = await caches.open(CACHE_NAME);
        const importantPromises = IMPORTANT_RESOURCES.map(async (url) => {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    console.log(`[SW Unified] Background sync updated: ${url}`);
                }
            } catch (error) {
                console.warn(`[SW Unified] Background sync failed for ${url}:`, error.message);
            }
        });
        
        await Promise.all(importantPromises);
        console.log('[SW Unified] Background sync completed');
        
    } catch (error) {
        console.error('[SW Unified] Background sync error:', error);
    }
}

// =====================================
// エラーハンドリング
// =====================================

self.addEventListener('error', (event) => {
    console.error('[SW Unified] Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW Unified] Unhandled promise rejection:', event.reason);
});

console.log('[SW Unified] Service Worker loaded, version:', CACHE_VERSION);
