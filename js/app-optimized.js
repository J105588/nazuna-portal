/**
 * なずなポータル - 最適化版メインアプリケーション
 * パフォーマンス最適化済み
 */

// ========================================
// 設定とユーティリティ
// ========================================

// パフォーマンス監視
const PerformanceMonitor = {
    marks: new Map(),
    
    mark(name) {
        this.marks.set(name, performance.now());
    },
    
    measure(name, startMark) {
        const end = performance.now();
        const start = this.marks.get(startMark) || 0;
        const duration = end - start;
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        return duration;
    }
};

// デバッグモードの判定（本番環境では無効化）
const DEBUG = false; // 本番環境では false に設定

// ログ関数の最適化
const log = DEBUG ? console.log : () => {};
const warn = DEBUG ? console.warn : () => {};
const error = console.error; // エラーは常に出力

// ========================================
// 最適化されたAPIクライアント
// ========================================

class OptimizedAPIClient {
    constructor() {
        this.cache = new Map();
        this.requestQueue = new Map();
        this.isOnline = navigator.onLine;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        // ネットワーク状態の監視
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // リクエストの重複排除
    async sendRequest(action, params = {}, options = {}) {
        const cacheKey = `${action}_${JSON.stringify(params)}`;
        
        // キャッシュチェック
        if (options.useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < (options.cacheDuration || 300000)) {
                return cached.data;
            }
        }
        
        // 重複リクエストの防止
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }
        
        const requestPromise = this._executeRequest(action, params, options);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // キャッシュに保存
            if (options.useCache) {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
        } finally {
            this.requestQueue.delete(cacheKey);
        }
    }
    
    async _executeRequest(action, params, options) {
        if (!this.isOnline && !options.allowOffline) {
            throw new Error('オフラインです');
        }
        
        const callbackName = `callback_${Date.now()}_${Math.random().toString(36).substr(2)}`;
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this._cleanup(callbackName);
                reject(new Error('リクエストがタイムアウトしました'));
            }, options.timeout || 10000);
            
            window.gasCallbacks = window.gasCallbacks || {};
            window.gasCallbacks[callbackName] = (data) => {
                clearTimeout(timeout);
                this._cleanup(callbackName);
                
                if (data.success) {
                    resolve(data);
                } else {
                    reject(new Error(data.error || 'サーバーエラー'));
                }
            };
            
            const queryParams = new URLSearchParams({
                action,
                callback: `gasCallbacks.${callbackName}`,
                timestamp: Date.now(),
                ...params
            });
            
            const script = document.createElement('script');
            script.id = `jsonp_${callbackName}`;
            script.src = `${CONFIG.GAS_URL}?${queryParams}`;
            script.onerror = () => {
                clearTimeout(timeout);
                this._cleanup(callbackName);
                reject(new Error('ネットワークエラー'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    _cleanup(callbackName) {
        delete window.gasCallbacks[callbackName];
        const script = document.getElementById(`jsonp_${callbackName}`);
        if (script) script.remove();
    }
    
    processQueue() {
        // キューに溜まったリクエストを処理
        for (const [key, promise] of this.requestQueue) {
            promise.catch(error => {
                log('Queued request failed:', error);
            });
        }
    }
    
    clearCache() {
        this.cache.clear();
    }
}

// ========================================
// 最適化されたDOM操作
// ========================================

class DOMOptimizer {
    constructor() {
        this.observers = new Map();
        this.debounceTimers = new Map();
    }
    
    // デバウンス付きイベントリスナー
    addDebouncedListener(element, event, handler, delay = 300) {
        const key = `${element.id || 'unknown'}_${event}`;
        
        element.addEventListener(event, (e) => {
            clearTimeout(this.debounceTimers.get(key));
            this.debounceTimers.set(key, setTimeout(() => {
                handler(e);
            }, delay));
        });
    }
    
    // Intersection Observer を使用した遅延読み込み
    observeElement(element, callback, options = {}) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        });
        
        observer.observe(element);
        this.observers.set(element, observer);
    }
    
    // バッチDOM更新
    batchUpdate(updates) {
        requestAnimationFrame(() => {
            updates.forEach(update => update());
        });
    }
    
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}

// ========================================
// 最適化されたデータ管理
// ========================================

