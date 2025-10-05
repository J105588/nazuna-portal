// 通知管理システム（GAS + FCM連携版）

class NotificationManager {
    constructor() {
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        this.registration = null;
        this.fcmToken = null;
        this.vapidPublicKey = null; // Firebase Consoleから取得したVAPIDキー
        this.gasEndpoint = CONFIG.GAS_URL; // GASのWebAppエンドポイント
        
        console.log('NotificationManager initialized. Support:', this.isSupported);
    }
    
    // 初期化
    async init() {
        if (!this.isSupported) {
            console.warn('Push messaging is not supported');
            return false;
        }
        
        try {
            // Service Worker登録を取得
            this.registration = await navigator.serviceWorker.getRegistration();
            if (!this.registration) {
                console.error('Service Worker not registered');
                return false;
            }
            
            console.log('NotificationManager initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing NotificationManager:', error);
            return false;
        }
    }
    
    // 通知許可の要求
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push messaging is not supported');
        }
        
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        
        if (permission === 'granted') {
            await this.subscribeToPush();
            return true;
        } else if (permission === 'denied') {
            throw new Error('Notification permission denied');
        } else {
            throw new Error('Notification permission dismissed');
        }
    }
    
    // FCMトークンの取得と登録
    async subscribeToPush() {
        try {
            // Firebase SDKを使用してFCMトークンを取得
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                // Firebase SDK使用時
                const messaging = firebase.messaging();
                
                // VAPIDキーをgetToken()のオプションで指定（usePublicVapidKeyは非推奨）
                const tokenOptions = this.vapidPublicKey ? { vapidKey: this.vapidPublicKey } : {};
                this.fcmToken = await messaging.getToken(tokenOptions);
                console.log('FCM token obtained:', this.fcmToken);
                
                // トークン更新の監視
                messaging.onTokenRefresh(async () => {
                    const tokenOptions = this.vapidPublicKey ? { vapidKey: this.vapidPublicKey } : {};
                    this.fcmToken = await messaging.getToken(tokenOptions);
                    await this.registerDevice();
                });
                
                // フォアグラウンドメッセージの処理
                messaging.onMessage((payload) => {
                    this.handleForegroundMessage(payload);
                });
                
            } else {
                // Service Worker Push APIを使用（フォールバック）
                this.subscription = await this.registration.pushManager.getSubscription();
                
                if (!this.subscription) {
                    const subscribeOptions = {
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey || this.getDefaultVapidKey())
                    };
                    
                    this.subscription = await this.registration.pushManager.subscribe(subscribeOptions);
                }
                
                // FCMトークンとして endpoint を使用
                this.fcmToken = this.subscription.endpoint;
                console.log('Push subscription created (fallback mode)');
            }
            
            // デバイス情報をGASに登録
            await this.registerDevice();
            
            return this.fcmToken;
        } catch (error) {
            console.error('Failed to subscribe to push:', error);
            throw error;
        }
    }
    
    // デバイス情報をGASに登録
    async registerDevice() {
        try {
            if (!this.fcmToken) {
                throw new Error('FCM token not available');
            }
            
            const deviceData = {
                action: 'registerDevice',
                fcmToken: this.fcmToken,
                userAgent: navigator.userAgent,
                platform: this.getPlatform(),
                browser: this.getBrowser(),
                deviceInfo: {
                    screen: {
                        width: screen.width,
                        height: screen.height
                    },
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    online: navigator.onLine
                }
            };
            
            const response = await fetch(this.gasEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deviceData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Device registration failed');
            }
            
            console.log('Device registered successfully:', result.data);
            
            // ローカルストレージに保存
            localStorage.setItem('fcm-token', this.fcmToken);
            localStorage.setItem('device-registered', new Date().toISOString());
            
            return result.data;
            
        } catch (error) {
            console.error('Error registering device:', error);
            throw error;
        }
    }
    
    // プッシュ通知の購読解除
    async unsubscribeFromPush() {
        try {
            if (this.fcmToken) {
                // GASにデバイス登録解除を通知
                await this.unregisterDevice();
                
                // Firebase SDK使用時
                if (typeof firebase !== 'undefined' && firebase.messaging) {
                    const messaging = firebase.messaging();
                    await messaging.deleteToken(this.fcmToken);
                }
                
                // Service Worker Push API使用時
                if (this.subscription) {
                    await this.subscription.unsubscribe();
                    this.subscription = null;
                }
                
                this.fcmToken = null;
                
                // ローカルストレージをクリア
                localStorage.removeItem('fcm-token');
                localStorage.removeItem('device-registered');
                
                console.log('Push subscription removed');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error unsubscribing from push:', error);
            throw error;
        }
    }
    
    // デバイス登録解除
    async unregisterDevice() {
        try {
            if (!this.fcmToken) {
                return;
            }
            
            const response = await fetch(this.gasEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'unregisterDevice',
                    fcmToken: this.fcmToken
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                console.warn('Device unregistration failed:', result.error);
            } else {
                console.log('Device unregistered successfully');
            }
            
        } catch (error) {
            console.error('Error unregistering device:', error);
            throw error;
        }
    }
    
    // 現在の購読状態を取得
    async getSubscriptionStatus() {
        try {
            if (!this.registration) {
                return { supported: false, subscribed: false };
            }
            
            const permission = Notification.permission;
            const hasToken = !!this.fcmToken || !!localStorage.getItem('fcm-token');
            
            return {
                supported: this.isSupported,
                permission: permission,
                subscribed: hasToken,
                fcmToken: this.fcmToken || localStorage.getItem('fcm-token'),
                lastRegistered: localStorage.getItem('device-registered')
            };
        } catch (error) {
            console.error('Error getting subscription status:', error);
            return { supported: false, subscribed: false, error: error.message };
        }
    }
    
    // フォアグラウンドメッセージの処理
    handleForegroundMessage(payload) {
        console.log('Foreground message received:', payload);
        
        const { notification, data } = payload;
        
        // カスタム通知を表示
        if (notification) {
            const options = {
                body: notification.body,
                icon: notification.icon || '/images/icon-192x192.png',
                badge: notification.badge || '/images/badge-72x72.png',
                tag: data?.category || 'general',
                requireInteraction: data?.priority === '2',
                actions: notification.actions || [],
                data: data || {}
            };
            
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(notification.title || 'お知らせ', options);
                });
            } else {
                // フォールバック
                new Notification(notification.title || 'お知らせ', options);
            }
        }
    }
    
    // テスト通知の送信
    async sendTestNotification() {
        try {
            if (Notification.permission === 'granted') {
                const notification = new Notification('テスト通知', {
                    body: 'これはテスト通知です。通知システムが正常に動作しています。',
                    icon: './images/icon-192x192.png',
                    badge: './images/badge-72x72.png',
                    tag: 'test-notification',
                    requireInteraction: false
                });
                
                notification.onclick = function() {
                    window.focus();
                    this.close();
                };
                
                // 5秒後に自動で閉じる
                setTimeout(() => {
                    notification.close();
                }, 5000);
                
                return true;
            } else {
                throw new Error('Notification permission not granted');
            }
        } catch (error) {
            console.error('Error sending test notification:', error);
            throw error;
        }
    }
    
    // ユーティリティ関数：Base64をUint8Arrayに変換
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // ユーティリティ関数：ArrayBufferをBase64に変換
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
    
    // プラットフォーム検出
    getPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/android/.test(userAgent)) return 'android';
        if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
        if (/windows/.test(userAgent)) return 'windows';
        if (/macintosh|mac os x/.test(userAgent)) return 'macos';
        if (/linux/.test(userAgent)) return 'linux';
        
        return 'web';
    }
    
    // ブラウザ検出
    getBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/chrome/.test(userAgent) && !/edge/.test(userAgent)) return 'chrome';
        if (/firefox/.test(userAgent)) return 'firefox';
        if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) return 'safari';
        if (/edge/.test(userAgent)) return 'edge';
        if (/opera/.test(userAgent)) return 'opera';
        
        return 'unknown';
    }
    
    // デフォルトのVAPIDキー（実際の運用では適切なキーを設定）
    getDefaultVapidKey() {
        // 実際の運用時はFirebase ConsoleのVAPIDキーを設定
        return 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLb5vdNt6ZIjBhgPCIKKhYhUGrTFDe4sHOVGKLFXfIGr3Qc4Jt6QE';
    }
}

