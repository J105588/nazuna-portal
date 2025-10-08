/**
 * Nazuna Portal - Google Apps Script API
 * Firebase Cloud Messaging (FCM) HTTP v1 API統合
 * 自動トークン更新機能付き
 */

// =====================================
// 設定
// =====================================

function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  
  return {
    // Supabase設定
    SUPABASE_URL: properties.getProperty('SUPABASE_URL') || 'https://jirppalacwwinwnsyauo.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: properties.getProperty('SUPABASE_SERVICE_ROLE_KEY') || 'your-service-role-key',
    
    // Firebase設定
    FIREBASE_PROJECT_ID: properties.getProperty('FIREBASE_PROJECT_ID') || 'your-project-id',
    FIREBASE_SERVICE_ACCOUNT_JSON: properties.getProperty('FIREBASE_SERVICE_ACCOUNT_JSON') || '{}',
    
    // Access Token（キャッシュ用）
    FIREBASE_ACCESS_TOKEN: properties.getProperty('FIREBASE_ACCESS_TOKEN'),
    FIREBASE_TOKEN_EXPIRY: properties.getProperty('FIREBASE_TOKEN_EXPIRY')
  };
}

// =====================================
// Firebase Access Token管理（自動更新）
// =====================================

/**
 * Firebase Access Tokenを取得（自動更新機能付き）
 * @returns {string|null} Access Token
 */
function getFirebaseAccessToken() {
  const properties = PropertiesService.getScriptProperties();
  const config = getConfig();
  
  // キャッシュされたトークンを確認
  const cachedToken = config.FIREBASE_ACCESS_TOKEN;
  const tokenExpiry = config.FIREBASE_TOKEN_EXPIRY;
  
  // トークンが有効かチェック（有効期限の5分前に更新）
  if (cachedToken && tokenExpiry) {
    const expiryTime = parseInt(tokenExpiry);
    const now = Math.floor(Date.now() / 1000);
    
    if (now < expiryTime - 300) { // 5分のバッファ
      console.log('Using cached Firebase access token');
      return cachedToken;
    }
  }
  
  // 新しいトークンを取得
  console.log('Fetching new Firebase access token...');
  
  try {
    const serviceAccountJson = config.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (!serviceAccountJson || serviceAccountJson === '{}') {
      console.error('Firebase Service Account JSON not configured');
      return null;
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // JWT作成
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1時間
    
    const jwt = createJWT({
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/firebase.messaging'
    }, serviceAccount.private_key);
    
    // OAuth2トークン取得
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      payload: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      },
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      console.error('Failed to get Firebase access token:', responseCode, responseText);
      return null;
    }
    
    const data = JSON.parse(responseText);
    const accessToken = data.access_token;
    
    // キャッシュに保存（有効期限も保存）
    properties.setProperty('FIREBASE_ACCESS_TOKEN', accessToken);
    properties.setProperty('FIREBASE_TOKEN_EXPIRY', String(expiry));
    
    console.log('New Firebase access token obtained and cached');
    
    return accessToken;
    
  } catch (error) {
    console.error('Error getting Firebase access token:', error.toString());
    return null;
  }
}

/**
 * JWTを作成
 * @param {Object} payload - JWTペイロード
 * @param {string} privateKey - 秘密鍵
 * @returns {string} JWT
 */
function createJWT(payload, privateKey) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  // Base64エンコード
  const base64Encode = function(obj) {
    const json = JSON.stringify(obj);
    const encoded = Utilities.base64EncodeWebSafe(json);
    return encoded.replace(/=+$/, ''); // パディング削除
  };
  
  const encodedHeader = base64Encode(header);
  const encodedPayload = base64Encode(payload);
  const signatureInput = encodedHeader + '.' + encodedPayload;
  
  // RSA-SHA256署名
  const signature = Utilities.computeRsaSha256Signature(signatureInput, privateKey);
  const encodedSignature = Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
  
  return signatureInput + '.' + encodedSignature;
}

// =====================================
// FCM通知送信（統一されたデータ構造）
// =====================================

/**
 * FCM HTTP v1 APIで通知を送信
 * @param {string} fcmToken - デバイスのFCMトークン
 * @param {Object} notification - 通知内容
 * @returns {Object} 送信結果
 */
