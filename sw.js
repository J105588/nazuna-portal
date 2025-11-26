/**
 * Service Worker - Nazuna Portal
 * キャッシュ戦略の最適化 + FCM通知データ構造統一
 */

// =====================================
// キャッシュ設定
// =====================================

const CACHE_VERSION = 8;
const CACHE_NAME = `nazuna-portal-v${CACHE_VERSION}`;
const CACHE_PREFIX = 'nazuna-portal-v';

// キャッシュするリソース（主要ページ・共通アセット）
const STATIC_CACHE_FILES = [
  '/',
  'index.html',
  'clubs.html',
  'council.html',
  'forum.html',
  'offline.html',
  'member-detail.html',
  'news.html',
  'devlog.html',
  'survey.html',
  'schedule.html',
  'css/style.css',
  'css/admin.css',
  'js/app.js',
  'js/config.js',
  'js/firebase-config.js',
  'js/admin.js',
  'js/simple-notification-manager.js',
  'js/notification-manager.js',
  'js/pwa-update.js',
  'images/icon.png',
];

// オプションのリソース（存在しない場合はスキップ）
const OPTIONAL_CACHE_FILES = [
  'js/api-client.js',
];

// 動的にキャッシュするパターン
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/
];

// キャッシュしないパターン（Service Workerを完全にバイパス）
const NO_CACHE_PATTERNS = [
  /supabase\.co/,
  /googleapis\.com\/.*\/messages/,
  /\/api\//
];

// Service Workerを通さないパターン（完全にブラウザに処理させる）
const BYPASS_SW_PATTERNS = [
  /supabase\.co/,
  /googleapis\.com/,
  /googleusercontent\.com/
];

// =====================================
// インストール
// =====================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker version', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);

        const toAbsolute = (url) => {
          // GitHub Pages配下でも動くよう、SWスコープ相対で解決
          const normalized = url.startsWith('/') ? url.slice(1) : url;
          return new URL(normalized, self.registration.scope).toString();
        };

        // 必須リソースをキャッシュ
        const requiredFiles = STATIC_CACHE_FILES.map(async (url) => {
          try {
            const absUrl = toAbsolute(url);
            const response = await fetch(absUrl);
            if (response.ok) {
              await cache.put(absUrl, response);
              console.log(`[SW] Cached (required): ${absUrl}`);
              return true;
            } else {
              console.warn(`[SW] Failed to cache required file ${absUrl}: ${response.status}`);
              return false;
            }
          } catch (error) {
            console.warn(`[SW] Failed to cache required file ${url}:`, error.message);
            return false;
          }
        });

        // オプションリソースをキャッシュ
        const optionalFiles = OPTIONAL_CACHE_FILES.map(async (url) => {
          try {
            const absUrl = toAbsolute(url);
            const response = await fetch(absUrl);
            if (response.ok) {
              await cache.put(absUrl, response);
              console.log(`[SW] Cached (optional): ${absUrl}`);
              return true;
            } else {
              console.log(`[SW] Skipped optional file ${absUrl}: ${response.status}`);
              return false;
            }
          } catch (error) {
            console.log(`[SW] Skipped optional file ${url}:`, error.message);
            return false;
          }
        });

        const cachePromises = [...requiredFiles, ...optionalFiles];

        const results = await Promise.allSettled(cachePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;

        const totalFiles = STATIC_CACHE_FILES.length + OPTIONAL_CACHE_FILES.length;
        console.log(`[SW] Caching complete: ${successCount}/${totalFiles} files cached successfully`);

        // 即座にアクティブ化
        await self.skipWaiting();

      } catch (error) {
        console.error('[SW] Installation failed:', error);
        // エラーが発生してもService Workerは有効にする
        await self.skipWaiting();
      }
    })()
  );
});