class DataManager {
    constructor() {
        this.cache = new Map();
        this.subscribers = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5分
    }
    
    // データの取得とキャッシュ
    async getData(key, fetcher, options = {}) {
        const cacheKey = `${key}_${JSON.stringify(options)}`;
        
        // キャッシュチェック
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheDuration) {
                return cached.data;
            }
        }
        
        // データ取得
        try {
            const data = await fetcher();
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
            return data;
        } catch (error) {
            error('Data fetch failed:', error);
            throw error;
        }
    }
    
    // データの購読
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        
        // 既存のデータがあれば即座に通知
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (Date.now() - cached.timestamp < this.cacheDuration) {
                callback(cached.data);
            }
        }
    }
    
    // データの通知
    notify(key, data) {
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    error('Subscriber callback error:', error);
                }
            });
        }
    }
    
    // キャッシュクリア
    clearCache(pattern) {
        if (pattern) {
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }
}

// ========================================
// 最適化されたUI管理
// ========================================

class UIManager {
    constructor() {
        this.domOptimizer = new DOMOptimizer();
        this.dataManager = new DataManager();
        this.apiClient = new OptimizedAPIClient();
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        PerformanceMonitor.mark('ui-init-start');
        
        try {
            // 基本機能の初期化
            await this.initNavigation();
            await this.initSidebar();
            await this.initPWA();
            
            // ページ別の初期化
            await this.initPageSpecific();
            
            this.isInitialized = true;
            PerformanceMonitor.measure('ui-init-complete', 'ui-init-start');
            
        } catch (error) {
            error('UI initialization failed:', error);
        }
    }
    