function sendFCMNotification(fcmToken, notification) {
  const config = getConfig();
  const accessToken = getFirebaseAccessToken();
  
  if (!accessToken) {
    return {
      success: false,
      error: 'Failed to obtain Firebase access token'
    };
  }
  
  const projectId = config.FIREBASE_PROJECT_ID;
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  
  // 統一されたメッセージ構造
  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: notification.title || 'お知らせ',
        body: notification.body || ''
      },
      data: {
        // 全てのデータを文字列として送信
        title: String(notification.title || 'お知らせ'),
        body: String(notification.body || ''),
        url: String(notification.url || '/'),
        category: String(notification.category || 'general'),
        timestamp: String(Date.now()),
        icon: String(notification.icon || '/images/icon-192x192.png'),
        badge: String(notification.badge || '/images/badge-72x72.png')
      },
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          icon: notification.icon || '/images/icon-192x192.png',
          badge: notification.badge || '/images/badge-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: false
        },
        fcm_options: {
          link: notification.url || '/'
        }
      }
    }
  };
  
  try {
    const response = UrlFetchApp.fetch(fcmUrl, {
      method: 'POST',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      },
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200) {
      console.log('Notification sent successfully:', responseText);
      return {
        success: true,
        response: JSON.parse(responseText)
      };
    } else {
      console.error('Failed to send notification:', responseCode, responseText);
      
      // トークンが無効な場合はエラーを返す
      if (responseText.includes('INVALID_ARGUMENT') || responseText.includes('registration-token-not-registered')) {
        return {
          success: false,
          error: 'Invalid or expired FCM token',
          shouldRemoveToken: true
        };
      }
      
      return {
        success: false,
        error: responseText
      };
    }
    
  } catch (error) {
    console.error('Error sending FCM notification:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 複数のデバイスに通知を送信
 * @param {Array<string>} fcmTokens - FCMトークンの配列
 * @param {Object} notification - 通知内容
 * @returns {Object} 送信結果
 */
function sendBulkNotifications(fcmTokens, notification) {
  const results = {
    success: 0,
    failed: 0,
    invalidTokens: []
  };
  
  fcmTokens.forEach(token => {
    const result = sendFCMNotification(token, notification);
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      
      if (result.shouldRemoveToken) {
        results.invalidTokens.push(token);
      }
    }
    
    // レート制限対策（100ms待機）
    Utilities.sleep(100);
  });
  
  return results;
}

// =====================================
// Supabase連携
// =====================================

/**
 * Supabaseからデバイス情報を取得
 * @param {string} userId - ユーザーID（オプション）
 * @returns {Array} デバイス情報の配列
 */
function getDevicesFromSupabase(userId) {
  const config = getConfig();
  const supabaseUrl = config.SUPABASE_URL;
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  
  let url = `${supabaseUrl}/rest/v1/notification_devices?select=*`;
  
  if (userId) {
    url += `&user_id=eq.${userId}`;
  }
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return JSON.parse(response.getContentText());
    } else {
      console.error('Failed to fetch devices:', response.getContentText());
      return [];
    }
    
  } catch (error) {
    console.error('Error fetching devices:', error.toString());
    return [];
  }
}

/**
 * 無効なFCMトークンをSupabaseから削除
 * @param {string} fcmToken - 削除するFCMトークン
 * @returns {boolean} 成功したかどうか
 */
function removeInvalidToken(fcmToken) {
  const config = getConfig();
  const supabaseUrl = config.SUPABASE_URL;
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  
  const url = `${supabaseUrl}/rest/v1/notification_devices?fcm_token=eq.${encodeURIComponent(fcmToken)}`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey
      },
      muteHttpExceptions: true
    });
    
    return response.getResponseCode() === 204;
    
  } catch (error) {
    console.error('Error removing invalid token:', error.toString());
    return false;
  }
}

// =====================================
// 管理者認証（ハッシュ化対応）
// =====================================

/**
 * 管理者ログイン（パスワードハッシュで検証）
 * @param {string} email - メールアドレス
 * @param {string} passwordHash - SHA-256ハッシュ化されたパスワード
 * @returns {Object} ログイン結果
 */
function adminLogin(email, passwordHash) {
  const config = getConfig();
  const supabaseUrl = config.SUPABASE_URL;
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  
  try {
    // 管理者情報を取得
    const url = `${supabaseUrl}/rest/v1/admin_users?select=*&email=eq.${encodeURIComponent(email)}`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      return {
        success: false,
        error: 'Database error'
      };
    }
    
    const admins = JSON.parse(response.getContentText());
    
    if (admins.length === 0) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
    
    const admin = admins[0];
    
    // パスワードハッシュを検証
    if (admin.password_hash !== passwordHash) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
    
    // セッショントークンを生成
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間
    
    // セッション情報をDBに保存
    const sessionUrl = `${supabaseUrl}/rest/v1/admin_sessions`;
    
    UrlFetchApp.fetch(sessionUrl, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      payload: JSON.stringify({
        admin_id: admin.id,
        token: sessionToken,
        expires_at: expiresAt.toISOString()
      }),
      muteHttpExceptions: true
    });
    
    return {
      success: true,
      token: sessionToken,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name
      }
    };
    
  } catch (error) {
    console.error('Login error:', error.toString());
    return {
      success: false,
      error: 'Server error'
    };
  }
}

/**
 * セッショントークンを検証
 * @param {string} token - セッショントークン
 * @param {string} email - メールアドレス
 * @returns {Object} 検証結果
 */
