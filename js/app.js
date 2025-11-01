// Supabaseクライアント
let supabaseClient = null;
let supabaseQueries = null;

// Supabaseクライアントを初期化
function initSupabase() {
    if (typeof supabase !== 'undefined' && 
        CONFIG.SUPABASE.URL && 
        CONFIG.SUPABASE.ANON_KEY &&
        CONFIG.SUPABASE.URL !== 'YOUR_SUPABASE_URL_HERE' &&
        CONFIG.SUPABASE.ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
        
        try {
            // 古いクライアントをクリア
            if (window.supabaseClient) {
                window.supabaseClient = null;
            }
            
            // 新しいクライアントを作成（CORS設定を含む）
            const supabaseOptions = CONFIG.SUPABASE.OPTIONS || {};
            supabaseClient = supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, supabaseOptions);
            window.supabaseClient = supabaseClient; // グローバルに公開
            
            if (typeof SupabaseQueries === 'undefined') {
                throw new Error('SupabaseQueries class not available');
            }
            supabaseQueries = new SupabaseQueries(supabaseClient);
            window.supabaseQueries = supabaseQueries; // グローバルに公開
            
            console.log('Supabase client and queries initialized successfully');
            console.log('Supabase URL:', CONFIG.SUPABASE.URL);
            
            // 接続テスト
            testSupabaseConnection();
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            console.log('Continuing with demo mode...');
            supabaseClient = null;
            supabaseQueries = null;
            window.supabaseClient = null;
            window.supabaseQueries = null;
        }
    } else {
        console.warn('Supabase not available or not configured properly');
        console.log('Using demo mode with fallback data');
        supabaseClient = null;
        supabaseQueries = null;
        window.supabaseClient = null;
        window.supabaseQueries = null;
    }
}

// Supabase接続テスト
async function testSupabaseConnection() {
    if (!supabaseClient) return;
    
    try {
        // 簡単な接続テスト（council_membersテーブルの存在確認）
        const { data, error } = await supabaseClient
            .from('council_members')
            .select('id')
            .limit(1);
            
        if (error) {
            console.error('Supabase connection test failed:', error);
            if (error.message.includes('410') || error.message.includes('Gone')) {
                console.error('Supabase project appears to be deleted or unavailable');
                console.log('Attempting to clear cache and reinitialize...');
                clearSupabaseCacheAndReinit();
                showConnectionError('Supabaseプロジェクトが削除されているか、利用できません。キャッシュをクリアして再試行します。');
            } else if (error.message.includes('CORS')) {
                console.error('CORS error detected');
                console.log('Attempting to clear cache and reinitialize...');
                clearSupabaseCacheAndReinit();
                showConnectionError('CORSエラーが発生しています。キャッシュをクリアして再試行します。');
            }
        } else {
            console.log('Supabase connection test successful');
        }
    } catch (error) {
        console.error('Supabase connection test error:', error);
    }
}

// 接続エラー表示
function showConnectionError(message) {
    // ユーザーにエラーメッセージを表示
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    } else {
        console.error('Connection Error:', message);
        // フォールバック: アラート表示
        if (confirm(`${message}\n\nページをリロードしますか？`)) {
            window.location.reload();
        }
    }
}

// キャッシュクリアとSupabase再初期化
function clearSupabaseCacheAndReinit() {
    try {
        // ローカルストレージからSupabase関連のキャッシュをクリア
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('sb-'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // セッションストレージからもクリア
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('sb-'))) {
                sessionKeysToRemove.push(key);
            }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        console.log('Supabase cache cleared');
        
        // Supabaseクライアントを再初期化
        initSupabase();
        
    } catch (error) {
        console.error('Error clearing Supabase cache:', error);
    }
}

// グローバルに公開（デバッグ用）
window.clearSupabaseCacheAndReinit = clearSupabaseCacheAndReinit;

// API Client初期化関数
function initializeAPIClient() {
    if (typeof APIClient !== 'undefined') {
        if (!window.apiClient) {
            try {
                window.apiClient = new APIClient();
                console.log('API Client initialized successfully');
            } catch (error) {
                console.error('API Client initialization failed:', error);
            }
        } else {
            console.log('API Client already initialized');
        }
    } else {
        console.warn('APIClient class not available');
    }
}

// グローバルに公開
window.initializeAPIClient = initializeAPIClient;

// JSONP用のグローバルコールバック関数を格納するオブジェクト
window.gasCallbacks = {};

// APIクライアントクラス
class APIClient {
    constructor() {
        this.baseURL = CONFIG.GAS_URL;
        this.cache = new Map();
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        
        // オンライン/オフライン状態の監視
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

// JSONP リクエストを送信する関数
    sendRequest(action, params = {}, options = {}) {
        return new Promise((resolve, reject) => {
            // オフライン時の処理
            if (!this.isOnline && !options.allowOffline) {
                this.requestQueue.push({ action, params, resolve, reject });
                reject(new Error(CONFIG.MESSAGES.INFO.OFFLINE));
                return;
            }
            
            // キャッシュチェック
            const cacheKey = `${action}_${JSON.stringify(params)}`;
            if (options.useCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < CONFIG.APP.CACHE_DURATION) {
                    resolve(cached.data);
                    return;
                }
            }
            
    const callbackName = 'callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
            
            // タイムアウト設定
            const timeout = setTimeout(() => {
                this.cleanup(callbackName);
                reject(new Error(CONFIG.MESSAGES.ERROR.NETWORK));
            }, options.timeout || 10000);
    
    // グローバルコールバック関数を設定
            window.gasCallbacks[callbackName] = (data) => {
                clearTimeout(timeout);
                
                // verifyAdminSessionなど、validプロパティを使うAPIにも対応
                const isSuccess = data.success === true || data.valid === true;
                const isFailure = data.success === false || data.valid === false;
                
                if (isSuccess && !isFailure) {
                    // キャッシュに保存
                    if (options.useCache) {
                        this.cache.set(cacheKey, {
                            data: data,
                            timestamp: Date.now()
                        });
                    }
                    resolve(data);
                } else if (isFailure) {
                    // より詳細なエラーメッセージを提供
                    const errorMessage = data.error || CONFIG.MESSAGES.ERROR.SERVER;
                    console.error('API Error:', errorMessage, data);
                    // verifyAdminSessionの場合、エラーでも結果として返す（valid: false）
                    if (data.valid !== undefined) {
                        resolve(data);
                    } else {
                        reject(new Error(errorMessage));
                    }
                } else {
                    // success/validプロパティがない場合も成功とみなす（後方互換性）
                    console.warn('Response without success/valid property:', data);
                    resolve(data);
                }
                
                this.cleanup(callbackName);
    };
    
    // パラメータをURLエンコード
    const queryParams = new URLSearchParams({
        action: action,
        callback: 'gasCallbacks.' + callbackName,
                timestamp: Date.now(),
        ...params
    });
    
    // scriptタグを動的に生成
    const script = document.createElement('script');
    script.id = 'jsonp_' + callbackName;
            script.src = `${this.baseURL}?${queryParams}`;
            script.onerror = () => {
                clearTimeout(timeout);
                this.cleanup(callbackName);
                reject(new Error(CONFIG.MESSAGES.ERROR.NETWORK));
            };
            
    document.head.appendChild(script);
        });
    }
    
    // クリーンアップ処理
    cleanup(callbackName) {
        delete window.gasCallbacks[callbackName];
        const script = document.getElementById('jsonp_' + callbackName);
        if (script) {
            script.remove();
        }
    }
    
    // キューに溜まったリクエストを処理
    processQueue() {
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            this.sendRequest(request.action, request.params)
                .then(request.resolve)
                .catch(request.reject);
        }
    }
    
    // キャッシュクリア
    clearCache() {
        this.cache.clear();
    }
}

