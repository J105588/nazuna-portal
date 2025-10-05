// 通知管理システム（GAS + FCM連携版、iOS PWA対応強化版）

class NotificationManager {
    constructor() {
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        this.registration = null;
        this.fcmToken = null;
        this.vapidPublicKey = CONFIG.VAPID_KEY; // Firebase Consoleから取得したVAPIDキー
        this.gasEndpoint = CONFIG.GAS_URL; // GASのWebAppエンドポイント
        
        // iOS PWA検出
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true;
        this.isIOSPWA = this.isIOS && this.isPWA;
        
        console.log('NotificationManager initialized. Support:', this.isSupported, 'iOS PWA:', this.isIOSPWA);
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
    
    // 通知許可の要求（iOS PWA対応強化版）
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push messaging is not supported');
        }
        
        try {
            // iOS PWA環境の検出
            const iOSVersion = this.getIOSVersion();
            const isIOS16_4OrLater = this.isIOSPWA && iOSVersion && iOSVersion >= 16.4;
            
            // iOS 16.4以降のPWAの場合は特別な処理
            if (isIOS16_4OrLater) {
                console.log('iOS 16.4以降のPWA環境で通知許可を要求します');
                
                // 通知許可状態を確認
                if (Notification.permission === 'granted') {
                    console.log('通知許可は既に付与されています');
                    await this.subscribeToPush();
                    return true;
                }
                
                // ユーザーに通知の重要性を説明
                const confirmMessage = 'このアプリからの通知を受け取るには許可が必要です。\n\n重要なお知らせや緊急情報をお届けするために通知を使用します。\n\n「許可」を選択してください。';
                const userConfirmed = confirm(confirmMessage);
                
                if (!userConfirmed) {
                    console.log('ユーザーが通知の説明を拒否しました');
                    throw new Error('User declined notification explanation');
                }
            }
            
            // 通知許可を要求
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
            
            if (permission === 'granted') {
                await this.subscribeToPush();
                
                // iOS PWAの場合は確認メッセージを表示
                if (this.isIOSPWA) {
                    setTimeout(() => {
                        this.showNotificationSuccessMessage();
                    }, 1000);
                }
                
                return true;
            } else if (permission === 'denied') {
                // iOS PWAの場合は設定方法を案内
                if (this.isIOSPWA) {
                    this.showIOSNotificationSettings();
                }
                throw new Error('Notification permission denied');
            } else {
                throw new Error('Notification permission dismissed');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            throw error;
        }
    }
    
