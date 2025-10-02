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
                
                if (data.success) {
                    // キャッシュに保存
                    if (options.useCache) {
                        this.cache.set(cacheKey, {
                            data: data,
                            timestamp: Date.now()
                        });
                    }
                    resolve(data);
                } else {
                    reject(new Error(data.error || CONFIG.MESSAGES.ERROR.SERVER));
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
    // オープニングスクリーンを表示
    showOpeningScreen();
    
    // メイン初期化を遅延実行
    setTimeout(async () => {
        // Supabaseを初期化
        const supabaseInitialized = initializeSupabase();
        
        initNavigation();
        initSidebar();
        initPWA();
        
        // ページ別の初期化
        const currentPage = getCurrentPage();
        
        if (supabaseInitialized) {
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
                    initNotifications();
                    break;
                case 'survey':
                    await loadSurveys();
                    initSurveyForm();
                    break;
            }
        } else {
            // Supabase初期化失敗時はフォールバック
            console.warn('Supabase initialization failed, using fallback data');
            initFallbackMode(currentPage);
        }
        
        // オープニングスクリーンを非表示
        hideOpeningScreen();
    }, 2500);
});

// 現在のページを取得
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename.replace('.html', '') || 'index';
}

// オープニングスクリーン表示
function showOpeningScreen() {
    const openingScreen = document.getElementById('opening-screen');
    if (openingScreen) {
        openingScreen.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// オープニングスクリーン非表示
function hideOpeningScreen() {
    const openingScreen = document.getElementById('opening-screen');
    if (openingScreen) {
        openingScreen.classList.add('fade-out');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            openingScreen.style.display = 'none';
        }, 1000);
    }
}

// サイドバー初期化
function initSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const body = document.body;
    
    // メニュートグルボタンのクリックイベント
    menuToggle?.addEventListener('click', () => {
        toggleSidebar();
    });
    
    // オーバーレイのクリックイベント
    overlay?.addEventListener('click', () => {
        closeSidebar();
    });
    
    // ESCキーでサイドバーを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar?.classList.contains('open')) {
            closeSidebar();
        }
    });
    
    // サイドバー内のリンククリック時に閉じる
    sidebar?.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            // モバイルでのみ閉じる
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

// サイドバーをトグル
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const body = document.body;
    
    if (sidebar?.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// サイドバーを開く
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const body = document.body;
    
    sidebar?.classList.add('open');
    overlay?.classList.add('show');
    
    // デスクトップではメインコンテンツをシフト
    if (window.innerWidth > 768) {
        body.classList.add('sidebar-open');
    }
}

// サイドバーを閉じる
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const body = document.body;
    
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
    body.classList.remove('sidebar-open');
}

// ナビゲーション初期化（旧システムとの互換性のため保持）
function initNavigation() {
    // ページ内リンクのスムーススクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                closeSidebar();
            }
        });
    });
    
    // アクティブリンクの設定
    setActiveNavLink();
}

// アクティブリンクを設定
function setActiveNavLink() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href) {
            const linkPage = href.replace('.html', '').replace('index', '') || 'index';
            if (linkPage === currentPage || (currentPage === 'index' && href === 'index.html')) {
                link.classList.add('active');
            }
        }
    });
}

// ウィンドウリサイズ時の処理
window.addEventListener('resize', () => {
    const body = document.body;
    const sidebar = document.getElementById('sidebar');
    
    // モバイルからデスクトップに切り替わった時の処理
    if (window.innerWidth > 768 && sidebar?.classList.contains('open')) {
        body.classList.add('sidebar-open');
    } else if (window.innerWidth <= 768) {
        body.classList.remove('sidebar-open');
    }
});

