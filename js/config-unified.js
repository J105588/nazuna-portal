/**
 * なずなポータルサイト - 統合設定ファイル
 * config.js + config-optimized.js の統合版
 * パフォーマンス最適化済み
 */

// ========================================
// 統合設定
// ========================================

const CONFIG_UNIFIED = {
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
    GAS_URL: 'https://script.google.com/macros/s/AKfycbzmDriTkb3t2KRcZNYwKF99btx7XyWB79W_UGovHmdJQMtcyqcAffkIJC1AkycaETps/exec',
    
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
            IMAGE_OPTIMIZATION: {
                enabled: true,
                quality: 0.8,
                formats: ['webp', 'jpeg', 'png'],
                lazyLoading: true
            },
            
            // キャッシュ戦略
            CACHE_STRATEGY: {
                static: 'cache-first',
                dynamic: 'network-first',
                api: 'network-only'
            },
            
            // プリロード
            PRELOAD: {
                critical: true,
                fonts: true,
                images: false
            }
        },
        
        // バンドル最適化
        BUNDLE_OPTIMIZATION: {
            // コード分割
            codeSplitting: true,
            // ツリーシェイキング
            treeShaking: true,
            // ミニファイ
            minification: true
        }
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
        DESCRIPTION: 'なずな学園の公式ポータルサイト',
        
        // ページ公開設定
        PAGES: {
            index: true,
            news: true,
            forum: true,
            clubs: true,
            survey: true,
            council: true,
            admin: true
        },
        
        // キャッシュ設定
        CACHE_DURATION: 5 * 60 * 1000, // 5分
        CACHE_SIZE_LIMIT: 50 * 1024 * 1024, // 50MB
        
        // リトライ設定
        RETRY: {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000
        },
        
        // タイムアウト設定
        TIMEOUT: {
            api: 10000,
            image: 5000,
            navigation: 15000
        }
    },
    
    // UI設定
    UI: {
        // テーマ設定
        THEME: {
            primary: '#3b82f6',
            secondary: '#6b7280',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6'
        },
        
        // アニメーション設定
        ANIMATION: {
            duration: 300,
            easing: 'ease-in-out',
            reducedMotion: false
        },
        
        // レスポンシブ設定
        RESPONSIVE: {
            breakpoints: {
                mobile: 768,
                tablet: 1024,
                desktop: 1280
            }
        }
    },
    
    // セキュリティ設定
    SECURITY: {
        // CSP設定
        CSP: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://www.gstatic.com"],
            'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            'font-src': ["'self'", "https://fonts.gstatic.com"],
            'img-src': ["'self'", "data:", "https:"],
            'connect-src': ["'self'", "https://jirppalacwwinwnsyauo.supabase.co", "https://script.google.com"]
        },
        
        // セッション設定
        SESSION: {
            timeout: 30 * 60 * 1000, // 30分
            refreshThreshold: 5 * 60 * 1000 // 5分前
        }
    },
    
    // PWA設定
    PWA: {
        // インストール設定
        INSTALL: {
            promptDelay: 10000, // 10秒後にプロンプト表示
            dismissDuration: 24 * 60 * 60 * 1000 // 24時間後に再表示
        },
        
        // アップデート設定
        UPDATE: {
            checkInterval: 5 * 60 * 1000, // 5分間隔
            cooldown: 30 * 1000, // 30秒クールダウン
            autoApply: false // 手動適用
        },
        
        // キャッシュ設定
        CACHE: {
            version: 2,
            strategy: 'stale-while-revalidate',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7日
        }
    },
    
    // 通知設定
    NOTIFICATIONS: {
        // 通知権限
        PERMISSION: {
            requestOnLoad: false,
            fallbackToLocal: true
        },
        
        // 通知表示設定
        DISPLAY: {
            position: 'top-right',
            duration: 5000,
            maxVisible: 3
        },
        
        // 通知タイプ
        TYPES: {
            news: {
                icon: 'fas fa-newspaper',
                color: '#3b82f6',
                sound: false
            },
            forum: {
                icon: 'fas fa-comments',
                color: '#10b981',
                sound: true
            },
            survey: {
                icon: 'fas fa-poll',
                color: '#f59e0b',
                sound: false
            },
            system: {
                icon: 'fas fa-cog',
                color: '#6b7280',
                sound: false
            }
        }
    },
    
    // メッセージ設定
    MESSAGES: {
        // 成功メッセージ
        SUCCESS: {
            SAVE: '保存しました',
            UPDATE: '更新しました',
            DELETE: '削除しました',
            SEND: '送信しました'
        },
        
        // エラーメッセージ
        ERROR: {
            NETWORK: 'ネットワークエラーが発生しました',
            TIMEOUT: 'タイムアウトしました',
            PERMISSION: '権限がありません',
            VALIDATION: '入力内容を確認してください',
            SERVER: 'サーバーエラーが発生しました'
        },
        
        // 情報メッセージ
        INFO: {
            LOADING: '読み込み中...',
            SAVING: '保存中...',
            OFFLINE: 'オフラインです',
            ONLINE: 'オンラインに戻りました'
        },
        
        // 確認メッセージ
        CONFIRM: {
            DELETE: '削除してもよろしいですか？',
            RESET: 'リセットしてもよろしいですか？',
            LOGOUT: 'ログアウトしますか？'
        }
    },
    
    // デバッグ設定
    DEBUG: {
        // ログレベル
        LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        
        // ログ出力先
        LOG_TARGETS: ['console'],
        
        // パフォーマンスログ
        PERFORMANCE_LOGGING: true,
        
        // エラー追跡
        ERROR_TRACKING: true
    }
};

