const CACHE_NAME = 'nazuna-portal-v3';
const urlsToCache = [
  './',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/pwa-install.js',
  './js/pwa-update.js',
  './manifest.json',
  './index.html',
  './images/icon-192x192.png'
];

// インストール時のキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// リクエスト時のキャッシュ戦略
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればそれを返す、なければネットワークから取得
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // レスポンスが正常でない場合はそのまま返す
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// プッシュ通知の受信
self.addEventListener('push', event => {
  console.log('Push message received:', event);
  
  let notificationData = {
    title: '生徒会ポータル',
    body: 'お知らせがあります',
    icon: './images/icon-192x192.png',
    badge: './images/badge-72x72.png',
    url: './',
    tag: 'general'
  };
  
  // プッシュデータがある場合は解析
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        url: data.url || notificationData.url,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || []
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    requireInteraction: notificationData.requireInteraction,
    tag: notificationData.tag,
    renotify: true,
    actions: notificationData.actions,
    data: {
      url: notificationData.url,
      dateOfArrival: Date.now(),
      originalData: event.data ? event.data.json() : null
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// 通知のクリック処理
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || './';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // 既に開いているタブがあるかチェック
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // 既存のタブにフォーカスして、必要に応じてナビゲート
          return client.focus().then(() => {
            if (urlToOpen !== './') {
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      
      // 新しいタブを開く
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 通知のアクションボタンクリック処理
self.addEventListener('notificationclick', event => {
  if (event.action) {
    console.log('Notification action clicked:', event.action);
    
    event.notification.close();
    
    // アクションに応じた処理
    let urlToOpen = './';
    switch (event.action) {
      case 'view_news':
        urlToOpen = './news.html';
        break;
      case 'view_forum':
        urlToOpen = './forum.html';
        break;
      case 'view_survey':
        urlToOpen = './survey.html';
        break;
      case 'dismiss':
        return; // 何もしない
    }
    
    event.waitUntil(clients.openWindow(urlToOpen));
  }
});

// バックグラウンド同期
self.addEventListener('sync', event => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// バックグラウンド同期処理
async function doBackgroundSync() {
  try {
    console.log('Performing background sync...');
    
    // オフライン時に蓄積されたデータを送信
    const offlineData = await getOfflineData();
    if (offlineData.length > 0) {
      for (const data of offlineData) {
        await sendToServer(data);
      }
      await clearOfflineData();
    }
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// オフラインデータの取得
async function getOfflineData() {
  try {
    const cache = await caches.open('offline-data');
    const requests = await cache.keys();
    const data = [];
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const json = await response.json();
        data.push(json);
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error getting offline data:', error);
    return [];
  }
}

// サーバーへのデータ送信
async function sendToServer(data) {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending data to server:', error);
    throw error;
  }
}

// オフラインデータのクリア
async function clearOfflineData() {
  try {
    await caches.delete('offline-data');
    console.log('Offline data cleared');
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
}

// Service Workerからのメッセージ受信
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Skipping waiting and activating new service worker');
    self.skipWaiting();
  }
});