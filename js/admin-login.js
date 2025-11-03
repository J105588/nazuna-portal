// =====================================
// 管理画面ログイン専用スクリプト
// login.html用
// =====================================

// シンプルなハッシュ（クライアント側）
if (!window.sha256) {
    async function sha256(text) {
        const enc = new TextEncoder();
        const data = enc.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    window.sha256 = sha256;
}

// API Client初期化待機
let apiClientReady = false;

// ページ初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Login page initializing...');
    
    // API Client初期化を待つ
    await waitForAPIClient();
    
    // ログインフォームのイベントリスナーを設定
    setupLoginForm();
    
    // 既にログイン済みの場合はadmin.htmlにリダイレクト
    const adminToken = sessionStorage.getItem('admin_token');
    const adminEmail = sessionStorage.getItem('admin_email');
    
    if (adminToken && adminEmail) {
        console.log('Existing token found, verifying...');
        const isValid = await verifyAdminSession(adminToken, adminEmail);
        if (isValid) {
            console.log('Token is valid, redirecting to admin.html');
            window.location.href = 'admin.html';
            return;
        } else {
            // トークンが無効な場合は削除
            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('admin_email');
        }
    }
});

// API Client初期化待機
async function waitForAPIClient() {
    let attempts = 0;
    const maxAttempts = 20; // 10秒間待機
    
    while (attempts < maxAttempts) {
        if (typeof APIClient !== 'undefined') {
            try {
                if (!window.apiClient) {
                    window.apiClient = new APIClient();
                }
                apiClientReady = true;
                console.log('API Client initialized');
                return;
            } catch (error) {
                console.error('API Client initialization error:', error);
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    console.error('API Client initialization timeout');
    showLoginError('システムエラー: APIクライアントが初期化できませんでした');
}

// ログインフォームの設定
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value.trim(); // 前後の空白を削除
        
        if (!email || !password) {
            showLoginError('メールアドレスとパスワードを入力してください');
            return;
        }
        
        await performLogin(email, password);
    });
}

// ログイン処理
async function performLogin(email, password) {
    const loginButton = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
    loginError.style.display = 'none';
    
    try {
        if (!apiClientReady || !window.apiClient) {
            await waitForAPIClient();
            if (!window.apiClient) {
                throw new Error('API Clientが初期化されていません');
            }
        }
        
        // パスワードが空でないことを確認
        if (!password || password.trim().length === 0) {
            throw new Error('パスワードを入力してください');
        }
        
        // パスワードをハッシュ化（前後の空白を削除済み）
        const passwordHash = await sha256(password);
        
        // デバッグ用：ハッシュ計算の検証
        const expectedHash = 'bd61359f215d97e146dec8928131df490382cea699abd2aacf50be0d3ae5d589';
        const correctPassword = 'Nazuna-portal@igsc';
        const correctPasswordHash = await sha256(correctPassword);
        
        console.log('=== パスワードハッシュ検証 ===');
        console.log('入力パスワード（長さ）:', password.length, '文字');
        console.log('入力パスワード（表示）:', password.replace(/./g, '*'));
        console.log('計算されたハッシュ:', passwordHash);
        console.log('正しいパスワードのハッシュ:', correctPasswordHash);
        console.log('期待されるハッシュ:', expectedHash);
        console.log('ハッシュ一致:', passwordHash === expectedHash);
        console.log('正しいパスワードとの一致:', passwordHash === correctPasswordHash);
        
        // パスワードの文字列比較（デバッグ用、本番では削除推奨）
        if (CONFIG?.APP?.DEBUG) {
            const passwordChars = Array.from(password);
            const correctChars = Array.from(correctPassword);
            const charComparison = passwordChars.map((c, i) => {
                const correctChar = i < correctChars.length ? correctChars[i] : null;
                const match = correctChar !== null && c === correctChar;
                return {
                    index: i,
                    inputChar: c,
                    inputCode: c.charCodeAt(0),
                    correctChar: correctChar,
                    correctCode: correctChar ? correctChar.charCodeAt(0) : 'N/A',
                    match: match,
                    diff: !match ? `'${c}'(${c.charCodeAt(0)}) vs '${correctChar}'(${correctChar ? correctChar.charCodeAt(0) : 'N/A'})` : 'OK'
                };
            });
            
            const mismatches = charComparison.filter(c => !c.match);
            console.log('=== パスワード文字列詳細比較 ===');
            console.log('入力パスワード:', password);
            console.log('正しいパスワード:', correctPassword);
            console.log('不一致の文字数:', mismatches.length);
            if (mismatches.length > 0) {
                console.log('不一致の文字詳細:');
                mismatches.forEach(m => {
                    console.log(`  位置 ${m.index}: ${m.diff}`);
                });
            }
            console.log('全文字比較:', charComparison);
        }
        
        // ログインリクエスト
        const result = await window.apiClient.sendRequest('adminLogin', {
            email: email,
            passwordHash: passwordHash
        });
        
        if (result && result.success && result.token) {
            // トークンをsessionStorageに保存
            sessionStorage.setItem('admin_token', result.token);
            sessionStorage.setItem('admin_email', email);
            
            console.log('=== Login successful ===');
            console.log('Token saved to sessionStorage');
            console.log('Token (first 10 chars):', result.token.substring(0, 10) + '...');
            console.log('Email:', email);
            console.log('Verifying token is saved...');
            
            // 保存を確認
            const savedToken = sessionStorage.getItem('admin_token');
            const savedEmail = sessionStorage.getItem('admin_email');
            console.log('Token verification - saved:', !!savedToken);
            console.log('Email verification - saved:', !!savedEmail);
            
            if (!savedToken || !savedEmail) {
                throw new Error('セッションストレージへの保存に失敗しました');
            }
            
            console.log('Redirecting to admin.html...');
            
            // admin.htmlにリダイレクト
            window.location.href = 'admin.html';
        } else {
            throw new Error(result?.error || 'ログインに失敗しました');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError(error.message || 'ログインに失敗しました。認証情報を確認してください。');
        
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> ログイン';
    }
}

// セッション検証（既存トークンの確認用）
async function verifyAdminSession(token, email) {
    try {
        if (!window.apiClient) {
            return false;
        }
        
        const result = await window.apiClient.sendRequest('verifyAdminSession', {
            token: token,
            email: email
        });
        
        return result && result.valid === true;
    } catch (error) {
        console.error('Session verification error:', error);
        return false;
    }
}

// ログインエラー表示
function showLoginError(message) {
    const loginError = document.getElementById('login-error');
    const loginErrorText = document.getElementById('login-error-text');
    
    if (loginError && loginErrorText) {
        loginErrorText.textContent = message;
        loginError.style.display = 'block';
    }
}

