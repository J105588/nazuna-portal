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
    
    // API Clientが初期化されていることを確認
    if (!window.apiClient) {
        console.error('API Client not initialized, cannot verify session');
        showAccessDenied();
        return;
    }
    
    console.log('API Client ready, checking session...');
    await checkExistingSession();
    setupEventListeners();
});

// 初期化待機関数
async function waitForInitialization() {
    console.log('=== Waiting for initialization ===');
    let attempts = 0;
    const maxAttempts = 20; // 10秒間待機（500ms × 20）
    
    while (attempts < maxAttempts) {
        // API Clientの初期化を試みる
        if (!window.apiClient) {
            // app.jsから読み込まれたAPIClientクラスを使用してインスタンスを作成
            if (typeof APIClient !== 'undefined') {
                try {
                    console.log('Creating new API Client instance...');
                    window.apiClient = new APIClient();
                    console.log('API Client initialized successfully');
                } catch (error) {
                    console.error('API Client initialization failed:', error);
                }
            } else {
                console.log(`Waiting for APIClient class... (attempt ${attempts + 1}/${maxAttempts})`);
            }
        } else {
            console.log('API Client already initialized');
        }
        
        // Supabase Clientの初期化を試みる
        if (!window.supabaseClient && typeof supabase !== 'undefined' && window.CONFIG?.SUPABASE) {
            try {
                const supabaseUrl = window.CONFIG.SUPABASE.URL;
                const supabaseAnonKey = window.CONFIG.SUPABASE.ANON_KEY;
                
                // URLの検証
                if (!supabaseUrl || !supabaseAnonKey) {
                    console.warn('Supabase URL or key not configured');
                } else {
                    // URLが正しい形式か検証
                    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
                        console.error('Invalid Supabase URL format:', supabaseUrl);
                    } else {
                        // 古いURLを使用していないかチェック
                        const oldInvalidUrls = ['jirppalacwwinwnsyauo', 'jffjacpedwldbgmggdcy'];
                        const isOldUrl = oldInvalidUrls.some(oldUrl => supabaseUrl.includes(oldUrl));
                        if (isOldUrl) {
                            console.warn('Detected old/invalid Supabase URL:', supabaseUrl);
                            console.log('Please update CONFIG.SUPABASE.URL in js/config.js');
                        } else {
                            // ストレージキャッシュをクリア（可能な場合）
                            if (typeof window.clearSupabaseStorageCache === 'function') {
                                window.clearSupabaseStorageCache();
                            }
                            
                            console.log('Creating Supabase client with URL:', supabaseUrl);
                            window.supabaseClient = supabase.createClient(
                                supabaseUrl, 
                                supabaseAnonKey,
                                window.CONFIG.SUPABASE.OPTIONS || {}
                            );
                            
                            // 作成されたクライアントのURLを検証（可能な場合）
                            if (window.supabaseClient && window.supabaseClient.supabaseUrl) {
                                if (window.supabaseClient.supabaseUrl !== supabaseUrl) {
                                    console.error('Supabase client URL mismatch after creation!');
                                    console.log('Expected URL:', supabaseUrl);
                                    console.log('Client URL:', window.supabaseClient.supabaseUrl);
                                    window.supabaseClient = null;
                                } else {
                                    console.log('Supabase initialized successfully');
                                }
                            } else {
                                console.log('Supabase client created (URL verification skipped)');
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Supabase initialization failed:', error);
                window.supabaseClient = null;
            }
        }
        
        // API Clientが初期化されていれば、Supabaseは必須ではない
        if (window.apiClient) {
            console.log('Initialization complete - API Client ready');
            break;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 最終確認
    if (!window.apiClient) {
        console.error('API Client initialization failed after', maxAttempts, 'attempts');
        console.error('APIClient class available:', typeof APIClient !== 'undefined');
        console.error('window.apiClient exists:', !!window.apiClient);
    } else {
        console.log('API Client is ready');
    }
    
    if (!window.supabaseClient) {
        console.warn('Supabase not available, continuing with limited functionality');
    }
}

// =====================================
// セッション管理（トークン検証のみ）
// =====================================
async function checkExistingSession() {
    console.log('=== Checking existing session ===');
    // 右下インジケータ表示開始
    try { document.getElementById('processing-indicator')?.classList.add('show'); } catch (_) {}
    const adminToken = sessionStorage.getItem('admin_token');
    const adminEmail = sessionStorage.getItem('admin_email');
    const adminExp = Number(sessionStorage.getItem('admin_token_exp') || 0);
    
    console.log('Token exists:', !!adminToken);
    console.log('Email exists:', !!adminEmail);
    
    // トークン・メールがない場合は即時拒否
    if (!adminToken || !adminEmail) {
        console.log('No token/email, access denied');
        showAccessDenied();
        return;
    }

    // 有効期限が無い/切れている場合でも一度検証を試みる（後方互換）
    if (!adminExp || Date.now() >= adminExp) {
        console.log('Token exp missing/expired, attempting verification...');
        try {
            const isStillValid = await verifyAdminSession(adminToken, adminEmail);
            if (isStillValid) {
                // 検証に通った場合は新しい有効期限を付与
                const renewMs = 8 * 60 * 60 * 1000; // 8時間
                sessionStorage.setItem('admin_token_exp', String(Date.now() + renewMs));
                console.log('Session renewed with new expiration');
            } else {
                console.log('Token verification failed after exp check');
                clearSession();
                showAccessDenied();
                return;
            }
        } catch (e) {
            console.error('Verification error during exp check:', e);
            clearSession();
            showAccessDenied();
            return;
        }
    }
    
    // API Clientが存在することを確認
    if (!window.apiClient) {
        console.error('API Client not available for token verification');
        showAccessDenied();
        return;
    }
    
    // トークンを検証
    console.log('Verifying token...');
    console.log('Token (first 10 chars):', adminToken.substring(0, 10) + '...');
    console.log('Email:', adminEmail);
    
    try {
        const isValid = await verifyAdminSession(adminToken, adminEmail);
        console.log('Token verification result:', isValid);
        
        if (isValid) {
            console.log('Token is valid, showing admin panel');
            isAuthenticated = true;
            currentUser = { email: adminEmail };
            showAdminPanel(currentUser);
        } else {
            // トークンが無効な場合はアクセス拒否
            console.log('Token invalid, access denied');
            clearSession();
            showAccessDenied();
        }
    } catch (error) {
        // 検証エラーでもアクセス拒否のみ表示
        console.error('Session verification error:', error);
        console.error('Error details:', error.message, error.stack);
        clearSession();
        showAccessDenied();
    }
    finally {
        // 右下インジケータ非表示
        try { document.getElementById('processing-indicator')?.classList.remove('show'); } catch (_) {}
    }
}

async function verifyAdminSession(token, email) {
    try {
        // API Clientが存在することを確認
        if (!window.apiClient) {
            console.error('API Client not available for verification');
            return false;
        }
        
        console.log('Sending verification request...');
        const result = await window.apiClient.sendRequest('verifyAdminSession', {
            token: token,
            email: email
        });
        
        console.log('Verification response:', result);
        
        // GASのverifyAdminSessionは{valid: true/false, user: ..., error: ...}形式で返す
        // app.jsがsuccessプロパティを期待するため、validをsuccessに変換する必要がある
        if (result && result.valid === true) {
            currentUser = result.user || { email: email };
            console.log('Session verified successfully');
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
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        // ネットワークエラーやAPIエラーの場合も無効とみなす
        return false;
    }
}

function clearSession() {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_email');
    sessionStorage.removeItem('admin_token_exp');
    isAuthenticated = false;
    currentUser = null;
}

// =====================================
// 認証（トークン検証のみ）
// =====================================
// ログイン機能はlogin.htmlに移行しました
// ここではトークン検証のみを行います

function performLogout() {
    clearSession();
    // ログアウト後はlogin.htmlにリダイレクト
    window.location.href = 'login.html';
}

// =====================================
// UI表示制御
// =====================================
function showAccessDenied() {
    // JSON形式で「not allowed」のみを返す
    // ページ全体をクリアしてJSON文字列のみ表示
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin: 0; padding: 0; font-family: monospace;';
    
    // JSON形式のレスポンスを設定
    const jsonResponse = JSON.stringify({ error: 'not allowed' });
    
    // Content-TypeをJSONに設定（可能な範囲で）
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Type';
    meta.content = 'application/json';
    document.head.appendChild(meta);
    
    // JSON文字列のみを表示
    const pre = document.createElement('pre');
    pre.textContent = jsonResponse;
    pre.style.cssText = 'margin: 0; padding: 20px; white-space: pre-wrap; word-wrap: break-word;';
    document.body.appendChild(pre);
    
    // ページタイトルも変更
    document.title = 'Access Denied';
    
    // コンソールにも出力（デバッグ用）
    console.log('Access denied - JSON response:', jsonResponse);
}

function showAdminPanel(user) {
    console.log('=== Showing admin panel ===');
    console.log('User:', user);
    
    const adminMain = document.getElementById('admin-main');
    console.log('admin-main element found:', !!adminMain);
    
    if (adminMain) {
        adminMain.style.display = '';
        console.log('Admin main panel displayed');
    } else {
        console.error('admin-main element not found!');
        showError('管理画面の要素が見つかりませんでした');
        return;
    }
    
    const adminUserName = document.getElementById('admin-user-name');
    if (adminUserName && user) {
        adminUserName.textContent = user.email || user.name || '管理者';
        console.log('Admin user name set:', adminUserName.textContent);
    } else {
        console.warn('admin-user-name element not found or user is null');
    }
    
    console.log('Loading admin data...');
    loadAdminData();
    console.log('Admin panel initialization complete');
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
    // ログインフォームはlogin.htmlに移行しました
    
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
    const adminSidebarOverlay = document.getElementById('admin-sidebar-overlay');
    
    if (hamburgerMenu && adminSidebar) {
        hamburgerMenu.addEventListener('click', () => {
            adminSidebar.classList.toggle('active');
            hamburgerMenu.classList.toggle('active');
            // オーバーレイはタブレット以下でのみ表示
            if (adminSidebarOverlay) {
                if (window.innerWidth <= 1024 && adminSidebar.classList.contains('active')) {
                    adminSidebarOverlay.classList.add('active');
                } else {
                    adminSidebarOverlay.classList.remove('active');
                }
            }
        });
    }
    
    if (sidebarCloseBtn && adminSidebar) {
        sidebarCloseBtn.addEventListener('click', () => {
            adminSidebar.classList.remove('active');
            hamburgerMenu?.classList.remove('active');
            adminSidebarOverlay?.classList.remove('active');
        });
    }
    
    // オーバーレイクリックでサイドバーを閉じる
    if (adminSidebarOverlay && adminSidebar) {
        adminSidebarOverlay.addEventListener('click', () => {
            adminSidebar.classList.remove('active');
            hamburgerMenu?.classList.remove('active');
            adminSidebarOverlay.classList.remove('active');
        });
    }
    
    // サイドバー以外の領域クリックで閉じる（モバイル時のみ有効）
    document.addEventListener('click', (e) => {
        if (!adminSidebar.classList.contains('active')) return;
        const clickedInsideSidebar = e.target.closest && e.target.closest('#admin-sidebar');
        const clickedHamburger = e.target.closest && e.target.closest('#hamburger-menu');
        if (!clickedInsideSidebar && !clickedHamburger) {
            adminSidebar.classList.remove('active');
            hamburgerMenu?.classList.remove('active');
            if (window.innerWidth <= 1024) adminSidebarOverlay?.classList.remove('active');
        }
    }, true);
    
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

