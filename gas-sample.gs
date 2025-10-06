// なずなポータル統合Google Apps Script

// ========================================
// 設定値（PropertiesServiceで管理）
// ========================================

// 設定値を取得する関数
function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  
  return {
    // Supabase設定
    SUPABASE_URL: properties.getProperty('SUPABASE_URL') || 'YOUR_SUPABASE_URL_HERE',
    SUPABASE_SERVICE_KEY: properties.getProperty('SUPABASE_SERVICE_KEY') || 'YOUR_SUPABASE_SERVICE_KEY_HERE',
    
    // Firebase設定
    FIREBASE_PROJECT_ID: properties.getProperty('FIREBASE_PROJECT_ID') || 'your-project-id',
    FCM_ENDPOINT: 'https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send',
    FIREBASE_ACCESS_TOKEN: properties.getProperty('FIREBASE_ACCESS_TOKEN') || 'your-access-token',
    
    // スプレッドシート設定（後方互換性のため）
    SPREADSHEET_ID: properties.getProperty('SPREADSHEET_ID') || 'YOUR_SPREADSHEET_ID_HERE',
    
    // 通知設定
    MAX_BATCH_SIZE: 1000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    REQUESTS_PER_MINUTE: 600,
    
    // デバッグモード
    DEBUG_MODE: properties.getProperty('DEBUG_MODE') === 'true'
  };
}

// 管理者認証情報を取得
function getAdminCredentials() {
  const properties = PropertiesService.getScriptProperties();
  const adminData = properties.getProperty('ADMIN_ACCOUNTS');
  
  if (!adminData) {
    // デフォルト管理者（初回設定用）
    return {
      'admin@school.ac.jp': {
        password: 'admin123',
        name: 'システム管理者',
        role: 'super_admin',
        permissions: ['all']
      }
    };
  }
  
  try {
    return JSON.parse(adminData);
  } catch (error) {
    console.error('Error parsing admin credentials:', error);
    return {};
  }
}

// シート名（後方互換性のため）
const SHEETS = {
  CLUBS: '部活動',
  POSTS: '投稿',
  NEWS: 'お知らせ',
  SURVEYS: 'アンケート',
  MEMBERS: 'メンバー'
};

// ========================================
// メイン関数（WebAppのエントリーポイント）
// ========================================

// GET リクエスト処理（JSONP対応）
function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  
  let result = { success: false, error: 'Unknown action' };
  
  try {
    switch (action) {
      case 'getClubs':
        result = getClubs(e.parameter);
        break;
      case 'getPosts':
        result = getPosts(e.parameter);
        break;
      case 'submitPost':
        result = submitPost(e.parameter);
        break;
      case 'getNews':
        result = getNews(e.parameter);
        break;
      case 'getSurveys':
        result = getSurveys(e.parameter);
        break;
      case 'getMembers':
        result = getMembers(e.parameter);
        break;
      // POST系のアクションもGETで処理（JSONP対応）
      case 'adminLogin':
        result = adminLogin(e.parameter);
        break;
      case 'registerDevice':
        result = registerDevice(e.parameter);
        break;
      case 'unregisterDevice':
        result = unregisterDevice(e.parameter);
        break;
      case 'sendNotification':
        result = sendNotification(e.parameter);
        break;
      case 'sendBulkNotification':
        result = sendBulkNotification(e.parameter);
        break;
      case 'getNotificationHistory':
        result = getNotificationHistory(e.parameter);
        break;
      case 'getNotificationStatistics':
        result = getNotificationStatistics(e.parameter);
        break;
      case 'getNotificationTemplates':
        result = getNotificationTemplates(e.parameter);
        break;
      case 'createNews':
        result = createNews(e.parameter);
        break;
      case 'updateNews':
        result = updateNews(e.parameter);
        break;
      case 'updateSurvey':
        result = updateSurvey(e.parameter);
        break;
      case 'updateClub':
        result = updateClub(e.parameter);
        break;
      case 'replyToPost':
        result = replyToPost(e.parameter);
        break;
      case 'registerFCMToken':
        result = registerFCMToken(e.parameter);
        break;
      default:
        result = { success: false, error: 'Invalid action: ' + action };
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    result = { success: false, error: error.toString() };
  }
  
  // JSONP形式で返す
  const jsonpResponse = callback + '(' + JSON.stringify(result) + ');';
  return ContentService
    .createTextOutput(jsonpResponse)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// POST リクエスト処理（通知システム用）
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    // CORS対応
    const response = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    };
    
    let result;
    
    // 認証が必要なアクション
    const authRequiredActions = [
      'sendNotification', 'sendBulkNotification', 'getNotificationHistory', 
      'getNotificationStatistics', 'adminLogin', 'updateNews', 'updateSurvey',
      'updateClub', 'replyToPost'
    ];
    
    if (authRequiredActions.includes(action)) {
      if (!isAuthorized(data.adminEmail, data.adminPassword)) {
        return createResponse({
          success: false,
          error: 'Unauthorized access'
        }, response.headers);
      }
    }
    
    // アクション処理
    switch (action) {
      // 認証
      case 'adminLogin':
        result = adminLogin(data);
        break;
      
      // 通知システム
      case 'registerDevice':
        result = registerDevice(data);
        break;
      case 'unregisterDevice':
        result = unregisterDevice(data);
        break;
      case 'sendNotification':
        result = sendNotification(data);
        break;
      case 'sendBulkNotification':
        result = sendBulkNotification(data);
        break;
      case 'getNotificationHistory':
        result = getNotificationHistory(data);
        break;
      case 'getNotificationStatistics':
        result = getNotificationStatistics(data);
        break;
      case 'getNotificationTemplates':
        result = getNotificationTemplates(data);
        break;
      case 'createNews':
        result = createNews(data);
        break;
      
      // データ管理
      case 'updateNews':
        result = updateNews(data);
        break;
      case 'updateSurvey':
        result = updateSurvey(data);
        break;
      case 'updateClub':
        result = updateClub(data);
        break;
      case 'replyToPost':
        result = replyToPost(data);
        break;
      
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
    
    return createResponse(result, response.headers);
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({
      success: false,
      error: error.toString()
    });
  }
}

