/**
 * なずなポータル管理画面 - コア機能
 * 認証、初期化、セクション管理を担当
 */

// =====================================
// グローバル変数
// =====================================
let isAuthenticated = false;
let currentUser = null;

// =====================================
// 初期化
// =====================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin panel initializing...');
    await waitForInitialization();
    await checkExistingSession();
    setupEventListeners();
});

// 初期化待機関数
async function waitForInitialization() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        if (!window.apiClient && typeof APIClient !== 'undefined') {
                try {
                    window.apiClient = new APIClient();
                console.log('API Client initialized');
                } catch (error) {
                    console.error('API Client initialization failed:', error);
            }
        }
        
        if (!window.supabaseClient && typeof supabase !== 'undefined' && window.CONFIG?.SUPABASE) {
                try {
                    window.supabaseClient = supabase.createClient(
                        window.CONFIG.SUPABASE.URL, 
                        window.CONFIG.SUPABASE.ANON_KEY,
                        window.CONFIG.SUPABASE.OPTIONS || {}
                    );
                console.log('Supabase initialized');
                } catch (error) {
                    console.error('Supabase initialization failed:', error);
            }
        }
        
        if (window.apiClient && window.supabaseClient) {
            console.log('All components initialized');
            break;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!window.apiClient) {
        console.error('API Client initialization failed');
        showError('システムエラー: APIクライアントが初期化できませんでした');
    }
    
    if (!window.supabaseClient) {
        console.warn('Supabase not available, continuing with limited functionality');
    }
}

// =====================================
// セッション管理
// =====================================
async function checkExistingSession() {
    const adminToken = sessionStorage.getItem('admin_token');
    const adminEmail = sessionStorage.getItem('admin_email');
    
    if (adminToken && adminEmail) {
        console.log('Existing session found, verifying...');
        try {
            const isValid = await verifyAdminSession(adminToken, adminEmail);
            if (isValid) {
                isAuthenticated = true;
                currentUser = { email: adminEmail };
                showAdminPanel(currentUser);
            } else {
                clearSession();
                showLoginScreen();
            }
        } catch (error) {
            console.error('Session verification error:', error);
            clearSession();
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}

async function verifyAdminSession(token, email) {
    try {
        const result = await window.apiClient.sendRequest('verifyAdminSession', {
            token: token,
            email: email
        });
        
        // GASのverifyAdminSessionは{valid: true/false, user: ..., error: ...}形式で返す
        // app.jsがsuccessプロパティを期待するため、validをsuccessに変換する必要がある
        if (result && result.valid === true) {
            currentUser = result.user || { email: email };
            return true;
        }
        
        // 無効なセッションの場合
        if (result && result.valid === false) {
            console.log('Session invalid:', result.error || 'Token expired or invalid');
        return false;
        }
        
        // レスポンス形式が不明な場合
        console.warn('Unexpected session verification response:', result);
        return false;
    } catch (error) {
        // エラーの詳細をログに記録
        console.error('Session verification error:', error);
        // ネットワークエラーやAPIエラーの場合も無効とみなす
        return false;
    }
}

function clearSession() {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_email');
    isAuthenticated = false;
    currentUser = null;
}

// =====================================
// 認証
// =====================================
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function performLogin(email, password) {
    const loginButton = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
    loginError.style.display = 'none';
    
    try {
        if (!window.apiClient) {
            if (typeof APIClient !== 'undefined') {
                window.apiClient = new APIClient();
            } else {
                throw new Error('API Clientが初期化されていません');
            }
        }
        
        const passwordHash = await hashPassword(password);
        const result = await window.apiClient.sendRequest('adminLogin', {
            email: email,
            passwordHash: passwordHash
        });
        
        if (result.success) {
            sessionStorage.setItem('admin_token', result.token);
            sessionStorage.setItem('admin_email', email);
            isAuthenticated = true;
            currentUser = result.user;
            showAdminPanel(currentUser);
        } else {
            throw new Error(result.error || 'ログインに失敗しました');
        }
    } catch (error) {
        console.error('Login error:', error);
        const loginErrorText = document.getElementById('login-error-text');
        if (loginErrorText) {
            loginErrorText.textContent = error.message || 'ログインに失敗しました';
        }
        loginError.style.display = 'block';
            loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> ログイン';
    }
}

function performLogout() {
    clearSession();
    showLoginScreen();
}

// =====================================
// UI表示制御
// =====================================
function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('admin-main').style.display = 'none';
}

function showAdminPanel(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-main').style.display = 'block';
    
    const adminUserName = document.getElementById('admin-user-name');
    if (adminUserName && user) {
        adminUserName.textContent = user.email || user.name || '管理者';
    }
    
    loadAdminData();
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${escapeHtml(message)}`;
    errorDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #ff4444; color: white;
        padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000; animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${escapeHtml(message)}`;
    successDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #00c853; color: white;
        padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000; animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(successDiv);
    setTimeout(() => {
        successDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// =====================================
// イベントリスナー設定
// =====================================
function setupEventListeners() {
    // ログインフォーム
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value;
            if (!email || !password) {
                showError('メールアドレスとパスワードを入力してください');
                return;
            }
            await performLogin(email, password);
        });
    }
    
    // ログアウト
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('ログアウトしますか？')) {
                performLogout();
            }
        });
    }
    
    // サイドバーメニュー
    const menuItems = document.querySelectorAll('.menu-item[data-section]');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            showSection(section);
            document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // ハンバーガーメニュー
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const adminSidebar = document.getElementById('admin-sidebar');
    const sidebarCloseBtn = document.getElementById('admin-sidebar-close');
    
    if (hamburgerMenu && adminSidebar) {
        hamburgerMenu.addEventListener('click', () => {
            adminSidebar.classList.toggle('active');
            hamburgerMenu.classList.toggle('active');
        });
    }
    
    if (sidebarCloseBtn && adminSidebar) {
        sidebarCloseBtn.addEventListener('click', () => {
            adminSidebar.classList.remove('active');
            hamburgerMenu?.classList.remove('active');
        });
    }
    
    // モーダル
    const modalCloseBtn = document.getElementById('modal-close');
    const modalCancelBtn = document.getElementById('modal-cancel');
    const modalOverlay = document.getElementById('modal-overlay');
    
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            modalOverlay?.classList.remove('active');
        });
    }
    
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', () => {
            modalOverlay?.classList.remove('active');
        });
    }
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        });
    }
    
    // PWA更新ボタン
    const pwaBtn = document.getElementById('pwa-update-btn');
    if (pwaBtn) {
        pwaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.showPWAUpdateModule) {
                window.showPWAUpdateModule();
            } else if (window.pwaUpdater?.showUpdateModule) {
                window.pwaUpdater.showUpdateModule();
            }
        });
    }
    
    // 各種ボタンのイベントは admin-operations.js で設定
    setupDataOperationsListeners();
}