// APIクライアントのインスタンスを作成
const apiClient = new APIClient();

// 便利な関数（後方互換性のため）
function sendJsonpRequest(action, params = {}, callback) {
    apiClient.sendRequest(action, params, { useCache: true })
        .then(callback)
        .catch(error => {
            console.error('API Error:', error);
            callback({ success: false, error: error.message });
        });
}

// ページ初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // セッションごとにオープニング画面を表示
    const shouldShowOpening = checkAndMarkSessionVisit();
    if (shouldShowOpening) {
        console.log('New session detected, showing opening screen');
        document.body.classList.add('opening-active');
        showOpeningScreen();
    }
    
    // Supabaseを初期化
    initSupabase();
    
    // API Client初期化
    initializeAPIClient();
    
    // 基本機能を初期化
    initNavigation();
    initSidebar();
    initPWA();
    
    // ページ別の初期化
    const currentPage = getCurrentPage();
    console.log('Current page:', currentPage);

    // ページ公開フラグを確認
    if (CONFIG?.APP?.PAGES && CONFIG.APP.PAGES[currentPage] === false) {
        alert('このページは現在準備中です。');
        window.location.href = '404.html?from=' + encodeURIComponent(currentPage);
        return;
    }
    
    // 最小5秒間はオープニング画面を表示
    const startTime = Date.now();
    const minDisplayTime = 5000; // 5秒
    
    const initializeContent = async () => {
        try {
            switch(currentPage) {
                case 'index':
                    await initHomePage();
                    break;
                case 'council':
                    await loadCouncilMembers();
                    break;
                case 'clubs':
                    await loadClubs();
                    initClubsFilter();
                    break;
                case 'forum':
                    await initForum();
                    break;
                case 'news':
                    await loadNews();
                    initNewsFilter();
                    initNewsletterDownloads();
                    initNotifications();
                    break;
                case 'survey':
                    await loadSurveys();
                    initSurveyForm();
                    break;
            }
        } catch (error) {
            console.error('Error during content initialization:', error);
        }
        
        // オープニング画面を表示した場合のみ隠す
        if (shouldShowOpening) {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(minDisplayTime - elapsedTime, 0);
            
            console.log(`Elapsed time: ${elapsedTime}ms, remaining time: ${remainingTime}ms`);
            
            setTimeout(() => {
                console.log('Hiding opening screen...');
                hideOpeningScreen();
            }, remainingTime);
        }
    };
    
    // オープニング画面を表示しない場合は直接ページエントリーアニメーションを実行
    if (!shouldShowOpening) {
        document.body.classList.add('page-enter');
        requestAnimationFrame(() => {
            document.body.classList.add('page-enter-active');
            // コンテンツの初期化を開始
            initializeContent();
        });
    } else {
        // オープニング画面を表示する場合は、コンテンツの初期化のみ実行
        initializeContent();
    }
    
    // フォールバック：オープニング画面を表示した場合のみ10秒後に強制的に閉じる
    if (shouldShowOpening) {
        setTimeout(() => {
            const openingScreen = document.getElementById('opening-screen');
            if (openingScreen) {
                console.log('Force hiding opening screen after 10 seconds');
                hideOpeningScreen();
            }
        }, 10000);
    }
});

// セッションごとのアクセスをチェックして記録
function checkAndMarkSessionVisit() {
    const SESSION_KEY = 'nazuna-portal-session';
    const OPENING_SHOWN_KEY = 'nazuna-portal-opening-shown';
    
    // セッション開始時刻を取得または設定
    let sessionStart = sessionStorage.getItem(SESSION_KEY);
    if (!sessionStart) {
        sessionStart = Date.now().toString();
        sessionStorage.setItem(SESSION_KEY, sessionStart);
        console.log('New session started');
        
        // 新しいセッション: この1回だけ表示し、以後のページでは表示しない
        sessionStorage.setItem(OPENING_SHOWN_KEY, 'true');
        return true;
    }
    
    // 同一セッション内でオープニングが既に表示されたかチェック
    const openingShown = sessionStorage.getItem(OPENING_SHOWN_KEY);
    if (!openingShown) {
        sessionStorage.setItem(OPENING_SHOWN_KEY, 'true');
        console.log('First page load in this session');
        return true;
    }
    
    console.log('Opening already shown in this session');
    return false;
}

// 初回アクセスかチェックして記録（後方互換性のため保持）
function checkAndMarkFirstVisit() {
    const FIRST_VISIT_KEY = 'nazuna-portal-first-visit';
    const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY);
    
    if (isFirstVisit) {
        localStorage.setItem(FIRST_VISIT_KEY, Date.now().toString());
        console.log('Marking first visit');
    } else {
        console.log('Returning visitor');
    }
    
    return isFirstVisit;
}

// セッション状態をリセット（デバッグ用）
function resetSession() {
    sessionStorage.removeItem('nazuna-portal-session');
    sessionStorage.removeItem('nazuna-portal-opening-shown');
    console.log('Session reset - opening will show on next page load');
}

// 初回アクセス状態をリセット（デバッグ用）
function resetFirstVisit() {
    localStorage.removeItem('nazuna-portal-first-visit');
    console.log('First visit status reset');
}

// 現在のページを取得
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename.replace('.html', '') || 'index';
}

// ナビゲーション初期化
function initNavigation() {
    // ページ内リンクのスムーススクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // 空のhrefや単純な#の場合はスキップ
            if (!href || href === '#' || href.length <= 1) {
                return;
            }
            
            e.preventDefault();
            
            try {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    closeSidebar(); // サイドバーが開いている場合は閉じる
                }
            } catch (error) {
                console.warn('Invalid selector for smooth scroll:', href);
            }
        });
    });
    
    console.log('Navigation initialized - using sidebar navigation');
}

// サイドバー初期化
function initSidebar() {
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    // ハンバーガーメニューをクリックしてサイドバーを開閉
    hamburger?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });
    
    // オーバーレイをクリックしてサイドバーを閉じる
    overlay?.addEventListener('click', () => {
        closeSidebar();
    });
    
    // サイドバー内のリンクをクリックしたらサイドバーを閉じて画面遷移
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            // document.body.classList.add('page-exit'); // フェードアウトは抑制してローディングを表示
            if (typeof showLoadingOverlay === 'function') {
                showLoadingOverlay();
            }
            closeSidebar();
            setTimeout(() => { window.location.href = href; }, 220);
        });
    });

    // スマホ用の閉じるボタン
    const sidebarCloseBtn = document.querySelector('#sidebar-close-btn');
    sidebarCloseBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSidebar();
    });
    
    // ESCキーでサイドバーを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar?.classList.contains('active')) {
            closeSidebar();
        }
    });
}

// サイドバーを開閉
function toggleSidebar() {
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    const isActive = sidebar?.classList.contains('active');
    
    hamburger?.classList.toggle('active');
    sidebar?.classList.toggle('active');
    overlay?.classList.toggle('active');
    
    // ハンバーガーボタンの位置制御用クラス
    if (!isActive) {
        document.body.classList.add('sidebar-open');
    } else {
        document.body.classList.remove('sidebar-open');
    }
    
    // アクセシビリティ属性を更新
    if (hamburger) {
        const newExpanded = !isActive;
        hamburger.setAttribute('aria-expanded', newExpanded.toString());
        hamburger.setAttribute('aria-label', newExpanded ? 'メニューを閉じる' : 'メニューを開く');
    }
    
    // ボディのスクロールを制御
    if (!isActive) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// サイドバーを閉じる
function closeSidebar() {
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    hamburger?.classList.remove('active');
    sidebar?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
    document.body.style.overflow = '';
}

// 画像のプリロード
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}

