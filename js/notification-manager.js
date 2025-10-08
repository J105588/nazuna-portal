/**
 * Notification Manager - Nazuna Portal
 * 無限ループ修正版
 */

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.fcmToken = null;
        this.isInitialized = false;
        this.isRegistering = false; // 無限ループ防止フラグ
        this.messaging = null;
        
        console.log('[NotificationManager] Initialized');
    }
    
    // =====================================
    // 初期化
    // =====================================
    
    async initialize() {
        if (this.isInitialized) {
            console.log('[NotificationManager] Already initialized');
            return;
        }
        
        console.log('[NotificationManager] Starting initialization...');
        
        try {
            // 通知権限を確認
            this.permission = await this.checkPermission();
            
            console.log('[NotificationManager] Current permission:', this.permission);
            
            // Service Workerの確認
            if (!('serviceWorker' in navigator)) {
                console.error('[NotificationManager] Service Worker not supported');
                return false;
            }
            
            // Firebase Messagingの初期化
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                try {
                    this.messaging = firebase.messaging();
                    console.log('[NotificationManager] Firebase Messaging initialized');
                } catch (error) {
                    console.error('[NotificationManager] Firebase Messaging init failed:', error);
                }
            }
            
            // 既存のトークンをチェック
            const savedToken = localStorage.getItem('fcm_token');
            const isRegistered = localStorage.getItem('device_registered') === 'true';
            
            if (savedToken && isRegistered) {
                this.fcmToken = savedToken;
                console.log('[NotificationManager] Using saved FCM token');
            }
            
            this.isInitialized = true;
            
            // UIを更新
            this.updateUI();
            
            return true;
            
        } catch (error) {
            console.error('[NotificationManager] Initialization failed:', error);
            return false;
        }
    }
    
    // =====================================
    // 権限管理
    // =====================================
    
    async checkPermission() {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        
        return Notification.permission;
    }
    
    async requestPermission() {
        console.log('[NotificationManager] Requesting notification permission...');
        
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            console.log('[NotificationManager] Permission result:', permission);
            
            if (permission === 'granted') {
                // FCMトークンを取得して登録
                await this.getFCMToken();
            }
            
            this.updateUI();
            
            return permission;
            
        } catch (error) {
            console.error('[NotificationManager] Permission request failed:', error);
            return 'denied';
        }
    }
    
    // =====================================
    // FCMトークン管理
    // =====================================
    
    async getFCMToken() {
        if (!this.messaging) {
            console.error('[NotificationManager] Firebase Messaging not initialized');
            return null;
        }
        
        if (this.fcmToken) {
            console.log('[NotificationManager] FCM token already exists');
            return this.fcmToken;
        }
        
        try {
            console.log('[NotificationManager] Getting FCM token...');
            
            // Service Workerの登録を待つ
            const registration = await navigator.serviceWorker.ready;
            
            // VAPIDキーを使用してトークンを取得
            const vapidKey = window.CONFIG?.FIREBASE?.VAPID_KEY;
            
            if (!vapidKey) {
                console.error('[NotificationManager] VAPID key not configured');
                return null;
            }
            
            const token = await this.messaging.getToken({
                vapidKey: vapidKey,
                serviceWorkerRegistration: registration
            });
            
            if (token) {
                console.log('[NotificationManager] FCM token obtained');
                this.fcmToken = token;
                
                // トークンを登録
                await this.registerDevice(token);
                
                return token;
            } else {
                console.warn('[NotificationManager] No FCM token available');
                return null;
            }
            
        } catch (error) {
            console.error('[NotificationManager] Failed to get FCM token:', error);
            return null;
        }
    }
    
    // =====================================
    // デバイス登録（無限ループ修正版）
    // =====================================
    
    async registerDevice(fcmToken) {
        // 既に登録処理中の場合はスキップ
        if (this.isRegistering) {
            console.log('[NotificationManager] Registration already in progress, skipping...');
            return false;
        }
        
        // 既に登録済みの場合はスキップ
        const isAlreadyRegistered = localStorage.getItem('device_registered') === 'true';
        const savedToken = localStorage.getItem('fcm_token');
        
        if (isAlreadyRegistered && savedToken === fcmToken) {
            console.log('[NotificationManager] Device already registered with this token');
            return true;
        }
        
        // 登録処理開始
        this.isRegistering = true;
        
        console.log('[NotificationManager] Registering device...');
        
        try {
            // API Clientを使用してGASに送信
            if (!window.apiClient) {
                throw new Error('API Client not initialized');
            }
            
            const result = await window.apiClient.sendRequest('registerDevice', {
                fcm_token: fcmToken,
                platform: this.getPlatform(),
                browser: this.getBrowser(),
                device_info: this.getDeviceInfo(),
                user_agent: navigator.userAgent,
                user_id: this.getUserId() // ログインユーザーがいれば
            });
            
            if (result.success) {
                console.log('[NotificationManager] Device registered successfully');
                
                // ローカルストレージに保存（二重登録防止）
                localStorage.setItem('fcm_token', fcmToken);
                localStorage.setItem('device_registered', 'true');
                localStorage.setItem('device_registered_at', new Date().toISOString());
                
                this.showNotification('通知が有効になりました', {
                    body: '今後、お知らせを受け取ることができます',
                    icon: '/images/icon-192x192.png'
                });
                
                return true;
                
            } else {
                console.error('[NotificationManager] Device registration failed:', result.error);
                return false;
            }
            
        } catch (error) {
            console.error('[NotificationManager] Error registering device:', error);
            return false;
            
        } finally {
            // 登録処理終了（必ず実行される）
            this.isRegistering = false;
        }
    }
    
    // =====================================
    // トークン更新監視
    // =====================================
    
    setupTokenRefreshListener() {
        if (!this.messaging) {
            console.warn('[NotificationManager] Messaging not initialized, skipping token refresh listener');
            return;
        }
        
        try {
            // Firebase SDK v9+ では onTokenRefresh は廃止されているため、
            // 定期的にトークンをチェックする方法に変更
            console.log('[NotificationManager] Setting up token monitoring...');
            
            // トークン監視の間隔（5分）
            const tokenCheckInterval = 5 * 60 * 1000;
            
            // 定期的にトークンをチェック
            this.tokenCheckTimer = setInterval(async () => {
                try {
                    const currentToken = await this.getFCMToken();
                    const storedToken = localStorage.getItem('fcm_token');
                    
                    // トークンが変更された場合
                    if (currentToken && currentToken !== storedToken) {
                        console.log('[NotificationManager] FCM token changed, re-registering...');
                        
                        // 新しいトークンを保存
                        localStorage.setItem('fcm_token', currentToken);
                        
                        // 古い登録情報をクリア
                        localStorage.removeItem('device_registered');
                        
                        // 新しいトークンで再登録
                        await this.registerDevice(currentToken);
                    }
                } catch (error) {
                    console.error('[NotificationManager] Token check failed:', error);
                }
            }, tokenCheckInterval);
            
            console.log('[NotificationManager] Token monitoring setup complete');
            
        } catch (error) {
            console.error('[NotificationManager] Failed to setup token monitoring:', error);
        }
    }
    
    // =====================================
    // メッセージ受信
    // =====================================
    
    setupMessageListener() {
        if (!this.messaging) {
            return;
        }
        
        try {
            this.messaging.onMessage((payload) => {
                console.log('[NotificationManager] Message received:', payload);
                
                // フォアグラウンドで通知を表示
                const notificationData = this.parseNotificationPayload(payload);
                
                this.showNotification(notificationData.title, {
                    body: notificationData.body,
                    icon: notificationData.icon,
                    badge: notificationData.badge,
                    data: {
                        url: notificationData.url
                    }
                });
            });
            
            console.log('[NotificationManager] Message listener setup complete');
            
        } catch (error) {
            console.error('[NotificationManager] Failed to setup message listener:', error);
        }
    }
    
    /**
     * 通知ペイロードを解析（統一された構造）
     */
    parseNotificationPayload(payload) {
        const defaultData = {
            title: 'お知らせ',
            body: '',
            icon: '/images/icon-192x192.png',
            badge: '/images/badge-72x72.png',
            url: '/'
        };
        
        // Firebase HTTP v1 API形式
        if (payload.data) {
            return {
                title: payload.data.title || defaultData.title,
                body: payload.data.body || defaultData.body,
                icon: payload.data.icon || defaultData.icon,
                badge: payload.data.badge || defaultData.badge,
                url: payload.data.url || defaultData.url
            };
        }
        
        // notificationフィールドがある場合（フォールバック）
        if (payload.notification) {
            return {
                title: payload.notification.title || defaultData.title,
                body: payload.notification.body || defaultData.body,
                icon: payload.notification.icon || defaultData.icon,
                badge: defaultData.badge,
                url: defaultData.url
            };
        }
        
        return defaultData;
    }
    
    // =====================================
    // 通知表示
    // =====================================
    
    async showNotification(title, options) {
        if (this.permission !== 'granted') {
            console.warn('[NotificationManager] Cannot show notification: permission not granted');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.ready;
            
            const defaultOptions = {
                icon: '/images/icon-192x192.png',
                badge: '/images/badge-72x72.png',
                vibrate: [200, 100, 200],
                requireInteraction: false
            };
            
            const notificationOptions = { ...defaultOptions, ...options };
            
            await registration.showNotification(title, notificationOptions);
            
            console.log('[NotificationManager] Notification shown:', title);
            
        } catch (error) {
            console.error('[NotificationManager] Failed to show notification:', error);
        }
    }
    
    // =====================================
    // デバイス情報取得
    // =====================================
    
    getPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/android/.test(userAgent)) return 'Android';
        if (/iphone|ipad|ipod/.test(userAgent)) return 'iOS';
        if (/windows/.test(userAgent)) return 'Windows';
        if (/mac/.test(userAgent)) return 'macOS';
        if (/linux/.test(userAgent)) return 'Linux';
        
        return 'Unknown';
    }
    
    getBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/edg/.test(userAgent)) return 'Edge';
        if (/chrome/.test(userAgent)) return 'Chrome';
        if (/firefox/.test(userAgent)) return 'Firefox';
        if (/safari/.test(userAgent)) return 'Safari';
        if (/opera/.test(userAgent)) return 'Opera';
        
        return 'Unknown';
    }
    
    getDeviceInfo() {
        const screen = window.screen;
        return `${screen.width}x${screen.height}`;
    }
    
    getUserId() {
        // ログインシステムがあれば、ここでユーザーIDを返す
        // 現在は匿名なのでnull
        return null;
    }
    
    // =====================================
    // UI更新
    // =====================================
    
    updateUI() {
        const notificationButton = document.getElementById('notification-toggle-button');
        const notificationStatus = document.getElementById('notification-status');
        
        if (notificationButton) {
            if (this.permission === 'granted') {
                notificationButton.textContent = '通知: 有効';
                notificationButton.classList.add('enabled');
            } else if (this.permission === 'denied') {
                notificationButton.textContent = '通知: ブロック中';
                notificationButton.classList.add('blocked');
            } else {
                notificationButton.textContent = '通知を有効にする';
                notificationButton.classList.remove('enabled', 'blocked');
            }
        }
        
        if (notificationStatus) {
            if (this.permission === 'granted') {
                notificationStatus.textContent = '✓ 通知が有効です';
                notificationStatus.className = 'notification-status enabled';
            } else if (this.permission === 'denied') {
                notificationStatus.textContent = '✕ 通知がブロックされています';
                notificationStatus.className = 'notification-status blocked';
            } else {
                notificationStatus.textContent = '通知が無効です';
                notificationStatus.className = 'notification-status disabled';
            }
        }
    }
    
    // =====================================
    // 通知設定リセット
    // =====================================
    
    resetNotificationSettings() {
        console.log('[NotificationManager] Resetting notification settings...');
        
        // タイマーをクリア
        if (this.tokenCheckTimer) {
            clearInterval(this.tokenCheckTimer);
            this.tokenCheckTimer = null;
        }
        
        localStorage.removeItem('fcm_token');
        localStorage.removeItem('device_registered');
        localStorage.removeItem('device_registered_at');
        
        this.fcmToken = null;
        this.isRegistering = false;
        
        this.updateUI();
        
        console.log('[NotificationManager] Settings reset complete');
    }
}

// グローバルインスタンス
window.notificationManager = new NotificationManager();

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', async () => {
    await window.notificationManager.initialize();
    
    // トークン更新とメッセージ受信のリスナーを設定
    window.notificationManager.setupTokenRefreshListener();
    window.notificationManager.setupMessageListener();
});