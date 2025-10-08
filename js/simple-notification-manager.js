/**
 * Simple Notification Manager - Nazuna Portal
 * シンプルで確実なFCM通知システム
 */

class SimpleNotificationManager {
    constructor() {
        this.permission = 'default';
        this.fcmToken = null;
        this.isInitialized = false;
        this.messaging = null;
        
        console.log('[SimpleNotificationManager] Initialized');
    }
    
    // =====================================
    // 初期化
    // =====================================
    
    async initialize() {
        if (this.isInitialized) {
            console.log('[SimpleNotificationManager] Already initialized');
            return true;
        }
        
        console.log('[SimpleNotificationManager] Starting initialization...');
        
        try {
            // 通知権限を確認
            this.permission = await this.checkPermission();
            console.log('[SimpleNotificationManager] Permission:', this.permission);
            
            // Service Workerの確認
            if (!('serviceWorker' in navigator)) {
                console.error('[SimpleNotificationManager] Service Worker not supported');
                return false;
            }
            
            // Firebase Messagingの初期化（未ロードでも送信機能は継続）
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                try {
                    this.messaging = firebase.messaging();
                    console.log('[SimpleNotificationManager] Firebase Messaging initialized');
                } catch (error) {
                    console.error('[SimpleNotificationManager] Firebase init failed:', error);
                    // 受信系は無効だが、送信（GAS）は継続可能
                    this.messaging = null;
                }
            } else {
                console.warn('[SimpleNotificationManager] Firebase not available. Proceeding without messaging.');
                this.messaging = null;
            }
            
            // 既存のトークンをチェック
            const savedToken = localStorage.getItem('fcm_token');
            const isRegistered = localStorage.getItem('device_registered') === 'true';
            
            if (savedToken && isRegistered) {
                this.fcmToken = savedToken;
                console.log('[SimpleNotificationManager] Using saved FCM token');
            }
            
            this.isInitialized = true;
            this.updateUI();
            
            return true;
            
        } catch (error) {
            console.error('[SimpleNotificationManager] Initialization failed:', error);
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
        
        const permission = Notification.permission;
        return permission;
    }
    
    async requestPermission() {
        if (!('Notification' in window)) {
            throw new Error('Notifications not supported');
        }
        
        const permission = await Notification.requestPermission();
        this.permission = permission;
        this.updateUI();
        
        return permission;
    }
    
    // =====================================
    // FCMトークン管理
    // =====================================
    
    async getFCMToken() {
        if (!this.messaging) {
            throw new Error('Firebase Messaging not initialized');
        }
        
        try {
            // 既存の設定からVAPIDキーを取得
            const vapidKey = window.CONFIG?.FIREBASE?.VAPID_KEY || 
                            window.SIMPLE_NOTIFICATION_CONFIG?.firebase?.vapidKey ||
                            window.vapidKey;
            
            if (!vapidKey) {
                throw new Error('VAPID key not configured');
            }
            
            const token = await this.messaging.getToken({
                vapidKey: vapidKey
            });
            
            if (token) {
                this.fcmToken = token;
                localStorage.setItem('fcm_token', token);
                console.log('[SimpleNotificationManager] FCM token obtained');
                return token;
            } else {
                console.warn('[SimpleNotificationManager] No FCM token available');
                return null;
            }
        } catch (error) {
            console.error('[SimpleNotificationManager] Failed to get FCM token:', error);
            throw error;
        }
    }
    
    async registerDevice() {
        if (this.permission !== 'granted') {
            throw new Error('Notification permission not granted');
        }
        
        try {
            const token = await this.getFCMToken();
            if (!token) {
                throw new Error('Failed to get FCM token');
            }
            
            // GASにデバイス登録
            const response = await this.sendToGAS('registerDevice', {
                fcmToken: token,
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            });
            
            if (response.success) {
                localStorage.setItem('device_registered', 'true');
                localStorage.setItem('device_registered_at', Date.now().toString());
                console.log('[SimpleNotificationManager] Device registered successfully');
                return true;
            } else {
                throw new Error(response.error || 'Device registration failed');
            }
            
        } catch (error) {
            console.error('[SimpleNotificationManager] Device registration failed:', error);
            throw error;
        }
    }
    
