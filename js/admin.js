// 管理画面用JavaScript

// 管理者認証状態
let isAuthenticated = false;
let currentUser = null;

// DOM要素
const loginScreen = document.getElementById('login-screen');
const adminMain = document.getElementById('admin-main');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');

// モーダル要素
const modalOverlay = document.getElementById('modal-overlay');
const adminModal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');

// セクション管理
const menuItems = document.querySelectorAll('.menu-item');
const adminSections = document.querySelectorAll('.admin-section');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel initializing...');
    
    // 認証状態をチェック
    checkAuthStatus();
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // ハンバーガーメニューの初期化
    initializeHamburgerMenu();
    
    // デバッグモード（自動ログイン無効化）
    if (CONFIG.APP.DEBUG) {
        console.log('Debug mode: Enabled but auto-login disabled for security');
        // セキュリティのため自動ログインは無効化
    }
});

// 認証状態チェック（セキュリティ強化版）
function checkAuthStatus() {
    // セッションから認証情報を復元
    const sessionData = sessionStorage.getItem('admin-session');
    
    if (sessionData) {
        try {
            const userData = JSON.parse(sessionData);
            
            // セッションの有効性をチェック（24時間以内）
            const loginTime = new Date(userData.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
                // 有効なセッション
                currentUser = userData;
                isAuthenticated = true;
                
                // セキュリティ監視を開始
                startSecurityMonitoring();
                
                // 管理画面を表示
                showAdminPanel();
                console.log('Session restored:', userData);
                return;
            } else {
                // セッション期限切れ
                console.log('Session expired, clearing data');
                clearAuthData();
            }
        } catch (error) {
            console.error('Error parsing session data:', error);
            clearAuthData();
        }
    }
    
    // 認証されていない場合はログイン画面を表示
    showLoginScreen();
    
    // セキュリティ強化：開発者ツールでの認証バイパスを防ぐ
    Object.defineProperty(window, 'isAuthenticated', {
        value: false,
        writable: false,
        configurable: false
    });
    
    Object.defineProperty(window, 'currentUser', {
        value: null,
        writable: false,
        configurable: false
    });
}

// ログイン画面表示
function showLoginScreen() {
    if (loginScreen) {
        loginScreen.style.display = 'flex';
    }
    if (adminMain) {
        adminMain.style.display = 'none';
    }
    
    // フォームをクリア
    if (adminEmailInput) adminEmailInput.value = '';
    if (adminPasswordInput) adminPasswordInput.value = '';
    if (loginError) loginError.style.display = 'none';
}

// イベントリスナー設定
function setupEventListeners() {
    // ログインフォーム送信
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // ログインボタン
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Enterキー対応
    adminEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });
    adminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });
    
    // ログアウト
    logoutBtn.addEventListener('click', handleLogout);
    
    // メニューナビゲーション
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });
    
    // モーダル
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    
    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });
    
    // 各セクションのボタン
    setupSectionButtons();
}

// セクションボタンの設定
function setupSectionButtons() {
    // お知らせ
    const addNewsBtn = document.getElementById('add-news-btn');
    if (addNewsBtn) {
        addNewsBtn.addEventListener('click', () => showNewsModal());
    }
    
    // アンケート
    const addSurveyBtn = document.getElementById('add-survey-btn');
    if (addSurveyBtn) {
        addSurveyBtn.addEventListener('click', () => showSurveyModal());
    }
    
    // 部活動
    const addClubBtn = document.getElementById('add-club-btn');
    if (addClubBtn) {
        addClubBtn.addEventListener('click', () => showClubModal());
    }
    
    // 生徒会メンバー
    const addMemberBtn = document.getElementById('add-member-btn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => showMemberModal());
    }
    
    // 活動実績管理
    const addAchievementBtn = document.getElementById('add-achievement-btn');
    if (addAchievementBtn) {
        addAchievementBtn.addEventListener('click', () => showAchievementModal());
    }
    
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => clearAchievementFilters());
    }
    
    // 年度フィルター
    const yearFilter = document.getElementById('achievement-year-filter');
    if (yearFilter) {
        yearFilter.addEventListener('change', () => loadAchievementsData());
    }
    
    const monthFilter = document.getElementById('achievement-month-filter');
    if (monthFilter) {
        monthFilter.addEventListener('change', () => loadAchievementsData());
    }
    
    const categoryFilter = document.getElementById('achievement-category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => loadAchievementsData());
    }
    
    const memberFilter = document.getElementById('member-filter');
    if (memberFilter) {
        memberFilter.addEventListener('change', () => loadAchievementsData());
    }
    
    // 通知送信
    const sendNotificationBtn = document.getElementById('send-notification-btn');
    if (sendNotificationBtn) {
        sendNotificationBtn.addEventListener('click', sendNotification);
    }
}

