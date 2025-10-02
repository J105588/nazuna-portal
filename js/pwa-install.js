// PWAインストール機能

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
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
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
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
        });

        // 既にインストール済みかチェック
        this.checkIfInstalled();
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
        if (!this.deferredPrompt) {
            console.log('PWA install prompt not available');
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
}

// PWAインストーラーを初期化
const pwaInstaller = new PWAInstaller();

// グローバルに公開
window.PWAInstaller = PWAInstaller;