// 通知UI管理
class NotificationUI {
    constructor(notificationManager) {
        this.manager = notificationManager;
        this.statusElement = null;
        this.enableButton = null;
        this.disableButton = null;
        this.testButton = null;
    }
    
    // UI要素を初期化
    init() {
        this.statusElement = document.getElementById('notification-status');
        this.enableButton = document.getElementById('enable-notifications');
        this.disableButton = document.getElementById('disable-notifications');
        this.testButton = document.getElementById('test-notification');
        
        if (this.enableButton) {
            this.enableButton.addEventListener('click', () => this.enableNotifications());
        }
        
        if (this.disableButton) {
            this.disableButton.addEventListener('click', () => this.disableNotifications());
        }
        
        if (this.testButton) {
            this.testButton.addEventListener('click', () => this.sendTestNotification());
        }
        
        // 初期状態を更新
        this.updateUI();
    }
    
    // 通知を有効化
    async enableNotifications() {
        try {
            this.setButtonLoading(this.enableButton, true);
            await this.manager.requestPermission();
            this.showMessage('通知が有効になりました！', 'success');
            this.updateUI();
        } catch (error) {
            console.error('Error enabling notifications:', error);
            this.showMessage('通知の有効化に失敗しました: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(this.enableButton, false);
        }
    }
    
    // 通知を無効化
    async disableNotifications() {
        try {
            this.setButtonLoading(this.disableButton, true);
            await this.manager.unsubscribeFromPush();
            this.showMessage('通知が無効になりました', 'info');
            this.updateUI();
        } catch (error) {
            console.error('Error disabling notifications:', error);
            this.showMessage('通知の無効化に失敗しました: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(this.disableButton, false);
        }
    }
    
    // テスト通知を送信
    async sendTestNotification() {
        try {
            this.setButtonLoading(this.testButton, true);
            await this.manager.sendTestNotification();
            this.showMessage('テスト通知を送信しました', 'success');
        } catch (error) {
            console.error('Error sending test notification:', error);
            this.showMessage('テスト通知の送信に失敗しました: ' + error.message, 'error');
        } finally {
            this.setButtonLoading(this.testButton, false);
        }
    }
    
    // UI状態を更新
    async updateUI() {
        const status = await this.manager.getSubscriptionStatus();
        
        if (!this.statusElement) return;
        
        if (!status.supported) {
            this.statusElement.innerHTML = `
                <div class="notification-status-item">
                    <i class="fas fa-times-circle text-error"></i>
                    <span>このブラウザは通知をサポートしていません</span>
                </div>
            `;
            this.hideButtons();
            return;
        }
        
        if (status.permission === 'denied') {
            this.statusElement.innerHTML = `
                <div class="notification-status-item">
                    <i class="fas fa-times-circle text-error"></i>
                    <span>通知が拒否されています。ブラウザの設定から許可してください。</span>
                </div>
            `;
            this.hideButtons();
            return;
        }
        
        if (status.subscribed) {
            this.statusElement.innerHTML = `
                <div class="notification-status-item">
                    <i class="fas fa-check-circle text-success"></i>
                    <span>通知が有効になっています</span>
                </div>
            `;
            this.showButton(this.disableButton);
            this.showButton(this.testButton);
            this.hideButton(this.enableButton);
        } else {
            this.statusElement.innerHTML = `
                <div class="notification-status-item">
                    <i class="fas fa-info-circle text-info"></i>
                    <span>通知を有効にしてお知らせを受け取りましょう</span>
                </div>
            `;
            this.showButton(this.enableButton);
            this.hideButton(this.disableButton);
            this.hideButton(this.testButton);
        }
    }
    
    // ボタンの表示/非表示
    showButton(button) {
        if (button) {
            button.style.display = 'inline-flex';
        }
    }
    
    hideButton(button) {
        if (button) {
            button.style.display = 'none';
        }
    }
    
    hideButtons() {
        this.hideButton(this.enableButton);
        this.hideButton(this.disableButton);
        this.hideButton(this.testButton);
    }
    
    // ボタンのローディング状態
    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            const originalText = button.innerHTML;
            button.dataset.originalText = originalText;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
    }
    
    // メッセージ表示
    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `notification-message notification-message-${type}`;
        messageEl.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-message-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(messageEl);
        
        // 自動で消す
        setTimeout(() => {
            if (messageEl.parentElement) {
                messageEl.remove();
            }
        }, 5000);
    }
}

// グローバルインスタンス
let notificationManager = null;
let notificationUI = null;

// 初期化
async function initNotificationSystem() {
    try {
        notificationManager = new NotificationManager();
        const initialized = await notificationManager.init();
        
        if (initialized) {
            notificationUI = new NotificationUI(notificationManager);
            notificationUI.init();
            console.log('Notification system initialized successfully');
        } else {
            console.warn('Failed to initialize notification system');
        }
    } catch (error) {
        console.error('Error initializing notification system:', error);
    }
}

// DOMが読み込まれたら初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotificationSystem);
} else {
    initNotificationSystem();
}

// グローバルに公開
window.notificationManager = notificationManager;
window.notificationUI = notificationUI;
window.initNotificationSystem = initNotificationSystem;
