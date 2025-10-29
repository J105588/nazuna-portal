// メンテナンスモードチェッカー

class MaintenanceChecker {
    constructor() {
        this.isMaintenanceMode = false;
        this.maintenanceMessage = '';
        this.maintenanceEndTime = null;
        this.checkInterval = null;
        this.init();
    }

    async init() {
        // apiClientが初期化されるまで待機
        await this.waitForApiClient();
        
        // ページ読み込み時にメンテナンス状態をチェック
        await this.checkMaintenanceStatus();
        
        // 定期的にメンテナンス状態をチェック（5分間隔）
        this.checkInterval = setInterval(() => {
            this.checkMaintenanceStatus();
        }, 5 * 60 * 1000);
    }
    
    async waitForApiClient(maxAttempts = 20, delay = 100) {
        for (let i = 0; i < maxAttempts; i++) {
            if (window.apiClient && typeof window.apiClient.sendRequest === 'function') {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        console.warn('apiClient not initialized after', maxAttempts, 'attempts');
        return false;
    }

    async checkMaintenanceStatus() {
        try {
            // apiClientが存在しない場合はスキップ
            if (!window.apiClient || typeof window.apiClient.sendRequest !== 'function') {
                console.warn('apiClient not available');
                return;
            }
            
            const result = await window.apiClient.sendRequest('checkMaintenance');
            
            if (result.success) {
                this.isMaintenanceMode = result.maintenance;
                this.maintenanceMessage = result.message || '';
                this.maintenanceEndTime = result.endTime || null;
                
                if (this.isMaintenanceMode) {
                    // admin.html以外の場合はwip.htmlにリダイレクト
                    if (!this.isAdminPage()) {
                        if (window.location.pathname !== '/wip.html') {
                            window.location.href = 'wip.html';
                        }
                    } else {
                        // admin.html内ではメンテナンス中でも通常表示
                        this.hideMaintenancePage();
                    }
                } else {
                    // メンテナンス終了時、wip.htmlから他のページにリダイレクト
                    if (window.location.pathname === '/wip.html' || window.location.pathname.endsWith('wip.html')) {
                        window.location.href = 'index.html';
                    }
                    this.hideMaintenancePage();
                }
            }
        } catch (error) {
            console.warn('Failed to check maintenance status:', error);
            // ネットワークエラーの場合は通常通り表示
            this.hideMaintenancePage();
        }
    }
    
    isAdminPage() {
        return window.location.pathname.includes('admin.html') || 
               window.location.href.includes('admin.html');
    }

    showMaintenancePage() {
        // 既に表示されている場合は何もしない
        if (document.getElementById('maintenance-overlay')) return;
        
        // admin.html以外でメンテナンス中の場合、wip.htmlにリダイレクト
        if (!this.isAdminPage()) {
            if (window.location.pathname !== '/wip.html') {
                window.location.href = 'wip.html';
            }
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'maintenance-overlay';
        overlay.innerHTML = `
            <div class="maintenance-container">
                <div class="maintenance-content">
                    <div class="maintenance-icon">
                        <i class="fas fa-tools"></i>
                    </div>
                    <h1 class="maintenance-title">システムメンテナンス中</h1>
                    <p class="maintenance-message">${this.maintenanceMessage}</p>
                    ${this.maintenanceEndTime ? `
                        <div class="maintenance-end-time">
                            <i class="fas fa-clock"></i>
                            <span>予定終了時刻: ${this.formatEndTime(this.maintenanceEndTime)}</span>
                        </div>
                    ` : ''}
                    <div class="maintenance-actions">
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i class="fas fa-refresh"></i>
                            再読み込み
                        </button>
                    </div>
                </div>
            </div>
        `;

        // スタイルを注入
        this.injectMaintenanceStyles();
        
        document.body.appendChild(overlay);
        
        // ページのスクロールを無効化
        document.body.style.overflow = 'hidden';
    }

    hideMaintenancePage() {
        const overlay = document.getElementById('maintenance-overlay');
        if (overlay) {
            overlay.remove();
            document.body.style.overflow = '';
        }
    }

    formatEndTime(endTime) {
        try {
            const date = new Date(endTime);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return endTime;
        }
    }

    injectMaintenanceStyles() {
        if (document.getElementById('maintenance-styles')) return;

        const style = document.createElement('style');
        style.id = 'maintenance-styles';
        style.textContent = `
            #maintenance-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(135deg, #4a7c59 0%, #6b9b7a 100%);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .maintenance-container {
                text-align: center;
                color: white;
                max-width: 500px;
                padding: 40px 20px;
            }

            .maintenance-content {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px 30px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }

            .maintenance-icon {
                font-size: 4rem;
                margin-bottom: 20px;
                opacity: 0.9;
            }

            .maintenance-title {
                font-size: 2rem;
                font-weight: 700;
                margin: 0 0 16px;
                line-height: 1.2;
            }

            .maintenance-message {
                font-size: 1.1rem;
                margin: 0 0 24px;
                opacity: 0.9;
                line-height: 1.5;
            }

            .maintenance-end-time {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-bottom: 30px;
                padding: 12px 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                font-size: 0.95rem;
            }

            .maintenance-actions {
                display: flex;
                justify-content: center;
                gap: 12px;
            }

            .maintenance-actions .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .maintenance-actions .btn-primary {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            .maintenance-actions .btn-primary:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }

            @media (max-width: 480px) {
                .maintenance-container {
                    padding: 20px 15px;
                }
                
                .maintenance-content {
                    padding: 30px 20px;
                }
                
                .maintenance-title {
                    font-size: 1.5rem;
                }
                
                .maintenance-message {
                    font-size: 1rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // メンテナンスモードを有効化（管理者用）
    async enableMaintenance(message, endTime) {
        try {
            if (!window.apiClient || typeof window.apiClient.sendRequest !== 'function') {
                console.error('apiClient not available');
                return false;
            }
            
            const result = await window.apiClient.sendRequest('enableMaintenance', {
                message: message,
                endTime: endTime
            });
            
            if (result.success) {
                console.log('Maintenance mode enabled');
                await this.checkMaintenanceStatus();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to enable maintenance mode:', error);
            return false;
        }
    }

    // メンテナンスモードを無効化（管理者用）
    async disableMaintenance() {
        try {
            if (!window.apiClient || typeof window.apiClient.sendRequest !== 'function') {
                console.error('apiClient not available');
                return false;
            }
            
            const result = await window.apiClient.sendRequest('disableMaintenance');
            
            if (result.success) {
                console.log('Maintenance mode disabled');
                await this.checkMaintenanceStatus();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to disable maintenance mode:', error);
            return false;
        }
    }

    // クリーンアップ
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.hideMaintenancePage();
    }
}

// グローバルに公開
window.MaintenanceChecker = MaintenanceChecker;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    window.maintenanceChecker = new MaintenanceChecker();
});
