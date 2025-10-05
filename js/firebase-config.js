// Firebase設定ファイル
// 実際の運用時はFirebase Consoleから取得した設定値を使用

// Firebase設定ファイル
// 実際の運用時はFirebase Consoleから取得した設定値を使用
// ES6 importは使用せず、CDNから読み込まれたFirebase SDKを使用

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDQ8g88Z4rW-nX6TzCGjxFvfDptju4fOIc",
    authDomain: "nazuna-portal.firebaseapp.com",
    projectId: "nazuna-portal",
    storageBucket: "nazuna-portal.firebasestorage.app", // Firebase Storage用の新しいドメイン
    messagingSenderId: "181514532945",
    appId: "1:181514532945:web:65043ee5d7d435a7af6070"
};

// Firebase初期化（CDN版を使用）
// const app = initializeApp(firebaseConfig); // ES6 import版は使用しない

// VAPIDキー（Firebase Console > Project Settings > Cloud Messaging から取得）
// Web Push通知などで使用します
const vapidKey = "BCEnp7nRdNubcooPI86iEEFqavkUxRal0t3AKkjsC1nB-PYLOUiE-EnGITJKfdANSRCG7zjyRzR6ERX3ZT0tZMQ";

// Firebase初期化（クロスプラットフォーム対応）
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
        
        // Firebase Messaging初期化（簡略版）
        if (firebase.messaging.isSupported()) {
            const messaging = firebase.messaging();
            
            // VAPIDキー設定（新しい方法）
            if (vapidKey && vapidKey !== 'your-vapid-key-here') {
                console.log('VAPID key available for token generation');
            }
            
            // 通知許可の要求（iOS対応）
            requestNotificationPermission()
                .then((permission) => {
                    if (permission === 'granted') {
                        console.log('Notification permission granted');
                        // VAPIDキーをgetToken()のオプションで指定
                        const tokenOptions = vapidKey && vapidKey !== 'your-vapid-key-here' 
                            ? { vapidKey: vapidKey } 
                            : {};
                        return messaging.getToken(tokenOptions);
                    } else {
                        console.log('Notification permission denied');
                        return null;
                    }
                })
                .then((token) => {
                    if (token) {
                        console.log('FCM Token:', token);
                        // トークンをGASに送信
                        registerFCMToken(token);
                    }
                })
                .catch((error) => {
                    console.error('Firebase Messaging initialization failed:', error);
                });
            
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

// 通知許可の要求（iOS対応）
function requestNotificationPermission() {
    return new Promise((resolve) => {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                resolve('granted');
            } else if (Notification.permission === 'denied') {
                resolve('denied');
            } else {
                Notification.requestPermission().then((permission) => {
                    resolve(permission);
                });
            }
        } else {
            resolve('denied');
        }
    });
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
        icon: notification?.icon || 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
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