// ========================================
// 設定検証
// ========================================

function validateConfig() {
    const required = [
        'SUPABASE.URL',
        'SUPABASE.ANON_KEY',
        'GAS_URL',
        'FIREBASE.PROJECT_ID',
        'FIREBASE.VAPID_KEY',
        'FIREBASE.MESSAGING_SENDER_ID'
    ];
    
    const missing = required.filter(path => {
        const keys = path.split('.');
        let current = CONFIG_UNIFIED;
        for (const key of keys) {
            if (!current || !current[key]) {
                return true;
            }
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

// ========================================
// 設定の動的更新
// ========================================

function updateConfig(path, value) {
    const keys = path.split('.');
    let current = CONFIG_UNIFIED;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    console.log(`[Config] Updated ${path}:`, value);
}

function getConfig(path) {
    const keys = path.split('.');
    let current = CONFIG_UNIFIED;
    
    for (const key of keys) {
        if (!current || !current[key]) {
            return undefined;
        }
        current = current[key];
    }
    
    return current;
}

// ========================================
// 環境別設定
// ========================================

function getEnvironmentConfig() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return {
            DEBUG: true,
            PERFORMANCE: {
                ...CONFIG_UNIFIED.PERFORMANCE,
                MONITORING: {
                    ...CONFIG_UNIFIED.PERFORMANCE.MONITORING,
                    sampleRate: 1.0 // 開発環境では100%監視
                }
            }
        };
    }
    
    if (hostname.includes('github.io') || hostname.includes('vercel.app')) {
        return {
            DEBUG: false,
            PERFORMANCE: {
                ...CONFIG_UNIFIED.PERFORMANCE,
                MONITORING: {
                    ...CONFIG_UNIFIED.PERFORMANCE.MONITORING,
                    sampleRate: 0.05 // 本番環境では5%監視
                }
            }
        };
    }
    
    return CONFIG_UNIFIED;
}

// ========================================
// グローバル公開
// ========================================

// 環境別設定を適用
const environmentConfig = getEnvironmentConfig();
const CONFIG = { ...CONFIG_UNIFIED, ...environmentConfig };

// グローバルに公開（既存のCONFIGを上書きしない）
if (typeof window.CONFIG === 'undefined') {
    window.CONFIG = CONFIG;
} else {
    // 既存のCONFIGがある場合は、統合設定をマージ
    window.CONFIG = { ...window.CONFIG, ...CONFIG };
}

// 設定検証
if (!validateConfig()) {
    console.error('[Config] Configuration validation failed');
}

// デバッグ情報
if (CONFIG.DEBUG?.LOG_LEVEL === 'debug') {
    console.log('[Config] Configuration loaded:', CONFIG);
    console.log('[Config] Environment:', window.location.hostname);
}

// 設定管理関数をグローバルに公開
window.updateConfig = updateConfig;
window.getConfig = getConfig;
window.validateConfig = validateConfig;

console.log('[Config Unified] Loaded successfully');
