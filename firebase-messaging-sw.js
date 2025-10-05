// Firebase Messaging Service Worker
// iOS、Android、Windows対応版
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyDQ8g88Z4rW-nX6TzCGjxFvfDptju4fOIc",
    authDomain: "nazuna-portal.firebaseapp.com",
    projectId: "nazuna-portal",
    storageBucket: "nazuna-portal.firebasestorage.app",
    messagingSenderId: "181514532945",
    appId: "1:181514532945:web:65043ee5d7d435a7af6070"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firebase Messaging初期化
const messaging = firebase.messaging();

// iOS対応: 通知許可の確認
self.addEventListener('push', function(event) {
    console.log('Push event received:', event);
    
    if (event.data) {
        const data = event.data.json();
        console.log('Push data:', data);
        
        const options = {
            body: data.body || 'お知らせがあります',
            icon: data.icon || '/images/icon-192x192.png',
            badge: '/images/badge-72x72.png',
            tag: data.tag || 'general',
            data: {
                url: data.url || '/',
                category: data.category || 'general',
                timestamp: Date.now()
            },
            actions: [
                { action: 'view', title: '詳細を見る' },
                { action: 'dismiss', title: '閉じる' }
            ],
            requireInteraction: data.requireInteraction || false,
            silent: false,
            vibrate: [200, 100, 200],
            timestamp: Date.now()
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'お知らせ', options)
        );
    }
});

// バックグラウンドメッセージ処理
messaging.onBackgroundMessage(function(payload) {
    console.log('Received background message:', payload);
    
    const { notification, data } = payload;
    
    const notificationTitle = notification?.title || 'お知らせ';
    const notificationOptions = {
        body: notification?.body || 'お知らせがあります',
        icon: notification?.icon || '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        tag: data?.category || 'general',
        requireInteraction: data?.priority === '2',
        data: {
            url: data?.url || '/',
            category: data?.category || 'general',
            timestamp: Date.now()
        },
        actions: notification?.actions || [
            { action: 'view', title: '詳細を見る' },
            { action: 'dismiss', title: '閉じる' }
        ]
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック処理（クロスプラットフォーム対応）
self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    const action = event.action;
    
    if (action === 'dismiss') {
        return;
    }
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            // 既に開いているタブがあるかチェック
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus().then(() => {
                        if (urlToOpen !== '/' && urlToOpen !== self.location.origin) {
                            return client.navigate(urlToOpen);
                        }
                    });
                }
            }
            
            // 新しいタブを開く
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        }).catch(function(error) {
            console.error('Error handling notification click:', error);
            // フォールバック: 新しいタブを開く
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// iOS対応: 通知の表示処理
self.addEventListener('notificationclose', function(event) {
    console.log('Notification closed:', event);
});

// バックグラウンド同期（オフライン対応）
self.addEventListener('sync', function(event) {
    console.log('Background sync:', event);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // オフライン時のデータ同期処理
            syncOfflineData()
        );
    }
});

// オフライン時のデータ同期
async function syncOfflineData() {
    try {
        // オフライン時に保存されたデータを同期
        const cache = await caches.open('nazuna-portal-cache');
        const requests = await cache.keys();
        
        for (const request of requests) {
            if (request.url.includes('/api/')) {
                // APIリクエストを再実行
                try {
                    await fetch(request);
                } catch (error) {
                    console.log('Sync failed for:', request.url);
                }
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}
