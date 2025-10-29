// PWAインストール機能

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
        this.banner = null;
        this.dismissKey = 'pwa-install-dismissed';
        this.init();
    }

    init() {
        // DOMが読み込まれた後に初期化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupInstaller());
        } else {
            this.setupInstaller();
        }
    }

    setupInstaller() {
        this.installButton = document.getElementById('install-pwa');
        
        // beforeinstallpromptイベントをリッスン
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA install prompt available');
            // preventDefault()を呼ばずに、プロンプトを保持
            this.deferredPrompt = e;
            this.showInstallButton();
            this.maybeShowSmartBanner();
        });

        // インストールボタンのクリックイベント
        if (this.installButton) {
            this.installButton.addEventListener('click', () => this.installPWA());
        }

        // アプリがインストールされた後の処理
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.hideInstallButton();
            this.showInstallSuccessMessage();
            this.removeSmartBanner();
            try { localStorage.setItem(this.dismissKey, 'installed'); } catch {}
        });

        // 既にインストール済みかチェック
        this.checkIfInstalled();
        this.maybeShowSmartBanner();
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

    async installPWA() {
        // iOS Safari の場合は特別な案内を表示
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isInStandaloneMode = window.navigator.standalone === true;
        
        if (isIOS && !isInStandaloneMode) {
            this.showIOSInstallInstructions();
            return;
        }
        
        if (!this.deferredPrompt) {
            console.log('PWA install prompt not available');
            this.showFallbackInstallMessage();
            return;
        }

        try {
            // インストールプロンプトを表示
            this.deferredPrompt.prompt();
            
            // ユーザーの選択を待つ
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log(`PWA install outcome: ${outcome}`);
            
            if (outcome === 'accepted') {
                this.showInstallSuccessMessage();
            }
            
            // プロンプトを一度だけ使用できるのでリセット
            this.deferredPrompt = null;
            this.hideInstallButton();
            
        } catch (error) {
            console.error('PWA installation failed:', error);
            this.showInstallErrorMessage();
        }
    }

    checkIfInstalled() {
        // スタンドアロンモードで実行されているかチェック
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('PWA is already installed');
            this.hideInstallButton();
            return true;
        }
        return false;
    }

    // スマートバナーの表示（一定条件で表示、ユーザーが閉じたら抑制）
    maybeShowSmartBanner() {
        try {
            const dismissed = localStorage.getItem(this.dismissKey);
            if (dismissed) return;
        } catch {}
        if (this.checkIfInstalled()) return;
        if (this.banner) return;
        this.banner = document.createElement('div');
        this.banner.className = 'pwa-smart-banner';
        this.banner.innerHTML = `
            <div class="pwa-smart-banner-content">
                <div class="pwa-smart-banner-header">
                    <div class="pwa-smart-banner-icon"><i class="fas fa-download"></i></div>
                    <div class="pwa-smart-banner-text">
                        <strong>アプリとしてインストール</strong>
                        <span>ホーム画面から素早くアクセスできます</span>
                    </div>
                </div>
                <div class="pwa-smart-banner-actions">
                    <button class="btn btn-primary" id="pwa-smart-install">インストール</button>
                </div>
                <button class="pwa-smart-banner-close" id="pwa-smart-dismiss" aria-label="閉じる">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(this.banner);
        setTimeout(() => this.banner.classList.add('show'), 50);
        const onInstall = () => this.installPWA();
        const onDismiss = () => {
            this.removeSmartBanner();
            try { localStorage.setItem(this.dismissKey, String(Date.now())); } catch {}
        };
        this.banner.querySelector('#pwa-smart-install').addEventListener('click', onInstall);
        this.banner.querySelector('#pwa-smart-dismiss').addEventListener('click', onDismiss);
    }

    removeSmartBanner() {
        if (!this.banner) return;
        this.banner.classList.remove('show');
        setTimeout(() => { this.banner && this.banner.remove(); this.banner = null; }, 200);
    }

    showInstallSuccessMessage() {
        this.showMessage('PWAのインストールが完了しました！', 'success');
    }

    showInstallErrorMessage() {
        this.showMessage('PWAのインストールに失敗しました。', 'error');
    }

    showMessage(message, type = 'info') {
        // 通知メッセージを表示
        const notification = document.createElement('div');
        notification.className = `pwa-notification pwa-notification-${type}`;
        notification.innerHTML = `
            <div class="pwa-notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button class="pwa-notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // 閉じるボタンのイベント
        notification.querySelector('.pwa-notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // 5秒後に自動で消す
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // アニメーション
        setTimeout(() => {
            notification.classList.add('pwa-notification-show');
        }, 100);
    }

    // PWAの機能をチェック
    checkPWAFeatures() {
        const features = {
            serviceWorker: 'serviceWorker' in navigator,
            installPrompt: 'BeforeInstallPromptEvent' in window,
            standalone: 'standalone' in window.navigator,
            fullscreen: 'requestFullscreen' in document.documentElement
        };

        console.log('PWA Features:', features);
        return features;
    }

    // iOS向けインストール案内
    showIOSInstallInstructions() {
        this.showNotification(
            'アプリをインストール',
            'Safari で共有ボタン → "ホーム画面に追加" を選択してください',
            'info'
        );
    }

    // フォールバック案内メッセージ
    showFallbackInstallMessage() {
        this.showNotification(
            'アプリのインストール',
            'このブラウザではワンクリックインストールをサポートしていませんが、ブックマークに追加してアプリのように使用できます',
            'info'
        );
    }

    // エラーメッセージ
    showInstallErrorMessage() {
        this.showNotification(
            'インストールエラー',
            'アプリのインストールに失敗しました。再度お試しください',
            'error'
        );
    }

    // 共通通知表示メソッド
    showNotification(title, message, type = 'info') {
        // 既存の通知があれば削除
        const existingNotification = document.querySelector('.pwa-install-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `pwa-install-notification pwa-install-${type}`;
        notification.innerHTML = `
            <div class="pwa-install-notification-content">
                <div class="pwa-install-notification-icon">
                    <i class="fas ${this.getIconForType(type)}"></i>
                </div>
                <div class="pwa-install-notification-text">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
                <button class="pwa-install-notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // 閉じるボタンのイベント
        const closeBtn = notification.querySelector('.pwa-install-notification-close');
        closeBtn.addEventListener('click', () => notification.remove());

        document.body.appendChild(notification);

        // 10秒後に自動で削除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    // タイプに応じたアイコンを取得
    getIconForType(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        return icons[type] || 'fa-info-circle';
    }
}

// PWAインストーラーを初期化
const pwaInstaller = new PWAInstaller();

// グローバルに公開
window.PWAInstaller = PWAInstaller;
