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
    FIREBASE_SERVER_KEY: properties.getProperty('FIREBASE_SERVER_KEY') || 'your-server-key',
    FCM_ENDPOINT: 'https://fcm.googleapis.com/fcm/send',
    
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

// GET リクエスト処理（後方互換性のため）
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
    const { email, password } = data;
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

// デバイス登録
function registerDevice(data) {
  try {
    const { fcmToken, userAgent, platform, browser, deviceInfo } = data;
    
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
    
    const response = supabaseRequest('POST', 'device_registrations', deviceData);
    
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

// 通知送信
function sendNotification(data) {
  try {
    const { templateKey, templateData, targetType = 'all', targetCriteria = {}, adminEmail } = data;
    
    // 通知テンプレートを取得
    const template = getNotificationTemplate(templateKey);
    if (!template) {
      return { success: false, error: 'Template not found: ' + templateKey };
    }
    
    // テンプレートからメッセージを生成
    const message = generateMessage(template, templateData);
    
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

// 一括通知送信
function sendBulkNotification(data) {
  try {
    const { notifications } = data;
    const results = [];
    
    for (const notification of notifications) {
      const result = sendNotification(notification);
      results.push(result);
      
      // レート制限対応
      Utilities.sleep(100);
    }
    
    return { success: true, data: results };
    
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
            icon: message.icon || '/images/icon-192x192.png',
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
        
        const response = sendFCMMessage(fcmMessage);
        
        if (response.success) {
          successCount++;
          deliveries.push({
            history_id: historyId,
            device_id: device.id,
            fcm_message_id: response.message_id,
            status: 'sent',
            sent_at: new Date().toISOString()
          });
        } else {
          failureCount++;
          deliveries.push({
            history_id: historyId,
            device_id: device.id,
            status: 'failed',
            error_code: response.error_code,
            error_message: response.error_message,
            sent_at: new Date().toISOString()
          });
          
          // 無効なトークンの場合はデバイスを無効化
          if (response.error_code === 'InvalidRegistration' || 
              response.error_code === 'NotRegistered') {
            deactivateDevice(device.fcm_token);
          }
        }
        
      } catch (error) {
        console.error('Error sending to device:', device.fcm_token, error);
        failureCount++;
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

// FCMメッセージ送信
function sendFCMMessage(message) {
  try {
    const config = getConfig();
    
    const response = UrlFetchApp.fetch(config.FCM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'key=' + config.FIREBASE_SERVER_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(message)
    });
    
    const responseData = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200 && responseData.success === 1) {
      return {
        success: true,
        message_id: responseData.multicast_id
      };
    } else {
      const error = responseData.results ? responseData.results[0].error : 'Unknown error';
      return {
        success: false,
        error_code: error,
        error_message: responseData.failure || error
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

// 通知テンプレート取得
function getNotificationTemplate(templateKey) {
  const response = supabaseRequest('GET', 
    `notification_templates?template_key=eq.${templateKey}&is_active=eq.true&limit=1`
  );
  
  return response.data && response.data.length > 0 ? response.data[0] : null;
}

// メッセージ生成
function generateMessage(template, data) {
  let title = template.title_template;
  let body = template.body_template;
  
  // テンプレート変数を置換
  for (const [key, value] of Object.entries(data || {})) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(regex, value);
    body = body.replace(regex, value);
  }
  
  return {
    title: title,
    body: body,
    icon: template.icon_url,
    action_url: template.action_url,
    category: template.category,
    priority: template.priority,
    actions: template.actions
  };
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
  return response.data || [];
}

// 通知履歴作成
function createNotificationHistory(template, message, targetType, criteria, totalRecipients, adminEmail) {
  const historyData = {
    template_id: template.id,
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
  return response.data[0].id;
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
// ユーティリティ関数
// ========================================

// Supabaseリクエスト
function supabaseRequest(method, endpoint, data = null) {
  try {
    const config = getConfig();
    
    const options = {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + config.SUPABASE_SERVICE_KEY,
        'apikey': config.SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : undefined
      }
    };
    
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
    'FIREBASE_SERVER_KEY': 'your-server-key',
    'SPREADSHEET_ID': 'YOUR_SPREADSHEET_ID_HERE'
  };
  
  properties.setProperties(defaultProperties);
  
  // 管理者アカウント設定
  setupAdminAccounts();
  
  console.log('GAS properties initialized');
  return { success: true, message: 'Properties initialized' };
}
