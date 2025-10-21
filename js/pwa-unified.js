/**
 * PWA Unified System - 統合PWA管理システム
 * pwa-update-v2.js + pwa-install-v2.js + pwa-manager-v2.js の統合版
 */

// ========================================
// PWA Update System
// ========================================

class PWAUpdateSystem {
    constructor() {
        this.registration = null;
        this.updateAvailable = false;
        this.isUpdating = false;
        this.updateCheckInterval = null;
        this.lastUpdateCheck = 0;
        this.updateCooldown = 30000; // 30秒のクールダウン
        
        this.init();
    }

    async init() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[PWA Update] Service Worker not supported');
            return;
        }

        try {
            await this.registerServiceWorker();
            this.setupEventListeners();
            this.startUpdateMonitoring();
            console.log('[PWA Update] System initialized successfully');
        } catch (error) {
            console.error('[PWA Update] Initialization failed:', error);
        }
    }

    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register('./sw-unified.js', {
                scope: '/',
                updateViaCache: 'none'
            });
            
            console.log('[PWA Update] Service Worker registered');
            return this.registration;
        } catch (error) {
            console.error('[PWA Update] Service Worker registration failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.registration.addEventListener('updatefound', () => {
            this.handleUpdateFound();
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            this.handleControllerChange();
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.throttledUpdateCheck();
            }
        });

        window.addEventListener('online', () => {
            this.throttledUpdateCheck();
        });
    }

    startUpdateMonitoring() {
        this.updateCheckInterval = setInterval(() => {
            this.throttledUpdateCheck();
        }, 5 * 60 * 1000);

        setTimeout(() => {
            this.throttledUpdateCheck();
        }, 1000);
    }

    async throttledUpdateCheck() {
        const now = Date.now();
        if (now - this.lastUpdateCheck < this.updateCooldown) {
            return;
        }

        this.lastUpdateCheck = now;
        await this.checkForUpdates();
    }

    handleUpdateFound() {
        const newWorker = this.registration.installing;
        if (!newWorker) return;

        console.log('[PWA Update] New Service Worker found');

        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    this.updateAvailable = true;
                    this.showUpdateNotification();
                } else {
                    console.log('[PWA Update] App installed for offline use');
                }
            }
        });
    }

    handleControllerChange() {
        console.log('[PWA Update] Service Worker controller changed');
        
        if (this.updateAvailable) {
            this.updateAvailable = false;
            this.hideUpdateNotification();
            this.showUpdateCompleteMessage();
        }
    }

    async checkForUpdates() {
        if (!this.registration) return;

        try {
            await this.registration.update();
            console.log('[PWA Update] Update check completed');
        } catch (error) {
            console.error('[PWA Update] Update check failed:', error);
        }
    }

    async applyUpdate() {
        if (this.isUpdating || !this.updateAvailable) {
            return;
        }

        this.isUpdating = true;
        this.showUpdateProgress();

        try {
            if (this.registration.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                await this.registration.update();
                
                if (this.registration.waiting) {
                    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    this.hideUpdateProgress();
                    this.showNoUpdateMessage();
                }
            }
        } catch (error) {
            console.error('[PWA Update] Apply update failed:', error);
            this.hideUpdateProgress();
            this.showUpdateErrorMessage();
        } finally {
            this.isUpdating = false;
        }
    }

    showUpdateNotification() {
        this.hideUpdateNotification();

        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <div class="pwa-update-notification-content">
                <div class="pwa-update-notification-icon">
                    <i class="fas fa-sync-alt"></i>
                </div>
                <div class="pwa-update-notification-text">
                    <strong>アップデートが利用可能です</strong>
                    <span>新しい機能と改善を適用しますか？</span>
                </div>
                <div class="pwa-update-notification-actions">
                    <button class="pwa-update-btn pwa-update-btn-primary" id="pwa-update-apply">
                        <i class="fas fa-download"></i>
                        今すぐ更新
                    </button>
                    <button class="pwa-update-btn pwa-update-btn-secondary" id="pwa-update-later">
                        後で
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        notification.querySelector('#pwa-update-apply').addEventListener('click', () => {
            this.applyUpdate();
        });

        notification.querySelector('#pwa-update-later').addEventListener('click', () => {
            this.hideUpdateNotification();
        });

        setTimeout(() => {
            notification.classList.add('pwa-update-notification-show');
        }, 100);
    }

    hideUpdateNotification() {
        const notification = document.querySelector('.pwa-update-notification');
        if (notification) {
            notification.classList.remove('pwa-update-notification-show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    showUpdateProgress() {
        const progress = document.createElement('div');
        progress.className = 'pwa-update-progress';
        progress.innerHTML = `
            <div class="pwa-update-progress-content">
                <div class="pwa-update-progress-spinner">
                    <div class="pwa-update-spinner"></div>
                </div>
                <div class="pwa-update-progress-text">
                    <h3>アップデート中...</h3>
                    <p>しばらくお待ちください</p>
                </div>
            </div>
        `;

        document.body.appendChild(progress);

        setTimeout(() => {
            progress.classList.add('pwa-update-progress-show');
        }, 100);
    }

    hideUpdateProgress() {
        const progress = document.querySelector('.pwa-update-progress');
        if (progress) {
            progress.classList.remove('pwa-update-progress-show');
            setTimeout(() => {
                progress.remove();
            }, 300);
        }
    }

    showUpdateCompleteMessage() {
        this.showToast('アップデートが完了しました', 'success');
    }

    showNoUpdateMessage() {
        this.showToast('最新版を使用しています', 'info');
    }

    showUpdateErrorMessage() {
        this.showToast('アップデートに失敗しました', 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `pwa-update-toast pwa-update-toast-${type}`;
        toast.innerHTML = `
            <div class="pwa-update-toast-content">
                <i class="fas fa-${this.getIconForType(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('pwa-update-toast-show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('pwa-update-toast-show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        return icons[type] || 'fa-info-circle';
    }

    async manualUpdateCheck() {
        await this.checkForUpdates();
        if (this.updateAvailable) {
            this.showUpdateNotification();
        } else {
            this.showNoUpdateMessage();
        }
    }

    getSystemStatus() {
        return {
            registered: !!this.registration,
            updateAvailable: this.updateAvailable,
            isUpdating: this.isUpdating,
            controller: !!navigator.serviceWorker.controller,
            scope: this.registration?.scope || null
        };
    }

    destroy() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
        }
        
        this.hideUpdateNotification();
        this.hideUpdateProgress();
        
        console.log('[PWA Update] System destroyed');
    }
}

// ========================================
// PWA Install System
// ========================================

class PWAInstallSystem {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.installButton = null;
        this.banner = null;
        this.dismissKey = 'pwa-install-dismissed-unified';
        
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.installButton = document.getElementById('install-pwa');
        this.checkInstallStatus();
        this.setupEventListeners();
        this.maybeShowBanner();
    }

    setupEventListeners() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA Install] Install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
            this.maybeShowBanner();
        });

        if (this.installButton) {
            this.installButton.addEventListener('click', () => this.install());
        }

        window.addEventListener('appinstalled', () => {
            console.log('[PWA Install] App installed successfully');
            this.isInstalled = true;
            this.hideInstallButton();
            this.hideBanner();
            this.showSuccessMessage();
            this.saveInstallStatus();
        });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkInstallStatus();
            }
        });
    }

    checkInstallStatus() {
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            this.isInstalled = true;
            this.hideInstallButton();
            this.hideBanner();
            return true;
        }
        return false;
    }

    async install() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isInStandaloneMode = window.navigator.standalone === true;
        
        if (isIOS && !isInStandaloneMode) {
            this.showIOSInstructions();
            return;
        }
        
        if (!this.deferredPrompt) {
            console.log('[PWA Install] Install prompt not available');
            this.showFallbackMessage();
            return;
        }

        try {
            this.deferredPrompt.prompt();
            
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log(`[PWA Install] Install outcome: ${outcome}`);
            
            if (outcome === 'accepted') {
                this.showSuccessMessage();
            } else {
                this.showDeclinedMessage();
            }
            
            this.deferredPrompt = null;
            this.hideInstallButton();
            
        } catch (error) {
            console.error('[PWA Install] Installation failed:', error);
            this.showErrorMessage();
        }
    }

    showInstallButton() {
        if (this.installButton) {
            this.installButton.style.display = 'inline-flex';
            this.installButton.classList.add('pwa-install-available');
        }
    }

    hideInstallButton() {
        if (this.installButton) {
            this.installButton.style.display = 'none';
            this.installButton.classList.remove('pwa-install-available');
        }
    }

    maybeShowBanner() {
        if (this.isInstalled) return;
        if (this.isBannerDismissed()) return;
        if (!this.deferredPrompt) return;
        if (this.banner) return;
        
        this.showBanner();
    }

    showBanner() {
        this.banner = document.createElement('div');
        this.banner.className = 'pwa-install-banner';
        this.banner.innerHTML = `
            <div class="pwa-install-banner-content">
                <div class="pwa-install-banner-icon">
                    <i class="fas fa-download"></i>
                </div>
                <div class="pwa-install-banner-text">
                    <strong>アプリとしてインストール</strong>
                    <span>ホーム画面から素早くアクセスできます</span>
                </div>
                <div class="pwa-install-banner-actions">
                    <button class="pwa-install-btn pwa-install-btn-primary" id="pwa-install-now">
                        インストール
                    </button>
                    <button class="pwa-install-btn pwa-install-btn-secondary" id="pwa-install-dismiss">
                        後で
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.banner);

        this.banner.querySelector('#pwa-install-now').addEventListener('click', () => {
            this.install();
        });

        this.banner.querySelector('#pwa-install-dismiss').addEventListener('click', () => {
            this.hideBanner();
            this.saveBannerDismissal();
        });

        setTimeout(() => {
            this.banner.classList.add('pwa-install-banner-show');
        }, 100);
    }

    hideBanner() {
        if (this.banner) {
            this.banner.classList.remove('pwa-install-banner-show');
            setTimeout(() => {
                this.banner.remove();
                this.banner = null;
            }, 300);
        }
    }

    saveBannerDismissal() {
        try {
            localStorage.setItem(this.dismissKey, Date.now().toString());
        } catch (error) {
            console.warn('[PWA Install] Failed to save banner dismissal:', error);
        }
    }

    isBannerDismissed() {
        try {
            const dismissed = localStorage.getItem(this.dismissKey);
            if (!dismissed) return false;
            
            const dismissTime = parseInt(dismissed);
            const now = Date.now();
            const dayInMs = 24 * 60 * 60 * 1000;
            
            return (now - dismissTime) < dayInMs;
        } catch (error) {
            return false;
        }
    }

    saveInstallStatus() {
        try {
            localStorage.setItem('pwa-installed', 'true');
        } catch (error) {
            console.warn('[PWA Install] Failed to save install status:', error);
        }
    }

    showSuccessMessage() {
        this.showToast('アプリがインストールされました！', 'success');
    }

    showDeclinedMessage() {
        this.showToast('インストールをキャンセルしました', 'info');
    }

    showErrorMessage() {
        this.showToast('インストールに失敗しました', 'error');
    }

    showIOSInstructions() {
        this.showModal(
            'アプリをインストール',
            'Safari で共有ボタン（□↑）をタップし、「ホーム画面に追加」を選択してください。',
            'info'
        );
    }

    showFallbackMessage() {
        this.showModal(
            'アプリのインストール',
            'このブラウザではワンクリックインストールをサポートしていませんが、ブックマークに追加してアプリのように使用できます。',
            'info'
        );
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `pwa-install-toast pwa-install-toast-${type}`;
        toast.innerHTML = `
            <div class="pwa-install-toast-content">
                <i class="fas fa-${this.getIconForType(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('pwa-install-toast-show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('pwa-install-toast-show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    showModal(title, message, type = 'info') {
        const modal = document.createElement('div');
        modal.className = 'pwa-install-modal';
        modal.innerHTML = `
            <div class="pwa-install-modal-content">
                <div class="pwa-install-modal-header">
                    <h3>${title}</h3>
                    <button class="pwa-install-modal-close" id="pwa-install-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="pwa-install-modal-body">
                    <div class="pwa-install-modal-icon">
                        <i class="fas fa-${this.getIconForType(type)}"></i>
                    </div>
                    <p>${message}</p>
                </div>
                <div class="pwa-install-modal-footer">
                    <button class="pwa-install-btn pwa-install-btn-primary" id="pwa-install-modal-ok">
                        了解
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#pwa-install-modal-close').addEventListener('click', () => {
            this.hideModal(modal);
        });

        modal.querySelector('#pwa-install-modal-ok').addEventListener('click', () => {
            this.hideModal(modal);
        });

        setTimeout(() => {
            modal.classList.add('pwa-install-modal-show');
        }, 100);
    }

    hideModal(modal) {
        modal.classList.remove('pwa-install-modal-show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        return icons[type] || 'fa-info-circle';
    }

    getSystemStatus() {
        return {
            isInstalled: this.isInstalled,
            canInstall: !!this.deferredPrompt,
            isBannerDismissed: this.isBannerDismissed(),
            installButton: !!this.installButton,
            banner: !!this.banner
        };
    }

    destroy() {
        this.hideBanner();
        this.hideInstallButton();
        console.log('[PWA Install] System destroyed');
    }
}

