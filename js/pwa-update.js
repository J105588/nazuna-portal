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
            // ステータス表示を追加
            this.showUpdateStatus();
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
                    this.updateStatusDisplay();
                } else {
                    // 初回インストール
                    console.log('App cached for offline use');
                    this.showCachedNotification();
                    this.updateStatusDisplay();
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
            '🚀 新しいバージョンが利用可能です',
            'アプリの新しいバージョンが利用可能です。最新の機能と改善をお楽しみください。',
            [
                {
                    text: '今すぐアップデート',
                    action: () => this.applyUpdate(),
                    primary: true
                },
                {
                    text: '後で通知',
                    action: () => this.scheduleUpdateReminder()
                }
            ]
        );

        this.showNotification(notification);
        
        // 更新通知をより目立たせるため、追加の視覚的効果を適用
        this.addUpdateNotificationEffects(notification);
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

    // 更新通知の視覚的効果を追加
    addUpdateNotificationEffects(notification) {
        // パルス効果を追加
        notification.style.animation = 'pulse 2s infinite';
        
        // 点滅効果を追加
        const icon = notification.querySelector('.pwa-update-icon i');
        if (icon) {
            icon.style.animation = 'blink 1.5s infinite';
        }
        
        // 5秒後に自動的に目立たせる
        setTimeout(() => {
            notification.classList.add('pwa-update-notification-urgent');
        }, 5000);
    }

    // 更新リマインダーをスケジュール
    scheduleUpdateReminder() {
        this.dismissNotification();
        
        // 10分後にリマインダーを表示
        setTimeout(() => {
            if (this.updateAvailable) {
                this.showUpdateReminder();
            }
        }, 10 * 60 * 1000); // 10分
        
        // ローカルストレージにリマインダー情報を保存
        localStorage.setItem('pwa-update-reminder', JSON.stringify({
            scheduled: true,
            timestamp: Date.now(),
            reminderTime: Date.now() + (10 * 60 * 1000)
        }));
    }

    // 更新リマインダーを表示
    showUpdateReminder() {
        const notification = this.createNotification(
            '⏰ アップデートのお知らせ',
            'まだアップデートしていません。最新の機能をお見逃しなく！',
            [
                {
                    text: '今すぐアップデート',
                    action: () => this.applyUpdate(),
                    primary: true
                },
                {
                    text: 'もう少し待つ',
                    action: () => this.scheduleUpdateReminder()
                }
            ]
        );

        this.showNotification(notification);
        this.addUpdateNotificationEffects(notification);
    }

    // 更新状況を表示するステータス表示を追加
    showUpdateStatus() {
        const statusContainer = document.createElement('div');
        statusContainer.className = 'pwa-update-status';
        statusContainer.innerHTML = `
            <div class="pwa-update-status-content">
                <div class="pwa-update-status-icon">
                    <i class="fas fa-sync-alt"></i>
                </div>
                <div class="pwa-update-status-text">
                    <span class="pwa-update-status-label">更新状況:</span>
                    <span class="pwa-update-status-value">チェック中...</span>
                </div>
                <div class="pwa-update-status-actions">
                    <button class="pwa-update-status-btn" onclick="window.checkForPWAUpdates()">
                        <i class="fas fa-refresh"></i>
                    </button>
                </div>
            </div>
        `;
        
        // ヘッダーに追加
        const header = document.querySelector('header') || document.querySelector('.header');
        if (header) {
            header.appendChild(statusContainer);
        } else {
            document.body.insertBefore(statusContainer, document.body.firstChild);
        }
        
        // ステータスを更新
        this.updateStatusDisplay();
    }

    // ステータス表示を更新
    updateStatusDisplay() {
        const statusValue = document.querySelector('.pwa-update-status-value');
        if (statusValue) {
            if (this.updateAvailable) {
                statusValue.textContent = '更新利用可能';
                statusValue.className = 'pwa-update-status-value pwa-update-status-available';
            } else if (this.registration) {
                statusValue.textContent = '最新版';
                statusValue.className = 'pwa-update-status-value pwa-update-status-current';
            } else {
                statusValue.textContent = '未登録';
                statusValue.className = 'pwa-update-status-value pwa-update-status-error';
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