// =====================================
// アクティベーション（すべてのキャッシュを削除して再キャッシュ）
// =====================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker version', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        // 全てのキャッシュ名を取得
        const cacheNames = await caches.keys();

        console.log('[SW] Found caches:', cacheNames);

        // nazuna-portalで始まるキャッシュをすべて削除（現在のバージョンも含む）
        const deletePromises = cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_PREFIX)) {
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        });

        await Promise.all(deletePromises);

        console.log('[SW] All caches deleted successfully');

        // 新しいキャッシュを作成して再キャッシュ
        const cache = await caches.open(CACHE_NAME);

        const toAbsolute = (url) => {
          const normalized = url.startsWith('/') ? url.slice(1) : url;
          return new URL(normalized, self.registration.scope).toString();
        };

        // 必須リソースを再キャッシュ
        const requiredFiles = STATIC_CACHE_FILES.map(async (url) => {
          try {
            const absUrl = toAbsolute(url);
            const response = await fetch(absUrl, { cache: 'reload' }); // キャッシュをバイパスして最新を取得
            if (response.ok) {
              await cache.put(absUrl, response);
              console.log(`[SW] Re-cached (required): ${absUrl}`);
              return true;
            } else {
              console.warn(`[SW] Failed to re-cache required file ${absUrl}: ${response.status}`);
              return false;
            }
          } catch (error) {
            console.warn(`[SW] Failed to re-cache required file ${url}:`, error.message);
            return false;
          }
        });

        // オプションリソースを再キャッシュ
        const optionalFiles = OPTIONAL_CACHE_FILES.map(async (url) => {
          try {
            const absUrl = toAbsolute(url);
            const response = await fetch(absUrl, { cache: 'reload' });
            if (response.ok) {
              await cache.put(absUrl, response);
              console.log(`[SW] Re-cached (optional): ${absUrl}`);
              return true;
            } else {
              console.log(`[SW] Skipped optional file ${absUrl}: ${response.status}`);
              return false;
            }
          } catch (error) {
            console.log(`[SW] Skipped optional file ${url}:`, error.message);
            return false;
          }
        });

        const cachePromises = [...requiredFiles, ...optionalFiles];
        const results = await Promise.allSettled(cachePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;

        const totalFiles = STATIC_CACHE_FILES.length + OPTIONAL_CACHE_FILES.length;
        console.log(`[SW] Re-caching complete: ${successCount}/${totalFiles} files cached successfully`);

        // 即座に全てのクライアントをコントロール
        await self.clients.claim();

        console.log('[SW] Service Worker activated and claimed clients');

        // クライアントへの強制リロードは行わない
        // 更新通知は BroadcastChannel と UI 側の制御に任せる

      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

// =====================================
// フェッチ戦略
// =====================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GitHub Pages: manifest.json と favicon.ico はそのままネットワークへ
  if (url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/favicon.ico')) {
    event.respondWith(fetch(request));
    return;
  }

  // Service Workerを完全にバイパスするパターン（Supabaseなど）
  const shouldBypass = BYPASS_SW_PATTERNS.some(pattern => pattern.test(request.url));
  if (shouldBypass) {
    // Service Workerに介入させない（ブラウザが直接処理）
    return;
  }

  // キャッシュしないパターンをチェック
  const shouldNotCache = NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url));

  if (shouldNotCache) {
    // ネットワークのみ
    event.respondWith(fetch(request));
    return;
  }

  // GETリクエストのみキャッシュ対象
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // ナビゲーションリクエスト（HTMLページ）
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 静的リソース
  event.respondWith(handleResourceRequest(request));
});

/**
 * ナビゲーションリクエストの処理
 * ネットワーク優先、フォールバックでキャッシュ
 */
async function handleNavigationRequest(request) {
  try {
    // ネットワークから取得を試みる
    const networkResponse = await fetch(request);

    // 成功した場合はキャッシュに保存
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // ネットワークが失敗した場合はキャッシュから取得
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // キャッシュにもない場合はスコープ相対の index.html
    const fallbackUrl = new URL('index.html', self.registration.scope).toString();
    return caches.match(fallbackUrl);
  }
}

/**
 * リソースリクエストの処理
 * キャッシュ優先、フォールバックでネットワーク
 */
