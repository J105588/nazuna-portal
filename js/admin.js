/**
 * Admin Panel - Nazuna Portal
 * パスワードハッシュ化 + セッション管理対応
 */

// =====================================
// グローバル変数
// =====================================

let isAuthenticated = false;
let currentUser = null;
// APIクライアントは window.apiClient を使用

// =====================================
// 初期化
// =====================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin panel initializing...');
    
    // 初期化を待つ
    await waitForInitialization();
    
    // セッションチェック
    await checkExistingSession();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // デバッグ情報の表示（開発時のみ）
    if (window.CONFIG && window.CONFIG.APP && window.CONFIG.APP.DEBUG) {
        showDebugInfo();
    }
});

// 初期化待機関数
async function waitForInitialization() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        // API Clientの初期化
        if (!window.apiClient) {
            if (typeof APIClient !== 'undefined') {
                try {
                    window.apiClient = new APIClient();
                    console.log('API Client initialized in admin panel');
                } catch (error) {
                    console.error('API Client initialization failed:', error);
                }
            } else {
                console.log('Waiting for APIClient...');
            }
        }
        
        // Supabaseの初期化確認
        if (!window.supabaseClient) {
            if (typeof supabase !== 'undefined' && window.CONFIG && window.CONFIG.SUPABASE) {
                try {
                    window.supabaseClient = supabase.createClient(
                        window.CONFIG.SUPABASE.URL, 
                        window.CONFIG.SUPABASE.ANON_KEY,
                        window.CONFIG.SUPABASE.OPTIONS || {}
                    );
                    console.log('Supabase initialized in admin panel');
                } catch (error) {
                    console.error('Supabase initialization failed:', error);
                }
            } else {
                console.log('Waiting for Supabase...');
            }
        }
        
        // 両方が初期化されたら終了
        if (window.apiClient && window.supabaseClient) {
            console.log('All components initialized successfully');
            break;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 最終チェック
    if (!window.apiClient) {
        console.error('API Client initialization failed after retries');
        showError('システムエラー: APIクライアントが初期化できませんでした');
        return;
    }
    
    if (!window.supabaseClient) {
        console.warn('Supabase not available, continuing with limited functionality');
    }
}

// デバッグ情報表示
function showDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    if (!debugInfo) return;
    
    debugInfo.style.display = 'block';
    
    // GAS URL表示
    const gasUrlElement = document.getElementById('debug-gas-url');
    if (gasUrlElement && window.CONFIG) {
        gasUrlElement.textContent = window.CONFIG.GAS_URL;
    }
    
    // API Client状態表示
    const apiStatusElement = document.getElementById('debug-api-status');
    if (apiStatusElement) {
        if (window.apiClient) {
            apiStatusElement.textContent = '✅ 利用可能';
        } else {
            apiStatusElement.textContent = '❌ 利用不可';
        }
    }
    
    // Supabase状態表示
    const supabaseStatusElement = document.getElementById('debug-supabase-status');
    if (supabaseStatusElement) {
        if (window.supabaseClient) {
            supabaseStatusElement.textContent = '✅ 接続済み';
        } else {
            supabaseStatusElement.textContent = '❌ 未接続';
        }
    }
}

// 手動初期化（グローバル関数）
window.initializeManually = function() {
    console.log('手動初期化開始...');
    
    // API Client初期化
    if (typeof APIClient !== 'undefined') {
        try {
            window.apiClient = new APIClient();
            console.log('API Client manually initialized');
            
            const apiStatusElement = document.getElementById('debug-api-status');
            if (apiStatusElement) {
                apiStatusElement.textContent = '✅ 手動初期化完了';
            }
        } catch (error) {
            console.error('API Client manual initialization failed:', error);
            
            const apiStatusElement = document.getElementById('debug-api-status');
            if (apiStatusElement) {
                apiStatusElement.textContent = '❌ 手動初期化失敗';
            }
        }
    }
    
    // Supabase初期化
    if (typeof supabase !== 'undefined' && window.CONFIG && window.CONFIG.SUPABASE) {
        try {
            window.supabaseClient = supabase.createClient(
                window.CONFIG.SUPABASE.URL, 
                window.CONFIG.SUPABASE.ANON_KEY,
                window.CONFIG.SUPABASE.OPTIONS || {}
            );
            console.log('Supabase manually initialized');
            
            const supabaseStatusElement = document.getElementById('debug-supabase-status');
            if (supabaseStatusElement) {
                supabaseStatusElement.textContent = '✅ 手動初期化完了';
            }
        } catch (error) {
            console.error('Supabase manual initialization failed:', error);
            
            const supabaseStatusElement = document.getElementById('debug-supabase-status');
            if (supabaseStatusElement) {
                supabaseStatusElement.textContent = '❌ 手動初期化失敗';
            }
        }
    }
    
    alert('手動初期化完了！');
};

