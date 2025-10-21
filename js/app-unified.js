/**
 * なずなポータル - 統合アプリケーション
 * app.js + app-optimized.js の統合版
 * パフォーマンス最適化済み
 */

// ========================================
// パフォーマンス監視とデバッグ
// ========================================

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

// デバッグモードの判定
const DEBUG = CONFIG?.APP?.DEBUG || false;
const log = DEBUG ? console.log : () => {};
const warn = DEBUG ? console.warn : () => {};
const error = console.error;

// ========================================
// Supabaseクライアント管理
// ========================================

let supabaseClient = null;
let supabaseQueries = null;

// Supabaseクライアントを初期化（重複を避ける）
function initSupabase() {
    // 既に初期化されている場合はスキップ
    if (window.supabaseClient && window.supabaseQueries) {
        log('Supabase client already initialized');
        return;
    }
    
    // Supabase SDKの確認
    if (typeof supabase === 'undefined') {
        console.warn('Supabase SDK not loaded');
        return;
    }
    
    // 設定の確認
    if (!CONFIG?.SUPABASE?.URL || !CONFIG?.SUPABASE?.ANON_KEY ||
        CONFIG.SUPABASE.URL === 'YOUR_SUPABASE_URL_HERE' ||
        CONFIG.SUPABASE.ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        console.warn('Supabase not configured properly');
        console.log('Using demo mode with fallback data');
        return;
    }
    
    try {
        supabaseClient = supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);
        window.supabaseClient = supabaseClient;
        
        if (typeof SupabaseQueries !== 'undefined') {
            supabaseQueries = new SupabaseQueries(supabaseClient);
            window.supabaseQueries = supabaseQueries;
            log('Supabase client and queries initialized successfully');
        } else {
            console.warn('SupabaseQueries class not available');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        console.log('Continuing with demo mode...');
        supabaseClient = null;
        supabaseQueries = null;
        window.supabaseClient = null;
        window.supabaseQueries = null;
    }
}

// ========================================
// 最適化されたAPIクライアント
// ========================================

class UnifiedAPIClient {
    constructor() {
        this.baseURL = CONFIG.GAS_URL;
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

    // リクエストの重複排除とキャッシュ
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
                this.cleanup(callbackName);
                reject(new Error('リクエストがタイムアウトしました'));
            }, options.timeout || 10000);
            
            // JSONPリクエストを送信（コールバック設定はsendJsonpRequest内で行う）
            this.sendJsonpRequest(action, params, callbackName, resolve, reject, timeout);
        });
    }
    
    sendJsonpRequest(action, params, callbackName, resolve, reject, timeout) {
        const script = document.createElement('script');
        const url = new URL(this.baseURL);
        url.searchParams.set('action', action);
        url.searchParams.set('callback', `gasCallbacks.${callbackName}`);
        
        // パラメータを追加
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, JSON.stringify(params[key]));
        });
        
        script.src = url.toString();
        script.onerror = () => {
            this.cleanup(callbackName);
            reject(new Error('ネットワークエラー'));
        };
        
        // コールバック関数を設定してからスクリプトを追加
        window.gasCallbacks[callbackName] = (data) => {
            clearTimeout(timeout);
            this.cleanup(callbackName);
            if (data && data.success) {
                resolve(data);
            } else {
                reject(new Error(data?.error || 'リクエストに失敗しました'));
            }
        };
        
        document.head.appendChild(script);
    }
    
    cleanup(callbackName) {
        delete window.gasCallbacks[callbackName];
        const scripts = document.querySelectorAll(`script[src*="${callbackName}"]`);
        scripts.forEach(script => script.remove());
    }
    
    processQueue() {
        // オフライン時にキューに保存されたリクエストを処理
        log('Processing queued requests...');
    }
}

// ========================================
// UI管理システム
// ========================================

class UIManager {
    constructor() {
        this.isInitialized = false;
        this.currentPage = null;
    }

    async init() {
        if (this.isInitialized) return;
        
        PerformanceMonitor.mark('ui-init-start');
        
        try {
            await this.initNavigation();
            await this.initSidebar();
            await this.initPWA();
            
            this.isInitialized = true;
            PerformanceMonitor.measure('ui-init', 'ui-init-start');
        } catch (error) {
            console.error('UI initialization failed:', error);
        }
    }

