// Firebase設定ファイル
// 実際の運用時はFirebase Consoleから取得した設定値を使用

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQ8g88Z4rW-nX6TzCGjxFvfDptju4fOIc",
    authDomain: "nazuna-portal.firebaseapp.com",
    projectId: "nazuna-portal",
    storageBucket: "nazuna-portal.appspot.com", // こちらの.appspot.comドメインのものを採用しました
    messagingSenderId: "181514532945",
    appId: "1:181514532945:web:65043ee5d7d435a7af6070"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// VAPIDキー（Firebase Console > Project Settings > Cloud Messaging から取得）
// Web Push通知などで使用します
const vapidKey = "BCEnp7nRdNubcooPI86iEEFqavkUxRal0t3AKkjsC1nB-PYLOUiE-EnGITJKfdANSRCG7zjyRzR6ERX3ZT0tZMQ";

// Firebase初期化
function initializeFirebase() {
    try {
        // Firebase SDKが読み込まれているかチェック
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded. Using fallback push notification system.');
            return false;
        }
        
        // Firebase初期化
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized successfully');
        }
        
        // Firebase Messaging初期化
        if (firebase.messaging.isSupported()) {
            const messaging = firebase.messaging();
            
            // VAPIDキー設定
            if (vapidKey && vapidKey !== 'your-vapid-key-here') {
                messaging.usePublicVapidKey(vapidKey);
            }
            
            // Service Worker登録（Firebase Messaging用）
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./firebase-messaging-sw.js')
                    .then((registration) => {
                        console.log('Firebase Service Worker registered:', registration);
                        messaging.useServiceWorker(registration);
                    })
                    .catch((error) => {
                        console.error('Firebase Service Worker registration failed:', error);
                    });
            }
            
            console.log('Firebase Messaging initialized successfully');
            return true;
        } else {
            console.warn('Firebase Messaging is not supported in this browser');
            return false;
        }
        
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return false;
    }
}

// Firebase Messaging Service Worker用の設定
function createFirebaseMessagingServiceWorker() {
    const swContent = `
// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase設定
const firebaseConfig = ${JSON.stringify(firebaseConfig)};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firebase Messaging初期化
const messaging = firebase.messaging();

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

// 通知クリック処理
self.addEventListener('notificationclick', function(event) {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    if (event.action === 'dismiss') {
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
                        if (urlToOpen !== '/') {
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
    `;
    
    return swContent;
}

// Service Workerファイルを動的に作成
function setupFirebaseServiceWorker() {
    if ('serviceWorker' in navigator) {
        const swContent = createFirebaseMessagingServiceWorker();
        const blob = new Blob([swContent], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl, { scope: './' })
            .then((registration) => {
                console.log('Firebase Messaging Service Worker registered:', registration);
                
                // Firebase Messagingに登録を伝える
                if (typeof firebase !== 'undefined' && firebase.messaging && firebase.messaging.isSupported()) {
                    const messaging = firebase.messaging();
                    messaging.useServiceWorker(registration);
                }
            })
            .catch((error) => {
                console.error('Firebase Messaging Service Worker registration failed:', error);
            });
    }
}

// 初期化処理
document.addEventListener('DOMContentLoaded', function() {
    // Firebase初期化
    const firebaseInitialized = initializeFirebase();
    
    if (firebaseInitialized) {
        // 通知マネージャーにVAPIDキーを設定
        if (window.notificationManager && vapidKey !== 'your-vapid-key-here') {
            window.notificationManager.vapidPublicKey = vapidKey;
        }
    }
});

// 設定値をグローバルに公開
window.firebaseConfig = firebaseConfig;
window.vapidKey = vapidKey;
window.initializeFirebase = initializeFirebase;