// オープニング画面を表示
async function showOpeningScreen() {
    console.log('Showing opening screen...');
    
    // 既存のオープニング画面があれば削除
    const existing = document.getElementById('opening-screen');
    if (existing) {
        existing.remove();
    }
    
    // 画像をプリロード
    const iconUrl = 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon.png';
    let imageLoaded = false;
    
    try {
        await preloadImage(iconUrl);
        imageLoaded = true;
        console.log('Opening image preloaded successfully');
    } catch (error) {
        console.warn('Failed to preload opening image:', error);
    }
    
    const openingHTML = `
        <div class="opening-screen" id="opening-screen">
            <div class="opening-particles">
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
                <div class="opening-particle"></div>
            </div>
            <div class="opening-logo">
                <img src="${iconUrl}" alt="なずなポータル" class="opening-logo-img" style="opacity: ${imageLoaded ? '1' : '0'}; transition: opacity 0.5s ease-in-out;">
            </div>
            <h1 class="opening-title" data-text="なずなポータル">なずなポータル</h1>
            <p class="opening-subtitle">みんなでつくる学校生活</p>
            <div class="opening-loader"></div>
            <div class="opening-progress">
                <div class="opening-progress-bar"></div>
            </div>
            <div class="opening-loading-text">読み込み中...</div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', openingHTML);
    console.log('Opening screen added to DOM');
    
    // 画像がまだ読み込まれていない場合は、読み込み完了後に表示
    if (!imageLoaded) {
        const img = document.querySelector('.opening-logo-img');
        if (img) {
            img.onload = () => {
                img.style.opacity = '1';
                console.log('Opening image loaded and displayed');
            };
            img.onerror = () => {
                console.error('Failed to load opening image');
                img.style.opacity = '1'; // エラーでも表示する
            };
        }
    }
    
    // デバッグ用：オープニング画面をクリックで閉じる
    const openingScreen = document.getElementById('opening-screen');
    if (openingScreen && CONFIG.APP.DEBUG) {
        openingScreen.style.cursor = 'pointer';
        openingScreen.addEventListener('click', () => {
            console.log('Opening screen clicked (debug mode)');
            hideOpeningScreen();
        });
    }
}

// オープニング画面を隠す
function hideOpeningScreen() {
    console.log('Attempting to hide opening screen...');
    const openingScreen = document.getElementById('opening-screen');
    
    if (openingScreen) {
        console.log('Opening screen found, adding fade-out class');
        openingScreen.classList.add('fade-out');
        
        // ページエントリーアニメーションを開始
        document.body.classList.add('page-enter');
        requestAnimationFrame(() => {
            document.body.classList.add('page-enter-active');
            
            // メインコンテンツの表示を少し遅らせる
            setTimeout(() => {
                const main = document.querySelector('main');
                if (main) {
                    main.classList.add('page-ready');
                }
            }, 200);
        });
        
        setTimeout(() => {
            if (openingScreen.parentNode) {
                openingScreen.remove();
                document.body.classList.remove('opening-active');
                console.log('Opening screen removed from DOM');
            }
        }, 800); // フェードアウト時間に合わせて調整
    } else {
        console.log('Opening screen not found in DOM');
    }
}

// データキャッシュ
const dataCache = {
    councilMembers: null,
    lastFetch: null,
    cacheDuration: 5 * 60 * 1000 // 5分
};

// キャッシュからデータを取得
function getCachedCouncilMembers() {
    if (!dataCache.councilMembers || !dataCache.lastFetch) {
        return null;
    }
    
    const now = Date.now();
    if (now - dataCache.lastFetch > dataCache.cacheDuration) {
        // キャッシュ期限切れ
        dataCache.councilMembers = null;
        dataCache.lastFetch = null;
        return null;
    }
    
    return dataCache.councilMembers;
}

// データをキャッシュに保存
function setCachedCouncilMembers(data) {
    dataCache.councilMembers = data;
    dataCache.lastFetch = Date.now();
}

// グローバルに公開（member-detail.jsからアクセス可能にする）
window.getCachedCouncilMembers = getCachedCouncilMembers;
window.setCachedCouncilMembers = setCachedCouncilMembers;

// 生徒会メンバー読み込み
async function loadCouncilMembers() {
    const container = document.querySelector('.council-members');
    if (!container) return;
    
    // ローディング表示
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>生徒会メンバー情報を読み込み中...</p>
        </div>
    `;
    
    const renderMember = (member) => `
        <div class="member-card clickable" data-member-id="${member.id}" tabindex="0" role="button" aria-label="${member.name}の詳細を見る">
            <div class="member-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 150px; border-radius: 50%; width: 150px; margin: 0 auto 1rem;"></div>
            <h3>${member.name}</h3>
            <p class="member-role">${member.role}</p>
            <p class="member-message">"${member.message || 'よろしくお願いします'}"</p>
            <div class="member-card-overlay">
                <i class="fas fa-eye"></i>
                <span>詳細を見る</span>
            </div>
        </div>
    `;
    
    try {
        // まずキャッシュをチェック
        const cachedData = getCachedCouncilMembers();
        if (cachedData) {
            console.log('Using cached council members data');
            container.innerHTML = cachedData.map(renderMember).join('');
            makeCouncilMembersClickable();
            showInfoMessage('キャッシュされたデータを表示しています。');
            return;
        }
        
        if (supabaseQueries) {
            console.log('Loading council members from Supabase...');
            const { data, error } = await supabaseQueries.getCouncilMembers({ activeOnly: true });
            
            if (error) {
                console.error('Supabase error loading council members:', error);
                console.log('Error details:', JSON.stringify(error));
                
                // エラーの詳細をチェック
                const errorMsg = error.message || error.details || error.hint || '不明なエラー';
                const isRLSError = errorMsg.includes('policy') || errorMsg.includes('RLS') || errorMsg.includes('permission');
                
                if (isRLSError) {
                    container.innerHTML = `
                        <div class="no-data-message">
                            <div class="no-data-icon">
                                <i class="fas fa-lock"></i>
                            </div>
                            <h3>アクセス権限エラー</h3>
                            <p>データベースのアクセス権限に問題があります。管理者にお問い合わせください。</p>
                            <details>
                                <summary>技術詳細</summary>
                                <pre>Error: ${JSON.stringify(error, null, 2)}</pre>
                            </details>
                            <button class="btn btn-primary" onclick="loadCouncilMembers()">
                                <i class="fas fa-refresh"></i>
                                再試行
                            </button>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div class="no-data-message">
                            <div class="no-data-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <h3>データの読み込みに失敗しました</h3>
                            <p>データベースに接続できませんでした。しばらく待ってから再試行してください。</p>
                            <button class="btn btn-primary" onclick="loadCouncilMembers()">
                                <i class="fas fa-refresh"></i>
                                再試行
                            </button>
                        </div>
                    `;
                }
                showErrorMessage(`データの読み込み中にエラーが発生しました: ${errorMsg}`);
            } else if (data && data.length > 0) {
                console.log('Loaded council members from Supabase:', data.length);
                console.log('Sample data:', data[0]);
                // データをキャッシュに保存
                setCachedCouncilMembers(data);
                container.innerHTML = data.map(renderMember).join('');
                makeCouncilMembersClickable();
                showSuccessMessage(`${data.length}名の生徒会メンバー情報を読み込みました。`);
            } else {
                console.log('No council members found in Supabase - empty result');
                container.innerHTML = `
                    <div class="no-data-message">
                        <div class="no-data-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3>メンバー情報がありません</h3>
                        <p>現在、生徒会メンバーの情報が登録されていません。</p>
                        <details>
                            <summary>デバッグ情報</summary>
                            <pre>Status: ${supabaseQueries?.isAvailable ? 'Supabase connected' : 'Supabase unavailable'}
RLS Policy: Public read access on council_members WHERE is_active = true
Query: SELECT * FROM council_members WHERE is_active = true ORDER BY display_order ASC</pre>
                        </details>
                    </div>
                `;
                showInfoMessage('データベースにメンバー情報が登録されていません。');
            }
        } else {
            console.log('Supabase not available');
            container.innerHTML = `
                <div class="no-data-message">
                    <div class="no-data-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>データベースに接続できません</h3>
                    <p>システムの初期化に失敗しました。ページを再読み込みしてください。</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i>
                        ページを再読み込み
                    </button>
                </div>
            `;
            showErrorMessage('データベースに接続できません。');
        }
        
    } catch (error) {
        console.error('Error loading council members:', error);
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>予期しないエラーが発生しました</h3>
                <p>システムエラーが発生しました。ページを再読み込みしてください。</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i>
                    ページを再読み込み
                </button>
            </div>
        `;
        showErrorMessage('予期しないエラーが発生しました。');
    }
}

// 生徒会メンバーカードをクリック可能にする
function makeCouncilMembersClickable() {
    const memberCards = document.querySelectorAll('.member-card.clickable');
    
    memberCards.forEach(card => {
        // クリックイベント
        card.addEventListener('click', function() {
            const memberId = this.dataset.memberId;
            if (memberId) {
                window.location.href = `member-detail.html?id=${memberId}`;
            }
        });
        
        // キーボード操作対応
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
        
        // ホバー効果
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '';
        });
    });
}

// Supabaseからデータを読み込む汎用関数（統一版）
async function loadFromSupabase(table, container, renderFunction, fallbackData = null, options = {}) {
    const loadingEl = document.getElementById(`${table}-loading`);
    
    if (loadingEl) loadingEl.style.display = 'block';
    
    try {
        if (supabaseQueries) {
            const { data, error } = await supabaseQueries.getTableData(table, options);
            
            if (loadingEl) loadingEl.style.display = 'none';
            
            if (error) {
                console.error('Supabase error:', error);
                showNoDataMessage(container, supabaseQueries.getErrorMessage(error, `${table}の読み込み`));
                return;
            }
            
            if (data && data.length > 0) {
                container.innerHTML = data.map(renderFunction).join('');
            } else {
                showNoDataMessage(container, CONFIG.MESSAGES.INFO.NO_INFO);
            }
        } else {
            // Supabaseが利用できない場合はフォールバックデータまたは「まだ情報はありません」を表示
            if (loadingEl) loadingEl.style.display = 'none';
            
            if (fallbackData && fallbackData.length > 0) {
                container.innerHTML = fallbackData.map(renderFunction).join('');
            } else {
                showNoDataMessage(container, CONFIG.MESSAGES.INFO.NO_INFO);
            }
        }
    } catch (error) {
        if (loadingEl) loadingEl.style.display = 'none';
        console.error('Error loading data:', error);
        showNoDataMessage(container, `データの読み込み中にエラーが発生しました。`);
    }
}

// データなしメッセージを表示
function showNoDataMessage(container, message = CONFIG.MESSAGES.INFO.NO_INFO) {
    if (container) {
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>${message}</h3>
                <p>新しい情報が追加されるまでお待ちください。</p>
            </div>
        `;
    }
}

