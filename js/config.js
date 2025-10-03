// なずなポータルサイト設定ファイル

// API設定
const CONFIG = {
    // Supabase設定
    SUPABASE: {
        URL: 'https://nhpohillwcpfybvmcexx.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocG9oaWxsd2NwZnlidm1jZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTQ5MTUsImV4cCI6MjA3NDk5MDkxNX0.iwNdmyg7vQFY8VUhYUQoI-y6u5sFivxtKLURNCerZAM'
    },
    
    // Google Apps Script WebApp URL
    // デプロイ後にこのURLを更新してください
    GAS_URL: 'YOUR_GAS_WEBAPP_URL_HERE',
    
    // Firebase設定（通知システム用）
    FIREBASE: {
        PROJECT_ID: 'your-project-id',
        VAPID_KEY: 'your-vapid-key-here',
        MESSAGING_SENDER_ID: 'your-sender-id'
    },
    
    // APIエンドポイント
    API: {
        // 部活動関連
        GET_CLUBS: 'getClubs',
        ADD_CLUB: 'addClub',
        UPDATE_CLUB: 'updateClub',
        
        // フォーラム関連
        GET_POSTS: 'getPosts',
        SUBMIT_POST: 'submitPost',
        UPDATE_POST_STATUS: 'updatePostStatus',
        
        // お知らせ関連
        GET_NEWS: 'getNews',
        ADD_NEWS: 'addNews',
        
        // アンケート関連
        GET_SURVEYS: 'getSurveys',
        SUBMIT_SURVEY: 'submitSurvey',
        GET_SURVEY_RESULTS: 'getSurveyResults',
        
        // 生徒会メンバー関連
        GET_MEMBERS: 'getMembers',
        UPDATE_MEMBERS: 'updateMembers'
    },
    
    // アプリケーション設定
    APP: {
        NAME: 'なずなポータル',
        VERSION: '2.0.0',
        DESCRIPTION: 'みんなでつくる学校生活',
        
        // ページネーション
        ITEMS_PER_PAGE: 10,
        
        // キャッシュ設定（ミリ秒）
        CACHE_DURATION: 5 * 60 * 1000, // 5分
        
        // 通知設定
        NOTIFICATION_ICON: './images/icon-192x192.png',
        
        // デバッグモード
        DEBUG: true
    },
    
    // UI設定
    UI: {
        // アニメーション時間（ミリ秒）
        ANIMATION_DURATION: 300,
        
        // ローディング表示時間
        MIN_LOADING_TIME: 1000,
        
        // 自動リフレッシュ間隔（ミリ秒）
        AUTO_REFRESH_INTERVAL: 30 * 60 * 1000, // 30分
        
        // フォーム設定
        FORM: {
            MAX_POST_LENGTH: 1000,
            MAX_COMMENT_LENGTH: 500,
            REQUIRED_FIELDS_MARK: '*'
        }
    },
    
    // カテゴリ設定
    CATEGORIES: {
        CLUBS: {
            'sports': '運動部',
            'culture': '文化部',
            'academic': '学術部',
            'music': '音楽部',
            'volunteer': 'ボランティア'
        },
        
        NEWS: {
            'event': 'イベント',
            'newsletter': '生徒会だより',
            'recruitment': '募集',
            'important': '重要',
            'general': '一般'
        },
        
        FORUM: {
            'suggestion': '提案・要望',
            'complaint': '苦情・問題',
            'question': '質問',
            'event': 'イベント関連',
            'facility': '施設・設備',
            'other': 'その他'
        }
    },
    
    // ステータス設定
    STATUS: {
        POSTS: {
            'pending': '確認中',
            'in_progress': '対応中',
            'resolved': '対応済み',
            'closed': '終了'
        },
        
        SURVEYS: {
            'active': '実施中',
            'closed': '終了',
            'draft': '下書き'
        }
    },
    
    // エラーメッセージ
    MESSAGES: {
        ERROR: {
            NETWORK: 'ネットワークエラーが発生しました。しばらく待ってから再試行してください。',
            SERVER: 'サーバーエラーが発生しました。管理者にお問い合わせください。',
            VALIDATION: '入力内容を確認してください。',
            PERMISSION: 'この操作を実行する権限がありません。',
            NOT_FOUND: '要求されたデータが見つかりません。'
        },
        
        SUCCESS: {
            POST_SUBMITTED: '投稿が完了しました！担当者が確認後、返信いたします。',
            SURVEY_SUBMITTED: 'アンケートの回答を送信しました。ご協力ありがとうございました！',
            NOTIFICATION_ENABLED: '通知が有効になりました！重要なお知らせをお届けします。'
        },
        
        INFO: {
            LOADING: '読み込み中...',
            NO_DATA: 'データがありません。',
            NO_INFO: 'まだ情報はありません',
            OFFLINE: 'オフラインモードで動作しています。'
        }
    }
};

// 設定の検証
if (CONFIG.APP.DEBUG) {
    console.log('なずなポータル設定:', CONFIG);
}

// 設定をグローバルに公開
window.CONFIG = CONFIG;
