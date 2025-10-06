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
        // 待機中SWが存在しない場合はリロードしない（無限更新防止）
        if (!this.registration || !this.registration.waiting) {
            console.log('Controller changed but no waiting SW; skipping reload');
            return;
        }
        if (this.updateAvailable) {
            console.log('Reloading page for update');
            window.location.reload();
        }
    }

    showUpdateNotification() {
        const notification = this.createNotification(
            '🚀 システムアップデートが利用可能です',
            'アプリの新しいバージョンが利用可能です。最新の機能と改善を体験するために、今すぐアップデートすることをお勧めします。',
            [
                {
                    text: '今すぐアップデート',
                    action: () => this.applyUpdate(),
                    primary: true
                },
                {
                    text: '詳細を確認',
                    action: () => this.showUpdateDetails()
                },
                {
                    text: '後で',
                    action: () => this.dismissNotification()
                }
            ]
        );

        this.showNotification(notification);
        
        // 更新モジュールを画面に表示
        this.showUpdateModule();
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
                    this.forceReloadWithCacheClear();
                }, 30000);
                
                // 新しいService Workerにskip waitingを送信
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                
                // アップデート完了を待つ
                const stateChangeHandler = () => {
                    if (this.registration.waiting.state === 'activated') {
                        console.log('Update applied successfully');
                        clearTimeout(timeoutId);
                        this.hideUpdateLoading();
                        // キャッシュを完全にクリアしてからリロード
                        this.forceReloadWithCacheClear();
                    }
                };
                
                this.registration.waiting.addEventListener('statechange', stateChangeHandler);
                
                // コントローラー変更も監視
                const controllerChangeHandler = () => {
                    console.log('Controller changed, update complete');
                    clearTimeout(timeoutId);
                    this.hideUpdateLoading();
                    this.forceReloadWithCacheClear();
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

    // キャッシュを完全にクリアしてリロード
    async forceReloadWithCacheClear() {
        try {
            console.log('Clearing all caches and reloading...');
            
            // すべてのキャッシュをクリア
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('Found caches:', cacheNames);
                
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
                console.log('All caches cleared');
            }
            
            // Service Workerを無効化
            if (this.registration) {
                await this.registration.unregister();
                console.log('Service Worker unregistered');
            }
            
            // ローカルストレージとセッションストレージをクリア
            try {
                localStorage.clear();
                sessionStorage.clear();
                console.log('Local storage cleared');
            } catch (e) {
                console.warn('Could not clear storage:', e);
            }
            
            // 強制リロード（キャッシュを無視）
            console.log('Forcing reload with cache bypass...');
            window.location.reload(true);
            
        } catch (error) {
            console.error('Error during cache clear and reload:', error);
            // エラーが発生してもリロードは実行
            window.location.reload(true);
        }
    }
    
    // 手動でキャッシュクリアとリロードを実行
    async manualCacheClearAndReload() {
        this.showUpdateLoading();
        
        try {
            await this.forceReloadWithCacheClear();
        } catch (error) {
            console.error('Manual cache clear failed:', error);
            this.hideUpdateLoading();
            this.showUpdateError();
        }
    }
    
    // 更新モジュールを画面に表示
    showUpdateModule() {
        // 既存のモジュールを削除
        const existingModule = document.querySelector('.pwa-update-module');
        if (existingModule) {
            existingModule.remove();
        }
        
        const module = document.createElement('div');
        module.className = 'pwa-update-module';
        module.innerHTML = `
            <div class="pwa-update-module-content">
                <div class="pwa-update-module-header">
                    <div class="pwa-update-module-icon">
                        <i class="fas fa-sync-alt fa-spin"></i>
                    </div>
                    <div class="pwa-update-module-title">
                        <h3>システムアップデート</h3>
                        <p>新しいバージョンが利用可能です</p>
                    </div>
                    <button class="pwa-update-module-close" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="pwa-update-module-body">
                    <div class="pwa-update-module-info">
                        <div class="pwa-update-module-item">
                            <i class="fas fa-download"></i>
                            <span>新しい機能と改善</span>
                        </div>
                        <div class="pwa-update-module-item">
                            <i class="fas fa-shield-alt"></i>
                            <span>セキュリティの強化</span>
                        </div>
                        <div class="pwa-update-module-item">
                            <i class="fas fa-bolt"></i>
                            <span>パフォーマンスの向上</span>
                        </div>
                    </div>
                    <div class="pwa-update-module-actions">
                        <button class="pwa-update-module-btn pwa-update-module-btn-primary" onclick="pwaUpdater.applyUpdate()">
                            <i class="fas fa-download"></i>
                            今すぐアップデート
                        </button>
                        <button class="pwa-update-module-btn" onclick="pwaUpdater.showUpdateDetails()">
                            <i class="fas fa-info-circle"></i>
                            詳細を確認
                        </button>
                        <button class="pwa-update-module-btn" onclick="pwaUpdater.manualCacheClearAndReload()">
                            <i class="fas fa-trash"></i>
                            キャッシュクリア
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(module);
        
        // アニメーション
        setTimeout(() => {
            module.classList.add('pwa-update-module-show');
        }, 100);
    }
    
    // 更新詳細を表示
    async showUpdateDetails() {
        const cacheInfo = await this.getCacheInfo();
        const status = this.getPWAStatus();
        
        const detailsModal = document.createElement('div');
        detailsModal.className = 'pwa-update-details';
        detailsModal.innerHTML = `
            <div class="pwa-update-details-content">
                <div class="pwa-update-details-header">
                    <h3>アップデート詳細</h3>
                    <button class="pwa-update-details-close" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="pwa-update-details-body">
                    <div class="pwa-update-details-section">
                        <h4>システム状態</h4>
                        <div class="pwa-update-details-item">
                            <span>Service Worker:</span>
                            <span class="${status.registered ? 'status-active' : 'status-inactive'}">
                                ${status.registered ? '登録済み' : '未登録'}
                            </span>
                        </div>
                        <div class="pwa-update-details-item">
                            <span>更新利用可能:</span>
                            <span class="${status.updateAvailable ? 'status-active' : 'status-inactive'}">
                                ${status.updateAvailable ? 'はい' : 'いいえ'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="pwa-update-details-section">
                        <h4>キャッシュ情報</h4>
                        <div class="pwa-update-details-cache">
                            ${cacheInfo.caches.map(cache => `
                                <div class="pwa-update-details-cache-item">
                                    <strong>${cache.name}</strong>
                                    <span>${cache.entries} エントリ</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="pwa-update-details-actions">
                        <button class="pwa-update-module-btn pwa-update-module-btn-primary" onclick="pwaUpdater.applyUpdate()">
                            <i class="fas fa-download"></i>
                            アップデート実行
                        </button>
                        <button class="pwa-update-module-btn" onclick="pwaUpdater.manualCacheClearAndReload()">
                            <i class="fas fa-trash"></i>
                            キャッシュクリア
                        </button>
                        <button class="pwa-update-module-btn" onclick="window.checkForPWAUpdates()">
                            <i class="fas fa-sync"></i>
                            更新チェック
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(detailsModal);
        
        // アニメーション
        setTimeout(() => {
            detailsModal.classList.add('pwa-update-details-show');
        }, 100);
    }
    
    // キャッシュ情報を取得
    async getCacheInfo() {
        const cacheInfo = {
            caches: [],
            totalSize: 0,
            serviceWorker: null
        };
        
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    const cache = await caches.open(cacheName);
                    const keys = await cache.keys();
                    cacheInfo.caches.push({
                        name: cacheName,
                        entries: keys.length,
                        urls: keys.map(request => request.url)
                    });
                }
            }
            
            if (this.registration) {
                cacheInfo.serviceWorker = {
                    scope: this.registration.scope,
                    active: this.registration.active ? this.registration.active.scriptURL : null,
                    waiting: this.registration.waiting ? this.registration.waiting.scriptURL : null,
                    installing: this.registration.installing ? this.registration.installing.scriptURL : null
                };
            }
            
        } catch (error) {
            console.error('Error getting cache info:', error);
        }
        
        return cacheInfo;
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

// 更新モジュールを手動で表示する関数
window.showPWAUpdateModule = () => pwaUpdater.showUpdateModule();

// キャッシュクリアとリロードを手動で実行する関数
window.clearPWACacheAndReload = () => pwaUpdater.manualCacheClearAndReload();

// 更新詳細を表示する関数
window.showPWAUpdateDetails = () => pwaUpdater.showUpdateDetails();