// OPTIONS リクエスト対応（CORS preflight）
function doOptions(e) {
  return createResponse({}, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
}

// 部活動データを取得
function getClubs(params) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.CLUBS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, clubs: [] };
    }
    
    const headers = data[0];
    const clubs = data.slice(1).map(row => {
      const club = {};
      headers.forEach((header, index) => {
        club[header] = row[index];
      });
      return club;
    });
    
    return { success: true, clubs: clubs };
  } catch (error) {
    console.error('Error in getClubs:', error);
    return { success: false, error: error.toString() };
  }
}

// 投稿データを取得
function getPosts(params) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.POSTS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, posts: [] };
    }
    
    const headers = data[0];
    const posts = data.slice(1).map(row => {
      const post = {};
      headers.forEach((header, index) => {
        post[header] = row[index];
      });
      return post;
    }).reverse(); // 新しい投稿を上に
    
    return { success: true, posts: posts };
  } catch (error) {
    console.error('Error in getPosts:', error);
    return { success: false, error: error.toString() };
  }
}

// 新しい投稿を追加
function submitPost(params) {
  try {
    const content = params.content;
    const category = params.category || 'other';
    
    if (!content || content.trim().length === 0) {
      return { success: false, error: '投稿内容が空です' };
    }
    
    if (content.length > 1000) {
      return { success: false, error: '投稿内容が長すぎます（1000文字以内）' };
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.POSTS);
    const postId = 'POST_' + Date.now();
    const timestamp = new Date();
    
    // ヘッダーが存在しない場合は作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['id', 'content', 'category', 'status', 'created_at', 'reply']);
    }
    
    sheet.appendRow([
      postId,
      content.trim(),
      category,
      'pending',
      timestamp,
      ''
    ]);
    
    return { 
      success: true, 
      postId: postId,
      message: '投稿が完了しました' 
    };
  } catch (error) {
    console.error('Error in submitPost:', error);
    return { success: false, error: error.toString() };
  }
}

// お知らせデータを取得
function getNews(params) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.NEWS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, news: [] };
    }
    
    const headers = data[0];
    const news = data.slice(1).map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return item;
    }).reverse(); // 新しいお知らせを上に
    
    return { success: true, news: news };
  } catch (error) {
    console.error('Error in getNews:', error);
    return { success: false, error: error.toString() };
  }
}

// アンケートデータを取得
function getSurveys(params) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.SURVEYS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, surveys: [] };
    }
    
    const headers = data[0];
    const surveys = data.slice(1).map(row => {
      const survey = {};
      headers.forEach((header, index) => {
        survey[header] = row[index];
      });
      return survey;
    });
    
    return { success: true, surveys: surveys };
  } catch (error) {
    console.error('Error in getSurveys:', error);
    return { success: false, error: error.toString() };
  }
}

// メンバーデータを取得
function getMembers(params) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.MEMBERS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, members: [] };
    }
    
    const headers = data[0];
    const members = data.slice(1).map(row => {
      const member = {};
      headers.forEach((header, index) => {
        member[header] = row[index];
      });
      return member;
    });
    
    return { success: true, members: members };
  } catch (error) {
    console.error('Error in getMembers:', error);
    return { success: false, error: error.toString() };
  }
}

// スプレッドシートの初期化（初回実行時に使用）
function initializeSpreadsheet() {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    
    // 部活動シート
    let sheet = ss.getSheetByName(SHEETS.CLUBS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.CLUBS);
      sheet.appendRow(['name', 'description', 'members', 'schedule', 'category', 'image_url']);
      sheet.appendRow(['サッカー部', '全国大会を目指して日々練習に励んでいます', 45, '月・水・金', 'sports', '']);
      sheet.appendRow(['吹奏楽部', '美しいハーモニーを奏でることを目標に活動中', 32, '火・木・土', 'music', '']);
    }
    
    // 投稿シート
    sheet = ss.getSheetByName(SHEETS.POSTS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.POSTS);
      sheet.appendRow(['id', 'content', 'category', 'status', 'created_at', 'reply']);
    }
    
    // お知らせシート
    sheet = ss.getSheetByName(SHEETS.NEWS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.NEWS);
      sheet.appendRow(['date', 'title', 'content', 'type']);
      sheet.appendRow(['2024/01/15', '体育祭のお知らせ', '来月20日に体育祭を開催します。', 'event']);
    }
    
    // アンケートシート
    sheet = ss.getSheetByName(SHEETS.SURVEYS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.SURVEYS);
      sheet.appendRow(['title', 'description', 'status', 'deadline']);
    }
    
    // メンバーシート
    sheet = ss.getSheetByName(SHEETS.MEMBERS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.MEMBERS);
      sheet.appendRow(['name', 'role', 'message']);
      sheet.appendRow(['会長 山田太郎', '全体統括', '皆さんの声を大切にします！']);
      sheet.appendRow(['副会長 田中花子', '企画運営', 'イベント企画頑張ります！']);
    }
    
    console.log('スプレッドシートの初期化が完了しました');
  } catch (error) {
    console.error('Error in initializeSpreadsheet:', error);
  }
}

// ========================================
// 管理者認証システム
// ========================================

