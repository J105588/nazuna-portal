// なずなポータルサイト設定ファイル

// API設定
const CONFIG = {
    // Supabase設定
    SUPABASE: {
        URL: 'https://ttcniefqeqcynbafxmsp.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0Y25pZWZxZXFjeW5iYWZ4bXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjMzNjcsImV4cCI6MjA3NzI5OTM2N30.i2qvGWrpZGjHgkem9sQNgFwTF2gdmYOvij1o-h2agTA',
        // CORS設定
        OPTIONS: {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            },
            global: {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
                }
            }
        }
    },

    // Google Apps Script WebApp URL
    // デプロイ後にこのURLを更新してください
    GAS_URL: 'https://script.google.com/macros/s/AKfycbxpmHJfKdc0nmAI3dG8-1-qlex9Sr9iy5LPZ1ri2EXkG1y5oFVlfrXs6Cy8QlbjgWQI/exec',

    // Firebase設定（通知システム用）
    FIREBASE: {
        PROJECT_ID: 'nazuna-portal',
        VAPID_KEY: 'BCEnp7nRdNubcooPI86iEEFqavkUxRal0t3AKkjsC1nB-PYLOUiE-EnGITJKfdANSRCG7zjyRzR6ERX3ZT0tZMQ',
        MESSAGING_SENDER_ID: '181514532945'
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
        VERSION: '1.0.0',
        DESCRIPTION: '市川学園生徒会',

        // ページネーション
        ITEMS_PER_PAGE: 10,

        // キャッシュ設定（ミリ秒）（最適化: 5分→15分に延長）
        CACHE_DURATION: 15 * 60 * 1000, // 15分

        // 通知設定
        NOTIFICATION_ICON: 'https://lh3.googleusercontent.com/pw/AP1GczPtDAtqRlRZY8yBF0ajASVZzyEDa1uq1vlm3Dw7a7TIXMQUzwOjquumsabe_DDWZiM6tg2Ruxgtb-kvWibkkbxvcklHnPPqCat1N8H4mKJp3QPpmvyEyJxObatEQq4xD2zu0AQ8yBYZf7GePeGIoEEF=w1033-h1033-s-no-gm?authuser=0',

        // デバッグモード
        DEBUG: true,

        // コンソールログ出力の有効/無効
        ENABLE_CONSOLE_LOG: true,


        // ページごとの公開フラグ（falseで準備中）
        PAGES: {
            'index': true,
            'council': true,
            'clubs': true,
            'forum': true,
            'news': true,
            'survey': true,
            'member-detail': true,
            'admin': true,
            'devlog': false,
            'schedule': true,
            '404': true,
            'location-denied': true
        }
    },

    // セキュリティ設定（位置情報ガード）
    SECURITY: {
        GEO_GUARD: {
            // ページごとの有効/無効設定
            ENABLED_PAGES: {
                // 例: 特定ページでのみ有効化する
                'admin': false,
                'forum': false,
                'index': false,
                'council': false,
                'clubs': true,
                'news': false,
                'survey': false,
                'member-detail': false
            },
            // 許可ゾーン（円形）複数可：{ lat, lng, radiusMeters }
            ALLOWED_ZONES: [
                // 必要に応じて座標を設定してください
                // { lat: 35.7099, lng: 139.8107, radiusMeters: 500 } // サンプル
                { lat: 35.729379, lng: 139.944390, radiusMeters: 200 },
            ],
            // 判定に失敗/拒否/範囲外時のリダイレクト先
            REDIRECT_PATH: 'location-denied.html',
            // 取得タイムアウト（ms）
            TIMEOUT_MS: 6000,
            // 高精度要求フラグ
            ENABLE_HIGH_ACCURACY: false,
            // 許可リクエスト時にユーザーへ表示する目的説明（同意取得用）
            CONSENT_MESSAGE: '個人情報保護の観点より、本ページは校内限定配信に設定されています。データ流出を防止するため、位置情報の取得を行います。取得した位置情報は、校内滞在の判定のみに用い、保存・記録はいたしません。'
        }
    },

    // UI設定
    UI: {
        // アニメーション時間（ミリ秒）
        ANIMATION_DURATION: 300,

        // ローディング表示時間（最適化: 1000ms→500ms）
        MIN_LOADING_TIME: 500,

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

// コンソールログ制御用ユーティリティ
// オリジナルのconsoleメソッドを保存
const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    trace: console.trace.bind(console)
};

// loggerオブジェクト（後方互換性のため）
const logger = {
    log: (...args) => {
        if (CONFIG.APP.ENABLE_CONSOLE_LOG) {
            originalConsole.log(...args);
        }
    },
    warn: (...args) => {
        if (CONFIG.APP.ENABLE_CONSOLE_LOG) {
            originalConsole.warn(...args);
        }
    },
    error: (...args) => {
        if (CONFIG.APP.ENABLE_CONSOLE_LOG) {
            originalConsole.error(...args);
        }
    },
    info: (...args) => {
        if (CONFIG.APP.ENABLE_CONSOLE_LOG) {
            originalConsole.info(...args);
        }
    },
    debug: (...args) => {
        if (CONFIG.APP.ENABLE_CONSOLE_LOG) {
            originalConsole.debug(...args);
        }
    },
    trace: (...args) => {
        if (CONFIG.APP.ENABLE_CONSOLE_LOG) {
            originalConsole.trace(...args);
        }
    }
};

// グローバルconsoleオブジェクトをオーバーライド
if (!CONFIG.APP.ENABLE_CONSOLE_LOG) {
    console.log = () => { };
    console.warn = () => { };
    console.error = () => { };
    console.info = () => { };
    console.debug = () => { };
    console.trace = () => { };
}

// 設定の検証
if (CONFIG.APP.DEBUG && CONFIG.APP.ENABLE_CONSOLE_LOG) {
    console.log('なずなポータル設定:', CONFIG);
}

// 設定をグローバルに公開
window.CONFIG = CONFIG;
window.logger = logger;
window.originalConsole = originalConsole; // デバッグ用に元のconsoleも公開