// ========================================
// PWA Manager - 統合管理システム
// ========================================

class PWAManager {
    constructor() {
        this.updateSystem = null;
        this.installSystem = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        
        if (window.PWAManager) {
            return window.PWAManager;
        }
        
        this.init();
        window.PWAManager = this;
    }

    async init() {
        if (this.isInitialized) return;
        
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }

    async _initialize() {
        try {
            console.log('[PWA Manager] Initializing unified system...');
            
            await this.initializeSystems();
            this.setupEventListeners();
            this.startStatusMonitoring();
            
            this.isInitialized = true;
            console.log('[PWA Manager] Initialization completed');
            
        } catch (error) {
            console.error('[PWA Manager] Initialization failed:', error);
            throw error;
        }
    }

    async initializeSystems() {
        this.updateSystem = new PWAUpdateSystem();
        this.installSystem = new PWAInstallSystem();
    }

    setupEventListeners() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshStatus();
            }
        });

        window.addEventListener('online', () => {
            this.refreshStatus();
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'pwa-installed' || event.key === 'pwa-install-dismissed-unified') {
                this.refreshStatus();
            }
        });
    }

    startStatusMonitoring() {
        setInterval(() => {
            this.refreshStatus();
        }, 60 * 1000);
    }

    refreshStatus() {
        if (this.updateSystem) {
            this.updateSystem.throttledUpdateCheck();
        }
        
        if (this.installSystem) {
            this.installSystem.checkInstallStatus();
        }
    }

    async checkForUpdates() {
        if (this.updateSystem) {
            return await this.updateSystem.manualUpdateCheck();
        }
        return false;
    }

    async applyUpdate() {
        if (this.updateSystem) {
            return await this.updateSystem.applyUpdate();
        }
        return false;
    }

    async installPWA() {
        if (this.installSystem) {
            return await this.installSystem.install();
        }
        return false;
    }

    async clearCache() {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                const deletePromises = cacheNames.map(name => caches.delete(name));
                await Promise.all(deletePromises);
                console.log('[PWA Manager] Cache cleared');
                return true;
            }
            return false;
        } catch (error) {
            console.error('[PWA Manager] Cache clear failed:', error);
            return false;
        }
    }

    getSystemStatus() {
        const status = {
            initialized: this.isInitialized,
            updateSystem: null,
            installSystem: null,
            overall: {
                canUpdate: false,
                canInstall: false,
                isInstalled: false,
                hasUpdate: false
            }
        };

        if (this.updateSystem) {
            status.updateSystem = this.updateSystem.getSystemStatus();
            status.overall.canUpdate = status.updateSystem.registered;
            status.overall.hasUpdate = status.updateSystem.updateAvailable;
        }

        if (this.installSystem) {
            status.installSystem = this.installSystem.getSystemStatus();
            status.overall.canInstall = status.installSystem.canInstall;
            status.overall.isInstalled = status.installSystem.isInstalled;
        }

        return status;
    }

    async getDetailedInfo() {
        const info = {
            system: this.getSystemStatus(),
            cache: await this.getCacheInfo(),
            serviceWorker: await this.getServiceWorkerInfo(),
            performance: await this.getPerformanceInfo()
        };

        return info;
    }

    async getCacheInfo() {
        try {
            if (!('caches' in window)) {
                return { available: false };
            }

            const cacheNames = await caches.keys();
            const cacheInfo = {};

            for (const name of cacheNames) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                cacheInfo[name] = {
                    size: keys.length,
                    urls: keys.map(request => request.url)
                };
            }

            return {
                available: true,
                caches: cacheInfo,
                totalCaches: cacheNames.length
            };
        } catch (error) {
            console.error('[PWA Manager] Failed to get cache info:', error);
            return { available: false, error: error.message };
        }
    }

    async getServiceWorkerInfo() {
        try {
            if (!('serviceWorker' in navigator)) {
                return { available: false };
            }

            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                return { available: false, registered: false };
            }

            return {
                available: true,
                registered: true,
                scope: registration.scope,
                active: registration.active ? {
                    scriptURL: registration.active.scriptURL,
                    state: registration.active.state
                } : null,
                waiting: registration.waiting ? {
                    scriptURL: registration.waiting.scriptURL,
                    state: registration.waiting.state
                } : null,
                installing: registration.installing ? {
                    scriptURL: registration.installing.scriptURL,
                    state: registration.installing.state
                } : null
            };
        } catch (error) {
            console.error('[PWA Manager] Failed to get Service Worker info:', error);
            return { available: false, error: error.message };
        }
    }

    async getPerformanceInfo() {
        try {
            const info = {
                memory: null,
                connection: null,
                timing: null
            };

            if ('memory' in performance) {
                info.memory = {
                    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                };
            }

            if ('connection' in navigator) {
                const conn = navigator.connection;
                info.connection = {
                    effectiveType: conn.effectiveType,
                    downlink: conn.downlink,
                    rtt: conn.rtt,
                    saveData: conn.saveData
                };
            }

            if (performance.timing) {
                const timing = performance.timing;
                info.timing = {
                    loadTime: timing.loadEventEnd - timing.navigationStart,
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime || null
                };
            }

            return info;
        } catch (error) {
            console.error('[PWA Manager] Failed to get performance info:', error);
            return { error: error.message };
        }
    }

    async resetSystem() {
        try {
            console.log('[PWA Manager] Resetting system...');
            
            await this.clearCache();
            
            const keysToRemove = [
                'pwa-installed',
                'pwa-install-dismissed-unified',
                'pwa_last_cache_name'
            ];
            
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn(`[PWA Manager] Failed to remove ${key}:`, error);
                }
            });
            
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            
            console.log('[PWA Manager] System reset completed');
            return true;
        } catch (error) {
            console.error('[PWA Manager] System reset failed:', error);
            return false;
        }
    }

    destroy() {
        if (this.updateSystem) {
            this.updateSystem.destroy();
        }
        
        if (this.installSystem) {
            this.installSystem.destroy();
        }
        
        this.isInitialized = false;
        console.log('[PWA Manager] System destroyed');
    }
}