// Service Workerファイルを登録
function setupFirebaseServiceWorker() {
    if ('serviceWorker' in navigator) {
        // iOS環境の検出
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
        const isIOSPWA = isIOS && isPWA;
        
        // iOS PWA環境でのバージョン検出
        let iosVersion = null;
        if (isIOS) {
            const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
            if (match) {
                iosVersion = parseFloat(`${match[1]}.${match[2]}`);
            }
        }
        
        // iOS 16.4以降はネイティブのプッシュ通知をサポート
        const useNativePush = !isIOSPWA || (isIOSPWA && iosVersion >= 16.4);
        
        // 静的なService Workerファイルを使用（動的生成よりも信頼性が高い）
        const swUrl = '/firebase-messaging-sw.js';
        
        navigator.serviceWorker.register(swUrl, { scope: './' })
            .then((registration) => {
                console.log('Firebase Messaging Service Worker registered:', registration);
                
                // Firebase Messagingに登録を伝える
                if (typeof firebase !== 'undefined' && firebase.messaging && firebase.messaging.isSupported()) {
                    const messaging = firebase.messaging();
                    // 新しいFirebase SDKでは自動的にService Workerが検出される
                    console.log('Firebase Messaging ready with Service Worker');
                }
            })
            .catch((error) => {
                console.error('Firebase Messaging Service Worker registration failed:', error);
                
                // iOS PWAの場合は特別な処理
                if (isIOSPWA) {
                    console.log('iOS PWA環境でService Worker登録に失敗しました。カスタム通知UIを使用します。');
                    // iOS PWAではService Workerの制限があるため、カスタム通知UIを使用
                    if (window.notificationManager) {
                        const supportInfo = window.notificationManager.checkIOSPWASupport();
                        console.log('iOS PWA診断情報:', supportInfo);
                    }
                }
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

// FCMトークンをGASに登録（クロスプラットフォーム対応）
async function registerFCMToken(token) {
    try {
        const deviceInfo = getDeviceInfo();
        
        // 登録の再試行ロジック
        let retries = 3;
        let result = null;
        
        while (retries > 0) {
            try {
                // GASにトークンを登録
                result = await apiClient.sendRequest('registerFCMToken', {
                    fcmToken: token,
                    deviceInfo: deviceInfo,
                    timestamp: new Date().toISOString()
                }, {
                    timeout: 10000 // タイムアウトを10秒に設定
                });
                
                if (result.success) {
                    break; // 成功したらループを抜ける
                } else {
                    console.warn(`FCM token registration failed (${retries} retries left):`, result.error);
                    retries--;
                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
                    }
                }
            } catch (err) {
                console.warn(`FCM token registration error (${retries} retries left):`, err);
                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
                }
            }
        }
        
        if (result && result.success) {
            console.log('FCM token registered successfully');
            // ローカルストレージに保存
            localStorage.setItem('fcmToken', token);
            localStorage.setItem('fcmTokenTimestamp', new Date().toISOString());
        } else {
            console.error('Failed to register FCM token:', result?.error || 'Registration failed after retries');
            // オフライン時はローカルストレージに保存
            localStorage.setItem('fcmToken', token);
            localStorage.setItem('fcmTokenTimestamp', new Date().toISOString());
        }
    } catch (error) {
        console.error('Error registering FCM token:', error);
        // オフライン時はローカルストレージに保存
        localStorage.setItem('fcmToken', token);
        localStorage.setItem('fcmTokenTimestamp', new Date().toISOString());
    }
}

// プラットフォーム検出（詳細版）
function getPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform ? navigator.platform.toLowerCase() : '';
    
    // Android
    if (/android/.test(userAgent)) {
        return 'android';
    }
    
    // iOS
    if (/iphone|ipad|ipod/.test(userAgent) || 
        (platform === 'macintel' && 'ontouchend' in document)) {
        return 'ios';
    }
    
    // Windows
    if (/windows/.test(userAgent) || platform.includes('win')) {
        return 'windows';
    }
    
    // macOS
    if (/macintosh|mac os x/.test(userAgent) || platform === 'macintel') {
        return 'macos';
    }
    
    // Linux
    if (/linux/.test(userAgent) || platform.includes('linux')) {
        return 'linux';
    }
    
    // Chrome OS
    if (/cros/.test(userAgent)) {
        return 'chromeos';
    }
    
    return 'web';
}

// デバイス情報の取得
function getDeviceInfo() {
    return {
        platform: getPlatform(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        onLine: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        screenWidth: screen.width,
        screenHeight: screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString()
    };
}

// PWA対応状況のテスト
function testPWACompatibility() {
    const results = {
        platform: getPlatform(),
        serviceWorker: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        pushManager: 'PushManager' in window,
        manifest: document.querySelector('link[rel="manifest"]') !== null,
        offline: 'onLine' in navigator,
        installPrompt: false,
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        deviceInfo: getDeviceInfo()
    };
    
    // インストールプロンプトの検出
    window.addEventListener('beforeinstallprompt', (e) => {
        results.installPrompt = true;
        console.log('PWA install prompt available');
    });
    
    console.log('PWA Compatibility Test Results:', results);
    return results;
}

// 通知機能のテスト
function testNotificationSupport() {
    if ('Notification' in window) {
        console.log('Notification permission:', Notification.permission);
        
        if (Notification.permission === 'granted') {
            // テスト通知を送信
            new Notification('なずなポータル', {
                body: '通知機能が正常に動作しています',
                icon: 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
                tag: 'test'
            });
            return true;
        } else if (Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    testNotificationSupport();
                }
            });
        }
    }
    return false;
}

// 設定値をグローバルに公開
window.firebaseConfig = firebaseConfig;
window.vapidKey = vapidKey;
window.initializeFirebase = initializeFirebase;
window.registerFCMToken = registerFCMToken;
window.getPlatform = getPlatform;
window.getDeviceInfo = getDeviceInfo;
window.testPWACompatibility = testPWACompatibility;
window.testNotificationSupport = testNotificationSupport;
