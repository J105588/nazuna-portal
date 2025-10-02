// Google Apps Script サンプルコード
// このファイルをGASプロジェクトにコピーして使用してください

// スプレッドシートID（実際のIDに変更してください）
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// シート名
const SHEETS = {
  CLUBS: '部活動',
  POSTS: '投稿',
  NEWS: 'お知らせ',
  SURVEYS: 'アンケート',
  MEMBERS: 'メンバー'
};

// メイン関数（WebAppのエントリーポイント）
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
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
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