// =====================================
// セッション管理
// =====================================

/**
 * 既存のセッションをチェック
 */
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
                console.log('Session verified successfully');
            } else {
                console.log('Session invalid or expired');
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

/**
 * セッションを検証
 */
async function verifyAdminSession(token, email) {
    try {
        const result = await window.apiClient.sendRequest('verifyAdminSession', {
            token: token,
            email: email
        });
        
        if (result.valid) {
            currentUser = result.user;
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Session verification failed:', error);
        return false;
    }
}

/**
 * セッションをクリア
 */
function clearSession() {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_email');
    isAuthenticated = false;
    currentUser = null;
}

// =====================================
// 認証（パスワードハッシュ化対応）
// =====================================

/**
 * パスワードをSHA-256でハッシュ化
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * ログイン処理
 */
async function performLogin(email, password) {
    const loginButton = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    
    // ボタンを無効化
    loginButton.disabled = true;
    loginButton.textContent = 'ログイン中...';
    loginError.style.display = 'none';
    
    try {
        // 本番モードでの認証
        console.log('Hashing password...');
        const passwordHash = await hashPassword(password);
        
        console.log('Sending login request...');
        
        // API Clientが利用可能かチェック・初期化
        if (!window.apiClient) {
            if (typeof APIClient !== 'undefined') {
                console.log('API Clientを再初期化中...');
                window.apiClient = new APIClient();
            } else {
                throw new Error('API Clientが初期化されていません');
            }
        }
        
        // GAS APIでログイン
        const result = await window.apiClient.sendRequest('adminLogin', {
            email: email,
            passwordHash: passwordHash
        });
        
        if (result.success) {
            // セッション情報を保存
            sessionStorage.setItem('admin_token', result.token);
            sessionStorage.setItem('admin_email', email);
            
            isAuthenticated = true;
            currentUser = result.user;
            
            console.log('Login successful');
            
            // 管理画面を表示
            showAdminPanel(currentUser);
            
        } else {
            throw new Error(result.error || 'ログインに失敗しました');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        const loginError = document.getElementById('login-error');
        const loginErrorText = document.getElementById('login-error-text');
        
        if (loginErrorText) {
            loginErrorText.textContent = error.message || 'ログインに失敗しました';
        }
        loginError.style.display = 'block';
        
        // ボタンを再有効化
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = 'ログイン';
        }
    }
}

/**
 * ログアウト処理
 */
function performLogout() {
    console.log('Logging out...');
    
    // セッションをクリア
    clearSession();
    
    // ログイン画面を表示
    showLoginScreen();
}

// =====================================
// UI表示制御
// =====================================

/**
 * ログイン画面を表示
 */
function showLoginScreen() {
    const loginContainer = document.getElementById('login-screen');
    const adminContainer = document.getElementById('admin-main');
    
    if (loginContainer) loginContainer.style.display = 'block';
    if (adminContainer) adminContainer.style.display = 'none';
}

/**
 * 管理画面を表示
 */
function showAdminPanel(user) {
    const loginContainer = document.getElementById('login-screen');
    const adminContainer = document.getElementById('admin-main');
    const adminUserName = document.getElementById('admin-user-name');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (adminContainer) adminContainer.style.display = 'block';
    
    if (adminUserName && user) {
        adminUserName.textContent = user.email;
    }
    
    // デフォルト表示
    loadAdminData();
    
    // メンテナンス制御を初期化
    initMaintenanceControls();
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

/**
 * 成功メッセージを表示
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00c853;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// =====================================
// イベントリスナー
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
    
    // ログアウトボタン
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (confirm('ログアウトしますか？')) {
                performLogout();
            }
        });
    }
    
    // 通知送信（ボタン）
    const sendNotificationBtn = document.getElementById('send-notification-btn');
    if (sendNotificationBtn) {
        sendNotificationBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await sendNotification();
        });
    }
    
    // サイドバー メニュー切替
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

    // PWA更新モジュール
    const pwaBtn = document.getElementById('pwa-update-btn');
    if (pwaBtn) {
        pwaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.showPWAUpdateModule) {
                window.showPWAUpdateModule();
            } else if (window.pwaUpdater && window.pwaUpdater.showUpdateModule) {
                window.pwaUpdater.showUpdateModule();
            }
        });
    }
    
    // フォーラム管理のフィルターとボタン
    const approvalFilter = document.getElementById('forum-approval-filter');
    if (approvalFilter) {
        approvalFilter.addEventListener('change', loadForumPosts);
    }
    
    const forumRefreshBtn = document.getElementById('forum-refresh-btn');
    if (forumRefreshBtn) {
        forumRefreshBtn.addEventListener('click', loadForumPosts);
    }
    
    const clearNotificationFormBtn = document.getElementById('clear-notification-form');
    if (clearNotificationFormBtn) {
        clearNotificationFormBtn.addEventListener('click', clearNotificationForm);
    }
    
    // モーダルの閉じるボタン
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
    
    // サブサイドバーのハンバーガーメニュー
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
}

/**
 * 通知フォームをクリア
 */
function clearNotificationForm() {
    const form = document.getElementById('notification-form');
    if (!form) return;
    
    form.querySelectorAll('input, textarea, select').forEach(element => {
        if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = false;
        } else {
            element.value = '';
        }
    });
}

// =====================================
// タブ切り替え
// =====================================

function showSection(sectionName) {
    // セクションの表示切替
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(sectionName + '-section');
    if (target) target.classList.add('active');
    // セクションに応じてデータ読み込み
    loadTabData(sectionName);
}

// =====================================
// データ読み込み
// =====================================

async function loadAdminData() {
    // デフォルトでダッシュボードを表示
    showSection('dashboard');
}

async function loadTabData(tabName) {
    if (!isAuthenticated) {
        return;
    }
    
    switch (tabName) {
        case 'notifications':
            await loadNotificationHistory();
            break;
        case 'devices':
            await loadDeviceList();
            break;
        case 'posts':
            await loadPostList();
            break;
        case 'forum':
            await loadForumPosts();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'dashboard':
            await loadDashboardStats();
            break;
    }
}

// =====================================
// 通知送信
// =====================================

async function sendNotification() {
    const titleEl = document.getElementById('notification-title');
    const bodyEl = document.getElementById('notification-message');
    const targetEl = document.getElementById('notification-target');
    const sendButton = document.getElementById('send-notification-btn');
    
    const title = (titleEl && titleEl.value.trim()) || '';
    const body = (bodyEl && bodyEl.value.trim()) || '';
    const target = (targetEl && targetEl.value) || 'all';
    
    if (!title || !body) {
        showError('タイトルと本文を入力してください');
        return;
    }
    
    if (sendButton) { sendButton.disabled = true; sendButton.textContent = '送信中...'; }
    
    try {
        // 全デバイスに送信（GAS側の実装に合わせてエンドポイントを選択）
        const result = await window.apiClient.sendRequest('sendBulkNotifications', {
            title: title,
            body: body,
            target: target,
            url: '/',
            category: 'general'
        });
        
        if (result.success) {
            showSuccess(`通知を送信しました（成功: ${result.results.success}, 失敗: ${result.results.failed}）`);
            
            // フォームをリセット
            if (titleEl) titleEl.value = '';
            if (bodyEl) bodyEl.value = '';
            
            // 通知履歴を再読み込み
            await loadNotificationHistory();
            
        } else {
            throw new Error(result.error || '通知の送信に失敗しました');
        }
        
    } catch (error) {
        console.error('Notification send error:', error);
        showError(error.message || '通知の送信に失敗しました');
        
    } finally {
        if (sendButton) { sendButton.disabled = false; sendButton.textContent = '通知を送信'; }
    }
}

// =====================================
// 通知履歴読み込み
// =====================================

async function loadNotificationHistory() {
    const historyContainer = document.getElementById('notification-history');
    
    if (!historyContainer) {
        return;
    }
    
    historyContainer.innerHTML = '<p class="loading">読み込み中...</p>';
    
    try {
        // Supabaseから通知履歴を取得
        const { data, error } = await window.supabaseClient
            .from('notification_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            historyContainer.innerHTML = '<p class="no-data">通知履歴がありません</p>';
            return;
        }
        
        // 履歴を表示
        const html = data.map(log => `
            <div class="notification-log-item">
                <div class="log-title">${escapeHtml(log.title)}</div>
                <div class="log-body">${escapeHtml(log.body)}</div>
                <div class="log-meta">
                    <span class="log-time">${formatDateTime(log.created_at)}</span>
                    <span class="log-category">${escapeHtml(log.category)}</span>
                </div>
            </div>
        `).join('');
        
        historyContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load notification history:', error);
        historyContainer.innerHTML = '<p class="error">履歴の読み込みに失敗しました</p>';
    }
}

// =====================================
// デバイスリスト読み込み
// =====================================

async function loadDeviceList() {
    const deviceContainer = document.getElementById('device-list');
    
    if (!deviceContainer) {
        return;
    }
    
    deviceContainer.innerHTML = '<p class="loading">読み込み中...</p>';
    
    try {
        // Supabaseからデバイス情報を取得
        const { data, error } = await window.supabaseClient
            .from('notification_devices')
            .select('*')
            .order('last_used', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            deviceContainer.innerHTML = '<p class="no-data">登録されたデバイスがありません</p>';
            return;
        }
        
        // デバイス情報を表示
        const html = data.map(device => `
            <div class="device-item">
                <div class="device-info">
                    <div class="device-platform">${escapeHtml(device.platform)} / ${escapeHtml(device.browser)}</div>
                    <div class="device-details">${escapeHtml(device.device_info)}</div>
                    <div class="device-time">最終使用: ${formatDateTime(device.last_used)}</div>
                </div>
                <button class="remove-device-button" data-token="${escapeHtml(device.fcm_token)}">削除</button>
            </div>
        `).join('');
        
        deviceContainer.innerHTML = html;
        
        // 削除ボタンのイベントリスナー
        const removeButtons = deviceContainer.querySelectorAll('.remove-device-button');
        removeButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const token = button.getAttribute('data-token');
                await removeDevice(token);
            });
        });
        
    } catch (error) {
        console.error('Failed to load device list:', error);
        deviceContainer.innerHTML = '<p class="error">デバイス情報の読み込みに失敗しました</p>';
    }
}

