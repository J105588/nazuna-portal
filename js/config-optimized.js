/**
 * なずなポータルサイト - 最適化版設定ファイル
 * パフォーマンス最適化済み
 */

// ========================================
// 最適化された設定
// ========================================

const CONFIG_OPTIMIZED = {
    // Supabase設定
    SUPABASE: {
        URL: 'https://jirppalacwwinwnsyauo.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcnBwYWxhY3d3aW53bnN5YXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTYwNDUsImV4cCI6MjA3NTIzMjA0NX0.wbCEhrTTPETy1iOB3MmbNVtN4JQk5Be2Dxfs61x7fr4',
        // 接続プール設定
        POOL_SIZE: 10,
        CONNECTION_TIMEOUT: 30000,
        QUERY_TIMEOUT: 10000
    },
    
    // Google Apps Script WebApp URL
    GAS_URL: 'https://script.google.com/macros/s/AKfycbxeusUgwu6ndqUf58VgRGHfy9NnPQW90mYN5HC19EsV3U5UaRF9qAQDxkq39v0Uzxfl/exec',
    
    // Firebase設定（通知システム用）
    FIREBASE: {
        PROJECT_ID: 'nazuna-portal',
        VAPID_KEY: 'BCEnp7nRdNubcooPI86iEEFqavkUxRal0t3AKkjsC1nB-PYLOUiE-EnGITJKfdANSRCG7zjyRzR6ERX3ZT0tZMQ',
        MESSAGING_SENDER_ID: '181514532945',
        // 通知設定
        NOTIFICATION_DEFAULTS: {
            icon: '/images/icon-192x192.png',
            badge: '/images/badge-72x72.png',
            requireInteraction: false,
            silent: false
        }
    },
    
    // パフォーマンス設定
    PERFORMANCE: {
        // デバッグモード（本番環境では false）
        DEBUG: false,
        
        // パフォーマンス監視
        MONITORING: {
            enabled: true,
            sampleRate: 0.1, // 10%のリクエストを監視
            metrics: ['loadTime', 'renderTime', 'apiResponseTime']
        },
        
        // リソース最適化
        RESOURCE_OPTIMIZATION: {
            // 画像最適化
            imageOptimization: {
                enabled: true,
                webpSupport: true,
                lazyLoading: true,
                responsiveImages: true,
                quality: 80
            },
            
            // フォント最適化
            fontOptimization: {
                enabled: true,
                preload: true,
                display: 'swap',
                fallback: 'system-ui, -apple-system, sans-serif'
            },
            
            // JavaScript最適化
            jsOptimization: {
                minification: true,
                compression: true,
                treeShaking: true,
                codeSplitting: true
            },
            
            // CSS最適化
            cssOptimization: {
                minification: true,
                criticalCSS: true,
                unusedCSSRemoval: true,
                compression: true
            }
        },
        
        // キャッシュ設定
        CACHE: {
            // メモリキャッシュ
            memory: {
                enabled: true,
                maxSize: 100,
                ttl: 5 * 60 * 1000, // 5分
                cleanupInterval: 60 * 1000 // 1分
            },
            
            // IndexedDBキャッシュ
            indexedDB: {
                enabled: true,
                dbName: 'NazunaPortalCache',
                version: 1,
                ttl: 24 * 60 * 60 * 1000, // 24時間
                stores: ['api', 'images', 'pages', 'assets']
            },
            
            // Service Workerキャッシュ
            serviceWorker: {
                enabled: true,
                cacheName: 'nazuna-portal-optimized-v30',
                strategies: {
                    'api': 'network-first',
                    'images': 'cache-first',
                    'pages': 'stale-while-revalidate',
                    'assets': 'cache-first'
                }
            },
            
            // APIキャッシュ設定
            api: {
                'council-members': { ttl: 10 * 60 * 1000, strategy: 'memory-first' },
                'clubs': { ttl: 30 * 60 * 1000, strategy: 'memory-first' },
                'news': { ttl: 5 * 60 * 1000, strategy: 'network-first' },
                'posts': { ttl: 2 * 60 * 1000, strategy: 'network-first' }
            }
        },
        
        // ネットワーク設定
        NETWORK: {
            // リトライ設定
            retry: {
                maxAttempts: 3,
                baseDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2
            },
            
            // タイムアウト設定
            timeout: {
                api: 10000,
                image: 5000,
                font: 3000,
                script: 8000
            },
            
            // 接続品質に応じた調整
            adaptive: {
                enabled: true,
                slowConnectionThreshold: 2000, // 2秒
                fastConnectionThreshold: 500   // 0.5秒
            }
        }
    },
    
    // アプリケーション設定
    APP: {
        NAME: 'なずなポータル',
        VERSION: '2.1.0',
        DESCRIPTION: 'みんなでつくる学校生活',
        
        // ページネーション
        PAGINATION: {
            DEFAULT_PAGE_SIZE: 10,
            MAX_PAGE_SIZE: 50,
            LOAD_MORE_THRESHOLD: 0.8
        },
        
        // 通知設定
        NOTIFICATION: {
            ICON: 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png',
            BADGE: 'https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/badge-72x72.png',
            DEFAULT_TITLE: 'なずなポータル',
            PERSISTENT: false,
            SILENT: false
        },
        
        // ページごとの公開フラグ
        PAGES: {
            'index': true,
            'council': true,
            'clubs': true,
            'forum': true,
            'news': true,
            'survey': false,
            'member-detail': true,
            'admin': true,
            '404': true
        },
        
        // 機能フラグ
        FEATURES: {
            PWA: true,
            NOTIFICATIONS: true,
            OFFLINE_SUPPORT: true,
            PUSH_NOTIFICATIONS: true,
            BACKGROUND_SYNC: true,
            ANALYTICS: true
        }
    },
    
    // UI設定
    UI: {
        // アニメーション設定
        ANIMATIONS: {
            enabled: true,
            duration: {
                fast: 150,
                normal: 300,
                slow: 500
            },
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            // ユーザーの設定に応じて無効化
            respectUserPreferences: true
        },
        
        // レスポンシブ設定
        RESPONSIVE: {
            breakpoints: {
                sm: 576,
                md: 768,
                lg: 992,
                xl: 1200
            },
            mobileFirst: true
        },
        
        // アクセシビリティ設定
        ACCESSIBILITY: {
            focusVisible: true,
            reducedMotion: true,
            highContrast: true,
            screenReader: true
        },
        
        // フォーム設定
        FORMS: {
            validation: {
                realtime: true,
                debounceDelay: 300
            },
            maxLength: {
                post: 1000,
                comment: 500,
                search: 100
            }
        }
    },
    
    // API設定
    API: {
        // エンドポイント
        ENDPOINTS: {
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
        
        // リクエスト設定
        REQUEST: {
            timeout: 10000,
            retries: 3,
            retryDelay: 1000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
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
            'newsletter': '月刊ぺんぺん草',
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
    
    // メッセージ設定
    MESSAGES: {
        ERROR: {
            NETWORK: 'ネットワークエラーが発生しました。しばらく待ってから再試行してください。',
            SERVER: 'サーバーエラーが発生しました。管理者にお問い合わせください。',
            VALIDATION: '入力内容を確認してください。',
            PERMISSION: 'この操作を実行する権限がありません。',
            NOT_FOUND: '要求されたデータが見つかりません。',
            TIMEOUT: 'リクエストがタイムアウトしました。',
            OFFLINE: 'オフラインです。ネットワーク接続を確認してください。'
        },
        
        SUCCESS: {
            POST_SUBMITTED: '投稿が完了しました！担当者が確認後、返信いたします。',
            SURVEY_SUBMITTED: 'アンケートの回答を送信しました。ご協力ありがとうございました！',
            NOTIFICATION_ENABLED: '通知が有効になりました！重要なお知らせをお届けします。',
            CACHE_CLEARED: 'キャッシュをクリアしました。',
            DATA_SAVED: 'データを保存しました。'
        },
        
        INFO: {
            LOADING: '読み込み中...',
            NO_DATA: 'データがありません。',
            NO_INFO: 'まだ情報はありません',
            OFFLINE: 'オフラインモードで動作しています。',
            CACHED_DATA: 'キャッシュされたデータを表示しています。',
            UPDATING: '更新中...',
            SAVING: '保存中...'
        }
    },
    
    // 分析設定
    ANALYTICS: {
        enabled: true,
        trackingId: 'GA_MEASUREMENT_ID', // 実際のIDに置き換え
        events: {
            pageView: true,
            userInteraction: true,
            performance: true,
            errors: true
        },
        privacy: {
            anonymizeIP: true,
            respectDoNotTrack: true,
            cookieConsent: true
        }
    },
    
    // セキュリティ設定
    SECURITY: {
        // CSP設定
        contentSecurityPolicy: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://www.gstatic.com", "https://cdnjs.cloudflare.com"],
            'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            'img-src': ["'self'", "data:", "https:", "blob:"],
            'font-src': ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            'connect-src': ["'self'", "https://jirppalacwwinwnsyauo.supabase.co", "https://script.google.com"],
            'manifest-src': ["'self'"]
        },
        
        // その他のセキュリティ設定
        httpsOnly: true,
        secureCookies: true,
        xssProtection: true,
        frameOptions: 'DENY'
    }
};

// ========================================
// 設定の検証と最適化
// ========================================

// 本番環境での設定最適化
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // デバッグモードを無効化
    CONFIG_OPTIMIZED.PERFORMANCE.DEBUG = false;
    
    // コンソールログを無効化
    if (CONFIG_OPTIMIZED.PERFORMANCE.DEBUG === false) {
        console.log = () => {};
        console.warn = () => {};
        console.info = () => {};
    }
    
    // パフォーマンス監視のサンプルレートを下げる
    CONFIG_OPTIMIZED.PERFORMANCE.MONITORING.sampleRate = 0.05; // 5%
}

// 設定の検証
function validateConfig() {
    const required = [
        'SUPABASE.URL',
        'SUPABASE.ANON_KEY',
        'GAS_URL',
        'FIREBASE.PROJECT_ID'
    ];
    
    const missing = required.filter(path => {
        const keys = path.split('.');
        let current = CONFIG_OPTIMIZED;
        for (const key of keys) {
            if (!current || !current[key]) return true;
            current = current[key];
        }
        return false;
    });
    
    if (missing.length > 0) {
        console.error('Missing required configuration:', missing);
        return false;
    }
    
    return true;
}

// 設定の最適化
function optimizeConfig() {
    // デバイス性能に応じた設定調整
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        // 低性能デバイス用の設定
        CONFIG_OPTIMIZED.PERFORMANCE.CACHE.memory.maxSize = 50;
        CONFIG_OPTIMIZED.PERFORMANCE.RESOURCE_OPTIMIZATION.imageOptimization.quality = 60;
    }
    
    // 接続品質に応じた設定調整
    if (navigator.connection) {
        const connection = navigator.connection;
        
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            // 低速接続用の設定
            CONFIG_OPTIMIZED.PERFORMANCE.CACHE.api['news'].ttl = 15 * 60 * 1000; // 15分
            CONFIG_OPTIMIZED.PERFORMANCE.CACHE.api['posts'].ttl = 5 * 60 * 1000; // 5分
        }
    }
    
    // ユーザー設定に応じた調整
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        CONFIG_OPTIMIZED.UI.ANIMATIONS.enabled = false;
    }
}

// ========================================
// 初期化
// ========================================

// 設定の検証と最適化を実行
if (validateConfig()) {
    optimizeConfig();
    console.log('Configuration validated and optimized');
} else {
    console.error('Configuration validation failed');
}

// グローバルに公開
window.CONFIG = CONFIG_OPTIMIZED;

// 後方互換性のため、既存のCONFIGも設定
if (typeof CONFIG === 'undefined') {
    window.CONFIG = CONFIG_OPTIMIZED;
}