// 管理者ログイン
function adminLogin(data) {
  try {
    // URLパラメータまたはJSONボディからデータを取得
    const email = data.email || data.parameter?.email;
    const password = data.password || data.parameter?.password;
    
    const adminCredentials = getAdminCredentials();
    
    if (adminCredentials[email] && adminCredentials[email].password === password) {
      const admin = adminCredentials[email];
      return {
        success: true,
        admin: {
          email: email,
          name: admin.name,
          role: admin.role,
          permissions: admin.permissions
        }
      };
    }
    
    return { success: false, error: 'Invalid credentials' };
  } catch (error) {
    console.error('Error in adminLogin:', error);
    return { success: false, error: error.toString() };
  }
}

// 管理者認証チェック
function isAuthorized(email, password) {
  if (!email || !password) return false;
  
  const adminCredentials = getAdminCredentials();
  return adminCredentials[email] && adminCredentials[email].password === password;
}

// 管理者アカウント設定（初期設定用）
function setupAdminAccounts() {
  const adminAccounts = {
    'admin@school.ac.jp': {
      password: 'admin123',
      name: 'システム管理者',
      role: 'super_admin',
      permissions: ['all']
    },
    'council@school.ac.jp': {
      password: 'council456',
      name: '生徒会管理者',
      role: 'admin',
      permissions: ['notification', 'news', 'survey', 'forum']
    },
    'teacher@school.ac.jp': {
      password: 'teacher789',
      name: '教員管理者',
      role: 'moderator',
      permissions: ['forum', 'news']
    }
  };
  
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('ADMIN_ACCOUNTS', JSON.stringify(adminAccounts));
  
  console.log('管理者アカウントを設定しました');
  return { success: true, message: 'Admin accounts configured' };
}

// ========================================
// 通知システム
// ========================================

// FCMトークン登録（firebase-config.js用）
function registerFCMToken(params) {
  try {
    const { fcmToken, deviceInfo } = params;
    
    if (!fcmToken) {
      return { success: false, error: 'FCM token is required' };
    }
    
    const deviceData = {
      fcm_token: fcmToken,
      user_agent: deviceInfo?.userAgent || '',
      platform: deviceInfo?.platform || 'web',
      browser: deviceInfo?.browser || '',
      device_info: deviceInfo || {},
      is_active: true,
      last_used_at: new Date().toISOString()
    };
    
    const response = supabaseRequest('POST', 'device_registrations?on_conflict=fcm_token', deviceData);
    
    if (response.error) {
      // 既存のトークンの場合は更新
      if (response.error.code === '23505') { // unique violation
        const updateResponse = supabaseRequest('PATCH', 
          `device_registrations?fcm_token=eq.${fcmToken}`, 
          {
            is_active: true,
            last_used_at: new Date().toISOString(),
            user_agent: deviceInfo?.userAgent,
            device_info: deviceInfo
          }
        );
        return { success: !updateResponse.error, data: updateResponse.data };
      }
      return { success: false, error: response.error.message };
    }
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return { success: false, error: error.toString() };
  }
}

// デバイス登録
function registerDevice(data) {
  try {
    // URLパラメータまたはJSONボディからデータを取得
    const fcmToken = data.fcmToken || data.parameter?.fcmToken;
    const userAgent = data.userAgent || data.parameter?.userAgent;
    const platform = data.platform || data.parameter?.platform;
    const browser = data.browser || data.parameter?.browser;
    const deviceInfo = data.deviceInfo || data.parameter?.deviceInfo;
    
    if (!fcmToken) {
      return { success: false, error: 'FCM token is required' };
    }
    
    const deviceData = {
      fcm_token: fcmToken,
      user_agent: userAgent || '',
      platform: platform || 'web',
      browser: browser || '',
      device_info: deviceInfo || {},
      is_active: true,
      last_used_at: new Date().toISOString()
    };
    
    const response = supabaseRequest('POST', 'device_registrations?on_conflict=fcm_token', deviceData);
    
    if (response.error) {
      // 既存のトークンの場合は更新
      if (response.error.code === '23505') { // unique violation
        const updateResponse = supabaseRequest('PATCH', 
          `device_registrations?fcm_token=eq.${fcmToken}`, 
          {
            is_active: true,
            last_used_at: new Date().toISOString(),
            user_agent: userAgent,
            device_info: deviceInfo
          }
        );
        return { success: !updateResponse.error, data: updateResponse.data };
      }
      return { success: false, error: response.error.message };
    }
    
    return { success: true, data: response.data };
    
  } catch (error) {
    console.error('Error registering device:', error);
    return { success: false, error: error.toString() };
  }
}

// デバイス登録解除
function unregisterDevice(data) {
  try {
    const { fcmToken } = data;
    
    if (!fcmToken) {
      return { success: false, error: 'FCM token is required' };
    }
    
    const response = supabaseRequest('PATCH', 
      `device_registrations?fcm_token=eq.${fcmToken}`, 
      { is_active: false }
    );
    
    return { success: !response.error, data: response.data };
    
  } catch (error) {
    console.error('Error unregistering device:', error);
    return { success: false, error: error.toString() };
  }
}

