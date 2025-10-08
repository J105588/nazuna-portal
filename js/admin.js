/**
 * Admin Panel - Nazuna Portal
 * パスワードハッシュ化 + セッション管理対応
 */

// =====================================
// グローバル変数
// =====================================

let isAuthenticated = false;
let currentUser = null;
let apiClient = null;

// =====================================
// 初期化
// =====================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin panel initializing...');
    
    // API Clientの初期化
    if (typeof APIClient !== 'undefined') {
        apiClient = new APIClient();
    } else {
        console.error('APIClient not found');
        showError('システムエラー: APIクライアントが読み込まれていません');
        return;
    }
    
    // セッションチェック
    await checkExistingSession();
    
    // イベントリスナーの設定
    setupEventListeners();
});

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
        const result = await apiClient.sendRequest('verifyAdminSession', {
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
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');
    
    // ボタンを無効化
    loginButton.disabled = true;
    loginButton.textContent = 'ログイン中...';
    loginError.style.display = 'none';
    
    try {
        // パスワードをハッシュ化
        console.log('Hashing password...');
        const passwordHash = await hashPassword(password);
        
        console.log('Sending login request...');
        
        // GAS APIでログイン
        const result = await apiClient.sendRequest('adminLogin', {
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
        
        loginError.textContent = error.message || 'ログインに失敗しました';
        loginError.style.display = 'block';
        
        // ボタンを再有効化
        loginButton.disabled = false;
        loginButton.textContent = 'ログイン';
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
    const loginContainer = document.getElementById('login-container');
    const adminContainer = document.getElementById('admin-container');
    
    if (loginContainer && adminContainer) {
        loginContainer.style.display = 'flex';
        adminContainer.style.display = 'none';
    }
}

/**
 * 管理画面を表示
 */
function showAdminPanel(user) {
    const loginContainer = document.getElementById('login-container');
    const adminContainer = document.getElementById('admin-container');
    const adminUserName = document.getElementById('admin-user-name');
    
    if (loginContainer && adminContainer) {
        loginContainer.style.display = 'none';
        adminContainer.style.display = 'block';
    }
    
    if (adminUserName && user) {
        adminUserName.textContent = user.email;
    }
    
    // データを読み込み
    loadAdminData();
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
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (confirm('ログアウトしますか？')) {
                performLogout();
            }
        });
    }
    
    // 通知送信フォーム
    const notificationForm = document.getElementById('notification-form');
    if (notificationForm) {
        notificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await sendNotification();
        });
    }
    
    // タブ切り替え
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

// =====================================
// タブ切り替え
// =====================================

function switchTab(tabName) {
    // 全てのタブコンテンツを非表示
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    
    // 全てのタブボタンを非アクティブ
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // 選択されたタブを表示
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // 選択されたボタンをアクティブ
    const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // タブに応じてデータを読み込み
    loadTabData(tabName);
}

// =====================================
// データ読み込み
// =====================================

async function loadAdminData() {
    // デフォルトで通知タブを表示
    switchTab('notifications');
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
        case 'settings':
            loadSettings();
            break;
    }
}

// =====================================
// 通知送信
// =====================================

async function sendNotification() {
    const title = document.getElementById('notification-title').value.trim();
    const body = document.getElementById('notification-body').value.trim();
    const url = document.getElementById('notification-url').value.trim() || '/';
    const category = document.getElementById('notification-category').value;
    const sendButton = document.getElementById('send-notification-button');
    
    if (!title || !body) {
        showError('タイトルと本文を入力してください');
        return;
    }
    
    sendButton.disabled = true;
    sendButton.textContent = '送信中...';
    
    try {
        // 全デバイスに送信
        const result = await apiClient.sendRequest('sendBulkNotifications', {
            title: title,
            body: body,
            url: url,
            category: category
        });
        
        if (result.success) {
            showSuccess(`通知を送信しました（成功: ${result.results.success}, 失敗: ${result.results.failed}）`);
            
            // フォームをリセット
            document.getElementById('notification-form').reset();
            
            // 通知履歴を再読み込み
            await loadNotificationHistory();
            
        } else {
            throw new Error(result.error || '通知の送信に失敗しました');
        }
        
    } catch (error) {
        console.error('Notification send error:', error);
        showError(error.message || '通知の送信に失敗しました');
        
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = '通知を送信';
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
document.head.appendChild(style);