// 成功メッセージを表示
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

// エラーメッセージを表示
function showErrorMessage(message) {
    showMessage(message, 'error');
}

// 情報メッセージを表示
function showInfoMessage(message) {
    showMessage(message, 'info');
}

// メッセージ表示の共通関数
function showMessage(message, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast message-${type}`;
    messageEl.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(messageEl);
    
    // アニメーション表示
    setTimeout(() => {
        messageEl.classList.add('show');
    }, 100);
    
    // 5秒後に自動で消す
    setTimeout(() => {
        messageEl.classList.remove('show');
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 300);
    }, 5000);
}

// 部活動データ読み込み
async function loadClubs() {
    const container = document.getElementById('clubs-container');
    if (!container) return;
    
    // フォールバックデータ（DB接続失敗時のみ使用）
    const fallbackClubs = [];
    
    const renderClub = (club) => `
        <div class="club-card" data-category="${club.category || ''}">
            ${club.image_url ? `<img src="${club.image_url}" alt="${club.name}" class="club-image">` : 
              `<div class="club-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`}
            <h3>${club.name}</h3>
            <p>${club.description}</p>
            ${club.members ? `<p class="club-members">部員数: ${club.members}名</p>` : ''}
            ${club.schedule ? `<p class="club-schedule">活動日: ${club.schedule}</p>` : ''}
        </div>
    `;
    
    await loadFromSupabase('clubs', container, renderClub, fallbackClubs);
}

// お知らせ読み込み
async function loadNews() {
    const newsContainer = document.querySelector('.news-container');
    if (!newsContainer) return;
    
    // 新しいNewsLoaderを使用
    if (typeof NewsLoader !== 'undefined') {
        const newsLoader = new NewsLoader();
        await newsLoader.init();
    } else {
        // フォールバック：エラーメッセージを表示
        newsContainer.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>読み込みエラー</h3>
                <p>ニュースローダーが読み込まれていません。ページを再読み込みしてください。</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i>
                    再読み込み
                </button>
            </div>
        `;
    }
}

function getNewsTypeLabel(type) {
    return CONFIG.CATEGORIES.NEWS[type] || 'お知らせ';
}

