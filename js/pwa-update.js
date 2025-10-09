// PWAアップデート機能

class PWAUpdater {
    constructor() {
        this.registration = null;
        this.updateAvailable = false;
        this.updatePromptShown = false;
        this.isApplying = false;
        this.updateIntervalId = null;
        this.channel = null;
        this.lastSeenCacheName = localStorage.getItem('pwa_last_cache_name') || '';
        if (!window.__pwaUpdaterInitialized) {
            window.__pwaUpdaterInitialized = true;
            this.ensureStyles();
            this.init();
        }
    }

    init() {
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
            // タブがアクティブになったときに軽量チェック
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.throttledUpdateCheck();
                }
            });

            // Service Worker からのメッセージを受信
            navigator.serviceWorker.addEventListener('message', (event) => {
                const data = event.data || {};
                if (!data || !data.type) return;
                switch (data.type) {
                    case 'UPDATE_AVAILABLE':
                        this.updateAvailable = true;
                        if (!this.updatePromptShown) {
                            this.updatePromptShown = true;
                            this.showUpdateNotification();
                        }
                        break;
                    case 'RELOAD':
                        // 次回以降のループを防ぐため、リロード前にキャッシュ名を確定保存
                        if (this._pendingCacheName) {
                            this.lastSeenCacheName = this._pendingCacheName;
                            try { localStorage.setItem('pwa_last_cache_name', this.lastSeenCacheName); } catch {}
                        }
                        this.cleanupOverlays();
                        window.location.reload();
                        break;
                    case 'CACHE_NAME':
                        if (typeof data.cacheName === 'string') {
                            this.handleCacheName(data.cacheName);
                        }
                        break;
                    default:
                        break;
                }
            });

            // BroadcastChannel 経由のメッセージリスナー
            try {
                if (window.BroadcastChannel) {
                    this.channel = new BroadcastChannel('pwa-updates');
                    this.channel.addEventListener('message', (ev) => {
                        const data = ev.data || {};
                        if (!data || !data.type) return;
                        switch (data.type) {
                            case 'UPDATE_AVAILABLE':
                                this.updateAvailable = true;
                                if (!this.updatePromptShown) {
                                    this.updatePromptShown = true;
                                    this.showUpdateNotification();
                                }
                                break;
                            case 'CACHE_NAME':
                                if (typeof data.cacheName === 'string') {
                                    this.handleCacheName(data.cacheName);
                                }
                                break;
                            case 'INSTALLED':
                            case 'ACTIVATED':
                                // 必要に応じてログやUI反映
                                break;
                            default:
                                break;
                        }
                    });
                }
            } catch {}
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
                // 重複ガード
                if (this.pendingWorker && this.pendingWorker.state !== 'redundant') return;
                console.log('New Service Worker found');
                this.handleUpdateFound();
            });

            // Service Workerの状態変更を監視
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker controller changed');
                this.handleControllerChange();
            });

            // 定期的にアップデートをチェック（重複防止）
            this.startPeriodicUpdateCheck();

        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    handleUpdateFound() {
        const newWorker = this.registration.installing;
        if (!newWorker) return;
        this.pendingWorker = newWorker;
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    // 既存のService Workerがある場合、アップデートが利用可能
                    console.log('App update available');
                    this.updateAvailable = true;
                    if (!this.updatePromptShown) {
                        this.updatePromptShown = true;
                        this.showUpdateNotification();
                    }
                } else {
                    // 初回インストール
                    console.log('App cached for offline use');
                    this.showCachedNotification();
                }
            }
        });
    }

    handleControllerChange() {
        console.log('Service Worker controller changed');
        
        // 更新が利用可能な場合のみリロード
        if (this.updateAvailable) {
            console.log('Reloading page for update');
            this.updateAvailable = false;
            this.updatePromptShown = false;
            this.hideUpdateLoading();
            
            // 少し遅延してからリロード（確実にSWがアクティブになるまで待つ）
            setTimeout(() => {
                // ページ再読み込み前にキャッシュ名を保存して再通知ループを防止
                if (this._pendingCacheName) {
                    this.lastSeenCacheName = this._pendingCacheName;
                    try { localStorage.setItem('pwa_last_cache_name', this.lastSeenCacheName); } catch {}
                }
                window.location.reload();
            }, 100);
        } else {
            console.log('Controller changed but no update available');
        }
    }

    showUpdateNotification() {
        // キャッシュ名が変わっていなければ通知を出さない
        if (this._pendingCacheName && this._pendingCacheName === this.lastSeenCacheName) return;
        // フルスクリーンの豪華な告知を表示
        this.showFullScreenUpdateAnnouncement();
    }

    showFullScreenUpdateAnnouncement() {
        // 既に表示中なら再表示しない
        if (document.querySelector('.pwa-update-announcement')) return;
        const overlay = document.createElement('div');
        overlay.className = 'pwa-update-announcement';

        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '50%';
        overlay.style.transform = 'translateX(-50%)';
        overlay.style.width = '100%';
        overlay.style.zIndex = '1000'; // 他の要素より手前に表示
        
        overlay.innerHTML = `
            <div class="pwa-update-announcement-content">
                <div class="pwa-ripples"></div>
                <div class="pwa-update-hero">
                    <div class="pwa-update-glow"></div>
                    <div class="pwa-update-icon">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <h2>システムアップデート</h2>
                    <p>最新の改善と最適化を一括適用します</p>
                </div>
                <div class="pwa-update-actions">
                    <button class="pwa-update-primary" id="pwa-update-apply-all">
                        <i class="fas fa-download"></i> 全体を今すぐ更新
                    </button>
                    <button class="pwa-update-secondary" id="pwa-update-later">
                        後で
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        // スクロール固定
        try { this._prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } catch {}
        setTimeout(() => overlay.classList.add('show'), 0);
        const applyBtn = overlay.querySelector('#pwa-update-apply-all');
        const laterBtn = overlay.querySelector('#pwa-update-later');
        applyBtn && applyBtn.addEventListener('click', () => {
            this.applyUpdate();
            this.showUpdateLoading();
            try { overlay.remove(); document.body.style.overflow = this._prevOverflow || ''; } catch {}
        });
        laterBtn && laterBtn.addEventListener('click', () => { try { overlay.remove(); document.body.style.overflow = this._prevOverflow || ''; } catch {} });
    }

    showCachedNotification() {
        // オフライン完了の通知は表示しない
        return;
    }

    createNotification(title, message, buttons = []) {
        const notification = document.createElement('div');
        notification.className = 'pwa-update-toast';
        const buttonsHTML = buttons.map(btn => `
            <button class="pwa-update-btn ${btn.primary ? 'pwa-update-btn-primary' : ''}" data-action="${btn.text}">${btn.text}</button>
        `).join('');
        notification.innerHTML = `
            <div class="pwa-update-toast-inner" role="status" aria-live="polite">
                <div class="pwa-update-toast-text">
                    <strong>${title}</strong>
                    <span>${message}</span>
                </div>
                <div class="pwa-update-toast-actions">
                    ${buttonsHTML}
                </div>
            </div>
        `;
        buttons.forEach(btn => {
            const el = notification.querySelector(`[data-action="${btn.text}"]`);
            if (el && btn.action) el.addEventListener('click', btn.action);
        });
        return notification;
    }

    showNotification(notification) {
        // 既存のトーストは上部でスタック表示にする（直近のみ残す運用が良ければ先に削除）
        const existing = document.querySelectorAll('.pwa-update-toast');
        if (existing.length > 1) existing[0].remove();
        document.body.appendChild(notification);
        requestAnimationFrame(() => notification.classList.add('show'));
    }

    dismissNotification() {
        const notification = document.querySelector('.pwa-update-toast');
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 200);
        }
    }

    async applyUpdate() {
        if (this.isApplying) return;
        this.isApplying = true;
        
        try {
            this.showUpdateLoading();
            
            if (this.registration) {
                // 待機中のService Workerがある場合
                if (this.registration.waiting) {
                    console.log('Activating waiting Service Worker...');
                    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    
                    // 確実に更新を適用するため、少し待ってからリロード
                    setTimeout(() => {
                        if (this.updateAvailable) {
                            window.location.reload();
                        }
                    }, 500);
                    
                } else if (this.registration.installing) {
                    console.log('Waiting for Service Worker installation...');
                    const installing = this.registration.installing;
                    
                    installing.addEventListener('statechange', () => {
                        if (installing.state === 'installed' && this.registration.waiting) {
                            console.log('Service Worker installed, activating...');
                            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                            
                            setTimeout(() => {
                                if (this.updateAvailable) {
                                    window.location.reload();
                                }
                            }, 500);
                        }
                    });
                    
                } else {
                    console.log('Checking for Service Worker updates...');
                    // 最新のService Workerを取得
                    await this.registration.update();
                    
                    if (this.registration.waiting) {
                        console.log('New Service Worker found, activating...');
                        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        
                        setTimeout(() => {
                            if (this.updateAvailable) {
                                window.location.reload();
                            }
                        }, 500);
                    } else {
                        console.log('No Service Worker update available');
                        this.hideUpdateLoading();
                    }
                }
            } else {
                console.log('No Service Worker registration found');
                this.hideUpdateLoading();
            }
            
        } catch (error) {
            console.error('Apply update failed:', error);
            this.hideUpdateLoading();
            this.showUpdateError();
        } finally {
            this.isApplying = false;
        }
    }

    startPeriodicUpdateCheck() {
        // 30分ごとにアップデートをチェック（多重起動防止）
        if (this.updateIntervalId) clearInterval(this.updateIntervalId);
        this.updateIntervalId = setInterval(() => this.throttledUpdateCheck(), 30 * 60 * 1000);
    }

    // 手動でアップデートをチェック
    async checkForUpdates() {
        if (this.registration) {
            try {
                await this.registration.update();
                console.log('Update check completed');
                // SW にも明示チェックを依頼し、待機中の有無を通知してもらう
                if (navigator.serviceWorker.controller) {
                    try { navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' }); } catch {}
                }
                try { this.channel && this.channel.postMessage({ type: 'CHECK_UPDATE' }); } catch {}
            } catch (error) {
                console.error('Update check failed:', error);
            }
        }
    }

    throttledUpdateCheck() {
        if (!this.registration) return;
        if (this._lastCheck && Date.now() - this._lastCheck < 60 * 1000) return; // 最低1分間隔
        this._lastCheck = Date.now();
        this.registration.update().catch(() => {});
    }

    // アップデートローディング表示（ディスプレイ中央）
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
            <div class="pwa-ripples"></div>
        `;
        // テーマカラー適用（グラデーション）
        try {
            const theme = this.getThemeColor();
            const box = loadingModal.querySelector('.pwa-update-loading-content');
            const spinner = loadingModal.querySelector('.spinner');
            if (box) box.style.background = `linear-gradient(135deg, ${theme} 0%, #6b9b7a 100%)`;
            if (spinner) {
                spinner.style.borderTopColor = '#fff';
                spinner.style.borderColor = 'rgba(255,255,255,.35)';
            }
        } catch {}
        
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
        // オーバーレイ類を後処理で確実に除去
        this.cleanupOverlays();
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

    // ソフトリロード（URLにバスター付与）
    forceSoftReload() {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('updated', String(Date.now()));
            this.cleanupOverlays();
            window.location.replace(url.toString());
        } catch (e) {
            this.cleanupOverlays();
            window.location.reload();
        }
    }

    // 現在のキャッシュを全消去してリロード
    async forceReloadWithCacheClearOnly() {
        try {
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
            }
        } catch (e) {
            console.warn('Cache clear error:', e);
        }
        this.cleanupOverlays();
        window.location.reload();
    }

    // 画面上に残りがちなオーバーレイやスクロール制御を除去
    cleanupOverlays() {
        try {
            const selectors = [
                '.opening-screen',
                '.modal-overlay',
                '.sidebar-overlay',
                '#main-overlay',
                '.pwa-update-notification',
                '.pwa-update-loading',
                '.pwa-update-error',
                '.pwa-update-module',
                '.pwa-update-details'
            ];
            selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                    // アニメーション用クラスを外してから除去
                    el.classList && el.classList.remove('active', 'show');
                    if (el.parentElement) el.remove();
                });
            });
            // ボディのスクロールを復帰
            document.body && (document.body.style.overflow = '');
        } catch (e) {
            console.warn('Overlay cleanup warning:', e);
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

    // 最小限のスタイルを注入して確実に表示
    ensureStyles() {
        const STYLE_ID = 'pwa-update-minimal-style';
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .pwa-update-toast { position: fixed; top: 16px; right: 16px; z-index: 2147483647; display: block; transform: translateY(-12px); opacity: 0; transition: transform .16s ease-out, opacity .16s ease-out; }
            .pwa-update-toast.show { transform: translateY(0); opacity: 1; }
            .pwa-update-toast-inner { box-sizing: border-box; background: #1f2937; color: #fff; padding: 10px 12px; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.25); display: flex; gap: 10px; align-items: center; max-width: 360px; }
            .pwa-update-toast-text { display: flex; flex-direction: column; gap: 2px; font-size: 13px; line-height: 1.35; }
            .pwa-update-toast-text strong { font-size: 13px; }
            .pwa-update-toast-actions { margin-left: auto; display: flex; gap: 8px; }
            .pwa-update-btn { appearance: none; border: 1px solid rgba(255,255,255,.35); background: transparent; color: #fff; border-radius: 6px; padding: 6px 10px; font-size: 13px; cursor: pointer; }
            .pwa-update-btn:hover { background: rgba(255,255,255,.08); }
            .pwa-update-btn-primary { background: #10b981; border-color: #10b981; color: #0b2b22; }
            .pwa-update-btn-primary:hover { filter: brightness(0.95); }
            @media (max-width: 480px) { .pwa-update-toast { right: 8px; left: 8px; } .pwa-update-toast-inner { max-width: none; } }
            /* Loading modal (viewport center) */
            .pwa-update-loading { position: fixed; inset: 0; z-index: 2147483646; display: grid; place-items: center; background:
                radial-gradient(1200px 600px at 20% -20%, rgba(255,255,255,.10), transparent),
                linear-gradient(135deg, #4a7c59 0%, #6b9b7a 100%);
                opacity: 0; transition: opacity .16s ease-out; overflow:hidden; }
            .pwa-update-loading-show { opacity: 1; }
            .pwa-update-loading-content { background: rgba(17,24,39,.82); color: #fff; padding: 22px 24px; border-radius: 14px; width: min(92vw, 460px); box-shadow: 0 18px 48px rgba(0,0,0,.5); text-align: center; backdrop-filter: blur(10px); }
            .pwa-update-loading-spinner { margin-bottom: 12px; display: grid; place-items: center; }
            .pwa-update-loading-spinner .spinner { width: 32px; height: 32px; border: 4px solid rgba(255,255,255,.25); border-top-color: #10b981; border-radius: 50%; animation: pwa-spin 1s linear infinite; }
            @keyframes pwa-spin { to { transform: rotate(360deg); } }
            /* Details/Module (viewport centered) */
            .pwa-update-details, .pwa-update-module { position: fixed; inset: 0; z-index: 2147483646; display: grid; place-items: center; background: rgba(0,0,0,.35); opacity: 0; transition: opacity .16s ease-out; }
            .pwa-update-details-show, .pwa-update-module-show { opacity: 1; }
            .pwa-update-details-content, .pwa-update-module-content { background: #111827; color:#fff; width: min(92vw, 560px); border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,.45); }
            .pwa-update-details-header, .pwa-update-module-header { display:flex; align-items:center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.08); }
            .pwa-update-details-body, .pwa-update-module-body { padding: 14px 16px; }
            /* Full-screen glamorous announcement (opening theme) */
            .pwa-update-announcement { position: fixed; inset:0; z-index:2147483647; display:grid; place-items:center; 
                background:
                  radial-gradient(1200px 600px at 20% -20%, rgba(255,255,255,.10), transparent),
                  linear-gradient(135deg, #4a7c59 0%, #6b9b7a 100%);
                opacity:0; transition: opacity .18s ease-out; overflow:hidden; }
            .pwa-update-announcement.show { opacity:1; }
            .pwa-update-announcement-content { width:min(92vw,740px); padding:28px; border-radius:18px; background: rgba(17,24,39,.72); color:#fff; box-shadow: 0 24px 72px rgba(0,0,0,.55); backdrop-filter: blur(12px); text-align:center; }
            .pwa-update-hero { position:relative; padding:12px 0 18px; }
            .pwa-update-glow { position:absolute; inset:-24px -24px auto -24px; height:120px; filter: blur(28px); background: conic-gradient(from 0deg at 50% 50%, rgba(102,126,234,.45), rgba(118,75,162,.35), rgba(102,126,234,.45)); opacity:.8; border-radius:24px; }
            .pwa-update-icon { position:relative; z-index:1; width:72px; height:72px; margin:0 auto 10px; border-radius:50%; display:grid; place-items:center; background: linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,.06)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); font-size:28px; }
            /* Ripple animation */
            .pwa-ripples { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
            .pwa-ripples::before, .pwa-ripples::after { content:''; position:absolute; top:50%; left:50%; width:20vmin; height:20vmin; border-radius:50%; transform:translate(-50%, -50%); background: radial-gradient(circle, rgba(255,255,255,.25) 0%, rgba(255,255,255,0) 60%); animation: pwa-ripple 3.2s ease-out infinite; }
            .pwa-ripples::after { width:28vmin; height:28vmin; animation-delay: 1.2s; background: radial-gradient(circle, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 60%); }
            @keyframes pwa-ripple { 0% { transform: translate(-50%, -50%) scale(0.6); opacity:.35; } 70% { opacity:.12; } 100% { transform: translate(-50%, -50%) scale(2.2); opacity:0; } }
            .pwa-update-hero h2 { position:relative; z-index:1; margin:8px 0 6px; font-size:28px; letter-spacing:.02em; }
            .pwa-update-hero p { position:relative; z-index:1; margin:0; opacity:.9; }
            .pwa-update-actions { display:flex; gap:12px; justify-content:center; margin-top:16px; }
            .pwa-update-primary { appearance:none; border:none; padding:12px 18px; border-radius:12px; color:#0b1220; background: linear-gradient(135deg, #34d399, #10b981); font-weight:700; cursor:pointer; box-shadow: 0 10px 28px rgba(16,185,129,.35); }
            .pwa-update-primary:hover { filter:brightness(.98); }
            .pwa-update-secondary { appearance:none; border:1px solid rgba(255,255,255,.28); background: transparent; color:#fff; padding:12px 18px; border-radius:12px; cursor:pointer; }
        `;
        document.head.appendChild(style);
    }

    // SWからの cacheName を受け取り、通知制御に使用
    handleCacheName(name) {
        this._pendingCacheName = name;
        if (!this.lastSeenCacheName) {
            this.lastSeenCacheName = name;
            localStorage.setItem('pwa_last_cache_name', name);
        }
    }

    getThemeColor() {
        try {
            const meta = document.querySelector('meta[name="theme-color"]');
            return meta && meta.content ? meta.content : '#4a7c59';
        } catch {
            return '#4a7c59';
        }
    }
}

// PWAアップデーターを初期化
const pwaUpdater = new PWAUpdater();

// グローバルに公開
window.PWAUpdater = PWAUpdater;

// 手動アップデートチェック用の関数をグローバルに公開
window.checkForPWAUpdates = () => pwaUpdater.checkForUpdates();
window.getPWAStatus = () => pwaUpdater.getPWAStatus();

// 更新モジュールを手動で表示する関数
window.showPWAUpdateModule = () => pwaUpdater.showUpdateModule();

// キャッシュクリアとリロードを手動で実行する関数
window.clearPWACacheAndReload = () => pwaUpdater.manualCacheClearAndReload();

// 更新詳細を表示する関数
window.showPWAUpdateDetails = () => pwaUpdater.showUpdateDetails();