    // 通知許可成功メッセージの表示
    showNotificationSuccessMessage() {
        const messageElement = document.createElement('div');
        messageElement.className = 'notification-success-message';
        messageElement.innerHTML = `
            <div class="success-content">
                <div class="success-icon">✓</div>
                <div class="success-text">通知の設定が完了しました</div>
                <button class="success-close">閉じる</button>
            </div>
        `;
        
        // スタイルを適用
        const styleId = 'notification-success-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .notification-success-message {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #4a7c59;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    z-index: 10000;
                    animation: success-fade-in 0.3s ease-out;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                }
                .success-content {
                    display: flex;
                    align-items: center;
                }
                .success-icon {
                    font-size: 18px;
                    margin-right: 10px;
                }
                .success-text {
                    font-size: 14px;
                    font-weight: 500;
                }
                .success-close {
                    background: none;
                    border: none;
                    color: white;
                    margin-left: 15px;
                    font-size: 14px;
                    cursor: pointer;
                    opacity: 0.8;
                }
                @keyframes success-fade-in {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(messageElement);
        
        // 閉じるボタンのイベント
        const closeButton = messageElement.querySelector('.success-close');
        closeButton.addEventListener('click', () => {
            messageElement.remove();
        });
        
        // 5秒後に自動的に消える
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 5000);
    }
    
    // iOS通知設定案内の表示
    showIOSNotificationSettings() {
        const messageElement = document.createElement('div');
        messageElement.className = 'ios-settings-guide';
        messageElement.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <div class="settings-title">通知を有効にするには</div>
                    <button class="settings-close">&times;</button>
                </div>
                <div class="settings-body">
                    <p>1. iOSの「設定」アプリを開く</p>
                    <p>2. 「Safari」を選択</p>
                    <p>3. 「詳細」をタップ</p>
                    <p>4. このWebサイトの設定で「通知」をオンにする</p>
                </div>
            </div>
        `;
        
        // スタイルを適用
        const styleId = 'ios-settings-guide-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .ios-settings-guide {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    width: 90%;
                    max-width: 350px;
                    border-radius: 12px;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
                    z-index: 10001;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                }
                .settings-content {
                    padding: 20px;
                }
                .settings-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .settings-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #333;
                }
                .settings-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #999;
                }
                .settings-body {
                    color: #555;
                    font-size: 14px;
                    line-height: 1.5;
                }
                .settings-body p {
                    margin: 8px 0;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(messageElement);
        
        // 閉じるボタンのイベント
        const closeButton = messageElement.querySelector('.settings-close');
        closeButton.addEventListener('click', () => {
            messageElement.remove();
        });
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
            
            const result = await apiClient.sendRequest('registerDevice', {
                fcmToken: this.fcmToken,
                userAgent: navigator.userAgent,
                platform: this.getPlatform(),
                browser: this.getBrowser(),
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    platform: this.getPlatform(),
                    browser: this.getBrowser(),
                    screen: {
                        width: screen.width,
                        height: screen.height
                    },
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    online: navigator.onLine
                }
            });
            
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
            
            const result = await apiClient.sendRequest('unregisterDevice', {
                fcmToken: this.fcmToken
            });
            
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
        
        // iOS PWAの場合の処理
        if (this.isIOSPWA) {
            // iOS 16.4以降かどうかを確認
            const iOSVersion = this.getIOSVersion();
            const isIOS16_4OrLater = iOSVersion && iOSVersion >= 16.4;
            
            if (!isIOS16_4OrLater) {
                // iOS 16.4未満の場合はカスタムUI
                this.handleIOSPWANotification(payload);
                return;
            }
            // iOS 16.4以降は標準APIを使用（以下の処理に続く）
        }
        
        const { notification, data } = payload;
        
        // カスタム通知を表示
        if (notification) {
            const options = {
                body: notification.body,
                icon: notification.icon || 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
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
    
    // iOS PWA向けの特別な通知処理
    handleIOSPWANotification(payload) {
        try {
            // iOS PWAではService Workerの通知が機能しない場合があるため、
            // 代わりにネイティブのアラートやカスタムUIを使用
            
            // 通知データの取得
            const notification = payload.notification || {};
            const data = payload.data || {};
            const notificationTitle = notification.title || 'お知らせ';
            const notificationBody = notification.body || '';
            const notificationUrl = data.url || './';
            const notificationIcon = notification.icon || './images/icon-192x192.png';
            const notificationCategory = data.category || 'general';
            
            // iOS 16.4以降かどうかを確認
            const iOSVersion = this.getIOSVersion();
            const isIOS16_4OrLater = iOSVersion && iOSVersion >= 16.4;
            
            // iOS 16.4以降でPWAの場合は標準のNotification APIを試す
            if (isIOS16_4OrLater && this.isIOSPWA && 'Notification' in window && Notification.permission === 'granted') {
                try {
                    console.log('iOS 16.4以降のPWAで標準通知APIを使用します');
                    
                    // 標準のNotification APIを使用
                    const notification = new Notification(notificationTitle, {
                        body: notificationBody,
                        icon: notificationIcon,
                        badge: './images/badge-72x72.png',
                        tag: notificationCategory,
                        data: { url: notificationUrl },
                        requireInteraction: data.priority === '2'
                    });
                    
                    notification.onclick = function() {
                        window.focus();
                        window.location.href = notificationUrl;
                        this.close();
                    };
                    
                    return;
                } catch (error) {
                    console.warn('標準APIでの通知に失敗しました。カスタムUIにフォールバックします:', error);
                    // 標準APIが失敗した場合はカスタムUIにフォールバック
                }
            }
            
            // カスタム通知UIを作成
            const notificationElement = document.createElement('div');
            notificationElement.className = 'ios-pwa-notification';
            notificationElement.innerHTML = `
                <div class="notification-content">
                    <div class="notification-header">
                        <img src="./images/icon-48x48.png" alt="Icon" class="notification-icon">
                        <div class="notification-title">${notificationTitle}</div>
                        <button class="notification-close">&times;</button>
                    </div>
                    <div class="notification-body">${notificationBody}</div>
                    <div class="notification-actions">
                        <button class="notification-action-view">詳細を見る</button>
                    </div>
                </div>
            `;
            
            // スタイルを適用
            const styleId = 'ios-pwa-notification-style';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    .ios-pwa-notification {
                        position: fixed;
                        top: 10px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 90%;
                        max-width: 400px;
                        background: rgba(250, 250, 250, 0.98);
                        border-radius: 12px;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                        z-index: 10000;
                        animation: notification-slide-in 0.3s ease-out;
                        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    }
                    .notification-content {
                        padding: 16px;
                    }
                    .notification-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    .notification-icon {
                        width: 24px;
                        height: 24px;
                        margin-right: 10px;
                        border-radius: 6px;
                    }
                    .notification-title {
                        flex-grow: 1;
                        font-weight: 600;
                        font-size: 16px;
                        color: #333;
                    }
                    .notification-close {
                        background: none;
                        border: none;
                        font-size: 22px;
                        cursor: pointer;
                        padding: 0 5px;
                        color: #999;
                    }
                    .notification-body {
                        padding-left: 34px;
                        margin-bottom: 12px;
                        font-size: 14px;
                        color: #555;
                        line-height: 1.4;
                    }
                    .notification-actions {
                        display: flex;
                        justify-content: flex-end;
                    }
                    .notification-action-view {
                        background: #4a7c59;
                        color: white;
                        border: none;
                        border-radius: 16px;
                        padding: 6px 16px;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                    }
                    @keyframes notification-slide-in {
                        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                        to { transform: translateX(-50%) translateY(0); opacity: 1; }
                    }
                    @keyframes notification-slide-out {
                        from { transform: translateX(-50%) translateY(0); opacity: 1; }
                        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notificationElement);
            
            // クリックイベントを設定
            notificationElement.addEventListener('click', () => {
                window.location.href = notificationUrl;
                notificationElement.remove();
            });
            
            // 詳細ボタンのイベント
            const viewButton = notificationElement.querySelector('.notification-action-view');
            viewButton.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = notificationUrl;
                notificationElement.remove();
            });
            
            // 閉じるボタンのイベント
            const closeButton = notificationElement.querySelector('.notification-close');
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationElement.remove();
            });
            
            // 一定時間後に自動的に消える
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.style.animation = 'notification-slide-out 0.3s ease-in';
                    setTimeout(() => notificationElement.remove(), 300);
                }
            }, 5000);
            
            // 通知音を再生（オプション）
            if (notification.sound !== 'silent') {
                try {
                    const audio = new Audio('/sounds/notification.mp3');
                    audio.play().catch(e => console.log('Could not play notification sound:', e));
                } catch (e) {
                    console.log('Sound playback error:', e);
                }
            }
            
        } catch (error) {
            console.error('Error handling iOS PWA notification:', error);
        }
    }
    
    // テスト通知の送信
    async sendTestNotification(options = {}) {
        try {
            // iOS PWAの場合は特別な処理
            if (this.isIOSPWA) {
                // iOS 16.4以降かどうかを確認
                const iOSVersion = this.getIOSVersion();
                const isIOS16_4OrLater = iOSVersion && iOSVersion >= 16.4;
                
                console.log(`iOS PWA環境でテスト通知を送信します。iOS バージョン: ${iOSVersion}`);
                
                // テスト通知のデータ
                const testNotification = {
                    notification: {
                        title: options.title || 'テスト通知',
                        body: options.body || 'これはテスト通知です。通知システムが正常に動作しています。',
                        icon: options.icon || 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
                        badge: options.badge || './images/badge-72x72.png'
                    },
                    data: {
                        url: options.url || window.location.href,
                        timestamp: new Date().toISOString(),
                        category: options.category || 'test',
                        priority: options.requireInteraction ? '2' : '1'
                    }
                };
                
                // iOS 16.4以降は標準のNotification APIを試す
                if (isIOS16_4OrLater && 'serviceWorker' in navigator && 'PushManager' in window) {
                    try {
                        console.log('iOS 16.4以降のため、標準のNotification APIを使用します');
                        const notification = new Notification(options.title || 'テスト通知 (標準API)', {
                            body: options.body || 'これはiOS 16.4以降の標準APIを使用したテスト通知です。',
                            icon: options.icon || 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
                            badge: options.badge || './images/badge-72x72.png',
                            tag: options.category || 'test-notification'
                        });
                        
                        notification.onclick = function() {
                            window.focus();
                            this.close();
                        };
                        
                        return true;
                    } catch (error) {
                        console.warn('標準APIでの通知に失敗しました。カスタムUIにフォールバックします:', error);
                        // フォールバック：カスタムUI通知
                        this.handleForegroundMessage(testNotification);
                        return true;
                    }
                } else {
                    // iOS 16.4未満またはPush APIが利用できない場合はカスタムUIで表示
                    console.log('カスタム通知UIを使用します');
                    this.handleForegroundMessage(testNotification);
                    return true;
                }
            }
            
            // 通常のブラウザ向け処理
            if (Notification.permission === 'granted') {
                const notification = new Notification(options.title || 'テスト通知', {
                    body: options.body || 'これはテスト通知です。通知システムが正常に動作しています。',
                    icon: options.icon || 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
                    badge: options.badge || './images/badge-72x72.png',
                    tag: options.category || 'test-notification',
                    requireInteraction: options.requireInteraction || false
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
    
    // iOS PWA向けの通知サポート状況を確認
    checkIOSPWASupport() {
        // iOS バージョンの取得
        const iOSVersion = this.getIOSVersion();
        const isIOS16_4OrLater = iOSVersion && iOSVersion >= 16.4;
        
        const supportInfo = {
            isIOS: this.isIOS,
            isPWA: this.isPWA,
            isIOSPWA: this.isIOSPWA,
            iOSVersion: iOSVersion,
            isIOS16_4OrLater: isIOS16_4OrLater,
            notificationPermission: Notification.permission,
            serviceWorkerSupported: 'serviceWorker' in navigator,
            pushManagerSupported: 'PushManager' in window,
            fcmSupported: typeof firebase !== 'undefined' && firebase.messaging,
            customNotificationUI: this.isIOSPWA,
            fullPushSupport: isIOS16_4OrLater && this.isIOSPWA
        };
        
        console.log('通知サポート状況:', supportInfo);
        
        // iOS 16.4以降のPWAでは完全なプッシュ通知がサポートされている
        if (this.isIOSPWA) {
            if (isIOS16_4OrLater) {
                console.log('iOS 16.4以降のPWAで実行中です。完全なプッシュ通知がサポートされています。');
            } else {
                console.log('iOS 16.4未満のPWAで実行中です。カスタム通知UIを使用します。');
            }
        }
        
        return supportInfo;
    }
    
    // iOSバージョンを取得
    getIOSVersion() {
        if (!this.isIOS) return null;
        
        const match = navigator.userAgent.match(/OS\s([0-9_]+)/);
        if (match && match[1]) {
            return parseFloat(match[1].replace('_', '.'));
        }
        return null;
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