// なずなフォーラム初期化
async function initForum() {
    const submitBtn = document.getElementById('submit-post');
    const contentInput = document.getElementById('forum-content');
    const postsContainer = document.getElementById('posts-container');
    const loginBtn = document.getElementById('login-button');
    const logoutBtn = document.getElementById('logout-button');
    const navLoginBtn = document.getElementById('nav-login-button');
    const navLogoutBtn = document.getElementById('nav-logout-button');
    const chatPanel = document.getElementById('chat-panel');
    const chatMessages = document.getElementById('chat-messages');
    const chatSend = document.getElementById('chat-send');
    const chatText = document.getElementById('chat-text');
    const categorySelect = document.getElementById('post-category');
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('search-posts');
    const sortSelect = document.getElementById('sort-posts');
    const pagePrev = document.getElementById('page-prev');
    const pageNext = document.getElementById('page-next');
    const pageInfo = document.getElementById('page-info');
    const charCounter = document.getElementById('forum-char-counter');

    // フォーラム状態（検索・並び替え・ページング）
    window.forumState = window.forumState || {
        search: '',
        status: 'all',
        orderBy: 'created_at',
        orderDirection: 'desc',
        page: 1,
        pageSize: 10,
        totalPages: 1
    };
    
    const bindLogout = (el) => el && el.addEventListener('click', () => {
        localStorage.removeItem('nazuna-auth');
        updateAuthUI();
    });
    const bindLogin = (el) => el && el.addEventListener('click', openAuthModal);
    bindLogin(loginBtn);
    bindLogin(navLoginBtn);
    bindLogout(logoutBtn);
    bindLogout(navLogoutBtn);

    updateAuthUI();

    if (submitBtn && contentInput) {
        // 文字数カウンタ
        if (charCounter) {
            const updateCounter = () => {
                const max = contentInput.getAttribute('maxlength') ? parseInt(contentInput.getAttribute('maxlength')) : 1000;
                const len = contentInput.value.length;
                charCounter.textContent = `${len} / ${max}`;
            };
            contentInput.addEventListener('input', updateCounter);
            updateCounter();
        }

        submitBtn.addEventListener('click', function() {
            // 先に認証チェック：未ログインなら即モーダルへ
            const auth = getAuth();
            if (!auth) {
                openAuthModal();
                return;
            }

            const content = contentInput.value.trim();
            if (!content) {
                alert('投稿内容を入力してください');
                return;
            }
            const category = categorySelect ? categorySelect.value : 'general';
            
            // 投稿を送信
            submitBtn.disabled = true;
            submitBtn.textContent = '送信中...';
            
            // Supabaseに投稿を送信
            submitToSupabase(content, auth.student_number, category).then(success => {
                submitBtn.disabled = false;
                submitBtn.textContent = '投稿する';
                
                if (success) {
                    contentInput.value = '';
                    alert(CONFIG.MESSAGES.SUCCESS.POST_SUBMITTED);
                    loadPosts();
                    // 投稿後にチャットパネルを表示
                    if (chatPanel) {
                        chatPanel.style.display = '';
                        // 直近の投稿IDは取得していないため、簡易にリスト再取得後の最初のアイテムを対象にするなどの実装は将来拡張
                    }
                } else {
                    alert(CONFIG.MESSAGES.ERROR.SERVER);
                }
            });
        });
    }
    
    // ステータスフィルター
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            window.forumState.status = statusFilter.value || 'all';
            window.forumState.page = 1;
            loadPosts();
        });
    }
    // 検索
    if (searchInput) {
        let searchTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                window.forumState.search = searchInput.value.trim();
                window.forumState.page = 1;
                loadPosts();
            }, 300);
        });
    }

    // 並び替え
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const v = sortSelect.value;
            window.forumState.orderBy = 'created_at';
            window.forumState.orderDirection = v === 'created_at_asc' ? 'asc' : 'desc';
            window.forumState.page = 1;
            loadPosts();
        });
    }

    // ページング
    const updatePager = () => {
        if (!pageInfo) return;
        pageInfo.textContent = `${window.forumState.page} / ${window.forumState.totalPages}`;
        if (pagePrev) pagePrev.disabled = window.forumState.page <= 1;
        if (pageNext) pageNext.disabled = window.forumState.page >= window.forumState.totalPages;
    };
    if (pagePrev) {
        pagePrev.addEventListener('click', () => {
            if (window.forumState.page > 1) {
                window.forumState.page -= 1;
                loadPosts();
            }
        });
    }
    if (pageNext) {
        pageNext.addEventListener('click', () => {
            if (window.forumState.page < window.forumState.totalPages) {
                window.forumState.page += 1;
                loadPosts();
            }
        });
    }
    
    // 投稿一覧を読み込み
    loadPosts().then(updatePager);

    // チャット送信
    if (chatSend && chatText) {
        chatSend.addEventListener('click', async () => {
            const auth = getAuth();
            if (!auth) { openAuthModal(); return; }
            const message = chatText.value.trim();
            if (!message) return;
            try {
                // 簡易: 直近の投稿に紐づけて送る（将来はユーザーごとのスレッド化）
                const latest = await getLatestUserPostId(auth.student_number);
                if (!latest) { alert('まず投稿してください。'); return; }
                await supabaseQueries.sendChat({ post_id: latest, sender: auth.student_number, message, is_admin: false });
                chatText.value = '';
                await renderChat(latest);
            } catch (e) {
                console.error('Chat send error', e);
            }
        });
    }
}

// 投稿一覧読み込み
async function loadPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    const state = window.forumState || { search: '', status: 'all', orderBy: 'created_at', orderDirection: 'desc', page: 1, pageSize: 10 };
    
    // フォールバックデータ（DB接続失敗時のみ使用）
    const fallbackPosts = [];
    
    const renderPost = (post) => `
        <div class="post-item">
            <div class="post-header">
                <span>投稿ID: ${post.id}</span>
                <span>${formatDate(post.created_at)}</span>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <span class="post-status status-${post.status}">${getStatusLabel(post.status)}</span>
            ${post.reply ? `
                <div class="post-reply">
                    <strong>生徒会より:</strong>
                    <p>${escapeHtml(post.reply)}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    const options = {
        orderBy: state.orderBy,
        orderDirection: state.orderDirection,
        limit: state.pageSize,
        offset: (state.page - 1) * state.pageSize
    };
    if (state.status && state.status !== 'all') {
        options.filters = { status: state.status };
    }
    if (state.search) {
        options.search = state.search;
    }

    // データ取得
    if (supabaseQueries) {
        try {
            // リスト取得
            const { data, error } = await supabaseQueries.getTableData('posts', options);
            if (error) {
                showNoDataMessage(container, supabaseQueries.getErrorMessage(error, '投稿の読み込み'));
                return;
            }
            // 件数取得（HEADだと環境により失敗するため非HEADでcount取得）
            let countQuery = supabaseClient.from('posts').select('id', { count: 'exact' });
            if (state.status && state.status !== 'all') countQuery = countQuery.eq('status', state.status);
            if (state.search) countQuery = countQuery.ilike('content', `%${state.search}%`);
            countQuery = countQuery.limit(0);
            const { count } = await countQuery;
            const total = count || 0;
            window.forumState.totalPages = Math.max(1, Math.ceil(total / state.pageSize));

            if (data && data.length > 0) {
                container.innerHTML = data.map(renderPost).join('');
            } else {
                showNoDataMessage(container, CONFIG.MESSAGES.INFO.NO_INFO);
            }
        } catch (e) {
            console.error('Error loading posts:', e);
            showNoDataMessage(container, '投稿の読み込み中にエラーが発生しました。');
        }
    } else {
        // フォールバック
        container.innerHTML = fallbackPosts.map(renderPost).join('');
        window.forumState.totalPages = 1;
    }

    // ページャ表示更新
    const pageInfo = document.getElementById('page-info');
    const pagePrev = document.getElementById('page-prev');
    const pageNext = document.getElementById('page-next');
    if (pageInfo) {
        pageInfo.textContent = `${window.forumState.page} / ${window.forumState.totalPages}`;
    }
    if (pagePrev) pagePrev.disabled = window.forumState.page <= 1;
    if (pageNext) pageNext.disabled = window.forumState.page >= window.forumState.totalPages;
}

async function getLatestUserPostId(student_number) {
    try {
        if (!supabaseQueries) return null;
        const { data, error } = await supabaseClient
            .from('posts')
            .select('id')
            .eq('student_number', student_number)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) return null;
        return data?.id || null;
    } catch { return null; }
}

async function renderChat(post_id) {
    const chatPanel = document.getElementById('chat-panel');
    const chatMessages = document.getElementById('chat-messages');
    if (!chatPanel || !chatMessages) return;
    const { data, error } = await supabaseQueries.listChats(post_id, { limit: 200 });
    if (error) return;
    chatPanel.style.display = '';
    chatMessages.innerHTML = (data || []).map(m => `
        <div class="chat-message" style="margin:6px 0; ${m.is_admin ? 'text-align:right;' : ''}">
            <span class="bubble" style="display:inline-block; padding:8px 12px; border-radius:16px; background:${m.is_admin ? '#eef5ff' : '#f2f2f2'};">
                ${escapeHtml(m.message)}
            </span>
        </div>
    `).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Supabaseに投稿を送信（統一版）
async function submitToSupabase(content, student_number, category = 'general') {
    try {
        if (supabaseQueries) {
            const result = await supabaseQueries.createPost({ content, student_number, category });
            
            if (result.error) {
                console.error('Supabase insert error:', result.error);
                return false;
            }
            
            return true;
        } else {
            // Supabaseが利用できない場合はエラー
            console.error('Supabase is not available. Post submission failed.');
            showErrorMessage('投稿の送信に失敗しました。データベースに接続できません。');
            return false;
        }
    } catch (error) {
        console.error('Error submitting post:', error);
        return false;
    }
}

// 認証UI
function getAuth() {
    try {
        const raw = localStorage.getItem('nazuna-auth');
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.student_number) return null;
        return data;
    } catch {
        return null;
    }
}