// 通知送信（カスタムメッセージ対応版）
function sendNotification(data) {
  try {
    // URLパラメータまたはJSONボディからデータを取得
    const templateKey = data.templateKey || data.parameter?.templateKey;
    // JSONPで渡された文字列をオブジェクトに復元
    let templateData = data.templateData || data.parameter?.templateData;
    if (typeof templateData === 'string') {
      try { templateData = JSON.parse(templateData); } catch (e) {}
    }
    const targetType = data.targetType || data.parameter?.targetType || 'all';
    let targetCriteria = data.targetCriteria || data.parameter?.targetCriteria || {};
    if (typeof targetCriteria === 'string') {
      try { targetCriteria = JSON.parse(targetCriteria); } catch (e) {}
    }
    const adminEmail = data.adminEmail || data.parameter?.adminEmail;
    
    // カスタムメッセージの直接送信を優先
    let message;
    // テンプレートが存在しないケース（カスタム送信）に備えて初期化
    var template = null;
    if (templateData && templateData.title && templateData.message) {
      // カスタムメッセージを直接使用（テンプレート不要）
      message = {
        title: templateData.title,
        body: templateData.message,
        icon: templateData.icon || 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
        image: templateData.image || '',
        badge: templateData.badge || '/images/badge-72x72.png',
        action_url: templateData.url || '/news.html',
        category: templateData.category || 'general',
        priority: parseInt(templateData.priority || 1),
        actions: templateData.actions || [
          { action: 'view', title: '詳細を見る' },
          { action: 'dismiss', title: '閉じる' }
        ],
        sound: templateData.sound || 'default',
        vibrate: templateData.vibrate || [200, 100, 200],
        requireInteraction: templateData.requireInteraction || false,
        renotify: templateData.renotify || false,
        silent: templateData.silent || false,
        timestamp: Date.now(),
        ttl: templateData.ttl || 86400,
        color: templateData.color || '#4285F4',
        channelId: templateData.channelId || 'default',
        data: {
          url: templateData.url || '/news.html',
          category: templateData.category || 'general',
          timestamp: Date.now(),
          originalData: templateData
        }
      };
    } else {
      // テンプレートベースの処理（後方互換性）
      template = getNotificationTemplate(templateKey);
      if (!template) {
        // フォールバック: テンプレート未登録でも送信可能にする
        template = {
          id: null,
          title_template: '{{title}}',
          body_template: '{{message}}',
          icon_url: '',
          image_url: '',
          badge_url: '/images/badge-72x72.png',
          action_url: '/news.html',
          category: 'general',
          priority: 1,
          url_params: [],
          append_params: false,
          actions: []
        };
      }
      
      // テンプレートを使用してメッセージを生成
      message = generateMessage(template, templateData, {
        customTitle: templateData.title,
        customBody: templateData.message
      });
    }
    
    // 対象デバイスを取得
    const devices = getTargetDevices(targetType, targetCriteria);
    if (devices.length === 0) {
      return { success: false, error: 'No target devices found' };
    }
    
    // 通知履歴を作成
    const historyId = createNotificationHistory(template, message, targetType, targetCriteria, devices.length, adminEmail);
    
    // FCMで通知送信
    const result = sendFCMNotifications(devices, message, historyId);
    
    // 送信結果を更新
    updateNotificationHistory(historyId, result);
    
    return {
      success: true,
      data: {
        historyId: historyId,
        totalRecipients: devices.length,
        successfulSends: result.successCount,
        failedSends: result.failureCount
      }
    };
    
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.toString() };
  }
}

// 一括通知送信（拡張版）
function sendBulkNotification(data) {
  try {
    const { notifications, options = {} } = data;
    const results = [];
    const config = getConfig();
    const batchSize = options.batchSize || config.MAX_BATCH_SIZE;
    const delayMs = options.delayMs || 100;
    let successCount = 0;
    let failureCount = 0;
    
    // バッチ処理の最適化
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const batchResults = [];
      // Apps Script は await/async 非対応のため同期実行で処理
      for (var j = 0; j < batch.length; j++) {
        var notification = batch[j];
        var result = sendNotification(notification);
        if (result && result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        batchResults.push(result);
      }
      results.push.apply(results, batchResults);
      
      // レート制限対応（バッチ間の遅延）
      if (i + batchSize < notifications.length) {
        Utilities.sleep(delayMs * batch.length);
      }
    }
    
    return { 
      success: true, 
      data: results,
      summary: {
        total: notifications.length,
        success: successCount,
        failure: failureCount,
        batches: Math.ceil(notifications.length / batchSize)
      }
    };
    
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return { success: false, error: error.toString() };
  }
}

// 通知履歴取得
function getNotificationHistory(data) {
  const { limit = 50, offset = 0 } = data;
  
  const response = supabaseRequest('GET', 
    `notification_history?order=sent_at.desc&limit=${limit}&offset=${offset}`
  );
  
  return { success: !response.error, data: response.data };
}

// 通知統計取得
function getNotificationStatistics(data) {
  const { days = 30 } = data;
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  
  const response = supabaseRequest('GET', 
    `notification_statistics?sent_at=gte.${fromDate}&order=sent_at.desc`
  );
  
  return { success: !response.error, data: response.data };
}

// ========================================
// 通知システムヘルパー関数
// ========================================

