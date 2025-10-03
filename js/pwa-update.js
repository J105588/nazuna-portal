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
            this.registration = await navigator.serviceWorker.register('./sw.js');
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
            try {
                // ローディング表示を開始
                this.showUpdateLoading();
                
                // タイムアウト設定（30秒）
                const timeoutId = setTimeout(() => {
                    console.warn('Update timeout, forcing reload');
                    this.hideUpdateLoading();
                    window.location.reload();
                }, 30000);
                
                // 新しいService Workerにskip waitingを送信
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                
                // アップデート完了を待つ
                const stateChangeHandler = () => {
                    if (this.registration.waiting.state === 'activated') {
                        console.log('Update applied successfully');
                        clearTimeout(timeoutId);
                        this.hideUpdateLoading();
                        // ページをリロードしてアップデートを適用
                        window.location.reload();
                    }
                };
                
                this.registration.waiting.addEventListener('statechange', stateChangeHandler);
                
                // コントローラー変更も監視
                const controllerChangeHandler = () => {
                    console.log('Controller changed, update complete');
                    clearTimeout(timeoutId);
                    this.hideUpdateLoading();
                    window.location.reload();
                };
                
                navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);
                
            } catch (error) {
                console.error('Update failed:', error);
                this.hideUpdateLoading();
                this.showUpdateError();
            }
        } else {
            console.warn('No waiting service worker found');
            this.showUpdateError();
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

    // アップデートローディング表示
    showUpdateLoading() {
        const loadingModal = document.createElement('div');
        loadingModal.className = 'pwa-update-loading';
        loadingModal.innerHTML = `
            <div class="pwa-update-loading-content">
                <div class="pwa-update-loading-spinner">
                    <div class="spinner"></div>
                </div>
                <div class="pwa-update-loading-text">
                    <h3>システムをアップデート中...</h3>
                    <p>しばらくお待ちください</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(loadingModal);
        
        // アニメーション
        setTimeout(() => {
            loadingModal.classList.add('pwa-update-loading-show');
        }, 100);
    }

    // アップデートローディング非表示
    hideUpdateLoading() {
        const loadingModal = document.querySelector('.pwa-update-loading');
        if (loadingModal) {
            loadingModal.classList.remove('pwa-update-loading-show');
            setTimeout(() => {
                loadingModal.remove();
            }, 300);
        }
    }

    // アップデートエラー表示
    showUpdateError() {
        const errorModal = document.createElement('div');
        errorModal.className = 'pwa-update-error';
        errorModal.innerHTML = `
            <div class="pwa-update-error-content">
                <div class="pwa-update-error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="pwa-update-error-text">
                    <h3>アップデートに失敗しました</h3>
                    <p>しばらく時間をおいてから再度お試しください</p>
                </div>
                <div class="pwa-update-error-actions">
                    <button class="pwa-update-btn pwa-update-btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        閉じる
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorModal);
        
        // アニメーション
        setTimeout(() => {
            errorModal.classList.add('pwa-update-error-show');
        }, 100);
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