    async initNavigation() {
        // スムーススクロールの最適化
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (!href || href === '#' || href.length <= 1) return;
                
                e.preventDefault();
                
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    this.closeSidebar();
                }
            });
        });
    }
    
    async initSidebar() {
        const hamburger = document.querySelector('.hamburger');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (!hamburger || !sidebar || !overlay) return;
        
        // イベントリスナーの最適化
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSidebar();
        });
        
        overlay.addEventListener('click', () => this.closeSidebar());
        
        // キーボード操作
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                this.closeSidebar();
            }
        });
        
        // サイドバー内のリンク
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                document.body.classList.add('page-exit');
                this.closeSidebar();
                setTimeout(() => { 
                    window.location.href = href; 
                }, 220);
            });
        });
    }
    
    toggleSidebar() {
        const hamburger = document.querySelector('.hamburger');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        const isActive = sidebar.classList.contains('active');
        
        hamburger.classList.toggle('active');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        if (!isActive) {
            document.body.classList.add('sidebar-open');
            document.body.style.overflow = 'hidden';
        } else {
            document.body.classList.remove('sidebar-open');
            document.body.style.overflow = '';
        }
        
        // アクセシビリティ
        if (hamburger) {
            const newExpanded = !isActive;
            hamburger.setAttribute('aria-expanded', newExpanded.toString());
            hamburger.setAttribute('aria-label', 
                newExpanded ? 'メニューを閉じる' : 'メニューを開く');
        }
    }
    
    closeSidebar() {
        const hamburger = document.querySelector('.hamburger');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        hamburger.classList.remove('active');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
        document.body.style.overflow = '';
    }
    
    async initPWA() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                log('ServiceWorker registered successfully');
                
                // iOS向け通知許可
                if (this.isIOS()) {
                    await this.requestIOSNotificationPermission();
                }
                
            } catch (error) {
                error('ServiceWorker registration failed:', error);
            }
        }
    }
    
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    
    async requestIOSNotificationPermission() {
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    this.showNotification('通知が有効になりました', '重要なお知らせをお届けします');
                }
            } catch (error) {
                error('Notification permission error:', error);
            }
        }
    }
    
    async initPageSpecific() {
        const currentPage = this.getCurrentPage();
        
        switch (currentPage) {
            case 'index':
                await this.initHomePage();
                break;
            case 'council':
                await this.loadCouncilMembers();
                break;
            case 'clubs':
                await this.loadClubs();
                break;
            case 'forum':
                await this.initForum();
                break;
            case 'news':
                await this.loadNews();
                break;
            case 'survey':
                await this.loadSurveys();
                break;
        }
    }
    
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        return filename.replace('.html', '') || 'index';
    }
    
    // ページ別の初期化メソッド
    async initHomePage() {
        // ホームページの最適化された初期化
        await Promise.all([
            this.loadLatestNews(),
            this.loadLatestPosts()
        ]);
    }
    
    async loadLatestNews() {
        const container = document.getElementById('latest-news');
        if (!container) return;
        
        // 遅延読み込み
        this.domOptimizer.observeElement(container, async () => {
            try {
                const news = await this.dataManager.getData('latest-news', 
                    () => this.apiClient.sendRequest('getNews', { limit: 3 }, { useCache: true })
                );
                
                container.innerHTML = news.map(item => `
                    <div class="news-preview">
                        <span class="news-type ${item.type}">${this.getNewsTypeLabel(item.type)}</span>
                        <h4>${item.title}</h4>
                        <span class="news-date">${item.date}</span>
                    </div>
                `).join('');
            } catch (error) {
                error('Failed to load latest news:', error);
            }
        });
    }
    
    async loadLatestPosts() {
        const container = document.getElementById('latest-posts');
        if (!container) return;
        
        this.domOptimizer.observeElement(container, async () => {
            try {
                const posts = await this.dataManager.getData('latest-posts',
                    () => this.apiClient.sendRequest('getPosts', { limit: 3 }, { useCache: true })
                );
                
                if (posts.length === 0) {
                    container.innerHTML = `
                        <div class="no-data-message">
                            <div class="no-data-icon">
                                <i class="fas fa-comments"></i>
                            </div>
                            <h3>まだ投稿がありません</h3>
                            <p>フォーラムに投稿してみましょう。</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = posts.map(post => `
                        <div class="post-preview">
                            <p>${post.content.substring(0, 100)}...</p>
                            <span class="post-date">${this.formatDate(post.created_at)}</span>
                        </div>
                    `).join('');
                }
            } catch (error) {
                error('Failed to load latest posts:', error);
            }
        });
    }
    
    async loadCouncilMembers() {
        const container = document.querySelector('.council-members');
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>生徒会メンバー情報を読み込み中...</p>
            </div>
        `;
        
        try {
            const members = await this.dataManager.getData('council-members',
                () => this.apiClient.sendRequest('getMembers', { activeOnly: true }, { useCache: true })
            );
            
            container.innerHTML = members.map(member => `
                <div class="member-card clickable" data-member-id="${member.id}">
                    <div class="member-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 150px; border-radius: 50%; width: 150px; margin: 0 auto 1rem;"></div>
                    <h3>${member.name}</h3>
                    <p class="member-role">${member.role}</p>
                    <p class="member-message">"${member.message || 'よろしくお願いします'}"</p>
                </div>
            `).join('');
            
            this.makeCouncilMembersClickable();
        } catch (error) {
            error('Failed to load council members:', error);
            container.innerHTML = `
                <div class="no-data-message">
                    <div class="no-data-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>データの読み込みに失敗しました</h3>
                    <p>ページを再読み込みしてください。</p>
                </div>
            `;
        }
    }
    
    makeCouncilMembersClickable() {
        document.querySelectorAll('.member-card.clickable').forEach(card => {
            card.addEventListener('click', function() {
                const memberId = this.dataset.memberId;
                if (memberId) {
                    window.location.href = `member-detail.html?id=${memberId}`;
                }
            });
        });
    }
    
    async loadClubs() {
        const container = document.getElementById('clubs-container');
        if (!container) return;
        
        try {
            const clubs = await this.dataManager.getData('clubs',
                () => this.apiClient.sendRequest('getClubs', {}, { useCache: true })
            );
            
            container.innerHTML = clubs.map(club => `
                <div class="club-card" data-category="${club.category || ''}">
                    ${club.image_url ? `<img src="${club.image_url}" alt="${club.name}" class="club-image" loading="lazy">` : 
                      `<div class="club-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`}
                    <h3>${club.name}</h3>
                    <p>${club.description}</p>
                    ${club.members ? `<p class="club-members">部員数: ${club.members}名</p>` : ''}
                    ${club.schedule ? `<p class="club-schedule">活動日: ${club.schedule}</p>` : ''}
                </div>
            `).join('');
        } catch (error) {
            error('Failed to load clubs:', error);
        }
    }
    
    async loadNews() {
        const container = document.querySelector('.news-container');
        if (!container) return;
        
        if (typeof NewsLoader !== 'undefined') {
            const newsLoader = new NewsLoader();
            await newsLoader.init();
        } else {
            container.innerHTML = `
                <div class="no-data-message">
                    <div class="no-data-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>読み込みエラー</h3>
                    <p>ニュースローダーが読み込まれていません。</p>
                </div>
            `;
        }
    }
    
    async loadSurveys() {
        const container = document.getElementById('active-surveys');
        if (!container) return;
        
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">
                    <i class="fas fa-poll"></i>
                </div>
                <h3>現在実施中のアンケートはありません</h3>
                <p>新しいアンケートが公開されるまでお待ちください。</p>
            </div>
        `;
    }
    
    async initForum() {
        // フォーラムの最適化された初期化
        const submitBtn = document.getElementById('submit-post');
        const contentInput = document.getElementById('forum-content');
        
        if (submitBtn && contentInput) {
            // デバウンス付きの文字数カウンタ
            this.domOptimizer.addDebouncedListener(contentInput, 'input', () => {
                const charCounter = document.getElementById('forum-char-counter');
                if (charCounter) {
                    const max = parseInt(contentInput.getAttribute('maxlength')) || 1000;
                    const len = contentInput.value.length;
                    charCounter.textContent = `${len} / ${max}`;
                }
            }, 100);
            
            submitBtn.addEventListener('click', async () => {
                const content = contentInput.value.trim();
                if (!content) {
                    alert('投稿内容を入力してください');
                    return;
                }
                
                submitBtn.disabled = true;
                submitBtn.textContent = '送信中...';
                
                try {
                    const result = await this.apiClient.sendRequest('submitPost', { content });
                    if (result.success) {
                        contentInput.value = '';
                        alert('投稿が完了しました！');
                        this.loadPosts();
                    } else {
                        alert('投稿に失敗しました');
                    }
                } catch (error) {
                    error('Post submission failed:', error);
                    alert('投稿に失敗しました');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '投稿する';
                }
            });
        }
        
        await this.loadPosts();
    }
    
    async loadPosts() {
        const container = document.getElementById('posts-container');
        if (!container) return;
        
        try {
            const posts = await this.dataManager.getData('posts',
                () => this.apiClient.sendRequest('getPosts', { limit: 10 }, { useCache: true })
            );
            
            container.innerHTML = posts.map(post => `
                <div class="post-item">
                    <div class="post-header">
                        <span>投稿ID: ${post.id}</span>
                        <span>${this.formatDate(post.created_at)}</span>
                    </div>
                    <div class="post-content">${this.escapeHtml(post.content)}</div>
                    <span class="post-status status-${post.status}">${this.getStatusLabel(post.status)}</span>
                    ${post.reply ? `
                        <div class="post-reply">
                            <strong>生徒会より:</strong>
                            <p>${this.escapeHtml(post.reply)}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } catch (error) {
            error('Failed to load posts:', error);
        }
    }
    
    // ユーティリティ関数
    getNewsTypeLabel(type) {
        return CONFIG.CATEGORIES.NEWS[type] || 'お知らせ';
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    getStatusLabel(status) {
        return CONFIG.STATUS.POSTS[status] || status;
    }
    
    showNotification(title, body, type = 'info') {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: CONFIG.APP.NOTIFICATION_ICON
            });
        }
    }
    
    // クリーンアップ
    destroy() {
        this.domOptimizer.cleanup();
        this.dataManager.clearCache();
    }
}

// ========================================
// グローバル初期化
// ========================================

// グローバル変数
let uiManager = null;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    PerformanceMonitor.mark('app-init-start');
    
    try {
        // UIマネージャーの初期化
        uiManager = new UIManager();
        await uiManager.init();
        
        PerformanceMonitor.measure('app-init-complete', 'app-init-start');
        
    } catch (error) {
        error('Application initialization failed:', error);
    }
});

// ページアンロード時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (uiManager) {
        uiManager.destroy();
    }
});

// グローバルに公開
window.UIManager = UIManager;
window.PerformanceMonitor = PerformanceMonitor;