// FCM通知送信
function sendFCMNotifications(devices, message, historyId) {
  const config = getConfig();
  let successCount = 0;
  let failureCount = 0;
  const deliveries = [];
  const retryAttempts = config.RETRY_ATTEMPTS || 3;
  const retryDelay = config.RETRY_DELAY || 1000;
  
  // バッチ処理
  for (let i = 0; i < devices.length; i += config.MAX_BATCH_SIZE) {
    const batch = devices.slice(i, i + config.MAX_BATCH_SIZE);
    
    for (const device of batch) {
      try {
        const fcmMessage = {
          to: device.fcm_token,
          notification: {
            title: message.title,
            body: message.body,
            icon: message.icon || 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
            badge: message.badge || '/images/badge-72x72.png',
            click_action: message.action_url || '/',
            tag: message.category || 'general'
          },
          data: {
            url: message.action_url || '/',
            category: message.category || 'general',
            historyId: historyId,
            timestamp: new Date().toISOString()
          },
          priority: message.priority >= 2 ? 'high' : 'normal',
          time_to_live: 86400 // 24時間
        };
        
        // リトライロジックを実装
        let response = null;
        let attempt = 0;
        let success = false;
        
        while (attempt < retryAttempts && !success) {
          response = sendFCMMessage(fcmMessage);
          success = response.success;
          
          if (!success && attempt < retryAttempts - 1) {
            console.log(`Retry attempt ${attempt + 1} for token: ${device.fcm_token}`);
            Utilities.sleep(retryDelay * (attempt + 1)); // 指数バックオフ
          }
          
          attempt++;
        }
        
        if (success) {
          successCount++;
          deliveries.push({
            history_id: historyId,
            device_id: device.id,
            fcm_message_id: response.message_id,
            status: 'sent',
            sent_at: new Date().toISOString(),
            retry_count: attempt - 1
          });
        } else {
          failureCount++;
          deliveries.push({
            history_id: historyId,
            device_id: device.id,
            status: 'failed',
            error_code: response.error_code,
            error_message: response.error_message,
            sent_at: new Date().toISOString(),
            retry_count: attempt - 1
          });
          
          // 無効なトークンの場合はデバイスを無効化
          if (response.error_code === 'INVALID_ARGUMENT' || 
              response.error_code === 'UNREGISTERED' ||
              response.error_code === 'NOT_FOUND') {
            deactivateDevice(device.fcm_token);
          }
        }
        
      } catch (error) {
        console.error('Error sending to device:', device.fcm_token, error);
        failureCount++;
        deliveries.push({
          history_id: historyId,
          device_id: device.id,
          status: 'error',
          error_message: error.toString(),
          sent_at: new Date().toISOString()
        });
      }
    }
    
    // レート制限対応
    if (i + config.MAX_BATCH_SIZE < devices.length) {
      Utilities.sleep(60000 / config.REQUESTS_PER_MINUTE * batch.length);
    }
  }
  
  // 配信状況をバッチで保存
  if (deliveries.length > 0) {
    supabaseRequest('POST', 'notification_deliveries', deliveries);
  }
  
  return { successCount, failureCount };
}

// FCMメッセージ送信（HTTP v1 API対応・拡張版）
function sendFCMMessage(message) {
  try {
    const config = getConfig();
    
    // HTTP v1 API用のエンドポイントURLを構築
    const endpoint = `https://fcm.googleapis.com/v1/projects/${config.FIREBASE_PROJECT_ID}/messages:send`;
    
    // ブラウザ側のデフォルト描画を避けるため、通知のタイトル/本文はService Workerで表示
    // HTTP v1の notification フィールドは送らない（データ経由で統一）
    const notification = undefined;
    
    // カスタムデータをFCMに渡すための設定
    const customData = {
      title: message.title,
      body: message.body,
      message: message.body,
      icon: message.icon,
      badge: message.badge,
      url: message.action_url,
      category: message.category,
      tag: message.category,
      requireInteraction: message.requireInteraction,
      actions: JSON.stringify(message.actions || []),
      vibrate: JSON.stringify(message.vibrate || [200, 100, 200]),
      silent: message.silent,
      renotify: message.renotify,
      timestamp: message.timestamp,
      originalData: JSON.stringify(message.data || {})
    };
    
    // プラットフォーム別の設定を準備
    const webpushConfig = {
      headers: {
        TTL: String(message.time_to_live || 86400),
        Urgency: message.priority === 'high' ? 'high' : 'normal'
      },
      fcm_options: {
        link: (message.action_url || (message.data && message.data.url)) || '/'
      }
    };
    
    // iOSデバイス向け設定（APNs対応強化版）
    const apnsConfig = {
      headers: {
        'apns-priority': message.priority === 'high' ? '10' : '5',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + (message.time_to_live || 86400)),
        'apns-push-type': 'alert',
        'apns-topic': message.apns_topic || 'jp.school.nazuna-portal'
      },
      payload: {
        aps: {
          alert: {
            title: message.title,
            body: message.body,
            subtitle: message.subtitle || '',
            'title-loc-key': message.notification.title_loc_key,
            'title-loc-args': message.notification.title_loc_args,
            'loc-key': message.notification.loc_key,
            'loc-args': message.notification.loc_args,
            'action-loc-key': message.notification.action_loc_key,
            'launch-image': message.notification.launch_image
          },
          sound: message.sound || 'default',
          badge: message.badge_count || 1,
          'mutable-content': 1,
          'content-available': 1,
          category: message.data.category || 'GENERAL',
          'thread-id': message.thread_id || message.data.category || 'general',
          'target-content-id': message.target_content_id || '',
          'interruption-level': message.priority === 'high' ? 'time-sensitive' : 'active',
          'relevance-score': message.relevance_score || 1.0
        },
        fcm_options: {
          image: message.image || message.icon
        },
        // カスタムデータをAPNsペイロードに追加
        data: message.data || {},
        url: message.data?.url || '/',
        category: message.data?.category || 'general',
        notification_id: message.data?.notification_id || '',
        timestamp: Date.now().toString()
      }
    };
    
    // Androidデバイス向け設定
    const androidConfig = {
      priority: message.priority === 'high' ? 'HIGH' : 'NORMAL',
      ttl: `${message.time_to_live || 86400}s`,
      notification: {
        icon: message.icon || 'ic_notification',
        color: message.color || '#4285F4',
        sound: message.sound || 'default',
        clickAction: message.data?.url || '/',
        tag: message.data?.category || 'general',
        channelId: message.channelId || 'default'
      }
    };
    
    // HTTP v1 API用のメッセージ形式に変換（カスタムデータ対応）
    const v1Message = {
      message: {
        token: message.to,
        // notification は送らず、data のみを使用
        data: customData,
        webpush: webpushConfig,
        apns: apnsConfig,
        android: androidConfig,
        fcm_options: {
          analytics_label: message.category || 'notification'
        }
      }
    };
    
    // バリデーションモードの場合
    if (message.validate_only) {
      v1Message.validate_only = true;
    }
    
    // Access Tokenを取得
    const accessToken = getFirebaseAccessToken();
    if (!accessToken) {
      return {
        success: false,
        error_code: 'AuthenticationError',
        error_message: 'Failed to get Firebase access token'
      };
    }
    
    // FCM APIにリクエスト送信
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(v1Message),
      muteHttpExceptions: true // エラーレスポンスも取得するため
    });
    
    const responseCode = response.getResponseCode();
    let responseData;
    
    try {
      responseData = JSON.parse(response.getContentText());
    } catch (e) {
      responseData = { error: { message: 'Failed to parse response' } };
    }
    
    // レスポンス処理
    if (responseCode === 200 && responseData.name) {
      return {
        success: true,
        message_id: responseData.name.split('/').pop(), // メッセージIDを抽出
        response_code: responseCode,
        response_data: responseData
      };
    } else {
      console.error('FCM API error:', responseCode, responseData);
      return {
        success: false,
        error_code: responseData.error?.status || responseData.error?.code || `HTTP_${responseCode}`,
        error_message: responseData.error?.message || 'Unknown error',
        response_code: responseCode,
        response_data: responseData
      };
    }
    
  } catch (error) {
    console.error('FCM send error:', error);
    return {
      success: false,
      error_code: 'NetworkError',
      error_message: error.toString()
    };
  }
}