// 生徒会メンバー読み込み（Supabaseから動的取得）
async function loadCouncilMembers() {
    const container = document.querySelector('.council-members');
    if (!container) return;
    
    // ローディング表示
    showLoadingState(container, 'メンバー情報を読み込み中...');
    
    try {
        const members = await dbHelper.getCouncilMembers();
        
        if (members && members.length > 0) {
            container.innerHTML = members.map(member => `
                <div class="member-card">
                    <div class="member-image" style="
                        background: ${member.image_url ? `url(${member.image_url})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
                        height: 150px; 
                        border-radius: 50%; 
                        width: 150px; 
                        margin: 0 auto 1rem;
                        background-size: cover;
                        background-position: center;
                    "></div>
                    <h3>${escapeHtml(member.name)}</h3>
                    <p class="member-role">${escapeHtml(member.role)}</p>
                    <p class="member-message">"${escapeHtml(member.message || '頑張ります！')}"</p>
                </div>
            `).join('');
        } else {
            showEmptyState(container, {
                icon: 'fas fa-users',
                title: '生徒会メンバー情報がありません',
                message: 'まだメンバー情報が登録されていません。',
                actionText: 'お知らせをチェック',
                actionLink: 'news.html'
            });
        }
    } catch (error) {
        console.error('Error loading council members:', error);
        showErrorState(container, {
            title: 'メンバー情報の読み込みに失敗しました',
            message: 'ネットワーク接続を確認してページを再読み込みしてください。',
            actionText: '再読み込み',
            actionCallback: () => location.reload()
        });
    }
}

// 部活動データ読み込み（Supabaseから動的取得）
async function loadClubs() {
    const loadingEl = document.getElementById('clubs-loading');
    const container = document.getElementById('clubs-container');
    
    if (!container) return;
    
    // ローディング表示
    if (loadingEl) loadingEl.style.display = 'block';
    showLoadingState(container, '部活動情報を読み込み中...');
    
    try {
        const clubs = await dbHelper.getClubs();
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (clubs && clubs.length > 0) {
            container.innerHTML = clubs.map(club => `
                <div class="club-card" data-category="${club.category || 'other'}">
                    ${club.image_url ? 
                        `<img src="${club.image_url}" alt="${escapeHtml(club.name)}" class="club-image">` : 
                        `<div class="club-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`
                    }
                    <h3>${escapeHtml(club.name)}</h3>
                    <p>${escapeHtml(club.description)}</p>
                    ${club.members ? `<p class="club-members"><i class="fas fa-users"></i> 部員数: ${club.members}名</p>` : ''}
                    ${club.schedule ? `<p class="club-schedule"><i class="fas fa-calendar"></i> 活動日: ${escapeHtml(club.schedule)}</p>` : ''}
                    ${club.contact ? `<p class="club-contact"><i class="fas fa-envelope"></i> 連絡先: ${escapeHtml(club.contact)}</p>` : ''}
                </div>
            `).join('');
        } else {
            showEmptyState(container, {
                icon: 'fas fa-futbol',
                title: '部活動情報がありません',
                message: 'まだ部活動情報が登録されていません。新しい部活動の情報をお待ちください。',
                actionText: '生徒会に問い合わせ',
                actionLink: 'forum.html'
            });
        }
    } catch (error) {
        console.error('Error loading clubs:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        
        showErrorState(container, {
            title: '部活動情報の読み込みに失敗しました',
            message: 'ネットワーク接続を確認してページを再読み込みしてください。',
            actionText: '再読み込み',
            actionCallback: () => location.reload()
        });
    }
}

// お知らせ読み込み（Supabaseから動的取得）
async function loadNews() {
    const newsContainer = document.querySelector('.news-container');
    if (!newsContainer) return;
    
    // ローディング表示
    showLoadingState(newsContainer, 'お知らせを読み込み中...');
    
    try {
        const newsItems = await dbHelper.getNews({ limit: 10 });
        
        if (newsItems && newsItems.length > 0) {
            newsContainer.innerHTML = `
                <div class="news-list">
                    ${newsItems.map(item => `
                        <div class="news-item" data-category="${item.type || 'general'}">
                            <div class="news-date">${formatDate(item.date || item.created_at)}</div>
                            <div class="news-content">
                                <h3>${escapeHtml(item.title)}</h3>
                                <p>${escapeHtml(item.content)}</p>
                            </div>
                            <span class="news-type ${item.type || 'general'}">${getNewsTypeLabel(item.type)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            showEmptyState(newsContainer, {
                icon: 'fas fa-newspaper',
                title: 'お知らせがありません',
                message: 'まだお知らせが投稿されていません。新しい情報をお待ちください。',
                actionText: 'フォーラムをチェック',
                actionLink: 'forum.html'
            });
        }
    } catch (error) {
        console.error('Error loading news:', error);
        showErrorState(newsContainer, {
            title: 'お知らせの読み込みに失敗しました',
            message: 'ネットワーク接続を確認してページを再読み込みしてください。',
            actionText: '再読み込み',
            actionCallback: () => location.reload()
        });
    }
}

function getNewsTypeLabel(type) {
    const labels = {
        event: 'イベント',
        newsletter: 'だより',
        recruitment: '募集',
        important: '重要',
        general: 'お知らせ'
    };
    return labels[type] || 'お知らせ';
}

// なずなフォーラム初期化
function initForum() {
    const submitBtn = document.getElementById('submit-post');
    const contentInput = document.getElementById('forum-content');
    const postsContainer = document.getElementById('posts-container');
    
    if (submitBtn && contentInput) {
        submitBtn.addEventListener('click', function() {
            const content = contentInput.value.trim();
            
            if (!content) {
                alert('投稿内容を入力してください');
                return;
            }
            
            // 投稿を送信
            submitBtn.disabled = true;
            submitBtn.textContent = '送信中...';
            
            sendJsonpRequest(CONFIG.API.SUBMIT_POST, { content: content }, function(data) {
                submitBtn.disabled = false;
                submitBtn.textContent = '投稿する';
                
                if (data.success) {
                    contentInput.value = '';
                    alert(CONFIG.MESSAGES.SUCCESS.POST_SUBMITTED + '\n投稿ID: ' + data.postId);
                    loadPosts();
                } else {
                    alert(data.error || CONFIG.MESSAGES.ERROR.SERVER);
                }
            });
        });
    }
    
    // 投稿一覧を読み込み
    loadPosts();
}

// 投稿一覧読み込み
function loadPosts() {
    const container = document.getElementById('posts-container');
    
    sendJsonpRequest(CONFIG.API.GET_POSTS, {}, function(data) {
        if (data.success && container) {
            container.innerHTML = data.posts.map(post => `
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
            `).join('');
        } else if (container) {
            // デモデータ
            container.innerHTML = `
                <div class="post-item">
                    <div class="post-header">
                        <span>投稿ID: DEMO001</span>
                        <span>2024/01/15 14:30</span>
                    </div>
                    <div class="post-content">図書室の開館時間を延長してほしいです。</div>
                    <span class="post-status status-resolved">対応済み</span>
                    <div class="post-reply">
                        <strong>生徒会より:</strong>
                        <p>ご意見ありがとうございます。来月より試験期間中は19時まで延長することが決定しました。</p>
                    </div>
                </div>
            `;
        }
    });
}

// PWA初期化
function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('ServiceWorker registered'))
            .catch(err => console.log('ServiceWorker registration failed'));
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
    const labels = {
        pending: '確認中',
        approved: '承認済み',
        resolved: '対応済み',
        rejected: '却下'
    };
    return labels[status] || status;
}

// ローディング状態を表示
function showLoadingState(container, message = CONFIG.MESSAGES.INFO.LOADING) {
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

// 空の状態を表示
function showEmptyState(container, options = {}) {
    const {
        icon = 'fas fa-inbox',
        title = CONFIG.MESSAGES.INFO.NO_ITEMS,
        message = CONFIG.MESSAGES.INFO.EMPTY_STATE,
        actionText = null,
        actionLink = null,
        actionCallback = null
    } = options;
    
    const actionButton = actionText ? `
        <button class="btn btn-primary empty-action" 
                ${actionLink ? `onclick="location.href='${actionLink}'"` : ''}
                ${actionCallback ? `onclick="(${actionCallback.toString()})()"` : ''}>
            ${actionText}
        </button>
    ` : '';
    
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <i class="${icon}"></i>
            </div>
            <h3 class="empty-title">${title}</h3>
            <p class="empty-message">${message}</p>
            ${actionButton}
        </div>
    `;
}

// エラー状態を表示
function showErrorState(container, options = {}) {
    const {
        title = CONFIG.MESSAGES.ERROR.LOADING_FAILED,
        message = CONFIG.MESSAGES.ERROR.NETWORK,
        actionText = '再読み込み',
        actionCallback = () => location.reload()
    } = options;
    
    container.innerHTML = `
        <div class="error-state">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="error-title">${title}</h3>
            <p class="error-message">${message}</p>
            <button class="btn btn-secondary error-action" onclick="(${actionCallback.toString()})()">
                <i class="fas fa-redo"></i>
                ${actionText}
            </button>
        </div>
    `;
}

// フォールバックモード初期化
function initFallbackMode(currentPage) {
    console.log('Initializing fallback mode for:', currentPage);
    
    // 各ページに対してフォールバックデータを表示
    switch(currentPage) {
        case 'index':
            showFallbackHomePage();
            break;
        case 'council':
            showFallbackCouncilPage();
            break;
        case 'clubs':
            showFallbackClubsPage();
            break;
        case 'forum':
            showFallbackForumPage();
            break;
        case 'news':
            showFallbackNewsPage();
            break;
        case 'survey':
            showFallbackSurveyPage();
            break;
    }
}

// フォールバックホームページ
function showFallbackHomePage() {
    const latestNewsContainer = document.getElementById('latest-news');
    const latestPostsContainer = document.getElementById('latest-posts');
    
    if (latestNewsContainer) {
        showEmptyState(latestNewsContainer, {
            icon: 'fas fa-database',
            title: 'データベースに接続できません',
            message: 'Supabaseの設定を確認してください。'
        });
    }
    
    if (latestPostsContainer) {
        showEmptyState(latestPostsContainer, {
            icon: 'fas fa-database',
            title: 'データベースに接続できません',
            message: 'Supabaseの設定を確認してください。'
        });
    }
}

// 他のフォールバック関数も同様に実装...
function showFallbackCouncilPage() {
    const container = document.querySelector('.council-members');
    if (container) {
        showEmptyState(container, {
            icon: 'fas fa-database',
            title: 'データベースに接続できません',
            message: 'Supabaseの設定を確認してください。'
        });
    }
}

function showFallbackClubsPage() {
    const container = document.getElementById('clubs-container');
    if (container) {
        showEmptyState(container, {
            icon: 'fas fa-database',
            title: 'データベースに接続できません',
            message: 'Supabaseの設定を確認してください。'
        });
    }
}

function showFallbackForumPage() {
    const container = document.getElementById('posts-container');
    if (container) {
        showEmptyState(container, {
            icon: 'fas fa-database',
            title: 'データベースに接続できません',
            message: 'Supabaseの設定を確認してください。'
        });
    }
}

function showFallbackNewsPage() {
    const container = document.querySelector('.news-container');
    if (container) {
        showEmptyState(container, {
            icon: 'fas fa-database',
            title: 'データベースに接続できません',
            message: 'Supabaseの設定を確認してください。'
        });
    }
}

function showFallbackSurveyPage() {
    const container = document.getElementById('active-surveys');
    if (container) {
        showEmptyState(container, {
            icon: 'fas fa-database',
            title: 'データベースに接続できません',
            message: 'Supabaseの設定を確認してください。'
        });
    }
}

// ホームページ初期化
async function initHomePage() {
    await loadLatestNews();
    await loadLatestPosts();
    initPWAInstall();
    initScrollAnimations();
}

// スクロールアニメーション初期化
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // アニメーション対象要素を初期化
    const animatedElements = document.querySelectorAll('.feature-card, .update-card, .club-card, .post-item');
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
}

// 最新ニュース読み込み（Supabaseから動的取得）
async function loadLatestNews() {
    const container = document.getElementById('latest-news');
    if (!container) return;
    
    try {
        const latestNews = await dbHelper.getNews({ limit: 3 });
        
        if (latestNews && latestNews.length > 0) {
            container.innerHTML = latestNews.map(item => `
                <div class="news-preview">
                    <span class="news-type ${item.type || 'general'}">${getNewsTypeLabel(item.type)}</span>
                    <h4>${escapeHtml(item.title)}</h4>
                    <span class="news-date">${formatDate(item.date || item.created_at)}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-newspaper"></i>
                    <p>まだお知らせがありません</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading latest news:', error);
        container.innerHTML = `
            <div class="error-state-small">
                <i class="fas fa-exclamation-triangle"></i>
                <p>読み込みに失敗しました</p>
            </div>
        `;
    }
}

// 最新投稿読み込み（Supabaseから動的取得）
async function loadLatestPosts() {
    const container = document.getElementById('latest-posts');
    if (!container) return;
    
    try {
        const latestPosts = await dbHelper.getPosts({ 
            limit: 3,
            filters: [{ method: 'neq', args: ['status', 'rejected'] }]
        });
        
        if (latestPosts && latestPosts.length > 0) {
            container.innerHTML = latestPosts.map(post => `
                <div class="post-preview">
                    <p>${escapeHtml(post.content.substring(0, 100))}${post.content.length > 100 ? '...' : ''}</p>
                    <span class="post-status status-${post.status}">${getStatusLabel(post.status)}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-comments"></i>
                    <p>まだ投稿がありません</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading latest posts:', error);
        container.innerHTML = `
            <div class="error-state-small">
                <i class="fas fa-exclamation-triangle"></i>
                <p>読み込みに失敗しました</p>
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
    const filterBtns = document.querySelectorAll('.filter-btn');
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
    const filterBtns = document.querySelectorAll('.filter-btn');
    const newsItems = document.querySelectorAll('.news-item');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // アクティブ状態の切り替え
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            
            newsItems.forEach(item => {
                if (category === 'all' || item.dataset.category === category) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
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
function loadSurveys() {
    const container = document.getElementById('active-surveys');
    if (!container) return;
    
    // デモデータ
    container.innerHTML = `
        <div class="survey-preview">
            <h3>文化祭の企画について</h3>
            <p>締切: 2024年2月15日</p>
            <a href="#sample-survey" class="btn btn-primary">回答する</a>
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