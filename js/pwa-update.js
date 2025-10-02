// PWAアップデート機能

class PWAUpdater {
    constructor() {
        this.registration = null;
        this.updateAvailable = false;
        this.init();
    }

    init() {
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        } else {
            console.log('Service Worker not supported');
        }
    }

    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully');

            // アップデートをチェック
            this.registration.addEventListener('updatefound', () => {
                console.log('New Service Worker found');
                this.handleUpdateFound();
            });

            // Service Workerの状態変更を監視
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker controller changed');
                this.handleControllerChange();
            });

            // 定期的にアップデートをチェック
            this.startPeriodicUpdateCheck();

        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    handleUpdateFound() {
        const newWorker = this.registration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    // 既存のService Workerがある場合、アップデートが利用可能
                    console.log('App update available');
                    this.updateAvailable = true;
                    this.showUpdateNotification();
                } else {
                    // 初回インストール
                    console.log('App cached for offline use');
                    this.showCachedNotification();
                }
            }
        });
    }

    handleControllerChange() {
        // ページをリロードしてアップデートを適用
        if (this.updateAvailable) {
            console.log('Reloading page for update');
            window.location.reload();
        }
    }

    showUpdateNotification() {
        const notification = this.createNotification(
            'アップデートが利用可能です',
            'アプリの新しいバージョンが利用可能です。今すぐアップデートしますか？',
            [
                {
                    text: 'アップデート',
                    action: () => this.applyUpdate(),
                    primary: true
                },
                {
                    text: '後で',
                    action: () => this.dismissNotification()
                }
            ]
        );

        this.showNotification(notification);
    }

    showCachedNotification() {
        const notification = this.createNotification(
            'オフライン対応完了',
            'アプリがオフラインで利用可能になりました。',
            [
                {
                    text: 'OK',
                    action: () => this.dismissNotification()
                }
            ]
        );

        this.showNotification(notification);
    }

    createNotification(title, message, buttons = []) {
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        
        const buttonsHTML = buttons.map(btn => 
            `<button class="pwa-update-btn ${btn.primary ? 'pwa-update-btn-primary' : ''}" data-action="${btn.text}">
                ${btn.text}
            </button>`
        ).join('');

        notification.innerHTML = `
            <div class="pwa-update-content">
                <div class="pwa-update-icon">
                    <i class="fas fa-download"></i>
                </div>
                <div class="pwa-update-text">
                    <h3>${title}</h3>
                    <p>${message}</p>
                </div>
                <div class="pwa-update-actions">
                    ${buttonsHTML}
                </div>
            </div>
        `;

        // ボタンのイベントリスナーを設定
        buttons.forEach(btn => {
            const buttonElement = notification.querySelector(`[data-action="${btn.text}"]`);
            if (buttonElement && btn.action) {
                buttonElement.addEventListener('click', btn.action);
            }
        });

        return notification;
    }

    showNotification(notification) {
        // 既存の通知を削除
        const existing = document.querySelector('.pwa-update-notification');
        if (existing) {
            existing.remove();
        }

        document.body.appendChild(notification);

        // アニメーション
        setTimeout(() => {
            notification.classList.add('pwa-update-notification-show');
        }, 100);
    }

    dismissNotification() {
        const notification = document.querySelector('.pwa-update-notification');
        if (notification) {
            notification.classList.remove('pwa-update-notification-show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    async applyUpdate() {
        if (this.registration && this.registration.waiting) {
            // 新しいService Workerにskip waitingを送信
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    }

    startPeriodicUpdateCheck() {
        // 30分ごとにアップデートをチェック
        setInterval(() => {
            if (this.registration) {
                console.log('Checking for updates...');
                this.registration.update();
            }
        }, 30 * 60 * 1000); // 30分
    }

    // 手動でアップデートをチェック
    async checkForUpdates() {
        if (this.registration) {
            try {
                await this.registration.update();
                console.log('Update check completed');
            } catch (error) {
                console.error('Update check failed:', error);
            }
        }
    }

    // PWAの状態を取得
    getPWAStatus() {
        return {
            registered: !!this.registration,
            updateAvailable: this.updateAvailable,
            controller: !!navigator.serviceWorker.controller,
            scope: this.registration ? this.registration.scope : null
        };
    }
}

// PWAアップデーターを初期化
const pwaUpdater = new PWAUpdater();

// グローバルに公開
window.PWAUpdater = PWAUpdater;

// 手動アップデートチェック用の関数をグローバルに公開
window.checkForPWAUpdates = () => pwaUpdater.checkForUpdates();