function updateAuthUI() {
    const auth = getAuth();
    const loginBtn = document.getElementById('login-button');
    const logoutBtn = document.getElementById('logout-button');
    const navLoginBtn = document.getElementById('nav-login-button');
    const navLogoutBtn = document.getElementById('nav-logout-button');
    const submitBtn = document.getElementById('submit-post');
    if (auth) {
        loginBtn && (loginBtn.style.display = 'none');
        logoutBtn && (logoutBtn.style.display = 'inline-flex');
        navLoginBtn && (navLoginBtn.style.display = 'none');
        navLogoutBtn && (navLogoutBtn.style.display = 'inline-flex');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 投稿する';
        }
    } else {
        loginBtn && (loginBtn.style.display = 'inline-flex');
        logoutBtn && (logoutBtn.style.display = 'none');
        navLoginBtn && (navLoginBtn.style.display = 'inline-flex');
        navLogoutBtn && (navLogoutBtn.style.display = 'none');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ログイン';
        }
    }
}

function openAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    const closeBtn = document.getElementById('auth-modal-close');
    const stepNumber = document.getElementById('step-student-number');
    const stepRegister = document.getElementById('step-register');
    const stepConfirmName = document.getElementById('step-confirm-name');
    const stepLogin = document.getElementById('step-login');
    const err = document.getElementById('auth-error');
    const checkBtn = document.getElementById('check-student-number');
    const registerBtn = document.getElementById('register-student');
    const confirmNameBtn = document.getElementById('confirm-name-proceed');
    const loginBtn = document.getElementById('login-student');
    const numberInput = document.getElementById('student-number-input');
    const nameInput = document.getElementById('student-name-input');
    const passSetInput = document.getElementById('password-set-input');
    const passConfirmInput = document.getElementById('password-confirm-input');
    const passLoginInput = document.getElementById('password-login-input');
    const togglePassSet = document.getElementById('toggle-password-set');
    const togglePassConfirm = document.getElementById('toggle-password-confirm');
    const togglePassLogin = document.getElementById('toggle-password-login');

    if (!overlay) return;
    err.style.display = 'none';
    stepNumber.style.display = '';
    stepRegister.style.display = 'none';
    stepConfirmName.style.display = 'none';
    stepLogin.style.display = 'none';
    
    // フォームをリセット
    if (numberInput) numberInput.value = '';
    if (nameInput) nameInput.value = '';
    const nameDisplayDiv = document.getElementById('student-name-display');
    if (nameDisplayDiv) nameDisplayDiv.textContent = '';
    if (passSetInput) passSetInput.value = '';
    if (passConfirmInput) passConfirmInput.value = '';
    if (passLoginInput) passLoginInput.value = '';
    // 開く（アニメーション：まずopeningでレイアウト→次フレームでactive）
    overlay.classList.remove('closing');
    overlay.classList.add('opening');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        overlay.classList.remove('opening');
    });

    // 初期フォーカス
    setTimeout(() => numberInput?.focus(), 0);

    const closeModal = () => {
        // 閉じる（アニメーション）
        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.classList.remove('active');
            overlay.classList.remove('closing');
            document.body.style.overflow = '';
        }, 250);
        document.removeEventListener('keydown', onEscClose, true);
    };
    const onEscClose = (e) => {
        if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onEscClose, true);
    closeBtn.onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    // パスワード表示切替
    const bindToggle = (btn, input) => {
        if (!btn || !input) return;
        // 既存のイベントリスナーを削除（重複防止）
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isPw = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPw ? 'text' : 'password');
            const icon = newBtn.querySelector('i');
            if (icon) {
                icon.className = isPw ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        });
    };
    bindToggle(togglePassSet, passSetInput);
    bindToggle(togglePassConfirm, passConfirmInput);
    bindToggle(togglePassLogin, passLoginInput);

    const doCheck = async () => {
        const sn = numberInput.value.trim();
        if (!sn) { showAuthError('生徒番号を入力してください'); return; }
        if (!supabaseQueries) { showAuthError('Supabase未設定'); return; }
        err.style.display = 'none';
        
        const { data, error } = await supabaseQueries.getStudentByNumber(sn);
        if (error) { showAuthError('確認に失敗しました'); return; }
        
        if (!data) {
            // 登録されていない場合：エラーメッセージを表示
            showAuthError('登録されていません。生徒番号を確認してください。');
            return;
        }
        
        // 登録されている場合：名前確認ステップを表示
        stepNumber.style.display = 'none';
        stepConfirmName.style.display = '';
        document.getElementById('auth-modal-title').textContent = '名前確認';
        const nameDisplayDiv = document.getElementById('student-name-display');
        if (nameDisplayDiv) {
            nameDisplayDiv.textContent = data.name || '（名前が登録されていません）';
        }
        err.style.display = 'none';
        
        // 名前確認後の処理
        if (confirmNameBtn) {
            confirmNameBtn.onclick = () => {
                stepConfirmName.style.display = 'none';
                // パスワード未設定（null/空文字など）の場合は、パスワード設定に誘導
                if (!data.password_hash) {
                    document.getElementById('auth-modal-title').textContent = 'パスワード設定';
                    // 既存ユーザーのパスワード設定では氏名は編集不可にする
                    stepRegister.style.display = '';
                    if (nameInput) {
                        nameInput.value = data.name || '';
                        nameInput.setAttribute('readonly', 'true');
                        nameInput.style.backgroundColor = '#f5f5f5';
                        nameInput.style.cursor = 'not-allowed';
                    }
                    if (registerBtn) {
                        registerBtn.textContent = '設定してログイン';
                        // 既存ユーザーのパスワード更新に切り替え
                        registerBtn.onclick = async () => {
                            const pw = passSetInput.value;
                            const pwConfirm = passConfirmInput.value;
                            if (!pw || pw.length < 6) { showAuthError('6文字以上のパスワードを入力してください'); return; }
                            if (pw !== pwConfirm) { showAuthError('パスワードが一致しません'); return; }
                            const password_hash = await window.sha256(pw);
                            const { error: updErr } = await supabaseQueries.updateStudentPassword({
                                student_number: data.student_number,
                                password_hash
                            });
                            if (updErr) { showAuthError('パスワード設定に失敗しました'); return; }
                            localStorage.setItem('nazuna-auth', JSON.stringify({ student_number: data.student_number, name: data.name }));
                            closeModal();
                            updateAuthUI();
                        };
                    }
                } else {
                    // 通常ログイン
                    stepLogin.style.display = '';
                    document.getElementById('auth-modal-title').textContent = 'ログイン';
                    err.style.display = 'none';
                    setTimeout(() => passLoginInput?.focus(), 0);
                }
            };
        }
        
        // ログイン処理
        const doLogin = async () => {
            const pw = passLoginInput.value;
            if (!pw) { showAuthError('パスワードを入力してください'); return; }
            const hash = await window.sha256(pw);
            if (hash !== data.password_hash) { 
                showAuthError('認証に失敗しました'); 
                return; 
            }
            localStorage.setItem('nazuna-auth', JSON.stringify({ student_number: data.student_number, name: data.name }));
            closeModal();
            updateAuthUI();
        };
        if (loginBtn) {
            loginBtn.onclick = doLogin;
            passLoginInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
        }
    };
    
    // 初回登録処理（管理者による事前登録など、別ルートでの登録に使用可能）
    if (registerBtn && stepRegister) {
        registerBtn.onclick = async () => {
            const sn = numberInput.value.trim();
            const name = nameInput.value.trim();
            const pw = passSetInput.value;
            const pwConfirm = passConfirmInput.value;
            
            if (!sn) { showAuthError('生徒番号を入力してください'); return; }
            if (!name) { showAuthError('氏名を入力してください'); return; }
            if (!pw || pw.length < 6) { showAuthError('6文字以上のパスワードを入力してください'); return; }
            if (pw !== pwConfirm) { showAuthError('パスワードが一致しません'); return; }
            
            const password_hash = await window.sha256(pw);
            const { data: created, error: insErr } = await supabaseQueries.registerStudent({ 
                student_number: sn, 
                name, 
                password_hash 
            });
            
            if (insErr) { 
                showAuthError('登録に失敗しました: ' + (insErr.message || 'エラーが発生しました')); 
                return; 
            }
            
            localStorage.setItem('nazuna-auth', JSON.stringify({ student_number: sn, name }));
            closeModal();
            updateAuthUI();
        };
        
        // Enterキーでの登録
        if (passConfirmInput) {
            passConfirmInput.onkeydown = (e) => { 
                if (e.key === 'Enter' && registerBtn) registerBtn.click(); 
            };
        }
    }
    
    checkBtn.onclick = doCheck;
    numberInput.onkeydown = (e) => { if (e.key === 'Enter') doCheck(); };
}