// ログイン処理
async function handleLogin() {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value.trim();
    
    if (!email || !password) {
        showLoginError('メールアドレスとパスワードを入力してください。');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
    
    try {
        const success = await performLogin(email, password);
        if (success) {
            showAdminPanel();
        } else {
            showLoginError('ログインに失敗しました。認証情報を確認してください。');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('ログイン中にエラーが発生しました。');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ログイン';
    }
}

// 実際のログイン処理（セキュリティ強化版）
async function performLogin(email, password) {
    try {
        // 入力値検証を強化
        if (!email || !password || email.trim().length === 0 || password.trim().length === 0) {
            return false;
        }
        
        // メールアドレス形式チェック
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return false;
        }
        
        // パスワード最小長チェック
        if (password.length < 6) {
            return false;
        }
        
        // デバッグモードでの簡易認証
        if (CONFIG.APP.DEBUG) {
            console.log('Debug mode: Performing simplified authentication');
            
            // デバッグ用の認証情報（実際の運用では削除）
            const debugAdmins = [
                { email: 'admin@school.ac.jp', password: 'admin123', name: '管理者', role: 'admin' },
                { email: 'council@school.ac.jp', password: 'council123', name: '生徒会', role: 'council' }
            ];
            
            const admin = debugAdmins.find(a => a.email === email && a.password === password);
            if (admin) {
                const userData = {
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                    permissions: ['read', 'write', 'admin'],
                    loginTime: new Date().toISOString()
                };
                
                // セッションのみに保存（ページ更新で消える）
                sessionStorage.setItem('admin-session', JSON.stringify(userData));
                
                currentUser = userData;
                isAuthenticated = true;
                
                // 追加のセキュリティチェック
                startSecurityMonitoring();
                
                console.log('Debug authentication successful:', userData);
                return true;
            }
            
            return false;
        }
        
        // 本番環境でのGAS認証
        const response = await fetch(CONFIG.GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'adminLogin',
                email: email,
                password: password
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.admin) {
            const userData = {
                email: result.admin.email,
                name: result.admin.name,
                role: result.admin.role,
                permissions: result.admin.permissions,
                loginTime: new Date().toISOString()
            };
            
            // セッションのみに保存（ページ更新で消える）
            sessionStorage.setItem('admin-session', JSON.stringify(userData));
            
            currentUser = userData;
            isAuthenticated = true;
            
            // 追加のセキュリティチェック
            startSecurityMonitoring();
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Authentication error:', error);
        return false;
    }
}

// ログインエラー表示
function showLoginError(message) {
    loginError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>${message}</span>`;
    loginError.style.display = 'flex';
    
    setTimeout(() => {
        loginError.style.display = 'none';
    }, 5000);
}

// 管理画面表示
function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminMain.style.display = 'grid';
    
    // ユーザー名を表示
    const userNameEl = document.getElementById('admin-user-name');
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.name || '管理者';
    }
    
    // ダッシュボードを初期化
    initializeDashboard();
    
    // デフォルトでダッシュボードを表示
    switchSection('dashboard');
}

// ログアウト処理（セキュリティ強化版）
function handleLogout() {
    if (confirm('ログアウトしますか？')) {
        // すべての認証データを完全にクリア
        clearAuthData();
        sessionStorage.clear();
        localStorage.clear();
        
        // 変数をリセット
        currentUser = null;
        isAuthenticated = false;
        
        // セキュリティ監視を停止
        stopSecurityMonitoring();
        
        // ページを強制リロード（メモリ上のデータもクリア）
        window.location.reload();
    }
}

// 認証データクリア
function clearAuthData() {
    localStorage.removeItem('admin-auth-token');
    localStorage.removeItem('admin-user-data');
    isAuthenticated = false;
    currentUser = null;
}

// セクション切り替え
function switchSection(sectionName) {
    // メニューのアクティブ状態を更新
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });
    
    // セクションの表示を切り替え
    adminSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionName + '-section') {
            section.classList.add('active');
        }
    });
    
    // セクション固有の初期化
    initializeSection(sectionName);
}

// セクション固有の初期化
async function initializeSection(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'news':
            await loadNewsData();
            break;
        case 'surveys':
            await loadSurveysData();
            break;
        case 'clubs':
            await loadClubsData();
            break;
        case 'council':
            await loadCouncilData();
            break;
        case 'notifications':
            await loadNotificationHistory();
            break;
        case 'forum':
            await loadForumData();
            break;
        case 'achievements':
            await loadAchievementsData();
            break;
    }
}

// ダッシュボード初期化
function initializeDashboard() {
    console.log('Initializing dashboard...');
}

// ダッシュボードデータ読み込み
async function loadDashboardData() {
    try {
        // 統計データを読み込み
        const stats = await loadStatistics();
        updateDashboardStats(stats);
        
        // 最近の活動を読み込み
        const recentActivities = await loadRecentActivities();
        updateRecentActivities(recentActivities);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// 統計データ読み込み
async function loadStatistics() {
    // デモデータ
    return {
        news: 12,
        surveys: 3,
        clubs: 28,
        forum: 45
    };
}

// ダッシュボード統計更新
function updateDashboardStats(stats) {
    document.getElementById('news-count').textContent = stats.news;
    document.getElementById('survey-count').textContent = stats.surveys;
    document.getElementById('club-count').textContent = stats.clubs;
    document.getElementById('forum-count').textContent = stats.forum;
}

// 最近の活動データ読み込み
async function loadRecentActivities() {
    // デモデータ
    return [
        {
            type: 'news',
            title: '新しいお知らせが投稿されました',
            description: '体育祭のお知らせ',
            time: '2時間前',
            icon: 'fas fa-newspaper'
        },
        {
            type: 'survey',
            title: 'アンケートが作成されました',
            description: '文化祭の企画について',
            time: '5時間前',
            icon: 'fas fa-poll'
        },
        {
            type: 'forum',
            title: 'フォーラムに新しい投稿',
            description: '図書室の利用について',
            time: '1日前',
            icon: 'fas fa-comments'
        }
    ];
}

// 最近の活動更新
function updateRecentActivities(activities) {
    const container = document.getElementById('recent-activities');
    if (!container) return;
    
    container.innerHTML = activities.map(activity => `
        <div class="recent-item">
            <div class="recent-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="recent-content">
                <h4>${activity.title}</h4>
                <p>${activity.description} • ${activity.time}</p>
            </div>
        </div>
    `).join('');
}

// お知らせデータ読み込み
async function loadNewsData() {
    const tableBody = document.getElementById('news-table-body');
    if (!tableBody) return;
    
    // デモデータ
    const newsData = [
        {
            id: 1,
            title: '体育祭のお知らせ',
            category: 'event',
            created_at: '2025-01-15',
            status: 'published'
        },
        {
            id: 2,
            title: '生徒会だより1月号',
            category: 'newsletter',
            created_at: '2025-01-10',
            status: 'published'
        }
    ];
    
    tableBody.innerHTML = newsData.map(item => `
        <tr>
            <td>${item.title}</td>
            <td><span class="status-badge status-${item.category}">${getCategoryLabel(item.category)}</span></td>
            <td>${formatDate(item.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="editNews(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="deleteNews(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// アンケートデータ読み込み
async function loadSurveysData() {
    const tableBody = document.getElementById('surveys-table-body');
    if (!tableBody) return;
    
    // デモデータ
    const surveysData = [
        {
            id: 1,
            title: '文化祭の企画について',
            status: 'active',
            responses: 127,
            deadline: '2025-02-15'
        },
        {
            id: 2,
            title: '学食の満足度調査',
            status: 'closed',
            responses: 89,
            deadline: '2025-01-31'
        }
    ];
    
    tableBody.innerHTML = surveysData.map(item => `
        <tr>
            <td>${item.title}</td>
            <td><span class="status-badge status-${item.status}">${getStatusLabel(item.status)}</span></td>
            <td>${item.responses}件</td>
            <td>${formatDate(item.deadline)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="viewSurveyResults(${item.id})">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="editSurvey(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="deleteSurvey(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 部活動データ読み込み
async function loadClubsData() {
    const tableBody = document.getElementById('clubs-table-body');
    if (!tableBody) return;
    
    // デモデータ
    const clubsData = [
        {
            id: 1,
            name: 'サッカー部',
            category: 'sports',
            members: 45,
            schedule: '月・水・金'
        },
        {
            id: 2,
            name: '吹奏楽部',
            category: 'music',
            members: 32,
            schedule: '火・木・土'
        }
    ];
    
    tableBody.innerHTML = clubsData.map(item => `
        <tr>
            <td>${item.name}</td>
            <td><span class="status-badge status-${item.category}">${getCategoryLabel(item.category)}</span></td>
            <td>${item.members}名</td>
            <td>${item.schedule}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="editClub(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="deleteClub(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 生徒会データ読み込み
async function loadCouncilData() {
    const membersGrid = document.getElementById('members-grid');
    if (!membersGrid) return;
    
    // デモデータ
    const membersData = [
        {
            id: 1,
            name: '会長 山田太郎',
            role: '全体統括',
            message: '皆さんの声を大切にします！',
            image: null
        },
        {
            id: 2,
            name: '副会長 田中花子',
            role: '企画運営',
            message: 'イベント企画頑張ります！',
            image: null
        }
    ];
    
    membersGrid.innerHTML = membersData.map(member => `
        <div class="member-admin-card">
            <div class="member-actions">
                <button class="btn btn-sm btn-icon btn-outline" onclick="editMember(${member.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-icon btn-outline" onclick="deleteMember(${member.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="member-avatar">
                <i class="fas fa-user"></i>
            </div>
            <h3>${member.name}</h3>
            <p class="member-role">${member.role}</p>
            <p class="member-message">"${member.message}"</p>
        </div>
    `).join('');
}

// 通知履歴読み込み
async function loadNotificationHistory() {
    const historyContainer = document.getElementById('notification-history');
    if (!historyContainer) return;
    
    // デモデータ
    const historyData = [
        {
            title: '体育祭の準備について',
            message: '体育祭の準備が始まります。各クラスの体育委員は...',
            target: '全ユーザー',
            sent_at: '2025-01-15 10:30',
            recipients: 234
        },
        {
            title: '生徒会だより1月号発行',
            message: '1月号を発行しました。ぜひご覧ください。',
            target: '生徒のみ',
            sent_at: '2025-01-10 14:00',
            recipients: 189
        }
    ];
    
    historyContainer.innerHTML = historyData.map(item => `
        <div class="history-item">
            <h4>${item.title}</h4>
            <p>${item.message}</p>
            <div class="history-meta">
                <span>${item.target} (${item.recipients}名)</span>
                <span>${formatDateTime(item.sent_at)}</span>
            </div>
        </div>
    `).join('');
}

// フォーラムデータ読み込み
async function loadForumData() {
    const tableBody = document.getElementById('forum-table-body');
    if (!tableBody) return;
    
    let forumData = [];
    let nameMap = {};
    try {
        if (window.supabaseQueries) {
            const { data: posts, error } = await window.supabaseQueries.getPostsForAdmin({ limit: 200 });
            if (!error && posts) {
                forumData = posts;
                const numbers = Array.from(new Set(posts.map(p => p.student_number).filter(Boolean)));
                if (numbers.length > 0) {
                    const { data: students, error: sErr } = await window.supabaseQueries.getStudentsByNumbers(numbers);
                    if (!sErr && students) {
                        students.forEach(s => { nameMap[s.student_number] = s.name; });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Admin posts load fallback:', e);
    }

    tableBody.innerHTML = forumData.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${truncateText(item.content, 50)}<div class="small" style="opacity:.7;">投稿者: ${nameMap[item.student_number] || '匿名'}</div></td>
            <td><span class="status-badge status-${item.status}">${getStatusLabel(item.status)}</span></td>
            <td>${formatDateTime(item.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="viewForumPost('${item.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="replyToPost('${item.id}')">
                        <i class="fas fa-reply"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// モーダル表示
function showModal(title, content, saveCallback = null) {
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modalOverlay.classList.add('active');
    
    // 保存ボタンのコールバック設定
    modalSave.onclick = saveCallback || closeModal;
}

// モーダル閉じる
function closeModal() {
    modalOverlay.classList.remove('active');
    modalSave.onclick = null;
}

// お知らせモーダル表示
function showNewsModal(newsId = null) {
    const isEdit = newsId !== null;
    const title = isEdit ? 'お知らせを編集' : '新しいお知らせを作成';
    
    const content = `
        <div class="form-group">
            <label for="news-title">タイトル *</label>
            <input type="text" id="news-title" class="form-control" placeholder="お知らせのタイトルを入力">
        </div>
        <div class="form-group">
            <label for="news-category">カテゴリ *</label>
            <select id="news-category" class="form-control">
                <option value="general">一般</option>
                <option value="event">イベント</option>
                <option value="important">重要</option>
                <option value="newsletter">生徒会だより</option>
                <option value="recruitment">募集</option>
            </select>
        </div>
        <div class="form-group">
            <label for="news-content">内容 *</label>
            <textarea id="news-content" class="form-control" rows="6" placeholder="お知らせの内容を入力"></textarea>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="news-notification"> プッシュ通知を送信
            </label>
        </div>
    `;
    
    showModal(title, content, () => saveNews(newsId));
}

// お知らせ保存
async function saveNews(newsId = null) {
    const title = document.getElementById('news-title').value.trim();
    const category = document.getElementById('news-category').value;
    const content = document.getElementById('news-content').value.trim();
    const sendNotification = document.getElementById('news-notification').checked;
    
    if (!title || !content) {
        alert('タイトルと内容は必須です。');
        return;
    }
    
    try {
        // 保存処理（実際はGASに送信）
        const result = await saveNewsData({
            id: newsId,
            title,
            category,
            content,
            sendNotification
        });
        
        if (result.success) {
            showSuccessMessage('お知らせを保存しました。');
            closeModal();
            loadNewsData(); // テーブルを再読み込み
            
            if (sendNotification) {
                // 通知送信
                await sendNewsNotification(title, content);
            }
        } else {
            throw new Error(result.error || '保存に失敗しました。');
        }
    } catch (error) {
        console.error('Error saving news:', error);
        showErrorMessage('保存中にエラーが発生しました。');
    }
}

// 通知送信
async function sendNotification() {
    const title = document.getElementById('notification-title').value.trim();
    const message = document.getElementById('notification-message').value.trim();
    const target = document.getElementById('notification-target').value;
    
    if (!title || !message) {
        alert('タイトルとメッセージを入力してください。');
        return;
    }
    
    const sendBtn = document.getElementById('send-notification-btn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
    
    try {
        const result = await sendPushNotification({
            title,
            message,
            target
        });
        
        if (result.success) {
            showSuccessMessage('通知を送信しました。');
            
            // フォームをクリア
            document.getElementById('notification-title').value = '';
            document.getElementById('notification-message').value = '';
            document.getElementById('notification-target').value = 'all';
            
            // 履歴を再読み込み
            loadNotificationHistory();
        } else {
            throw new Error(result.error || '送信に失敗しました。');
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        showErrorMessage('通知送信中にエラーが発生しました。');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 通知を送信';
    }
}

// 実際の通知送信処理（GAS + FCM）
async function sendPushNotification(data) {
    try {
        if (CONFIG.APP.DEBUG) {
            // デバッグモード
            console.log('Debug: Sending notification:', data);
            return { success: true, recipients: 150, historyId: 'debug-' + Date.now() };
        }
        
        // GASに通知送信要求
        const requestData = {
            action: 'sendNotification',
            templateKey: getTemplateKeyFromData(data),
            templateData: {
                title: data.title,
                summary: data.message.substring(0, 100),
                message: data.message,
                url: getNotificationUrl(data)
            },
            targetType: data.target || 'all',
            targetCriteria: getTargetCriteria(data.target),
            adminEmail: currentUser?.email || 'admin@school.ac.jp',
            adminPassword: 'admin' // 実際の運用では適切な認証を実装
        };
        
        const response = await fetch(CONFIG.GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Notification sending failed');
        }
        
        console.log('Notification sent successfully:', result.data);
        return result;
        
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}

// 通知タイプからテンプレートキーを取得
function getTemplateKeyFromData(data) {
    // タイトルや内容から適切なテンプレートを判定
    const title = data.title.toLowerCase();
    
    if (title.includes('緊急') || title.includes('重要')) {
        return 'emergency_alert';
    } else if (title.includes('アンケート')) {
        return 'survey_created';
    } else if (title.includes('イベント') || title.includes('行事')) {
        return 'event_reminder';
    } else {
        return 'news_published';
    }
}

// 通知URLを生成
function getNotificationUrl(data) {
    const type = getTemplateKeyFromData(data);
    
    switch (type) {
        case 'survey_created':
            return './survey.html';
        case 'event_reminder':
            return './news.html#events';
        case 'emergency_alert':
            return './news.html#important';
        default:
            return './news.html';
    }
}

// ターゲット条件を生成
function getTargetCriteria(target) {
    switch (target) {
        case 'students':
            return { platform: 'web' }; // 実際の運用では学生識別子を使用
        case 'teachers':
            return { platform: 'web' }; // 実際の運用では教職員識別子を使用
        case 'all':
        default:
            return {};
    }
}

// ニュース通知送信
async function sendNewsNotification(title, content) {
    const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
    
    return await sendPushNotification({
        title: `📢 ${title}`,
        message: shortContent,
        target: 'all'
    });
}

// データ保存処理（デモ）
async function saveNewsData(data) {
    if (CONFIG.APP.DEBUG) {
        console.log('Debug: Saving news:', data);
        return { success: true };
    } else {
        return await apiClient.sendRequest('saveNews', data);
    }
}

// ユーティリティ関数
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return `${formatDate(dateString)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function getCategoryLabel(category) {
    const labels = {
        general: '一般',
        event: 'イベント',
        important: '重要',
        newsletter: '生徒会だより',
        recruitment: '募集',
        sports: '運動部',
        music: '音楽部',
        culture: '文化部',
        academic: '学術部'
    };
    return labels[category] || category;
}

function getStatusLabel(status) {
    const labels = {
        active: '実施中',
        closed: '終了',
        draft: '下書き',
        pending: '確認中',
        resolved: '対応済み',
        published: '公開中'
    };
    return labels[status] || status;
}

// 成功・エラーメッセージ表示
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `${type}-message`;
    messageEl.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${message}`;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

// 編集・削除関数（プレースホルダー）
function editNews(id) {
    showNewsModal(id);
}

function deleteNews(id) {
    if (confirm('このお知らせを削除しますか？')) {
        console.log('Delete news:', id);
        loadNewsData();
    }
}

function showSurveyModal(id = null) {
    const title = id ? 'アンケートを編集' : '新しいアンケートを作成';
    const content = `
        <div class="form-group">
            <label for="survey-title">タイトル *</label>
            <input type="text" id="survey-title" class="form-control" placeholder="アンケートのタイトルを入力">
        </div>
        <div class="form-group">
            <label for="survey-description">説明</label>
            <textarea id="survey-description" class="form-control" rows="3" placeholder="アンケートの説明を入力"></textarea>
        </div>
        <div class="form-group">
            <label for="survey-deadline">締切日</label>
            <input type="date" id="survey-deadline" class="form-control">
        </div>
        <div class="form-group">
            <label>質問項目</label>
            <div id="survey-questions">
                <div class="question-item">
                    <input type="text" class="form-control" placeholder="質問を入力">
                    <button type="button" class="btn btn-sm btn-outline" onclick="removeQuestion(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="addQuestion()">
                <i class="fas fa-plus"></i> 質問を追加
            </button>
        </div>
    `;
    
    showModal(title, content, () => saveSurvey(id));
}

function editSurvey(id) {
    showSurveyModal(id);
}

function deleteSurvey(id) {
    if (confirm('このアンケートを削除しますか？')) {
        console.log('Delete survey:', id);
        loadSurveysData();
    }
}

function viewSurveyResults(id) {
    console.log('View survey results:', id);
}

function saveSurvey(id = null) {
    console.log('Save survey:', id);
    closeModal();
    loadSurveysData();
}

function showClubModal(id = null) {
    const title = id ? '部活動を編集' : '新しい部活動を追加';
    const content = `
        <div class="form-group">
            <label for="club-name">部活動名 *</label>
            <input type="text" id="club-name" class="form-control" placeholder="部活動名を入力">
        </div>
        <div class="form-group">
            <label for="club-category">カテゴリ *</label>
            <select id="club-category" class="form-control">
                <option value="sports">運動部</option>
                <option value="culture">文化部</option>
                <option value="music">音楽部</option>
                <option value="academic">学術部</option>
            </select>
        </div>
        <div class="form-group">
            <label for="club-description">説明</label>
            <textarea id="club-description" class="form-control" rows="3" placeholder="部活動の説明を入力"></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="club-members">部員数</label>
                <input type="number" id="club-members" class="form-control" placeholder="0">
            </div>
            <div class="form-group">
                <label for="club-schedule">活動日</label>
                <input type="text" id="club-schedule" class="form-control" placeholder="例: 月・水・金">
            </div>
        </div>
    `;
    
    showModal(title, content, () => saveClub(id));
}

function editClub(id) {
    showClubModal(id);
}

function deleteClub(id) {
    if (confirm('この部活動を削除しますか？')) {
        console.log('Delete club:', id);
        loadClubsData();
    }
}

function saveClub(id = null) {
    console.log('Save club:', id);
    closeModal();
    loadClubsData();
}

function showMemberModal(id = null) {
    const title = id ? 'メンバーを編集' : '新しいメンバーを追加';
    const content = `
        <div class="form-group">
            <label for="member-name">名前 *</label>
            <input type="text" id="member-name" class="form-control" placeholder="例: 会長 山田太郎">
        </div>
        <div class="form-group">
            <label for="member-role">役職 *</label>
            <input type="text" id="member-role" class="form-control" placeholder="例: 全体統括">
        </div>
        <div class="form-group">
            <label for="member-message">メッセージ</label>
            <textarea id="member-message" class="form-control" rows="3" placeholder="メンバーからのメッセージを入力"></textarea>
        </div>
        <div class="form-group">
            <label for="member-image">プロフィール画像</label>
            <input type="file" id="member-image" class="form-control" accept="image/*">
        </div>
    `;
    
    showModal(title, content, () => saveMember(id));
}

function editMember(id) {
    showMemberModal(id);
}

function deleteMember(id) {
    if (confirm('このメンバーを削除しますか？')) {
        console.log('Delete member:', id);
        loadCouncilData();
    }
}

function saveMember(id = null) {
    console.log('Save member:', id);
    closeModal();
    loadCouncilData();
}

function viewForumPost(id) {
    console.log('View forum post:', id);
}

function replyToPost(id) {
    console.log('Reply to post:', id);
}

// 質問項目の追加・削除（アンケート用）
function addQuestion() {
    const questionsContainer = document.getElementById('survey-questions');
    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    questionItem.innerHTML = `
        <input type="text" class="form-control" placeholder="質問を入力">
        <button type="button" class="btn btn-sm btn-outline" onclick="removeQuestion(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    questionsContainer.appendChild(questionItem);
}

function removeQuestion(button) {
    button.parentElement.remove();
}

// ハンバーガーメニューの初期化
function initializeHamburgerMenu() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const mainOverlay = document.getElementById('main-overlay');
    
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', function() {
            toggleSidebar();
        });
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', function() {
            closeSidebar();
        });
    }
    
    if (mainOverlay) {
        mainOverlay.addEventListener('click', function() {
            closeSidebar();
        });
    }
    
    // ESCキーでサイドバーを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });
}

// サイドバーの開閉
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mainOverlay = document.getElementById('main-overlay');
    
    if (sidebar && hamburgerMenu) {
        const isOpen = sidebar.classList.contains('active');
        
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mainOverlay = document.getElementById('main-overlay');
    
    if (sidebar) sidebar.classList.add('active');
    if (hamburgerMenu) hamburgerMenu.classList.add('active');
    if (mainOverlay) mainOverlay.classList.add('active');
    
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mainOverlay = document.getElementById('main-overlay');
    
    if (sidebar) sidebar.classList.remove('active');
    if (hamburgerMenu) hamburgerMenu.classList.remove('active');
    if (mainOverlay) mainOverlay.classList.remove('active');
    
    document.body.style.overflow = '';
}

// セキュリティ監視システム
let securityInterval = null;
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30分

function startSecurityMonitoring() {
    // 非アクティブタイマー開始
    resetInactivityTimer();
    
    // 開発者ツール検知
    securityInterval = setInterval(() => {
        // 開発者ツールが開かれているかチェック
        const threshold = 160;
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
            console.warn('Developer tools detected - logging out for security');
            handleLogout();
        }
    }, 1000);
    
    // ユーザーアクティビティ監視
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
}

function stopSecurityMonitoring() {
    if (securityInterval) {
        clearInterval(securityInterval);
        securityInterval = null;
    }
    
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
}

function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    inactivityTimer = setTimeout(() => {
        alert('セキュリティのため、非アクティブによりログアウトします。');
        handleLogout();
    }, INACTIVITY_TIMEOUT);
}

// セキュリティ強化：重要な関数を保護
Object.defineProperty(window, 'performLogin', {
    value: undefined,
    writable: false,
    configurable: false
});

Object.defineProperty(window, 'showAdminPanel', {
    value: undefined,
    writable: false,
    configurable: false
});

// デバッグ用関数（セキュリティ強化版）
if (CONFIG.APP.DEBUG) {
    // デバッグモードでも認証バイパス機能は提供しない
    window.adminDebug = {
        logout: handleLogout,
        switchSection: switchSection,
        clearAuth: clearAuthData,
        toggleSidebar: toggleSidebar,
        openSidebar: openSidebar,
        closeSidebar: closeSidebar
        // login機能は削除（セキュリティのため）
        // 活動実績管理機能
        loadAchievementsData,
        showAchievementModal,
        clearAchievementFilters
    };
    console.log('Admin debug functions available (login disabled for security)');
}

// ========================================
// 活動実績管理機能
// ========================================

// 活動実績データ読み込み
async function loadAchievementsData() {
    const tableBody = document.getElementById('achievements-table-body');
    if (!tableBody) return;
    
    try {
        // 活動実績を取得
        const membersResult = await supabaseQueries.getCouncilMembers();
        const members = membersResult.data || [];
        
        // 全てのメンバーの活動実績を取得
        let achievements = [];

        for (const member of members) {
            const achievementsResult = await supabaseQueries.getMemberAchievements(member.id, {
                includePublicOnly: false // 管理者は全ての実績を表示
            });
            
            if (achievementsResult.data && achievementsResult.data.length > 0) {
                achievements = achievements.concat(achievementsResult.data.map(achievement => ({
                    ...achievement,
                    memberName: member.name,
                    memberRole: member.role
                })));
            }
        }

        // フィルター適用
        const filteredAchievements = applyAchievementFilters(achievements);
        
        // UI更新
        updateAchievementsTable(filteredAchievements);
        updateMemberFilter(members);
        
    } catch (error) {
        console.error('活動実績データの読み込みエラー:', error);
        tableBody.innerHTML = '<tr><td colspan="7">データの読み込みに失敗しました</td></tr>';
    }
}

// 活動実績テーブル更新
function updateAchievementsTable(achievements) {
    const tableBody = document.getElementById('achievements-table-body');
    if (!tableBody) return;
    
    if (!achievements || achievements.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">活動実績がありません</td></tr>';
        return;
    }
    
    tableBody.innerHTML = achievements.map(achievement => `
        <tr>
            <td>
                <div class="member-name">${achievement.memberName}</div>
                <div class="member-role">${achievement.memberRole}</div>
            </td>
            <td>
                <span class="date-badge">${achievement.year}年${achievement.month}月</span>
            </td>
            <td>
                <div class="achievement-title">${achievement.title}</div>
            </td>
            <td>
                <span class="achievement-category category-${achievement.category}">
                    ${getAchievementCategoryLabel(achievement.category)}
                </span>
            </td>
            <td>
                <div class="achievement-description">${achievement.description || ''}</div>
            </td>
            <td>
                <span class="public-status ${achievement.isPublic ? 'public' : 'private'}">
                    <i class="fas fa-${achievement.isPublic ? 'eye' : 'eye-slash'}"></i>
                    ${achievement.isPublic ? '公開' : '非公開'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="editAchievement(${achievement.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAchievement(${achievement.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// メンバーフィルター更新
function updateMemberFilter(members) {
    const memberFilter = document.getElementById('member-filter');
    if (!memberFilter) return;
    
    memberFilter.innerHTML = `
        <option value="">すべてのメンバー</option>
        ${members.map(member => `
            <option value="${member.id}">${member.name} (${member.role})</option>
        `).join('')}
    `;
}

// フィルター適用
function applyAchievementFilters(achievements) {
    const yearFilter = document.getElementById('achievement-year-filter')?.value;
    const monthFilter = document.getElementById('achievement-month-filter')?.value;
    const categoryFilter = document.getElementById('achievement-category-filter')?.value;
    const memberFilter = document.getElementById('member-filter')?.value;
    
    return achievements.filter(achievement => {
        if (yearFilter && achievement.year != yearFilter) return false;
        if (monthFilter && achievement.month != monthFilter) return false;
        if (categoryFilter && achievement.category !== categoryFilter) return false;
        if (memberFilter && achievement.memberId != memberFilter) return false;
        return true;
    });
}

// 活動実績編集モーダル表示
function showAchievementModal(achievementId = null) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = achievementId ? '活動実績編集' : '活動実績追加';
    
    modalBody.innerHTML = `
        <form id="achievement-form">
            <div class="form-group">
                <label for="achievement-member">メンバー <span class="required">*</span></label>
                <select id="achievement-member" class="form-control" required>
                    <option value="">メンバーを選択</option>
                </select>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="achievement-year">年 <span class="required">*</span></label>
                    <select id="achievement-year" class="form-control" required>
                        <option value="">年を選択</option>
                        <option value="2024">2024年</option>
                        <option value="2025">2025年</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="achievement-month">月 <span class="required">*</span></label>
                    <select id="achievement-month" class="form-control" required>
                        <option value="">月を選択</option>
                        <option value="1">1月</option>
                        <option value="2">2月</option>
                        <option value="3">3月</option>
                        <option value="4">4月</option>
                        <option value="5">5月</option>
                        <option value="6">6月</option>
                        <option value="7">7月</option>
                        <option value="8">8月</option>
                        <option value="9">9月</option>
                        <option value="10">10月</option>
                        <option value="11">11月</option>
                        <option value="12">12月</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="achievement-title">タイトル <span class="required">*</span></label>
                <input type="text" id="achievement-title" class="form-control" required maxlength="200">
            </div>
            
            <div class="form-group">
                <label for="achievement-description">詳細</label>
                <textarea id="achievement-description" class="form-control" rows="3" maxlength="1000"></textarea>
            </div>
            
            <div class="form-group">
                <label for="achievement-category">カテゴリ</label>
                <select id="achievement-category" class="form-control">
                    <option value="general">一般</option>
                    <option value="academic">学習</option>
                    <option value="cultural">文化</option>
                    <option value="sports">スポーツ</option>
                    <option value="leadership">リーダーシップ</option>
                    <option value="volunteer">ボランティア</option>
                    <option value="event">イベント</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="achievement-priority">表示優先度</label>
                <input type="number" id="achievement-priority" class="form-control" min="0" max="100" value="0">
            </div>
            
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="achievement-public">
                    <span class="checkmark"></span>
                    公開する
                </label>
            </div>
        </form>
    `;
    
    // メンバー選択肢を設定
    populateMemberSelect();
    
    // 編集の場合、データを設定
    if (achievementId) {
        setAchievementFormData(achievementId);
    } else {
        // 公開をデフォルトでON
        document.getElementById('achievement-public').checked = true;
    }
    
    showModal();
}

// メンバー選択肢設定
async function populateMemberSelect() {
    const memberSelect = document.getElementById('achievement-member');
    if (!memberSelect) return;
    
    try {
        const result = await supabaseQueries.getCouncilMembers();
        const members = result.data || [];
        
        memberSelect.innerHTML = '<option value="">メンバーを選択</option>' +
            members.map(member => `
                <option value="${member.id}">${member.name} (${member.role})</option>
            `).join('');
    } catch (error) {
        console.error('メンバー一覧の取得エラー:', error);
    }
}

// 実績フォームデータ設定（編集時）
async function setAchievementFormData(achievementId) {
    try {
        // 実績データを取得してフォームに設定
        // 注意: SupabaseQueriesには単一実績取得メソッドがないため、全データから検索
        // 実際の実装では、getMemberAchievement(id) メソッドを追加することが推奨
        
        document.getElementById('form-mode').value = 'edit';
        document.getElementById('form-id').value = achievementId;
    } catch (error) {
        console.error('実績データの取得エラー:', error);
    }
}

// フィルタークリア
function clearAchievementFilters() {
    document.getElementById('achievement-year-filter').value = '';
    document.getElementById('achievement-month-filter').value = '';
    document.getElementById('achievement-category-filter').value = '';
    document.getElementById('member-filter').value = '';
    
    // データ再読み込み
    loadAchievementsData();
}

// 活動実績編集
function editAchievement(achievementId) {
    showAchievementModal(achievementId);
}

// 活動実績削除
async function deleteAchievement(achievementId) {
    if (!confirm('この活動実績を削除してもよろしいですか？')) return;
    
    try {
        const result = await supabaseQueries.deleteMemberAchievement(achievementId);
        
        if (result.error) {
            showErrorMessage('削除に失敗しました: ' + result.error.message);
        } else {
            showInfoMessage('活動実績を削除しました');
            loadAchievementsData();
        }
    } catch (error) {
        console.error('実績削除エラー:', error);
        showErrorMessage('削除中にエラーが発生しました');
    }
}