// =====================================
// デバイス削除
// =====================================

async function removeDevice(fcmToken) {
    if (!confirm('このデバイスを削除しますか？')) {
        return;
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('notification_devices')
            .delete()
            .eq('fcm_token', fcmToken);
        
        if (error) throw error;
        
        showSuccess('デバイスを削除しました');
        await loadDeviceList();
        
    } catch (error) {
        console.error('Failed to remove device:', error);
        showError('デバイスの削除に失敗しました');
    }
}

// =====================================
// 投稿リスト読み込み
// =====================================

async function loadPostList() {
    const postContainer = document.getElementById('post-list');
    
    if (!postContainer) {
        return;
    }
    
    postContainer.innerHTML = '<p class="loading">読み込み中...</p>';
    
    try {
        const { data, error } = await window.supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            postContainer.innerHTML = '<p class="no-data">投稿がありません</p>';
            return;
        }
        
        const html = data.map(post => `
            <div class="post-item">
                <div class="post-header">
                    <span class="post-author">${escapeHtml(post.author_name || '匿名')}</span>
                    <span class="post-time">${formatDateTime(post.created_at)}</span>
                </div>
                <div class="post-content">${escapeHtml(post.content)}</div>
                <div class="post-actions">
                    <button class="delete-post-button" data-id="${post.id}">削除</button>
                </div>
            </div>
        `).join('');
        
        postContainer.innerHTML = html;
        
        // 削除ボタンのイベントリスナー
        const deleteButtons = postContainer.querySelectorAll('.delete-post-button');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const postId = button.getAttribute('data-id');
                await deletePost(postId);
            });
        });
        
    } catch (error) {
        console.error('Failed to load post list:', error);
        postContainer.innerHTML = '<p class="error">投稿の読み込みに失敗しました</p>';
    }
}

