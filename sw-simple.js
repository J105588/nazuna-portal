/**
 * Simple Service Worker - Nazuna Portal
 * シンプルで確実な通知処理
 */

const CACHE_VERSION = 2;
const CACHE_NAME = `nazuna-portal-simple-v${CACHE_VERSION}`;

// =====================================
// インストール
// =====================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Simple Service Worker version', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // 必須ファイルのみキャッシュ
        const essentialFiles = [
          '/',
          '/index.html',
          '/css/style.css',
          '/js/app.js',
          '/js/simple-notification-manager.js'
        ];
        
        const cachePromises = essentialFiles.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log(`[SW] Cached: ${url}`);
              return true;
            } else {
              console.warn(`[SW] Failed to cache ${url}: ${response.status}`);
              return false;
            }
          } catch (error) {
            console.warn(`[SW] Failed to cache ${url}:`, error.message);
            return false;
          }
        });
        
        const results = await Promise.allSettled(cachePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        
        console.log(`[SW] Caching complete: ${successCount}/${essentialFiles.length} files cached`);
        
        await self.skipWaiting();
        
      } catch (error) {
        console.error('[SW] Installation failed:', error);
        await self.skipWaiting();
      }
    })()
  );
});

// =====================================
// アクティベーション
// =====================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Simple Service Worker version', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // 古いキャッシュを削除
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('nazuna-portal') && name !== CACHE_NAME
        );
        
        if (oldCaches.length > 0) {
          console.log('[SW] Deleting old caches:', oldCaches);
          await Promise.all(oldCaches.map(name => caches.delete(name)));
        }
        
        // クライアントを制御
        await self.clients.claim();
        
        console.log('[SW] Simple Service Worker activated');
        
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

// =====================================
// プッシュ通知受信
// =====================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push message received:', event);
  
  if (!event.data) {
    console.warn('[SW] No push data received');
    return;
  }
  
  try {
    // プッシュデータを解析
    const data = event.data.json();
    console.log('[SW] Push data:', data);
    
    // 通知の内容を取得
    const title = data.notification?.title || data.title || 'お知らせ';
    const body = data.notification?.body || data.body || '新しい通知があります';
    const icon = data.notification?.icon || data.icon || 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png';
    const badge = data.notification?.badge || data.badge || '/images/badge-72x72.png';
    const url = data.data?.url || data.url || '/';
    const tag = data.data?.tag || data.tag || data.data?.historyId || 'general';
    
    // 通知オプション
    const options = {
      body: body,
      icon: icon,
      badge: badge,
      tag: tag,
      requireInteraction: false,
      actions: [
        { action: 'view', title: '詳細を見る' },
        { action: 'dismiss', title: '閉じる' }
      ],
      data: {
        url: url,
        timestamp: Date.now(),
        originalData: data
      }
    };
    
    // 通知を表示
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
    
    console.log('[SW] Notification displayed:', title);
    
  } catch (error) {
    console.error('[SW] Error processing push message:', error);
    
    // フォールバック通知
    event.waitUntil(
      self.registration.showNotification('お知らせ', {
        body: '新しい通知があります',
        icon: 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
        tag: 'nazuna-notification'
      })
    );
  }
});

// =====================================
// 通知クリック処理
// =====================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  // 通知を閉じる
  event.notification.close();
  
  // クリックされたアクションを確認
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    console.log('[SW] Notification dismissed');
    return;
  }
  
  // 開くURLを決定
  const urlToOpen = data?.url || '/';
  console.log('[SW] Opening URL:', urlToOpen);
  
  event.waitUntil(
    (async () => {
      try {
        // 既存のクライアントを取得
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        
        // 同じオリジンのタブがあるかチェック
        for (const client of clients) {
          try {
            const clientUrl = new URL(client.url);
            const targetUrl = new URL(urlToOpen, self.location.origin);
            
            if (clientUrl.origin === targetUrl.origin) {
              // 既存のタブにフォーカスしてURLを更新
              await client.focus();
              if (client.navigate) {
                await client.navigate(targetUrl.href);
              } else {
                client.postMessage({ type: 'NAVIGATE', url: targetUrl.href });
              }
              return;
            }
          } catch (e) {
            // URL解析エラーは無視
          }
        }
        
        // 新しいタブを開く
        if (self.clients.openWindow) {
          await self.clients.openWindow(urlToOpen);
        }
        
      } catch (error) {
        console.error('[SW] Error handling notification click:', error);
      }
    })()
  );
});

// =====================================
// フェッチ処理
// =====================================

self.addEventListener('fetch', (event) => {
  // キャッシュ戦略: ネットワークファースト
  event.respondWith(
    (async () => {
      try {
        // まずネットワークから取得を試行
        const networkResponse = await fetch(event.request);
        
        if (networkResponse.ok) {
          // 成功した場合はキャッシュに保存
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
        
      } catch (error) {
        // ネットワークエラーの場合はキャッシュから取得
        console.log('[SW] Network failed, trying cache:', event.request.url);
        
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // キャッシュにもない場合はエラーページを返す
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});

// =====================================
// メッセージ処理
// =====================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting requested');
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_VERSION });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

console.log('[SW] Simple Service Worker loaded');
