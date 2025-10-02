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
    initNavigation();
    initPWA();
    
    // ページ別の初期化
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index':
            initHomePage();
            break;
        case 'council':
            loadCouncilMembers();
            break;
        case 'clubs':
            loadClubs();
            initClubsFilter();
            break;
        case 'forum':
            initForum();
            break;
        case 'news':
            loadNews();
            initNewsFilter();
            initNotifications();
            break;
        case 'survey':
            loadSurveys();
            initSurveyForm();
            break;
    }
});

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

// 生徒会メンバー読み込み
function loadCouncilMembers() {
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

// 部活動データ読み込み
function loadClubs() {
    const loadingEl = document.getElementById('clubs-loading');
    const container = document.getElementById('clubs-container');
    
    if (loadingEl) loadingEl.style.display = 'block';
    
    sendJsonpRequest(CONFIG.API.GET_CLUBS, {}, function(data) {
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (data.success && container) {
            container.innerHTML = data.clubs.map(club => `
                <div class="club-card">
                    ${club.image_url ? `<img src="${club.image_url}" alt="${club.name}" class="club-image">` : 
                      `<div class="club-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`}
                    <h3>${club.name}</h3>
                    <p>${club.description}</p>
                    ${club.members ? `<p class="club-members">部員数: ${club.members}名</p>` : ''}
                    ${club.schedule ? `<p class="club-schedule">活動日: ${club.schedule}</p>` : ''}
                </div>
            `).join('');
        } else {
            // デモデータを表示
            const demoClubs = [
                { name: 'サッカー部', description: '全国大会を目指して日々練習に励んでいます', members: 45, schedule: '月・水・金' },
                { name: '吹奏楽部', description: '美しいハーモニーを奏でることを目標に活動中', members: 32, schedule: '火・木・土' },
                { name: '美術部', description: '個性豊かな作品制作を通じて表現力を磨いています', members: 18, schedule: '月・木' },
                { name: '科学部', description: '実験や研究を通じて科学の楽しさを追求', members: 24, schedule: '水・金' }
            ];
            
            if (container) {
                container.innerHTML = demoClubs.map(club => `
                    <div class="club-card">
                        <div class="club-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
                        <h3>${club.name}</h3>
                        <p>${club.description}</p>
                        <p class="club-members">部員数: ${club.members}名</p>
                        <p class="club-schedule">活動日: ${club.schedule}</p>
                    </div>
                `).join('');
            }
        }
    });
}

// お知らせ読み込み
function loadNews() {
    const newsContainer = document.querySelector('.news-container');
    
    if (newsContainer) {
        // デモデータ（実際はGASから取得）
        const newsItems = [
            { date: '2024/01/15', title: '体育祭のお知らせ', content: '来月20日に体育祭を開催します。詳細は後日配布します。', type: 'event' },
            { date: '2024/01/10', title: '生徒会だより1月号', content: '今月の活動報告と来月の予定をまとめました。', type: 'newsletter' },
            { date: '2024/01/05', title: '文化祭実行委員募集', content: '文化祭の企画・運営に参加してくれる生徒を募集しています。', type: 'recruitment' }
        ];
        
        newsContainer.innerHTML = `
            <div class="news-list">
                ${newsItems.map(item => `
                    <div class="news-item">
                        <div class="news-date">${item.date}</div>
                        <div class="news-content">
                            <h3>${item.title}</h3>
                            <p>${item.content}</p>
                        </div>
                        <span class="news-type ${item.type}">${getNewsTypeLabel(item.type)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function getNewsTypeLabel(type) {
    return CONFIG.CATEGORIES.NEWS[type] || 'お知らせ';
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
    return CONFIG.STATUS.POSTS[status] || status;
}

// ホームページ初期化
function initHomePage() {
    loadLatestNews();
    loadLatestPosts();
    initPWAInstall();
}

// 最新ニュース読み込み
function loadLatestNews() {
    const container = document.getElementById('latest-news');
    if (!container) return;
    
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
function loadLatestPosts() {
    const container = document.getElementById('latest-posts');
    if (!container) return;
    
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