// =====================================
// 投稿削除
// =====================================

async function deletePost(postId) {
    if (!confirm('この投稿を削除しますか？')) {
        return;
    }
    
    try {
        const { error } = await window.supabaseClient
            .from('posts')
            .delete()
            .eq('id', postId);
        
        if (error) throw error;
        
        showSuccess('投稿を削除しました');
        await loadPostList();
        
    } catch (error) {
        console.error('Failed to delete post:', error);
        showError('投稿の削除に失敗しました');
    }
}

// =====================================
// 設定読み込み
// =====================================

function loadSettings() {
    console.log('Loading settings...');
    // 設定UIの実装
}

// =====================================
// フォーラム管理（投稿承認機能）
// =====================================

/**
 * フォーラム投稿一覧を読み込む
 */
async function loadForumPosts() {
    const container = document.getElementById('forum-table-body');
    const alertDiv = document.getElementById('approval-alert');
    const pendingCountSpan = document.getElementById('pending-count');
    
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="7" class="loading-state">読み込み中...</td></tr>';
    
    try {
        // 承認状態フィルターを取得
        const approvalFilter = document.getElementById('forum-approval-filter')?.value || 'all';
        
        // Supabaseから投稿を取得
        let query = window.supabaseClient
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (approvalFilter !== 'all') {
            query = query.eq('approval_status', approvalFilter);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // 承認待ち件数を表示
        if (pendingCountSpan && data) {
            const pendingCount = data.filter(p => p.approval_status === 'pending').length;
            pendingCountSpan.textContent = pendingCount;
            
            if (alertDiv) {
                alertDiv.style.display = pendingCount > 0 ? 'block' : 'none';
            }
        }
        
        if (data && data.length > 0) {
            container.innerHTML = data.map(post => renderForumPostRow(post)).join('');
        } else {
            container.innerHTML = '<tr><td colspan="7" class="empty-state">投稿がありません</td></tr>';
        }
        
    } catch (error) {
        console.error('Error loading forum posts:', error);
        container.innerHTML = '<tr><td colspan="7" class="error-state">読み込みエラーが発生しました</td></tr>';
    }
}

/**
 * フォーラム投稿の行をレンダリング
 */
function renderForumPostRow(post) {
    const approvalBadge = getApprovalStatusBadge(post.approval_status);
    const statusBadge = getStatusBadge(post.status || 'pending');
    const category = getCategoryLabel(post.category);
    const contentPreview = post.content.length > 100 
        ? post.content.substring(0, 100) + '...' 
        : post.content;
    const createdDate = formatDateTime(post.created_at);
    
    const actionButtons = post.approval_status === 'pending'
        ? `
            <button class="btn btn-success btn-sm" onclick="approvePost('${post.id}')">
                <i class="fas fa-check"></i> 承認
            </button>
            <button class="btn btn-danger btn-sm" onclick="rejectPostPrompt('${post.id}')">
                <i class="fas fa-times"></i> 却下
            </button>
        `
        : '';
    
    return `
        <tr>
            <td>${post.id.substring(0, 8)}...</td>
            <td>${escapeHtml(contentPreview)}</td>
            <td>${category}</td>
            <td>${approvalBadge}</td>
            <td>${statusBadge}</td>
            <td>${createdDate}</td>
            <td class="action-buttons">
                ${actionButtons}
                <button class="btn btn-outline btn-sm" onclick="viewPostDetails('${post.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `;
}

/**
 * 承認ステータスのバッジを取得
 */
function getApprovalStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> 承認待ち</span>',
        'approved': '<span class="status-badge status-active"><i class="fas fa-check-circle"></i> 承認済み</span>',
        'rejected': '<span class="status-badge status-closed"><i class="fas fa-times-circle"></i> 却下済み</span>'
    };
    return badges[status] || status;
}