// 通知テンプレート取得（拡張版）
function getNotificationTemplate(templateKey, options = {}) {
  let query = `notification_templates?`;
  
  // テンプレートキーによる検索
  if (templateKey) {
    query += `template_key=eq.${templateKey}&`;
  }
  
  // カテゴリによる検索
  if (options.category) {
    query += `category=eq.${options.category}&`;
  }
  
  // アクティブなテンプレートのみ取得
  if (options.active_only !== false) {
    query += `is_active=eq.true&`;
  }
  
  // 並び順の指定
  if (options.order_by) {
    query += `order=${options.order_by}.${options.ascending !== false ? 'asc' : 'desc'}&`;
  } else {
    query += `order=priority.desc&`;
  }
  
  // 取得件数の制限
  query += `limit=${options.limit || 1}`;
  
  const response = supabaseRequest('GET', query);
  
  // 単一レコード取得か複数レコード取得かの判断
  if (templateKey && !options.return_all) {
    return response.data && response.data.length > 0 ? response.data[0] : null;
  } else {
    return response.data || [];
  }
}

// 通知テンプレート一覧取得（JSONP想定の軽量版）
function getNotificationTemplates(params) {
  try {
    var query = 'notification_templates?is_active=eq.true&order=priority.desc';
    if (params && params.category) {
      query += '&category=eq.' + params.category;
    }
    var response = supabaseRequest('GET', query);
    if (response.error) {
      return { success: false, error: response.error.message || 'Failed to fetch templates' };
    }
    // 必要最小限のフィールドのみ返す
    var data = (response.data || []).map(function(t){
      return {
        template_key: t.template_key,
        title_template: t.title_template,
        body_template: t.body_template,
        category: t.category,
        priority: t.priority
      };
    });
    return { success: true, data: data };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ニュース新規作成
function createNews(data) {
  try {
    var payload = {
      title: data.title,
      category: data.category || data.type || 'general',
      content: data.content,
      is_published: data.is_published !== false,
      date: new Date().toISOString(),
      priority: data.priority || 0
    };
    var resp = supabaseRequest('POST', 'news', [payload]);
    if (resp.error) {
      return { success: false, error: resp.error.message || 'Failed to create news' };
    }
    return { success: true, data: resp.data && resp.data[0] };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// メッセージ生成（拡張版）
function generateMessage(template, data, options = {}) {
  // カスタム入力値があればそれを優先使用
  let title = options.customTitle || template.title_template;
  let body = options.customBody || template.body_template;
  
  // テンプレート変数を置換
  for (const [key, value] of Object.entries(data || {})) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(regex, value);
    body = body.replace(regex, value);
  }
  
  // 日時変数を置換
  const now = new Date();
  const dateVars = {
    'YYYY': now.getFullYear(),
    'MM': (now.getMonth() + 1).toString().padStart(2, '0'),
    'DD': now.getDate().toString().padStart(2, '0'),
    'HH': now.getHours().toString().padStart(2, '0'),
    'mm': now.getMinutes().toString().padStart(2, '0'),
    'ss': now.getSeconds().toString().padStart(2, '0'),
    'WEEKDAY': ['日', '月', '火', '水', '木', '金', '土'][now.getDay()]
  };
  
  for (const [key, value] of Object.entries(dateVars)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(regex, value);
    body = body.replace(regex, value);
  }
  
  // アクションURLの処理（クエリパラメータ付加など）
  let actionUrl = template.action_url || '/';
  if (data.url) {
    actionUrl = data.url;
  }
  
  // URLにパラメータを追加
  if (template.append_params && data) {
    const url = new URL(actionUrl, 'https://example.com'); // 相対URLを絶対URLに変換するためのベースURL
    
    // テンプレートで指定されたパラメータを追加
    if (template.url_params) {
      for (const param of template.url_params) {
        if (data[param.key]) {
          url.searchParams.set(param.key, data[param.key]);
        }
      }
    }
    
    // 通知IDを追加
    url.searchParams.set('notification_id', data.notification_id || Utilities.getUuid());
    
    // 相対URLの場合は、ホスト部分を除去
    actionUrl = url.pathname + url.search + url.hash;
    if (!template.action_url.startsWith('http')) {
      actionUrl = actionUrl.replace(/^https?:\/\/example\.com/, '');
    }
  }
  
  // 通知アクションの設定
  let actions = template.actions || [];
  if (data.actions) {
    try {
      if (typeof data.actions === 'string') {
        actions = JSON.parse(data.actions);
      } else {
        actions = data.actions;
      }
    } catch (e) {
      console.error('Failed to parse actions:', e);
    }
  }
  
  // 通知オプションの設定
  const messageOptions = {
    title: title,
    body: body,
    icon: data.icon || template.icon_url,
    image: data.image || template.image_url,
    badge: data.badge || template.badge_url || '/images/badge-72x72.png',
    action_url: actionUrl,
    category: data.category || template.category || 'general',
    priority: parseInt(data.priority || template.priority || 1),
    actions: actions,
    sound: data.sound || template.sound || 'default',
    vibrate: data.vibrate || template.vibrate || [200, 100, 200],
    requireInteraction: data.requireInteraction || template.require_interaction || false,
    renotify: data.renotify || template.renotify || false,
    silent: data.silent || template.silent || false,
    timestamp: Date.now(),
    ttl: data.ttl || template.ttl || 86400, // 24時間
    color: data.color || template.color || '#4285F4',
    channelId: data.channelId || template.channel_id || 'default'
  };
  
  return messageOptions;
}

// 対象デバイス取得
function getTargetDevices(targetType, criteria) {
  let query = 'device_registrations?is_active=eq.true';
  
  if (criteria.platform) {
    query += `&platform=eq.${criteria.platform}`;
  }
  
  // 最終使用日フィルタ（30日以内のアクティブデバイス）
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  query += `&last_used_at=gte.${thirtyDaysAgo}`;
  
  const response = supabaseRequest('GET', query);
  const list = response.data || [];
  // fcm_token で重複排除（同一端末の多重登録対策）
  const seen = {};
  const deduped = [];
  for (var i = 0; i < list.length; i++) {
    var dev = list[i];
    var token = dev && dev.fcm_token;
    if (!token) continue;
    if (!seen[token]) {
      seen[token] = true;
      deduped.push(dev);
    }
  }
  return deduped;
}

// 通知履歴作成
function createNotificationHistory(template, message, targetType, criteria, totalRecipients, adminEmail) {
  const historyData = {
    template_id: (template && typeof template === 'object') ? (template.id || null) : null,
    title: message.title,
    body: message.body,
    icon_url: message.icon,
    action_url: message.action_url,
    category: message.category,
    priority: message.priority,
    target_type: targetType,
    target_criteria: criteria,
    total_recipients: totalRecipients,
    gas_execution_id: Utilities.getUuid(),
    admin_email: adminEmail,
    status: 'sending'
  };
  
  const response = supabaseRequest('POST', 'notification_history', historyData);
  // 安全にIDを取得（失敗時はUUIDを返す）
  try {
    if (response && response.data && response.data[0] && response.data[0].id) {
      return response.data[0].id;
    }
  } catch (e) {}
  return Utilities.getUuid();
}

// 通知履歴更新
function updateNotificationHistory(historyId, result) {
  const updateData = {
    successful_sends: result.successCount,
    failed_sends: result.failureCount,
    status: 'completed',
    completed_at: new Date().toISOString()
  };
  
  supabaseRequest('PATCH', `notification_history?id=eq.${historyId}`, updateData);
}

// デバイス無効化
function deactivateDevice(fcmToken) {
  supabaseRequest('PATCH', 
    `device_registrations?fcm_token=eq.${fcmToken}`, 
    { is_active: false }
  );
}

// ========================================
// データ管理関数
// ========================================

// ニュース更新
function updateNews(data) {
  try {
    const { id, title, content, summary, type, priority, is_published } = data;
    
    const updateData = {
      title: title,
      content: content,
      summary: summary,
      type: type,
      priority: priority || 0,
      is_published: is_published !== undefined ? is_published : true
    };
    
    const response = supabaseRequest('PATCH', `news?id=eq.${id}`, updateData);
    return { success: !response.error, data: response.data };
    
  } catch (error) {
    console.error('Error updating news:', error);
    return { success: false, error: error.toString() };
  }
}

// アンケート更新
function updateSurvey(data) {
  try {
    const { id, title, description, questions, is_active, is_published, expires_at } = data;
    
    const updateData = {
      title: title,
      description: description,
      questions: questions,
      is_active: is_active,
      is_published: is_published,
      expires_at: expires_at
    };
    
    const response = supabaseRequest('PATCH', `surveys?id=eq.${id}`, updateData);
    return { success: !response.error, data: response.data };
    
  } catch (error) {
    console.error('Error updating survey:', error);
    return { success: false, error: error.toString() };
  }
}

// 部活動更新
function updateClub(data) {
  try {
    const { id, name, description, members, schedule, category, is_active } = data;
    
    const updateData = {
      name: name,
      description: description,
      members: members,
      schedule: schedule,
      category: category,
      is_active: is_active !== undefined ? is_active : true
    };
    
    const response = supabaseRequest('PATCH', `clubs?id=eq.${id}`, updateData);
    return { success: !response.error, data: response.data };
    
  } catch (error) {
    console.error('Error updating club:', error);
    return { success: false, error: error.toString() };
  }
}

// 投稿への返信
function replyToPost(data) {
  try {
    const { postId, reply } = data;
    
    const updateData = {
      reply: reply,
      status: 'replied',
      replied_at: new Date().toISOString()
    };
    
    const response = supabaseRequest('PATCH', `posts?id=eq.${postId}`, updateData);
    return { success: !response.error, data: response.data };
    
  } catch (error) {
    console.error('Error replying to post:', error);
    return { success: false, error: error.toString() };
  }
}

// ========================================
// Firebase認証関数
// ========================================

// Firebase Access Tokenを取得（サービスアカウントキーを使用）
function getFirebaseAccessToken() {
  try {
    const config = getConfig();
    
    // キャッシュからトークンを取得（有効期限内であれば再利用）
    const cache = CacheService.getScriptCache();
    const cachedToken = cache.get('FIREBASE_ACCESS_TOKEN');
    
    if (cachedToken) {
      return cachedToken;
    }
    
    // サービスアカウントキー情報を取得
    const serviceAccountKey = JSON.parse(
      PropertiesService.getScriptProperties().getProperty('FIREBASE_SERVICE_ACCOUNT_KEY')
    );
    
    if (!serviceAccountKey) {
      throw new Error('Firebase service account key not configured. Please set FIREBASE_SERVICE_ACCOUNT_KEY in PropertiesService.');
    }
    
    // JWT（JSON Web Token）を作成
    const now = Math.floor(Date.now() / 1000);
    const expTime = now + 3600; // 1時間の有効期限
    
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccountKey.private_key_id
    };
    
    const payload = {
      iss: serviceAccountKey.client_email,
      sub: serviceAccountKey.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expTime,
      scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };
    
    // JWTの署名部分を作成
    const headerBase64 = Utilities.base64EncodeWebSafe(JSON.stringify(header)).replace(/=+$/, '');
    const payloadBase64 = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
    const toSign = headerBase64 + '.' + payloadBase64;
    
    // 秘密鍵で署名
    const signature = Utilities.computeRsaSha256Signature(
      toSign,
      serviceAccountKey.private_key
    );
    const signatureBase64 = Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');
    
    // 完全なJWTを作成
    const jwt = headerBase64 + '.' + payloadBase64 + '.' + signatureBase64;
    
    // Google OAuth2 APIを使用してアクセストークンを取得
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      payload: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }
    });
    
    const responseData = JSON.parse(response.getContentText());
    const accessToken = responseData.access_token;
    
    if (!accessToken) {
      throw new Error('Failed to obtain access token: ' + JSON.stringify(responseData));
    }
    
    // トークンをキャッシュに保存（50分間有効）
    cache.put('FIREBASE_ACCESS_TOKEN', accessToken, 3000); // 50分 = 3000秒
    
    return accessToken;
    
  } catch (error) {
    console.error('Error getting Firebase access token:', error);
    return null;
  }
}