function showAuthError(message) {
    const err = document.getElementById('auth-error');
    if (!err) return;
    err.style.display = 'block';
    err.textContent = message;
}

// PWA初期化
function initPWA() {
    console.log('Initializing PWA...');
    
    // PWAアップデーターとインストーラーは別ファイルで初期化されるため、
    // ここでは基本的なService Worker登録のみ行う
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registered successfully');
                
                // iOS向け通知許可の要求
                requestIOSNotificationPermission();
                
                return registration;
            })
            .catch(err => {
                console.error('ServiceWorker registration failed:', err);
            });
    } else {
        console.log('Service Worker not supported');
    }
}

// iOS向け通知許可要求
async function requestIOSNotificationPermission() {
    // iOSデバイスの検出
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS || isSafari) {
        console.log('iOS device detected, requesting notification permission...');
        
        // 通知がサポートされているかチェック
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    console.log('iOS notification permission granted');
                    showNotification('通知が有効になりました', '重要なお知らせをお届けします', 'success');
                    
                    // PWAインストール促進（iOS Safari用）
                    showIOSInstallPrompt();
                } else if (permission === 'denied') {
                    console.log('iOS notification permission denied');
                } else {
                    console.log('iOS notification permission default');
                }
            } catch (error) {
                console.error('Error requesting iOS notification permission:', error);
            }
        }
    }
}