/**
 * ステータスのバッジを取得
 */
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending">対応待ち</span>',
        'in_progress': '<span class="status-badge status-active">対応中</span>',
        'resolved': '<span class="status-badge status-resolved">解決済み</span>',
        'closed': '<span class="status-badge status-closed">終了</span>'
    };
    return badges[status] || status;
}

/**
 * カテゴリのラベルを取得
 */
function getCategoryLabel(category) {
    const categories = {
        'suggestion': '提案・要望',
        'complaint': '苦情・問題',
        'question': '質問',
        'event': 'イベント',
        'facility': '施設・設備',
        'other': 'その他',
        'general': '一般'
    };
    return categories[category] || category;
}

/**
 * 投稿を承認
 */
async function approvePost(postId) {
    if (!confirm('この投稿を承認しますか？')) return;
    
    try {
        const currentUserEmail = currentUser?.email || 'admin@school.ac.jp';
        
        const { error } = await window.supabaseClient
            .from('posts')
            .update({
                approval_status: 'approved',
                approval_admin_email: currentUserEmail,
                approval_date: new Date().toISOString()
            })
            .eq('id', postId);
        
        if (error) throw error;
        
        // アクションログに記録
        await logPostAction(postId, 'approve', currentUserEmail);
        
        showSuccess('投稿を承認しました');
        await loadForumPosts();
        
    } catch (error) {
        console.error('Error approving post:', error);
        showError('承認に失敗しました');
    }
}

