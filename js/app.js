// Supabaseクライアント
let supabaseClient = null;

// Supabaseクライアントを初期化
function initSupabase() {
    if (typeof supabase !== 'undefined' && 
        CONFIG.SUPABASE.URL && 
        CONFIG.SUPABASE.ANON_KEY &&
        CONFIG.SUPABASE.URL !== 'YOUR_SUPABASE_URL_HERE' &&
        CONFIG.SUPABASE.ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
        
        try {
            supabaseClient = supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);
            console.log('Supabase client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            supabaseClient = null;
        }
    } else {
        console.warn('Supabase not available or not configured properly');
        console.log('Using demo mode with fallback data');
        supabaseClient = null;
    }
}

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
    console.log('DOM loaded, initializing...');
    
    // 初回アクセスかチェックしてオープニング画面を表示
    const isFirstVisit = checkAndMarkFirstVisit();
    if (isFirstVisit) {
        console.log('First visit detected, showing opening screen');
        showOpeningScreen();
    }
    
    // Supabaseを初期化
    initSupabase();
    
    // 基本機能を初期化
    initNavigation();
    initSidebar();
    initPWA();
    
    // ページ別の初期化
    const currentPage = getCurrentPage();
    console.log('Current page:', currentPage);
    
    // 最小2秒間はオープニング画面を表示
    const startTime = Date.now();
    const minDisplayTime = 2000; // 2秒
    
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
        
        // 初回アクセスの場合のみオープニング画面を隠す
        if (isFirstVisit) {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(minDisplayTime - elapsedTime, 0);
            
            console.log(`Elapsed time: ${elapsedTime}ms, remaining time: ${remainingTime}ms`);
            
            setTimeout(() => {
                console.log('Hiding opening screen...');
                hideOpeningScreen();
            }, remainingTime);
        }
    };
    
    // コンテンツの初期化を開始
    initializeContent();
    
    // フォールバック：初回アクセスの場合のみ5秒後に強制的にオープニング画面を閉じる
    if (isFirstVisit) {
        setTimeout(() => {
            const openingScreen = document.getElementById('opening-screen');
            if (openingScreen) {
                console.log('Force hiding opening screen after 5 seconds');
                hideOpeningScreen();
            }
        }, 5000);
    }
});

// 初回アクセスかチェックして記録
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
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger?.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
    
    // ページ内リンクのスムーススクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                navMenu?.classList.remove('active');
            }
        });
    });
    
    // メニューの外側をクリックしたら閉じる
    document.addEventListener('click', (e) => {
        if (navMenu?.classList.contains('active') && 
            !navMenu.contains(e.target) && 
            !hamburger?.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });
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
            e.preventDefault(); // デフォルトのリンク動作を防ぐ
            const href = link.getAttribute('href');
            
            // サイドバーを閉じる
            closeSidebar();
            
            // 少し遅延してから画面遷移（アニメーションのため）
            setTimeout(() => {
                window.location.href = href;
            }, 300); // サイドバーのアニメーション時間と同じ
        });
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
    
    hamburger?.classList.toggle('active');
    sidebar?.classList.toggle('active');
    overlay?.classList.toggle('active');
    
    // ボディのスクロールを制御
    if (sidebar?.classList.contains('active')) {
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
    document.body.style.overflow = '';
}