function verifyAdminSession(token, email) {
  const config = getConfig();
  const supabaseUrl = config.SUPABASE_URL;
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  
  try {
    // セッション情報を取得
    const url = `${supabaseUrl}/rest/v1/admin_sessions?select=*,admin_users(*)&token=eq.${encodeURIComponent(token)}`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      return { valid: false };
    }
    
    const sessions = JSON.parse(response.getContentText());
    
    if (sessions.length === 0) {
      return { valid: false };
    }
    
    const session = sessions[0];
    
    // 有効期限をチェック
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, expired: true };
    }
    
    // メールアドレスを確認
    if (session.admin_users.email !== email) {
      return { valid: false };
    }
    
    return {
      valid: true,
      user: {
        id: session.admin_users.id,
        email: session.admin_users.email,
        name: session.admin_users.name
      }
    };
    
  } catch (error) {
    console.error('Session verification error:', error.toString());
    return { valid: false };
  }
}

/**
 * セッショントークンを生成
 * @returns {string} ランダムなトークン
 */
function generateSessionToken() {
  const randomBytes = Utilities.getUuid();
  const timestamp = Date.now().toString(36);
  return Utilities.base64EncodeWebSafe(randomBytes + timestamp).replace(/=/g, '');
}

// =====================================
// APIエンドポイント
// =====================================

/**
 * doPost - メインAPIエンドポイント
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    
    switch (action) {
      case 'sendNotification':
        return sendNotificationHandler(params);
        
      case 'sendBulkNotifications':
        return sendBulkNotificationsHandler(params);
        
      case 'registerDevice':
        return registerDeviceHandler(params);
        
      case 'adminLogin':
        return adminLoginHandler(params);
        
      case 'verifyAdminSession':
        return verifyAdminSessionHandler(params);
        
      default:
        return createResponse({
          success: false,
          error: 'Unknown action'
        });
    }
    
  } catch (error) {
    console.error('API Error:', error.toString());
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * 通知送信ハンドラ
 */
function sendNotificationHandler(params) {
  const { fcm_token, title, body, url, category, icon, badge } = params;
  
  const result = sendFCMNotification(fcm_token, {
    title: title,
    body: body,
    url: url,
    category: category,
    icon: icon,
    badge: badge
  });
  
  // 無効なトークンを削除
  if (result.shouldRemoveToken) {
    removeInvalidToken(fcm_token);
  }
  
  return createResponse(result);
}

/**
 * 一括通知送信ハンドラ
 */
function sendBulkNotificationsHandler(params) {
  const { user_id, title, body, url, category } = params;
  
  // デバイス情報を取得
  const devices = getDevicesFromSupabase(user_id);
  const fcmTokens = devices.map(device => device.fcm_token);
  
  if (fcmTokens.length === 0) {
    return createResponse({
      success: false,
      error: 'No devices found'
    });
  }
  
  const results = sendBulkNotifications(fcmTokens, {
    title: title,
    body: body,
    url: url,
    category: category
  });
  
  // 無効なトークンを削除
  if (results.invalidTokens.length > 0) {
    results.invalidTokens.forEach(token => {
      removeInvalidToken(token);
    });
  }
  
  return createResponse({
    success: true,
    results: results
  });
}

/**
 * デバイス登録ハンドラ
 */
function registerDeviceHandler(params) {
  const config = getConfig();
  const supabaseUrl = config.SUPABASE_URL;
  const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  
  const { fcm_token, platform, browser, device_info, user_agent, user_id } = params;
  
  try {
    const url = `${supabaseUrl}/rest/v1/notification_devices`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      payload: JSON.stringify({
        fcm_token: fcm_token,
        user_id: user_id || null,
        platform: platform,
        browser: browser,
        device_info: device_info,
        user_agent: user_agent,
        last_used: new Date().toISOString()
      }),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    
    if (responseCode === 201 || responseCode === 200) {
      return createResponse({
        success: true,
        message: 'Device registered successfully'
      });
    } else {
      return createResponse({
        success: false,
        error: response.getContentText()
      });
    }
    
  } catch (error) {
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * 管理者ログインハンドラ
 */
function adminLoginHandler(params) {
  const { email, passwordHash } = params;
  
  if (!email || !passwordHash) {
    return createResponse({
      success: false,
      error: 'Email and password hash are required'
    });
  }
  
  const result = adminLogin(email, passwordHash);
  return createResponse(result);
}

/**
 * セッション検証ハンドラ
 */
function verifyAdminSessionHandler(params) {
  const { token, email } = params;
  
  if (!token || !email) {
    return createResponse({
      valid: false,
      error: 'Token and email are required'
    });
  }
  
  const result = verifyAdminSession(token, email);
  return createResponse(result);
}

/**
 * レスポンス作成
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================
// テスト関数
// =====================================

/**
 * トークン取得のテスト
 */
function testGetAccessToken() {
  const token = getFirebaseAccessToken();
  console.log('Access Token:', token ? 'OK' : 'FAILED');
  return token;
}

/**
 * 通知送信のテスト
 */
function testSendNotification() {
  const testToken = 'YOUR_TEST_FCM_TOKEN';
  
  const result = sendFCMNotification(testToken, {
    title: 'テスト通知',
    body: 'これはテストメッセージです',
    url: '/',
    category: 'test'
  });
  
  console.log('Test Result:', result);
  return result;
}