/**
 * 却下理由入力プロンプト
 */
function rejectPostPrompt(postId) {
    const reason = prompt('却下理由を入力してください（任意）');
    if (reason !== null) {
        rejectPost(postId, reason);
    }
}

/**
 * 投稿を却下
 */
async function rejectPost(postId, reason = '') {
    try {
        const currentUserEmail = currentUser?.email || 'admin@school.ac.jp';
        
        const { error } = await window.supabaseClient
            .from('posts')
            .update({
                approval_status: 'rejected',
                approval_admin_email: currentUserEmail,
                approval_date: new Date().toISOString(),
                rejection_reason: reason
            })
            .eq('id', postId);
        
        if (error) throw error;
        
        // アクションログに記録
        await logPostAction(postId, 'reject', currentUserEmail, { reason });
        
        showSuccess('投稿を却下しました');
        await loadForumPosts();
        
    } catch (error) {
        console.error('Error rejecting post:', error);
        showError('却下に失敗しました');
    }
}

/**
 * 投稿アクションをログに記録
 */
async function logPostAction(postId, actionType, adminEmail, details = {}) {
    try {
        const { error } = await window.supabaseClient
            .from('post_action_logs')
            .insert([{
                post_id: postId,
                action_type: actionType,
                admin_email: adminEmail,
                admin_name: currentUser?.name || '管理者',
                details: details
            }]);
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Error logging post action:', error);
    }
}

/**
 * 投稿詳細を表示
 */
async function viewPostDetails(postId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
        
        if (error) throw error;
        
        // モーダルで詳細を表示
        showModal('投稿詳細', `
            <div class="post-details">
                <p><strong>投稿ID:</strong> ${data.id}</p>
                <p><strong>内容:</strong></p>
                <p>${escapeHtml(data.content)}</p>
                <p><strong>カテゴリ:</strong> ${getCategoryLabel(data.category)}</p>
                <p><strong>承認状態:</strong> ${getApprovalStatusBadge(data.approval_status)}</p>
                <p><strong>投稿日:</strong> ${formatDateTime(data.created_at)}</p>
                ${data.rejection_reason ? `<p><strong>却下理由:</strong> ${escapeHtml(data.rejection_reason)}</p>` : ''}
            </div>
        `);
        
    } catch (error) {
        console.error('Error viewing post details:', error);
        showError('投稿詳細の取得に失敗しました');
    }
}

/**
 * モーダルを表示
 */
function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

/**
 * ダッシュボード統計を読み込む
 */