// ========================================
// ユーティリティ関数
// ========================================

// Supabaseリクエスト
function supabaseRequest(method, endpoint, data = null) {
  try {
    const config = getConfig();
    
    // ヘッダーは未定義値を含めないように組み立てる
    const headers = {
      'Authorization': 'Bearer ' + config.SUPABASE_SERVICE_KEY,
      'apikey': config.SUPABASE_SERVICE_KEY
    };
    // GETでは Content-Type ヘッダーを付けない（一部環境で Header:null 扱いになるのを回避）
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }
    if (method === 'POST' || method === 'PATCH') {
      headers['Prefer'] = 'return=representation';
    }
    const options = { method: method, headers: headers, muteHttpExceptions: true };
    
    if (data && (method === 'POST' || method === 'PATCH')) {
      options.payload = JSON.stringify(data);
    }
    
    const response = UrlFetchApp.fetch(
      `${config.SUPABASE_URL}/rest/v1/${endpoint}`,
      options
    );
    
    const responseData = response.getContentText();
    const parsed = responseData ? JSON.parse(responseData) : {};
    
    if (response.getResponseCode() >= 400) {
      return { error: parsed };
    }
    
    return { data: Array.isArray(parsed) ? parsed : [parsed] };
    
  } catch (error) {
    console.error('Supabase request error:', error);
    return { error: { message: error.toString() } };
  }
}