async function handleResourceRequest(request) {
  // まずキャッシュを確認
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // バックグラウンドで更新（Stale-While-Revalidate）
    updateCacheInBackground(request);
    return cachedResponse;
  }

  // キャッシュになければネットワークから取得
  try {
    const networkResponse = await fetch(request);

    // 動的にキャッシュするか判定
    const shouldCache = DYNAMIC_CACHE_PATTERNS.some(pattern =>
      pattern.test(request.url)
    );

    if (shouldCache && networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (error) {
    console.error('[SW] Fetch failed:', request.url, error);

    // ネットワークエラーの場合は空のレスポンスを返す
    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * バックグラウンドでキャッシュを更新
 * 同じURLの更新を制限してログの過剰出力を防止
 */
const updateCacheThrottle = new Map();

async function updateCacheInBackground(request) {
  const url = request.url;
  const now = Date.now();
  const lastUpdate = updateCacheThrottle.get(url) || 0;

  // 同じURLは60秒以内に複数回更新しない
  if (now - lastUpdate < 60000) {
    return;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse);
      updateCacheThrottle.set(url, now);

      // ログは開発時のみ（本番環境では削減）
      if (CACHE_VERSION <= 100) {
        console.log('[SW] Cache updated in background:', request.url);
      }
    }

  } catch (error) {
    // バックグラウンド更新の失敗は無視（ログも出力しない）
  }
}

// =====================================
// プッシュ通知（統一されたデータ構造）
// =====================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'お知らせ',
    body: '',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    url: '/'
  };

  // プッシュデータを解析
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Push payload:', payload);

      // Firebase HTTP v1 API形式（統一されたデータ構造）
      // GAS側から送信されるデータ構造に対応
      if (payload.data) {
        notificationData.title = payload.data.title || notificationData.title;
        notificationData.body = payload.data.body || notificationData.body;
        notificationData.url = payload.data.url || notificationData.url;
        notificationData.icon = payload.data.icon || notificationData.icon;
        notificationData.badge = payload.data.badge || notificationData.badge;
        notificationData.tag = payload.data.tag || payload.data.historyId || 'general';
      }

      // notification フィールドがある場合も対応（フォールバック）
      if (payload.notification) {
        notificationData.title = payload.notification.title || notificationData.title;
        notificationData.body = payload.notification.body || notificationData.body;
      }

    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
      // デフォルト値を使用
    }
  }

  // 通知オプション
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    data: {
      url: notificationData.url,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '開く'
      },
      {
        action: 'close',
        title: '閉じる'
      }
    ],
    requireInteraction: false,
    tag: notificationData.tag || 'nazuna-notification'
  };

  // 通知を表示
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// =====================================
// 通知クリック
// =====================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  // 「閉じる」アクションの場合は何もしない
  if (event.action === 'close') {
    return;
  }

  // URLを取得し正規化
  let urlToOpen = event.notification.data?.url || '/';
  try {
    // 空や不正な値をフォールバック
    if (typeof urlToOpen !== 'string' || urlToOpen.trim() === '') {
      urlToOpen = '/';
    }
    // 相対パスを絶対URLへ
    const targetUrl = new URL(urlToOpen, self.location.origin).toString();
    urlToOpen = targetUrl;
  } catch (e) {
    urlToOpen = self.location.origin + '/';
  }

  // プロトコル検証（http/https のみ許可）
  try {
    const parsed = new URL(urlToOpen);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      urlToOpen = self.location.origin + '/';
    }
  } catch (_e) {
    urlToOpen = self.location.origin + '/';
  }

  // クライアントを開く
  event.waitUntil(
    (async () => {
      try {
        // 既存のウィンドウを確認
        const allClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });

        // 同じURLのウィンドウが既に開いている場合はフォーカス
        for (const client of allClients) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen);

          if (clientUrl.pathname === targetUrl.pathname) {
            return client.focus();
          }
        }

        // 新しいウィンドウ/タブを開く（失敗時はフォールバック）
        let opened = null;
        try {
          opened = await clients.openWindow(urlToOpen);
        } catch (openErr) {
          // 握りつぶさずログのみ、後段でフォールバック
          console.warn('[SW] openWindow threw, falling back to origin:', openErr);
        }
        if (opened && 'focus' in opened) {
          return opened.focus();
        }
        // フォールバック: 既存クライアントにnavigate試行
        if (allClients && allClients[0] && 'navigate' in allClients[0]) {
          return allClients[0].navigate(urlToOpen);
        }
        // 最終フォールバック: ルートを開く
        try {
          const rootOpened = await clients.openWindow(self.location.origin + '/');
          if (rootOpened && 'focus' in rootOpened) {
            return rootOpened.focus();
          }
        } catch (_) {
          // 何もできない
        }
        return null;

      } catch (error) {
        console.error('[SW] Failed to open window:', error);
      }
    })()
  );
});

// =====================================
// メッセージ受信（クライアントからの通信）
// =====================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith(CACHE_PREFIX)) {
              console.log('[SW] Clearing cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      cacheName: CACHE_NAME
    });
  }
});

// =====================================
// バックグラウンド同期（オプション）
// =====================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    // バックグラウンドで通知データを同期
    console.log('[SW] Syncing notifications...');

    // ここに同期ロジックを実装

  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// =====================================
// エラーハンドリング
// =====================================

self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

console.log('[SW] Service Worker loaded, version:', CACHE_VERSION);

// ===============================
// Update communication to page
// ===============================
try {
  const channel = new BroadcastChannel('pwa-updates');
  // 通知: 現在のキャッシュ名
  const postCacheName = () => {
    try { channel.postMessage({ type: 'CACHE_NAME', cacheName: CACHE_NAME }); } catch (e) { }
  };
  // 起動時に送信
  postCacheName();
  // activate時にも送信
  self.addEventListener('activate', () => { postCacheName(); });
  // ページからのCHECK_UPDATE要求に応答
  self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data && data.type === 'CHECK_UPDATE') {
      postCacheName();
    }
  });
} catch (e) { }