// オープニング画面を表示
function showOpeningScreen() {
    console.log('Showing opening screen...');
    
    // 既存のオープニング画面があれば削除
    const existing = document.getElementById('opening-screen');
    if (existing) {
        existing.remove();
    }
    
    const openingHTML = `
        <div class="opening-screen" id="opening-screen">
            <div class="opening-logo">
                <i class="fas fa-users"></i>
            </div>
            <h1 class="opening-title">生徒会ポータル</h1>
            <p class="opening-subtitle">みんなでつくる学校生活</p>
            <div class="opening-loader"></div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', openingHTML);
    console.log('Opening screen added to DOM');
    
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
        
        setTimeout(() => {
            if (openingScreen.parentNode) {
                openingScreen.remove();
                console.log('Opening screen removed from DOM');
            }
        }, 500);
    } else {
        console.log('Opening screen not found in DOM');
    }
}

// 生徒会メンバー読み込み
async function loadCouncilMembers() {
    const members = [
        { name: '会長 山田太郎', role: '全体統括', image: 'images/member1.jpg', message: '皆さんの声を大切にします！' },
        { name: '副会長 田中花子', role: '企画運営', image: 'images/member2.jpg', message: 'イベント企画頑張ります！' },
        { name: '書記 鈴木一郎', role: '議事録作成', image: 'images/member3.jpg', message: '透明性のある活動を目指します' },
        { name: '会計 佐藤美咲', role: '予算管理', image: 'images/member4.jpg', message: '予算を有効活用します' }
    ];
    
    const container = document.querySelector('.council-members');
    if (container) {
        container.innerHTML = members.map(member => `
            <div class="member-card">
                <div class="member-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 150px; border-radius: 50%; width: 150px; margin: 0 auto 1rem;"></div>
                <h3>${member.name}</h3>
                <p class="member-role">${member.role}</p>
                <p class="member-message">"${member.message}"</p>
            </div>
        `).join('');
    }
}

// Supabaseからデータを読み込む汎用関数
async function loadFromSupabase(table, container, renderFunction, fallbackData = null) {
    const loadingEl = document.getElementById(`${table}-loading`);
    
    if (loadingEl) loadingEl.style.display = 'block';
    
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from(table)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (loadingEl) loadingEl.style.display = 'none';
            
            if (error) {
                console.error('Supabase error:', error);
                showNoDataMessage(container, `${table}の読み込み中にエラーが発生しました。`);
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

// 部活動データ読み込み
async function loadClubs() {
    const container = document.getElementById('clubs-container');
    if (!container) return;
    
    // フォールバックデータ
    const demoClubs = [
        { name: 'サッカー部', description: '全国大会を目指して日々練習に励んでいます', members: 45, schedule: '月・水・金' },
        { name: '吹奏楽部', description: '美しいハーモニーを奏でることを目標に活動中', members: 32, schedule: '火・木・土' },
        { name: '美術部', description: '個性豊かな作品制作を通じて表現力を磨いています', members: 18, schedule: '月・木' },
        { name: '科学部', description: '実験や研究を通じて科学の楽しさを追求', members: 24, schedule: '水・金' }
    ];
    
    const renderClub = (club) => `
        <div class="club-card">
            ${club.image_url ? `<img src="${club.image_url}" alt="${club.name}" class="club-image">` : 
              `<div class="club-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`}
            <h3>${club.name}</h3>
            <p>${club.description}</p>
            ${club.members ? `<p class="club-members">部員数: ${club.members}名</p>` : ''}
            ${club.schedule ? `<p class="club-schedule">活動日: ${club.schedule}</p>` : ''}
        </div>
    `;
    
    await loadFromSupabase('clubs', container, renderClub, demoClubs);
}

// お知らせ読み込み
async function loadNews() {
    const newsContainer = document.querySelector('.news-container');
    if (!newsContainer) return;
    
    // フォールバックデータ
    const demoNews = [
        { date: '2024/01/15', title: '体育祭のお知らせ', content: '来月20日に体育祭を開催します。詳細は後日配布します。', type: 'event' },
        { date: '2024/01/10', title: '生徒会だより1月号', content: '今月の活動報告と来月の予定をまとめました。', type: 'newsletter' },
        { date: '2024/01/05', title: '文化祭実行委員募集', content: '文化祭の企画・運営に参加してくれる生徒を募集しています。', type: 'recruitment' }
    ];
    
    const renderNews = (item) => `
        <div class="news-item">
            <div class="news-date">${formatDate(item.date || item.created_at)}</div>
            <div class="news-content">
                <h3>${item.title}</h3>
                <p>${item.content}</p>
            </div>
            <span class="news-type ${item.type}">${getNewsTypeLabel(item.type)}</span>
        </div>
    `;
    
    // ラッパーdivを作成
    const wrapper = document.createElement('div');
    wrapper.className = 'news-list';
    newsContainer.appendChild(wrapper);
    
    await loadFromSupabase('news', wrapper, renderNews, demoNews);
}

function getNewsTypeLabel(type) {
    return CONFIG.CATEGORIES.NEWS[type] || 'お知らせ';
}

// なずなフォーラム初期化
async function initForum() {
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
            
            // Supabaseに投稿を送信
            submitToSupabase(content).then(success => {
                submitBtn.disabled = false;
                submitBtn.textContent = '投稿する';
                
                if (success) {
                    contentInput.value = '';
                    alert(CONFIG.MESSAGES.SUCCESS.POST_SUBMITTED);
                    loadPosts();
                } else {
                    alert(CONFIG.MESSAGES.ERROR.SERVER);
                }
            });
        });
    }
    
    // 投稿一覧を読み込み
    loadPosts();
}

// 投稿一覧読み込み
async function loadPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    
    // フォールバックデータ
    const demoPosts = [
        {
            id: 'DEMO001',
            content: '図書室の開館時間を延長してほしいです。',
            status: 'resolved',
            created_at: '2024/01/15 14:30',
            reply: 'ご意見ありがとうございます。来月より試験期間中は19時まで延長することが決定しました。'
        }
    ];
    
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
    
    await loadFromSupabase('forum_posts', container, renderPost, demoPosts);
}

// Supabaseに投稿を送信
async function submitToSupabase(content) {
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('forum_posts')
                .insert([{ content: content }]);
            
            if (error) {
                console.error('Supabase insert error:', error);
                return false;
            }
            
            return true;
        } else {
            // Supabaseが利用できない場合はデモとして成功を返す
            console.log('Demo mode: Post submitted:', content);
            return true;
        }
    } catch (error) {
        console.error('Error submitting post:', error);
        return false;
    }
}

// PWA初期化
function initPWA() {
    console.log('Initializing PWA...');
    
    // PWAアップデーターとインストーラーは別ファイルで初期化されるため、
    // ここでは基本的なService Worker登録のみ行う
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered successfully');
                return registration;
            })
            .catch(err => {
                console.error('ServiceWorker registration failed:', err);
            });
    } else {
        console.log('Service Worker not supported');
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
    
    // デモデータ（実際はGASから取得）
    const latestNews = [
        { date: '2024/01/15', title: '体育祭のお知らせ', type: 'event' },
        { date: '2024/01/10', title: '生徒会だより1月号', type: 'newsletter' }
    ];
    
    container.innerHTML = latestNews.map(item => `
        <div class="news-preview">
            <span class="news-type ${item.type}">${getNewsTypeLabel(item.type)}</span>
            <h4>${item.title}</h4>
            <span class="news-date">${item.date}</span>
        </div>
    `).join('');
}

// 最新投稿読み込み
async function loadLatestPosts() {
    const container = document.getElementById('latest-posts');
    if (!container) return Promise.resolve();
    
    container.innerHTML = `
        <div class="post-preview">
            <p>図書室の開館時間を延長してほしいです。</p>
            <span class="post-status status-resolved">対応済み</span>
        </div>
        <div class="post-preview">
            <p>体育祭の種目について提案があります。</p>
            <span class="post-status status-pending">確認中</span>
        </div>
    `;
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
async function loadSurveys() {
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

// デバッグ用関数をグローバルに公開
if (CONFIG.APP.DEBUG) {
    window.resetFirstVisit = resetFirstVisit;
    window.showOpeningScreen = showOpeningScreen;
    window.hideOpeningScreen = hideOpeningScreen;
    console.log('Debug functions available: resetFirstVisit(), showOpeningScreen(), hideOpeningScreen()');
}