// ========================================
// グローバル初期化
// ========================================

const pwaManager = new PWAManager();

// グローバル関数として公開
window.pwaManager = pwaManager;
window.checkForUpdates = () => pwaManager.checkForUpdates();
window.applyUpdate = () => pwaManager.applyUpdate();
window.installPWA = () => pwaManager.installPWA();
window.clearPWACache = () => pwaManager.clearCache();
window.getPWAStatus = () => pwaManager.getSystemStatus();
window.getPWADebugInfo = () => pwaManager.showDebugInfo();

// スタイル注入
const style = document.createElement('style');
style.textContent = `
    /* PWA Update Notification */
    .pwa-update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        background: #1f2937;
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
    }

    .pwa-update-notification-show {
        transform: translateX(0);
        opacity: 1;
    }

    .pwa-update-notification-content {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .pwa-update-notification-icon {
        width: 40px;
        height: 40px;
        background: #3b82f6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
    }

    .pwa-update-notification-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .pwa-update-notification-text strong {
        font-size: 14px;
        font-weight: 600;
    }

    .pwa-update-notification-text span {
        font-size: 12px;
        opacity: 0.8;
    }

    .pwa-update-notification-actions {
        display: flex;
        gap: 8px;
    }

    .pwa-update-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .pwa-update-btn-primary {
        background: #10b981;
        color: white;
    }

    .pwa-update-btn-primary:hover {
        background: #059669;
    }

    .pwa-update-btn-secondary {
        background: transparent;
        color: #9ca3af;
        border: 1px solid #374151;
    }

    .pwa-update-btn-secondary:hover {
        background: #374151;
        color: white;
    }

    /* PWA Update Progress */
    .pwa-update-progress {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10001;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .pwa-update-progress-show {
        opacity: 1;
    }

    .pwa-update-progress-content {
        background: white;
        padding: 32px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .pwa-update-progress-spinner {
        margin-bottom: 16px;
    }

    .pwa-update-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e5e7eb;
        border-top: 4px solid #3b82f6;
        border-radius: 50%;
        animation: pwa-update-spin 1s linear infinite;
        margin: 0 auto;
    }

    @keyframes pwa-update-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .pwa-update-progress-text h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        color: #1f2937;
    }

    .pwa-update-progress-text p {
        margin: 0;
        font-size: 14px;
        color: #6b7280;
    }

    /* PWA Update Toast */
    .pwa-update-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100%);
        z-index: 10002;
        background: white;
        color: #1f2937;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: all 0.3s ease;
    }

    .pwa-update-toast-show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }

    .pwa-update-toast-success {
        border-left: 4px solid #10b981;
    }

    .pwa-update-toast-error {
        border-left: 4px solid #ef4444;
    }

    .pwa-update-toast-info {
        border-left: 4px solid #3b82f6;
    }

    .pwa-update-toast-warning {
        border-left: 4px solid #f59e0b;
    }

    .pwa-update-toast-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .pwa-update-toast-content i {
        font-size: 16px;
    }

    .pwa-update-toast-success i {
        color: #10b981;
    }

    .pwa-update-toast-error i {
        color: #ef4444;
    }

    .pwa-update-toast-info i {
        color: #3b82f6;
    }

    .pwa-update-toast-warning i {
        color: #f59e0b;
    }

    /* PWA Install Banner */
    .pwa-install-banner {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        z-index: 10000;
        background: #1f2937;
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        transform: translateY(100%);
        opacity: 0;
        transition: all 0.3s ease;
    }

    .pwa-install-banner-show {
        transform: translateY(0);
        opacity: 1;
    }

    .pwa-install-banner-content {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .pwa-install-banner-icon {
        width: 40px;
        height: 40px;
        background: #3b82f6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
    }

    .pwa-install-banner-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .pwa-install-banner-text strong {
        font-size: 14px;
        font-weight: 600;
    }

    .pwa-install-banner-text span {
        font-size: 12px;
        opacity: 0.8;
    }

    .pwa-install-banner-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }

    .pwa-install-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .pwa-install-btn-primary {
        background: #10b981;
        color: white;
    }

    .pwa-install-btn-primary:hover {
        background: #059669;
    }

    .pwa-install-btn-secondary {
        background: transparent;
        color: #9ca3af;
        border: 1px solid #374151;
    }

    .pwa-install-btn-secondary:hover {
        background: #374151;
        color: white;
    }

    /* PWA Install Toast */
    .pwa-install-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100%);
        z-index: 10001;
        background: white;
        color: #1f2937;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transition: all 0.3s ease;
    }

    .pwa-install-toast-show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }

    .pwa-install-toast-success {
        border-left: 4px solid #10b981;
    }

    .pwa-install-toast-error {
        border-left: 4px solid #ef4444;
    }

    .pwa-install-toast-info {
        border-left: 4px solid #3b82f6;
    }

    .pwa-install-toast-warning {
        border-left: 4px solid #f59e0b;
    }

    .pwa-install-toast-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .pwa-install-toast-content i {
        font-size: 16px;
    }

    .pwa-install-toast-success i {
        color: #10b981;
    }

    .pwa-install-toast-error i {
        color: #ef4444;
    }

    .pwa-install-toast-info i {
        color: #3b82f6;
    }

    .pwa-install-toast-warning i {
        color: #f59e0b;
    }

    /* PWA Install Modal */
    .pwa-install-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10002;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .pwa-install-modal-show {
        opacity: 1;
    }

    .pwa-install-modal-content {
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        overflow: hidden;
    }

    .pwa-install-modal-header {
        padding: 20px 20px 0 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .pwa-install-modal-header h3 {
        margin: 0;
        font-size: 18px;
        color: #1f2937;
    }

    .pwa-install-modal-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #6b7280;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .pwa-install-modal-close:hover {
        background: #f3f4f6;
        color: #374151;
    }

    .pwa-install-modal-body {
        padding: 20px;
        text-align: center;
    }

    .pwa-install-modal-icon {
        width: 60px;
        height: 60px;
        background: #f3f4f6;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        margin: 0 auto 16px auto;
    }

    .pwa-install-modal-body p {
        margin: 0;
        color: #6b7280;
        line-height: 1.5;
    }

    .pwa-install-modal-footer {
        padding: 0 20px 20px 20px;
        display: flex;
        justify-content: center;
    }

    /* レスポンシブ対応 */
    @media (max-width: 768px) {
        .pwa-update-notification {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
        }

        .pwa-update-notification-content {
            padding: 12px;
        }

        .pwa-update-notification-actions {
            flex-direction: column;
            gap: 4px;
        }

        .pwa-update-btn {
            padding: 6px 10px;
            font-size: 11px;
        }

        .pwa-install-banner {
            bottom: 10px;
            left: 10px;
            right: 10px;
        }

        .pwa-install-banner-content {
            padding: 12px;
        }

        .pwa-install-banner-actions {
            flex-direction: column;
            gap: 4px;
        }

        .pwa-install-btn {
            padding: 6px 10px;
            font-size: 11px;
        }
    }
`;

document.head.appendChild(style);

console.log('[PWA Unified] System loaded successfully');