async function loadDashboardStats() {
    try {
        const stats = await window.supabaseQueries?.getStatistics();
        
        if (stats) {
            document.getElementById('news-count').textContent = stats.news_count || 0;
            document.getElementById('survey-count').textContent = stats.surveys_count || 0;
            document.getElementById('club-count').textContent = stats.clubs_count || 0;
            document.getElementById('forum-count').textContent = stats.posts_count || 0;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
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

// CSSアニメーション
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

// メンテナンスモード管理のスタイル
const maintenanceStyle = document.createElement('style');
maintenanceStyle.textContent = `
    .system-controls {
        display: grid;
        gap: 20px;
        margin-top: 20px;
    }
    
    .control-card {
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 24px;
        box-shadow: var(--shadow-light);
    }
    
    .control-card h3 {
        margin: 0 0 16px;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-color);
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .maintenance-status {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding: 12px;
        background: var(--background-color);
        border-radius: 8px;
    }
    
    .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    
    .status-indicator.status-active {
        background: #f39c12;
        box-shadow: 0 0 8px rgba(243, 156, 18, 0.5);
    }
    
    .status-indicator.status-inactive {
        background: #27ae60;
        box-shadow: 0 0 8px rgba(39, 174, 96, 0.5);
    }
    
    .status-text {
        font-weight: 500;
        color: var(--text-color);
    }
    
    .maintenance-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }
    
    .maintenance-form {
        margin-top: 16px;
        padding: 16px;
        background: var(--background-color);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }
    
    .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
        justify-content: flex-end;
    }
    
    @media (max-width: 768px) {
        .maintenance-actions {
            flex-direction: column;
        }
        
        .form-actions {
            flex-direction: column;
        }
    }
`;

document.head.appendChild(style);
document.head.appendChild(maintenanceStyle);

/**
 * メンテナンスモード管理の初期化
 */
function initMaintenanceControls() {
    const enableBtn = document.getElementById('enable-maintenance-btn');
    const disableBtn = document.getElementById('disable-maintenance-btn');
    const confirmBtn = document.getElementById('confirm-maintenance-btn');
    const cancelBtn = document.getElementById('cancel-maintenance-btn');
    const form = document.getElementById('maintenance-form');
    const actions = document.getElementById('maintenance-actions');
    
    if (enableBtn) {
        enableBtn.addEventListener('click', () => {
            form.style.display = 'block';
            actions.style.display = 'none';
        });
    }
    
    if (disableBtn) {
        disableBtn.addEventListener('click', async () => {
            if (confirm('メンテナンスモードを終了しますか？')) {
                const success = await window.maintenanceChecker.disableMaintenance();
                if (success) {
                    updateMaintenanceStatus(false);
                }
            }
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const message = document.getElementById('maintenance-message').value;
            const endTimeInput = document.getElementById('maintenance-end-time').value;
            
            if (!message.trim()) {
                alert('メッセージを入力してください');
                return;
            }
            
            // datetime-localの値をISO形式に変換
            let endTime = null;
            if (endTimeInput) {
                const date = new Date(endTimeInput);
                endTime = date.toISOString();
            }
            
            const success = await window.maintenanceChecker.enableMaintenance(message, endTime);
            if (success) {
                updateMaintenanceStatus(true);
                form.style.display = 'none';
                actions.style.display = 'block';
                // フォームをリセット
                document.getElementById('maintenance-message').value = '';
                document.getElementById('maintenance-end-time').value = '';
            }
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            form.style.display = 'none';
            actions.style.display = 'block';
        });
    }
    
    // 初期状態をチェック
    checkMaintenanceStatus();
}

/**
 * メンテナンス状態をチェック
 */
async function checkMaintenanceStatus() {
    try {
        const result = await window.apiClient.sendRequest('checkMaintenance');
        if (result.success) {
            updateMaintenanceStatus(result.maintenance);
        }
    } catch (error) {
        console.warn('Failed to check maintenance status:', error);
        updateMaintenanceStatus(false);
    }
}

/**
 * メンテナンス状態のUIを更新
 */
function updateMaintenanceStatus(isMaintenance) {
    const indicator = document.getElementById('maintenance-indicator');
    const text = document.getElementById('maintenance-text');
    const actions = document.getElementById('maintenance-actions');
    const enableBtn = document.getElementById('enable-maintenance-btn');
    const disableBtn = document.getElementById('disable-maintenance-btn');
    
    if (isMaintenance) {
        indicator.className = 'status-indicator status-active';
        text.textContent = 'メンテナンス中';
        enableBtn.style.display = 'none';
        disableBtn.style.display = 'inline-flex';
    } else {
        indicator.className = 'status-indicator status-inactive';
        text.textContent = '通常稼働中';
        enableBtn.style.display = 'inline-flex';
        disableBtn.style.display = 'none';
    }
    
    actions.style.display = 'block';
}