// iOS向けインストール促進メッセージ
function showIOSInstallPrompt() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.navigator.standalone === true;
    
    if (isIOS && !isInStandaloneMode) {
        // PWAがまだインストールされていない場合のみ表示
        setTimeout(() => {
            const installPrompt = document.createElement('div');
            installPrompt.className = 'ios-install-prompt';
            installPrompt.innerHTML = `
                <div class="ios-install-content">
                    <div class="ios-install-icon">
                        <i class="fas fa-mobile-alt"></i>
                    </div>
                    <div class="ios-install-text">
                        <h4>アプリとしてインストール</h4>
                        <p>ホーム画面に追加して、アプリのように使用できます</p>
                        <div class="ios-install-steps">
                            <span><i class="fas fa-share"></i> 共有ボタン</span>
                            <span>→</span>
                            <span><i class="fas fa-plus-square"></i> ホーム画面に追加</span>
                        </div>
                    </div>
                    <button class="ios-install-close" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            document.body.appendChild(installPrompt);
            
            // 10秒後に自動で消す
            setTimeout(() => {
                if (installPrompt.parentElement) {
                    installPrompt.remove();
                }
            }, 10000);
        }, 3000);
    }
}

// ユーティリティ関数
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getStatusLabel(status) {
    return CONFIG.STATUS.POSTS[status] || status;
}

// ホームページ初期化
async function initHomePage() {
    try {
        await loadLatestNews();
        await loadLatestPosts();
        initPWAInstall();
        console.log('Home page initialization completed');
    } catch (error) {
        console.error('Error initializing home page:', error);
    }
}

// 最新ニュース読み込み
async function loadLatestNews() {
    const container = document.getElementById('latest-news');
    if (!container) return Promise.resolve();
    
    container.innerHTML = '<div class="loading">読み込み中...</div>';
    
    try {
        let latestNews = [];
        
        // Supabaseから最新のお知らせを取得
        if (window.supabaseQueries) {
            const { data, error } = await window.supabaseQueries.getNews({
                limit: 5,
                offset: 0,
                publishedOnly: true
            });
            
            if (error) {
                console.error('Error loading latest news:', error);
                throw error;
            }
            
            if (data && data.length > 0) {
                latestNews = data.map(item => ({
                    id: item.id,
                    title: item.title,
                    category: item.category || item.type || 'general',
                    date: item.date || item.created_at,
                    summary: item.summary || item.content?.substring(0, 100) || ''
                }));
            }
        }
        
        // データが無い場合またはSupabaseが利用できない場合
        if (latestNews.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <div class="no-data-icon">
                        <i class="fas fa-bell"></i>
                    </div>
                    <h3>まだお知らせがありません</h3>
                    <p>新しいお知らせが追加されるまでお待ちください。</p>
                </div>
            `;
            return;
        }
        
        // お知らせを表示
        container.innerHTML = latestNews.map(item => {
            const categoryLabel = getNewsTypeLabel(item.category);
            // 日付を簡潔に表示（時間は表示しない）
            const dateObj = new Date(item.date);
            const formattedDate = isNaN(dateObj.getTime()) 
                ? item.date 
                : `${dateObj.getFullYear()}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
            
            return `
                <div class="news-preview" data-news-id="${item.id}">
                    <span class="news-type ${item.category}">${escapeHtml(categoryLabel)}</span>
                    <h4><a href="news.html#${item.id}">${escapeHtml(item.title)}</a></h4>
                    ${item.summary ? `<p class="news-summary">${escapeHtml(item.summary)}${item.summary.length >= 100 ? '...' : ''}</p>` : ''}
                    <span class="news-date">${formattedDate}</span>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading latest news:', error);
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>読み込みエラー</h3>
                <p>お知らせの読み込みに失敗しました。</p>
            </div>
        `;
    }
}

// 最新投稿読み込み
async function loadLatestPosts() {
    const container = document.getElementById('latest-posts');
    if (!container) return Promise.resolve();
    
    container.innerHTML = '<div class="loading">読み込み中...</div>';
    
    try {
        let latestPosts = [];
        
        // Supabaseから最新の投稿を取得（承認済みのみ）
        if (window.supabaseQueries) {
            // RLSポリシーにより、一般ユーザーは承認済み投稿のみ閲覧可能
            // さらにフィルターとしてapproval_status='approved'も指定（二重チェック）
            const { data, error } = await window.supabaseQueries.getTableData('posts', {
                limit: 5,
                offset: 0,
                orderBy: 'created_at',
                orderDirection: 'desc',
                filters: {
                    approval_status: 'approved' // 承認済みのみ表示
                }
            });
            
            // approval_statusカラムが存在しない場合（古いデータベース）のフォールバック
            if (error || !data || data.length === 0) {
                // フィルターなしで再試行（RLSポリシーに任せる）
                const fallbackResult = await window.supabaseQueries.getTableData('posts', {
                    limit: 5,
                    offset: 0,
                    orderBy: 'created_at',
                    orderDirection: 'desc'
                });
                
                if (!fallbackResult.error && fallbackResult.data) {
                    latestPosts = fallbackResult.data;
                }
            } else {
                latestPosts = data;
            }
        }
        
        // データが無い場合またはSupabaseが利用できない場合
        if (latestPosts.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <div class="no-data-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3>まだ投稿がありません</h3>
                    <p>フォーラムに投稿してみましょう。</p>
                </div>
            `;
            return;
        }
        
        // 投稿を表示
        container.innerHTML = latestPosts.map(post => {
            if (!post.content) return ''; // contentが無い場合はスキップ
            
            const contentPreview = post.content.length > 100 
                ? post.content.substring(0, 100) + '...' 
                : post.content;
            
            // 日付を簡潔に表示（時間は表示しない）
            const dateObj = new Date(post.created_at);
            const formattedDate = isNaN(dateObj.getTime()) 
                ? post.created_at 
                : `${dateObj.getFullYear()}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
            
            // 承認済みの場合はステータスバッジを表示しない
            const statusBadge = (post.approval_status === 'approved' && (!post.status || post.status === 'resolved' || post.status === 'closed')) 
                ? '' 
                : `<span class="post-status status-${post.status || 'pending'}">${getStatusLabel(post.status || 'pending')}</span>`;
            
            return `
                <div class="post-preview" data-post-id="${post.id}">
                    <div class="post-header-mini">
                        <span class="post-date-mini">${formattedDate}</span>
                        ${statusBadge}
                    </div>
                    <p class="post-content-preview">${escapeHtml(contentPreview)}</p>
                    ${post.reply ? `
                        <div class="post-reply-mini">
                            <strong>返信:</strong> ${escapeHtml(post.reply.length > 50 ? post.reply.substring(0, 50) + '...' : post.reply)}
                        </div>
                    ` : ''}
                    <a href="forum.html#post-${post.id}" class="post-link">続きを読む <i class="fas fa-arrow-right"></i></a>
                </div>
            `;
        }).filter(html => html !== '').join(''); // 空のエントリを除外
        
    } catch (error) {
        console.error('Error loading latest posts:', error);
        container.innerHTML = `
            <div class="no-data-message">
                <div class="no-data-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>読み込みエラー</h3>
                <p>投稿の読み込みに失敗しました。</p>
            </div>
        `;
    }
}

// PWAインストール機能
function initPWAInstall() {
    const installBtn = document.getElementById('install-pwa');
    if (!installBtn) return;
    
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'inline-flex';
    });
    
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('PWA installed');
        }
        
        deferredPrompt = null;
        installBtn.style.display = 'none';
    });
}

// 部活動フィルター初期化
function initClubsFilter() {
    // 支持: ニュースと同じデザイン(.filter-tab)を優先、後方互換で.filter-btnも拾う
    const filterBtns = document.querySelectorAll('.clubs-filter .filter-tab, .clubs-filter .filter-btn');
    const clubCards = document.querySelectorAll('.club-card');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // アクティブ状態の切り替え
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            
            clubCards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// ニュースフィルター初期化
function initNewsFilter() {
    // NewsLoaderが初期化された後に実行されるため、
    // ここでは何もしない（NewsLoader内で処理される）
    console.log('News filter initialization delegated to NewsLoader');
}

// 月刊ぺんぺん草のダウンロードボタン初期化
function initNewsletterDownloads() {
    const container = document.querySelector('.newsletter-section');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn.btn-outline');
        if (!btn) return;
        // ダウンロード用のURLを data-download-url から取得
        const url = btn.getAttribute('data-download-url') || btn.href;
        if (!url || url === '#' || url.trim() === '') {
            // リンク未設定時は何もしない
            e.preventDefault();
            return;
        }
        e.preventDefault();
        window.open(url, '_blank', 'noopener');
    });
}

// 通知機能初期化
function initNotifications() {
    const enableBtn = document.getElementById('enable-notifications');
    const disableBtn = document.getElementById('disable-notifications');
    const statusEl = document.getElementById('notification-status');
    
    if (!enableBtn || !disableBtn || !statusEl) return;
    
    // 通知許可状態をチェック
    function checkNotificationStatus() {
        if (!('Notification' in window)) {
            statusEl.innerHTML = '<p><i class="fas fa-times-circle"></i> このブラウザは通知をサポートしていません</p>';
            enableBtn.style.display = 'none';
            return;
        }
        
        switch (Notification.permission) {
            case 'granted':
                statusEl.innerHTML = '<p><i class="fas fa-check-circle"></i> 通知が有効になっています</p>';
                enableBtn.style.display = 'none';
                disableBtn.style.display = 'inline-flex';
                break;
            case 'denied':
                statusEl.innerHTML = '<p><i class="fas fa-times-circle"></i> 通知が拒否されています</p>';
                enableBtn.style.display = 'none';
                break;
            default:
                statusEl.innerHTML = '<p><i class="fas fa-info-circle"></i> 通知を有効にしてお知らせを受け取りましょう</p>';
                enableBtn.style.display = 'inline-flex';
                disableBtn.style.display = 'none';
        }
    }
    
    enableBtn.addEventListener('click', async () => {
        const permission = await Notification.requestPermission();
        checkNotificationStatus();
        
        if (permission === 'granted') {
            new Notification(CONFIG.APP.NAME, {
                body: CONFIG.MESSAGES.SUCCESS.NOTIFICATION_ENABLED,
                icon: CONFIG.APP.NOTIFICATION_ICON
            });
        }
    });
    
    disableBtn.addEventListener('click', () => {
        // 通知を無効にする（実際にはブラウザ設定で行う）
        alert('通知を無効にするには、ブラウザの設定から行ってください。');
    });
    
    checkNotificationStatus();
}

// アンケート読み込み
async function loadSurveys() {
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

// アンケートフォーム初期化
function initSurveyForm() {
    const form = document.querySelector('.survey-content');
    const submitBtn = form?.querySelector('.btn-primary');
    
    if (!submitBtn) return;
    
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // 回答を収集
        const formData = new FormData();
        const inputs = form.querySelectorAll('input:checked, textarea');
        
        inputs.forEach(input => {
            if (input.type === 'radio' || input.type === 'checkbox') {
                formData.append(input.name, input.value);
            } else if (input.tagName === 'TEXTAREA' && input.value.trim()) {
                formData.append('comments', input.value.trim());
            }
        });
        
        // 送信処理（実際はGASに送信）
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
        
        setTimeout(() => {
            alert(CONFIG.MESSAGES.SUCCESS.SURVEY_SUBMITTED);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 回答を送信';
            
            // フォームをリセット
            inputs.forEach(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    input.checked = false;
                } else if (input.tagName === 'TEXTAREA') {
                    input.value = '';
                }
            });
        }, 2000);
    });
}

// デバッグ用関数をグローバルに公開
if (CONFIG.APP.DEBUG) {
    window.resetFirstVisit = resetFirstVisit;
    window.resetSession = resetSession;
    window.showOpeningScreen = showOpeningScreen;
    window.hideOpeningScreen = hideOpeningScreen;
    window.checkAndMarkSessionVisit = checkAndMarkSessionVisit;
    console.log('Debug functions available: resetFirstVisit(), resetSession(), showOpeningScreen(), hideOpeningScreen(), checkAndMarkSessionVisit()');
}

// ================== Loading Overlay Utility ===================
function showLoadingOverlay() {
    if (document.getElementById('loading-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
}
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
}
window.addEventListener('DOMContentLoaded', hideLoadingOverlay);