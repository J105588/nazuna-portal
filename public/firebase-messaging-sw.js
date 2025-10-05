// Firebase Cloud Messaging Service Worker

// Firebase SDKをインポート
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebaseの設定情報
const firebaseConfig = {
  apiKey: "AIzaSyDQ8g88Z4rW-nX6TzCGjxFvfDptju4fOIc",
  authDomain: "nazuna-portal.firebaseapp.com",
  projectId: "nazuna-portal",
  storageBucket: "nazuna-portal.firebasestorage.app",
  messagingSenderId: "181514532945",
  appId: "1:181514532945:web:65043ee5d7d435a7af6070"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// バックグラウンドメッセージの処理
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // 通知データの取得
  const notificationTitle = payload.notification.title || 'お知らせ';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: payload.notification.icon || '/images/icon-192x192.png',
    badge: payload.notification.badge || '/images/badge-72x72.png',
    image: payload.notification.image,
    data: payload.data || {},
    tag: payload.data?.category || 'general',
    renotify: payload.data?.renotify === 'true',
    requireInteraction: payload.data?.requireInteraction === 'true',
    actions: []
  };
  
  // アクションの設定
  try {
    if (payload.data?.actions) {
      const actions = JSON.parse(payload.data.actions);
      if (Array.isArray(actions)) {
        notificationOptions.actions = actions.slice(0, 2); // 最大2つまで
      }
    }
  } catch (e) {
    console.error('Error parsing notification actions:', e);
  }
  
  // クリック時のURLを設定
  if (payload.data?.url) {
    notificationOptions.data.url = payload.data.url;
  }
  
  // 通知を表示
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click event', event);
  
  event.notification.close();
  
  // クリックされたアクションの処理
  const action = event.action;
  const notification = event.notification;
  const data = notification.data || {};
  
  // URLの決定（アクション固有のURLまたはデフォルトURL）
  let url = '/';
  
  if (action && notification.actions) {
    const clickedAction = notification.actions.find(a => a.action === action);
    if (clickedAction && clickedAction.url) {
      url = clickedAction.url;
    }
  } else if (data.url) {
    url = data.url;
  }
  
  // 分析データの送信（オプション）
  try {
    const analyticsData = {
      notification_id: data.notification_id,
      category: data.category,
      action: action || 'click',
      timestamp: Date.now()
    };
    
    // 分析データをサーバーに送信（実装は省略）
    console.log('Analytics data:', analyticsData);
  } catch (e) {
    console.error('Error sending analytics data:', e);
  }
  
  // クライアントを開くか、新しいウィンドウを開く
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(windowClients) {
      // 既に開いているウィンドウがあれば、そこに移動
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 新しいウィンドウを開く
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// プッシュサブスクリプションの変更イベント
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[firebase-messaging-sw.js] Push subscription changed', event);
  
  const applicationServerKey = self.registration.pushManager.getSubscription()
    .then(function(subscription) {
      return subscription.options.applicationServerKey;
    });
  
  event.waitUntil(
    Promise.all([
      applicationServerKey,
      self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      })
    ])
    .then(function([applicationServerKey, subscription]) {
      // 新しいサブスクリプションをサーバーに送信（実装は省略）
      console.log('New subscription:', subscription);
    })
  );
});

// Service Workerのインストール時の処理
self.addEventListener('install', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting(); // 即座にアクティブ化
});

// Service Workerのアクティベーション時の処理
self.addEventListener('activate', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(self.clients.claim()); // すべてのクライアントを制御
});