// =====================================
// セクション切り替え
// =====================================
function showSection(sectionName) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(sectionName + '-section');
    if (target) target.classList.add('active');
    loadTabData(sectionName);
}

// =====================================
// データ読み込み
// =====================================
async function loadAdminData() {
    showSection('dashboard');
}

async function loadTabData(tabName) {
    if (!isAuthenticated) return;
    
    switch (tabName) {
        case 'dashboard':
            await loadDashboardStats();
            break;
        case 'news':
            await loadNewsList();
            break;
        case 'surveys':
            await loadSurveysList();
            break;
        case 'clubs':
            await loadClubsList();
            break;
        case 'council':
            await loadCouncilMembersList();
            break;
        case 'achievements':
            await loadAchievementsList();
            break;
        case 'notifications':
            await loadNotificationHistory();
            break;
        case 'statistics':
            await loadNotificationStatistics();
            break;
        case 'forum':
            await loadForumPosts();
            break;
        case 'accounts':
            // フォームベースなので読み込み不要
            break;
        case 'system':
            await window.loadAdminSystemData();
            break;
    }
}

// =====================================
// ダッシュボード統計
// =====================================
async function loadDashboardStats() {
    try {
        const stats = await window.supabaseQueries?.getStatistics();
        if (stats) {
            document.getElementById('news-count').textContent = stats.news_count || 0;
            document.getElementById('survey-count').textContent = stats.surveys_count || 0;
            document.getElementById('club-count').textContent = stats.clubs_count || 0;
            document.getElementById('forum-count').textContent = stats.posts_count || 0;
        }
        
        // 最近の活動をロード
        await loadRecentActivities();
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadRecentActivities() {
    const container = document.getElementById('recent-activities');
    if (!container) return;
    
    try {
        const activities = [];
        
        // 最新のお知らせ
        if (window.supabaseQueries) {
            const { data: news } = await window.supabaseQueries.getNews({ limit: 3, publishedOnly: true });
            if (news) {
                news.forEach(item => {
                    activities.push({
                        type: 'news',
                        icon: 'newspaper',
                        title: item.title,
                        date: item.date || item.created_at,
                        color: '#3498db'
                    });
                });
            }
        }
        
        if (activities.length === 0) {
            container.innerHTML = '<p class="empty-state">最近の活動がありません</p>';
            return;
        }

        container.innerHTML = activities.map(act => `
            <div class="recent-item">
                <div class="recent-icon" style="background: ${act.color};">
                    <i class="fas fa-${act.icon}"></i>
        </div>
                <div class="recent-content">
                    <h4>${escapeHtml(act.title)}</h4>
                    <p>${formatDateTime(act.date)}</p>
        </div>
        </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent activities:', error);
        container.innerHTML = '<p class="error-state">読み込みエラー</p>';
    }
}

// =====================================
// ユーティリティ関数
// =====================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// =====================================
// CSSアニメーション追加
// =====================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// データ操作のリスナー設定は admin-operations.js で実装
// このファイルでは関数の宣言のみ（実装は admin-operations.js）
function setupDataOperationsListeners() {
    // この関数は admin-operations.js で実装される
    if (window.setupAdminDataOperations) {
        window.setupAdminDataOperations();
    }
}

// 各データ読み込み関数は admin-operations.js で実装
// ここでは関数宣言のみ
async function loadNewsList() {
    if (window.loadAdminNewsList) {
        return window.loadAdminNewsList();
    }
}

async function loadSurveysList() {
    if (window.loadAdminSurveysList) {
        return window.loadAdminSurveysList();
    }
}

async function loadClubsList() {
    if (window.loadAdminClubsList) {
        return window.loadAdminClubsList();
    }
}

async function loadCouncilMembersList() {
    if (window.loadAdminCouncilMembersList) {
        return window.loadAdminCouncilMembersList();
    }
}

async function loadAchievementsList() {
    if (window.loadAdminAchievementsList) {
        return window.loadAdminAchievementsList();
    }
}

async function loadNotificationHistory() {
    if (window.loadAdminNotificationHistory) {
        return window.loadAdminNotificationHistory();
    }
}

async function loadNotificationStatistics() {
    if (window.loadAdminNotificationStatistics) {
        return window.loadAdminNotificationStatistics();
    }
}

async function loadForumPosts() {
    if (window.loadAdminForumPosts) {
        return window.loadAdminForumPosts();
    }
}

// グローバルに公開
window.adminPanel = {
    showSection,
    loadTabData,
    showError,
    showSuccess,
    escapeHtml,
    formatDateTime,
    currentUser: () => currentUser,
    isAuthenticated: () => isAuthenticated
};

