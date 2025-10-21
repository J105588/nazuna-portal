/**
 * なずなポータルサイト - 統合通知管理システム
 * notification-manager.js + simple-notification-manager.js の統合版
 * シンプルで確実なFCM通知システム
 */

class UnifiedNotificationManager {
    constructor() {
        this.permission = 'default';
        this.fcmToken = null;
        this.isInitialized = false;
        this.isRegistering = false; // 無限ループ防止フラグ
        this.messaging = null;
        this.notificationQueue = [];
        this.maxQueueSize = 10;
        
        console.log('[Notification Unified] Initialized');
    }
    
    // =====================================
    // 初期化
    // =====================================
    
    async initialize() {
        if (this.isInitialized) {
            console.log('[Notification Unified] Already initialized');
            return true;
        }
        
        console.log('[Notification Unified] Starting initialization...');
        
        try {
            // 通知権限を確認
            this.permission = await this.checkPermission();
            console.log('[Notification Unified] Permission:', this.permission);
            
            // Service Workerの確認
            if (!('serviceWorker' in navigator)) {
                console.error('[Notification Unified] Service Worker not supported');
                return false;
            }
            
            // Firebase Messagingの初期化（未ロードでも送信機能は継続）
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                try {
                    this.messaging = firebase.messaging();
                    console.log('[Notification Unified] Firebase Messaging initialized');
                } catch (error) {
                    console.error('[Notification Unified] Firebase init failed:', error);
                    // 受信系は無効だが、送信（GAS）は継続可能
                    this.messaging = null;
                }
            } else {
                console.warn('[Notification Unified] Firebase not available. Proceeding without messaging.');
                this.messaging = null;
            }
            
            // 権限がある場合のみFCMトークンを取得
            if (this.permission === 'granted' && this.messaging) {
                await this.getFCMToken();
            }
            
            // メッセージリスナーを設定
            this.setupMessageListener();
            
            this.isInitialized = true;
            console.log('[Notification Unified] Initialization completed');
            return true;
            
        } catch (error) {
            console.error('[Notification Unified] Initialization failed:', error);
            return false;
        }
    }
    
    // =====================================
    // 権限管理
    // =====================================
    
    async checkPermission() {
        if (!('Notification' in window)) {
            console.warn('[Notification Unified] Notifications not supported');
            return 'denied';
        }
        
        return Notification.permission;
    }
    
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('[Notification Unified] Notifications not supported');
            return false;
        }
        
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                console.log('[Notification Unified] Permission granted');
                
                // FCMトークンを取得
                if (this.messaging) {
                    await this.getFCMToken();
                }
                
                return true;
            } else {
                console.log('[Notification Unified] Permission denied');
                return false;
            }
        } catch (error) {
            console.error('[Notification Unified] Permission request failed:', error);
            return false;
        }
    }
    
    // =====================================
    // FCMトークン管理
    // =====================================
    
    async getFCMToken() {
        if (!this.messaging) {
            console.warn('[Notification Unified] Messaging not available');
            return null;
        }
        
        if (this.isRegistering) {
            console.log('[Notification Unified] Token registration in progress...');
            return null;
        }
        
        this.isRegistering = true;
        
        try {
            const token = await this.messaging.getToken({
                vapidKey: CONFIG.FIREBASE.VAPID_KEY
            });
            
            if (token) {
                this.fcmToken = token;
                console.log('[Notification Unified] FCM Token obtained');
                
                // トークンをサーバーに登録
                await this.registerToken(token);
                
                return token;
            } else {
                console.warn('[Notification Unified] No FCM token available');
                return null;
            }
        } catch (error) {
            console.error('[Notification Unified] FCM token error:', error);
            return null;
        } finally {
            this.isRegistering = false;
        }
    }
    
    async registerToken(token) {
        if (!window.apiClient) {
            console.warn('[Notification Unified] API client not available');
            return false;
        }
        
        try {
            const result = await window.apiClient.sendRequest('registerFCMToken', {
                token: token,
                deviceInfo: this.getDeviceInfo()
            });
            
            if (result.success) {
                console.log('[Notification Unified] Token registered successfully');
                return true;
            } else {
                console.error('[Notification Unified] Token registration failed:', result.error);
                return false;
            }
        } catch (error) {
            console.error('[Notification Unified] Token registration error:', error);
            return false;
        }
    }
    
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timestamp: new Date().toISOString()
        };
    }
    
    // =====================================
    // メッセージ処理
    // =====================================
    
    setupMessageListener() {
        if (!this.messaging) {
            console.warn('[Notification Unified] Messaging not available for listener');
            return;
        }
        
        this.messaging.onMessage((payload) => {
            console.log('[Notification Unified] Message received:', payload);
            
            // フォアグラウンド通知を表示
            this.showForegroundNotification(payload);
        });
    }
    
    showForegroundNotification(payload) {
        const { notification, data } = payload;
        
        if (notification) {
            const options = {
                body: notification.body,
                icon: notification.icon || '/images/icon-192x192.png',
                badge: '/images/badge-72x72.png',
                tag: data?.tag || 'nazuna-notification',
                data: data || {},
                requireInteraction: data?.priority === 'high',
                actions: data?.actions || [
                    {
                        action: 'view',
                        title: '確認する',
                        icon: '/images/icon-192x192.png'
                    },
                    {
                        action: 'close',
                        title: '閉じる'
                    }
                ]
            };
            
            // ブラウザ通知を表示
            if (this.permission === 'granted') {
                const notification = new Notification(notification.title, options);
                
                notification.onclick = (event) => {
                    event.preventDefault();
                    this.handleNotificationClick(data);
                    notification.close();
                };
            }
        }
    }
    
    handleNotificationClick(data) {
        const url = data?.url || '/';
        
        // 既存のタブで開くか新しいタブで開く
        if (window.focus) {
            window.focus();
        }
        
        if (url !== window.location.pathname) {
            window.location.href = url;
        }
    }
    
    // =====================================
    // 通知送信
    // =====================================
    
    async sendNotification(title, body, options = {}) {
        const notificationData = {
            title,
            body,
            icon: options.icon || '/images/icon-192x192.png',
            badge: '/images/badge-72x72.png',
            tag: options.tag || 'nazuna-notification',
            data: options.data || {},
            requireInteraction: options.requireInteraction || false,
            actions: options.actions || [
                {
                    action: 'view',
                    title: '確認する',
                    icon: '/images/icon-192x192.png'
                },
                {
                    action: 'close',
                    title: '閉じる'
                }
            ]
        };
        
        if (this.permission === 'granted') {
            try {
                const notification = new Notification(title, notificationData);
                
                notification.onclick = (event) => {
                    event.preventDefault();
                    this.handleNotificationClick(options.data);
                    notification.close();
                };
                
                // 自動で閉じる
                if (!options.requireInteraction) {
                    setTimeout(() => {
                        notification.close();
                    }, options.duration || 5000);
                }
                
                return true;
            } catch (error) {
                console.error('[Notification Unified] Failed to show notification:', error);
                return false;
            }
        } else {
            console.warn('[Notification Unified] Permission not granted');
            return false;
        }
    }
    
    // =====================================
    // 通知キュー管理
    // =====================================
    
    addToQueue(notification) {
        if (this.notificationQueue.length >= this.maxQueueSize) {
            this.notificationQueue.shift(); // 古い通知を削除
        }
        
        this.notificationQueue.push({
            ...notification,
            timestamp: Date.now()
        });
    }
    
    getQueue() {
        return this.notificationQueue;
    }
    
    clearQueue() {
        this.notificationQueue = [];
    }
    
    // =====================================
    // 通知タイプ別送信
    // =====================================
    
    async sendNewsNotification(newsItem) {
        const options = {
            icon: '/images/icon-192x192.png',
            tag: 'news-notification',
            data: {
                url: '/news.html',
                type: 'news',
                id: newsItem.id
            },
            requireInteraction: false
        };
        
        return await this.sendNotification(
            `新しいお知らせ: ${newsItem.title}`,
            newsItem.content.substring(0, 100) + '...',
            options
        );
    }
    
    async sendForumNotification(post) {
        const options = {
            icon: '/images/icon-192x192.png',
            tag: 'forum-notification',
            data: {
                url: '/forum.html',
                type: 'forum',
                id: post.id
            },
            requireInteraction: true
        };
        
        return await this.sendNotification(
            `新しい投稿: ${post.title}`,
            post.content.substring(0, 100) + '...',
            options
        );
    }
    
    async sendSurveyNotification(survey) {
        const options = {
            icon: '/images/icon-192x192.png',
            tag: 'survey-notification',
            data: {
                url: '/survey.html',
                type: 'survey',
                id: survey.id
            },
            requireInteraction: true
        };
        
        return await this.sendNotification(
            `新しいアンケート: ${survey.title}`,
            survey.description.substring(0, 100) + '...',
            options
        );
    }
    
    async sendSystemNotification(title, message, type = 'info') {
        const options = {
            icon: '/images/icon-192x192.png',
            tag: 'system-notification',
            data: {
                url: '/',
                type: 'system',
                notificationType: type
            },
            requireInteraction: false
        };
        
        return await this.sendNotification(title, message, options);
    }
    
    // =====================================
    // システム状態管理
    // =====================================
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            permission: this.permission,
            hasToken: !!this.fcmToken,
            hasMessaging: !!this.messaging,
            queueSize: this.notificationQueue.length
        };
    }
    
    async testNotification() {
        if (this.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) {
                return false;
            }
        }
        
        return await this.sendSystemNotification(
            'テスト通知',
            '通知システムが正常に動作しています。',
            'success'
        );
    }
    
    // =====================================
    // クリーンアップ
    // =====================================
    
    destroy() {
        this.clearQueue();
        this.isInitialized = false;
        this.messaging = null;
        this.fcmToken = null;
        console.log('[Notification Unified] Destroyed');
    }
}

// ========================================
// グローバル初期化
// ========================================

const notificationManager = new UnifiedNotificationManager();

// グローバルに公開
window.notificationManager = notificationManager;

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', async () => {
    await notificationManager.initialize();
});

// デバッグ用関数をグローバルに公開
if (CONFIG?.DEBUG?.LOG_LEVEL === 'debug') {
    window.testNotification = () => notificationManager.testNotification();
    window.getNotificationStatus = () => notificationManager.getStatus();
    window.requestNotificationPermission = () => notificationManager.requestPermission();
    
    console.log('Debug functions available: testNotification(), getNotificationStatus(), requestNotificationPermission()');
}

console.log('[Notification Unified] Loaded successfully');