    async initNavigation() {
        // ナビゲーション初期化
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

        if (hamburger && sidebar) {
            hamburger.addEventListener('click', () => {
                sidebar.classList.add('active');
                sidebarOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (sidebarCloseBtn && sidebar) {
            sidebarCloseBtn.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    }

    async initSidebar() {
        // サイドバー初期化
        log('Sidebar initialized');
    }

    async initPWA() {
        // PWA初期化
        log('PWA initialized');
    }
}

// ========================================
// ページ管理システム
// ========================================

class PageManager {
    constructor() {
        this.currentPage = null;
        this.pageHandlers = new Map();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'index';
        this.currentPage = page;
        return page;
    }

    async loadPageContent() {
        const page = this.getCurrentPage();
        
        // ページ別の初期化処理
        switch (page) {
            case 'index':
                await this.initHomePage();
                break;
            case 'news':
                await this.initNewsPage();
                break;
            case 'forum':
                await this.initForumPage();
                break;
            case 'survey':
                await this.initSurveyPage();
                break;
            default:
                log(`No specific handler for page: ${page}`);
        }
    }

    async initHomePage() {
        // ホームページの初期化
        await this.loadLatestNews();
        await this.loadLatestPosts();
    }

    async initNewsPage() {
        // ニュースページの初期化
        log('News page initialized');
    }

    async initForumPage() {
        // フォーラムページの初期化
        log('Forum page initialized');
    }

    async initSurveyPage() {
        // アンケートページの初期化
        log('Survey page initialized');
    }

    async loadLatestNews() {
        try {
            const newsContainer = document.getElementById('latest-news');
            if (!newsContainer) return;

            if (window.supabaseQueries) {
                const news = await window.supabaseQueries.getLatestNews(3);
                this.renderNews(news, newsContainer);
            } else {
                // フォールバックデータ
                this.renderNews([], newsContainer);
            }
        } catch (error) {
            console.error('Failed to load latest news:', error);
        }
    }

    async loadLatestPosts() {
        try {
            const postsContainer = document.getElementById('latest-posts');
            if (!postsContainer) return;

            if (window.supabaseQueries) {
                const posts = await window.supabaseQueries.getLatestPosts(3);
                this.renderPosts(posts, postsContainer);
            } else {
                // フォールバックデータ
                this.renderPosts([], postsContainer);
            }
        } catch (error) {
            console.error('Failed to load latest posts:', error);
        }
    }

    renderNews(news, container) {
        if (news.length === 0) {
            container.innerHTML = '<div class="no-content">最新のお知らせはありません</div>';
            return;
        }

        const newsHTML = news.map(item => `
            <div class="news-item">
                <h4>${item.title}</h4>
                <p>${item.content.substring(0, 100)}...</p>
                <span class="news-date">${new Date(item.created_at).toLocaleDateString()}</span>
            </div>
        `).join('');

        container.innerHTML = newsHTML;
    }

    renderPosts(posts, container) {
        if (posts.length === 0) {
            container.innerHTML = '<div class="no-content">最新の投稿はありません</div>';
            return;
        }

        const postsHTML = posts.map(post => `
            <div class="post-item">
                <h4>${post.title}</h4>
                <p>${post.content.substring(0, 100)}...</p>
                <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
            </div>
        `).join('');

        container.innerHTML = postsHTML;
    }
}

// ========================================
// オープニング画面管理
// ========================================

class OpeningScreenManager {
    constructor() {
        this.isShown = false;
        this.minDisplayTime = 5000;
    }

    checkAndMarkSessionVisit() {
        const sessionKey = 'session_visit_' + new Date().toDateString();
        const hasVisitedToday = localStorage.getItem(sessionKey);
        
        if (!hasVisitedToday) {
            localStorage.setItem(sessionKey, 'true');
            return true;
        }
        return false;
    }

    showOpeningScreen() {
        if (this.isShown) return;
        
        this.isShown = true;
        document.body.classList.add('opening-active');
        
        // 最小表示時間後に自動で非表示
        setTimeout(() => {
            this.hideOpeningScreen();
        }, this.minDisplayTime);
    }

    hideOpeningScreen() {
        document.body.classList.remove('opening-active');
        document.body.classList.add('opening-complete');
    }
}

// ========================================
// グローバル初期化
// ========================================

// JSONP用のグローバルコールバック関数を格納するオブジェクト
window.gasCallbacks = {};

// グローバルインスタンス
const uiManager = new UIManager();
const pageManager = new PageManager();
const openingManager = new OpeningScreenManager();
const apiClient = new UnifiedAPIClient();

// グローバルに公開
window.apiClient = apiClient;
window.uiManager = uiManager;
window.pageManager = pageManager;
window.openingManager = openingManager;

// ページ初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing unified app...');
    
    PerformanceMonitor.mark('app-init-start');
    
    try {
        // セッションごとにオープニング画面を表示
        const shouldShowOpening = openingManager.checkAndMarkSessionVisit();
        if (shouldShowOpening) {
            console.log('New session detected, showing opening screen');
            openingManager.showOpeningScreen();
        }
        
        // Supabaseを初期化
        initSupabase();
        
        // UI管理システムを初期化
        await uiManager.init();
        
        // ページ別の初期化
        await pageManager.loadPageContent();
        
        // ページ公開フラグを確認
        const currentPage = pageManager.getCurrentPage();
        if (CONFIG?.APP?.PAGES && CONFIG.APP.PAGES[currentPage] === false) {
            alert('このページは現在準備中です。');
            window.location.href = '404.html?from=' + encodeURIComponent(currentPage);
            return;
        }
        
        // 最小表示時間後にオープニング画面を非表示
        if (shouldShowOpening) {
            setTimeout(() => {
                openingManager.hideOpeningScreen();
            }, openingManager.minDisplayTime);
        }
        
        PerformanceMonitor.measure('app-init', 'app-init-start');
        console.log('Unified app initialization completed');
        
    } catch (error) {
        console.error('App initialization failed:', error);
    }
});

// デバッグ用関数をグローバルに公開
if (DEBUG) {
    window.resetFirstVisit = () => {
        const sessionKey = 'session_visit_' + new Date().toDateString();
        localStorage.removeItem(sessionKey);
        location.reload();
    };
    
    window.showOpeningScreen = () => openingManager.showOpeningScreen();
    window.hideOpeningScreen = () => openingManager.hideOpeningScreen();
    
    console.log('Debug functions available: resetFirstVisit(), showOpeningScreen(), hideOpeningScreen()');
}

console.log('[App Unified] Loaded successfully');