    // =====================================
    // 通知送信（管理者用）
    // =====================================
    
    async sendNotification(title, message, target = 'all') {
        if (!this.isInitialized) {
            throw new Error('Notification manager not initialized');
        }
        
        try {
            const response = await this.sendToGAS('sendNotification', {
                title: title,
                message: message,
                target: target,
                timestamp: Date.now()
            });
            
            if (response.success) {
                console.log('[SimpleNotificationManager] Notification sent successfully');
                return response.data;
            } else {
                throw new Error(response.error || 'Notification sending failed');
            }
            
        } catch (error) {
            console.error('[SimpleNotificationManager] Failed to send notification:', error);
            throw error;
        }
    }
    
    // =====================================
    // GAS通信
    // =====================================
    
    async sendToGAS(functionName, data) {
        // 既存のconfigからGAS URLを取得
        const gasUrl = window.CONFIG?.GAS_URL || window.SIMPLE_NOTIFICATION_CONFIG?.gas?.url;
        
        if (!gasUrl) {
            throw new Error('GAS URL not configured');
        }
        
        // JSONP（CORS完全回避）
        let action = functionName;
        if (functionName === 'sendNotification') action = 'sendNotificationSimple';
        if (functionName === 'registerDevice') action = 'registerDeviceSimple';
        
        return new Promise((resolve, reject) => {
            try {
                const callbackName = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
                const params = new URLSearchParams();
                params.set('action', action);
                // データはフラットに展開（非文字列はJSON化）
                Object.keys(data || {}).forEach((key) => {
                    const value = data[key];
                    params.set(key, typeof value === 'string' ? value : JSON.stringify(value));
                });
                params.set('callback', callbackName);

                const script = document.createElement('script');
                script.src = `${gasUrl}?${params.toString()}`;

                window[callbackName] = (result) => {
                    try {
                        resolve(result);
                    } finally {
                        delete window[callbackName];
                        if (script && script.parentNode) script.parentNode.removeChild(script);
                    }
                };

                script.onerror = () => {
                    try {
                        reject(new Error('JSONP request failed'));
                    } finally {
                        delete window[callbackName];
                        if (script && script.parentNode) script.parentNode.removeChild(script);
                    }
                };

                document.body.appendChild(script);
            } catch (err) {
                reject(err);
            }
        });
    }
    
    // =====================================
    // UI更新
    // =====================================
    
    updateUI() {
        // 通知状態の表示を更新
        const statusElement = document.getElementById('notification-status');
        if (statusElement) {
            if (this.permission === 'granted') {
                statusElement.textContent = '✓ 通知が有効です';
                statusElement.className = 'notification-status enabled';
            } else if (this.permission === 'denied') {
                statusElement.textContent = '✕ 通知がブロックされています';
                statusElement.className = 'notification-status blocked';
            } else {
                statusElement.textContent = '通知が無効です';
                statusElement.className = 'notification-status disabled';
            }
        }
    }
    
    // =====================================
    // 設定リセット
    // =====================================
    
    resetSettings() {
        console.log('[SimpleNotificationManager] Resetting settings...');
        
        // ローカルストレージをクリア
        localStorage.removeItem('fcm_token');
        localStorage.removeItem('device_registered');
        localStorage.removeItem('device_registered_at');
        
        // 状態をリセット
        this.fcmToken = null;
        this.isInitialized = false;
        
        this.updateUI();
        
        console.log('[SimpleNotificationManager] Settings reset complete');
    }
}

// グローバルインスタンス
window.simpleNotificationManager = new SimpleNotificationManager();

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', async () => {
    await window.simpleNotificationManager.initialize();
});

// グローバルに公開
window.SimpleNotificationManager = SimpleNotificationManager;