// レスポンス作成
function createResponse(data, headers = {}) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}

// ========================================
// 定期実行・メンテナンス関数
// ========================================

// 古いデバイス登録のクリーンアップ
function cleanupOldDevices() {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  
  supabaseRequest('PATCH', 
    `device_registrations?last_used_at=lt.${sixMonthsAgo}`, 
    { is_active: false }
  );
  
  console.log('Old devices cleanup completed');
}

// 通知統計レポート生成
function generateNotificationReport() {
  const response = supabaseRequest('GET', 'notification_statistics?limit=100');
  
  if (response.data) {
    console.log('Notification report generated:', response.data.length, 'records');
  }
}

// 設定初期化（初回実行用）
function initializeGASProperties() {
  const properties = PropertiesService.getScriptProperties();
  
  // 基本設定
  const defaultProperties = {
    'DEBUG_MODE': 'false',
    'SUPABASE_URL': 'YOUR_SUPABASE_URL_HERE',
    'SUPABASE_SERVICE_KEY': 'YOUR_SUPABASE_SERVICE_KEY_HERE',
    'FIREBASE_PROJECT_ID': 'your-project-id',
    'FIREBASE_ACCESS_TOKEN': 'your-firebase-access-token',
    'SPREADSHEET_ID': 'YOUR_SPREADSHEET_ID_HERE'
  };
  
  properties.setProperties(defaultProperties);
  
  // 管理者アカウント設定
  setupAdminAccounts();
  
  console.log('GAS properties initialized');
  return { success: true, message: 'Properties initialized' };
}
