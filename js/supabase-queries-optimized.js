/**
 * 最適化されたSupabaseクエリクラス
 * パフォーマンス最適化済み
 */

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

// ========================================
// 最適化されたSupabaseQueriesクラス
// ========================================

if (typeof window.SupabaseQueries === 'undefined') {
class OptimizedSupabaseQueries {
    constructor(supabaseClient) {
        this.client = supabaseClient;
        this.isAvailable = !!supabaseClient;
        
        // クエリキャッシュ
        this.queryCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分
        
        // バッチ処理用キュー
        this.batchQueue = new Map();
        this.batchTimeout = 100; // 100ms
        
        // リトライ設定
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // ========================================
    // キャッシュ管理
    // ========================================
    
    getCacheKey(method, params) {
        return `${method}_${JSON.stringify(params)}`;
    }
    
    getCachedData(cacheKey) {
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }
    
    setCachedData(cacheKey, data) {
        this.queryCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
    }
    
    clearCache(pattern) {
        if (pattern) {
            for (const [key] of this.queryCache) {
                if (key.includes(pattern)) {
                    this.queryCache.delete(key);
                }
            }
        } else {
            this.queryCache.clear();
        }
    }

    // ========================================
    // 最適化されたクエリ実行
    // ========================================
    
    async executeQuery(queryFn, cacheKey = null, useCache = true) {
        if (!this.isAvailable) {
            return { data: [], error: null };
        }
        
        // キャッシュチェック
        if (useCache && cacheKey) {
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                return { data: cached, error: null };
            }
        }
        
        // リトライ付きクエリ実行
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const { data, error } = await queryFn();
                
                if (error) {
                    throw error;
                }
                
                // キャッシュに保存
                if (useCache && cacheKey) {
                    this.setCachedData(cacheKey, data);
                }
                
                return { data: data || [], error: null };
                
            } catch (error) {
                console.warn(`Query attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.maxRetries) {
                    return { data: [], error };
                }
                
                // 指数バックオフでリトライ
                await new Promise(resolve => 
                    setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1))
                );
            }
        }
    }

    // ========================================
    // バッチ処理
    // ========================================
    
    async batchQuery(queries) {
        if (!this.isAvailable) {
            return queries.map(() => ({ data: [], error: null }));
        }
        
        try {
            // 並列実行
            const results = await Promise.allSettled(
                queries.map(query => query())
            );
            
            return results.map(result => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    return { data: [], error: result.reason };
                }
            });
            
        } catch (error) {
            console.error('Batch query failed:', error);
            return queries.map(() => ({ data: [], error }));
        }
    }

    // ========================================
    // 最適化されたデータ取得メソッド
    // ========================================

    /**
     * 生徒会メンバーを取得（最適化版）
     */
    async getCouncilMembers(options = {}) {
        const {
            limit = 50,
            offset = 0,
            activeOnly = true,
            useCache = true
        } = options;
        
        const cacheKey = this.getCacheKey('council-members', { limit, offset, activeOnly });
        
        return this.executeQuery(async () => {
            let query = this.client
                .from('council_members')
                .select('id, name, role, message, display_order, is_active, created_at')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (activeOnly) {
                query = query.eq('is_active', true);
            }
            
            return await query;
        }, cacheKey, useCache);
    }

    /**
     * 部活動データを取得（最適化版）
     */
    async getClubs(options = {}) {
        const {
            limit = 100,
            offset = 0,
            category = null,
            activeOnly = true,
            useCache = true
        } = options;
        
        const cacheKey = this.getCacheKey('clubs', { limit, offset, category, activeOnly });
        
        return this.executeQuery(async () => {
            let query = this.client
                .from('clubs')
                .select('id, name, description, category, image_url, members, schedule, is_active, display_order, created_at')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (activeOnly) {
                query = query.eq('is_active', true);
            }
            
            if (category) {
                query = query.eq('category', category);
            }
            
            return await query;
        }, cacheKey, useCache);
    }

    /**
     * お知らせデータを取得（最適化版）
     */
    async getNews(options = {}) {
        const {
            limit = 20,
            offset = 0,
            category = null,
            publishedOnly = true,
            useCache = true
        } = options;
        
        const cacheKey = this.getCacheKey('news', { limit, offset, category, publishedOnly });
        
        return this.executeQuery(async () => {
            let query = this.client
                .from('news')
                .select('id, title, content, category, date, priority, is_published, created_at')
                .order('date', { ascending: false })
                .order('priority', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (publishedOnly) {
                query = query.eq('is_published', true);
            }
            
            if (category) {
                query = query.eq('category', category);
            }
            
            return await query;
        }, cacheKey, useCache);
    }

    /**
     * フォーラム投稿を取得（最適化版）
     */
    async getPosts(options = {}) {
        const {
            limit = 20,
            offset = 0,
            status = null,
            search = null,
            orderBy = 'created_at',
            orderDirection = 'desc',
            useCache = true
        } = options;
        
        const cacheKey = this.getCacheKey('posts', { 
            limit, offset, status, search, orderBy, orderDirection 
        });
        
        return this.executeQuery(async () => {
            let query = this.client
                .from('posts')
                .select('id, content, student_number, status, category, reply, created_at, updated_at')
                .order(orderBy, { ascending: orderDirection === 'asc' })
                .range(offset, offset + limit - 1);
            
            if (status) {
                query = query.eq('status', status);
            }
            
            if (search) {
                query = query.ilike('content', `%${search}%`);
            }
            
            return await query;
        }, cacheKey, useCache);
    }

    /**
     * 投稿を送信（最適化版）
     */
    async createPost(postData) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }
        
        try {
            const { data, error } = await this.client
                .from('posts')
                .insert([{
                    content: postData.content,
                    student_number: postData.student_number,
                    category: postData.category || 'general',
                    status: 'pending',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) {
                return { data: null, error };
            }
            
            // キャッシュをクリア
            this.clearCache('posts');
            
            return { data, error: null };
            
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * 生徒情報を取得（最適化版）
     */
    async getStudentByNumber(studentNumber) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }
        
        const cacheKey = this.getCacheKey('student', { studentNumber });
        
        return this.executeQuery(async () => {
            return await this.client
                .from('students')
                .select('student_number, name, password_hash, created_at')
                .eq('student_number', studentNumber)
                .maybeSingle();
        }, cacheKey, true);
    }

    /**
     * 生徒を登録（最適化版）
     */
    async registerStudent(studentData) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }
        
        try {
            const { data, error } = await this.client
                .from('students')
                .insert([{
                    student_number: studentData.student_number,
                    name: studentData.name,
                    password_hash: studentData.password_hash,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) {
                return { data: null, error };
            }
            
            // キャッシュをクリア
            this.clearCache('student');
            
            return { data, error: null };
            
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * チャットメッセージを取得（最適化版）
     */
    async getChatMessages(postId, options = {}) {
        const {
            limit = 50,
            offset = 0,
            useCache = true
        } = options;
        
        const cacheKey = this.getCacheKey('chat', { postId, limit, offset });
        
        return this.executeQuery(async () => {
            return await this.client
                .from('chat_messages')
                .select('id, post_id, sender, message, is_admin, created_at')
                .eq('post_id', postId)
                .order('created_at', { ascending: true })
                .range(offset, offset + limit - 1);
        }, cacheKey, useCache);
    }

    /**
     * チャットメッセージを送信（最適化版）
     */
    async sendChat(chatData) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }
        
        try {
            const { data, error } = await this.client
                .from('chat_messages')
                .insert([{
                    post_id: chatData.post_id,
                    sender: chatData.sender,
                    message: chatData.message,
                    is_admin: chatData.is_admin || false,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) {
                return { data: null, error };
            }
            
            // キャッシュをクリア
            this.clearCache('chat');
            
            return { data, error: null };
            
        } catch (error) {
            return { data: null, error };
        }
    }

    // ========================================
    // 統計情報取得（最適化版）
    // ========================================
    
    async getStatistics() {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }
        
        const cacheKey = this.getCacheKey('statistics', {});
        
        return this.executeQuery(async () => {
            // 並列で統計情報を取得
            const [postsResult, newsResult, membersResult] = await Promise.allSettled([
                this.client.from('posts').select('id', { count: 'exact' }).limit(0),
                this.client.from('news').select('id', { count: 'exact' }).eq('is_published', true).limit(0),
                this.client.from('council_members').select('id', { count: 'exact' }).eq('is_active', true).limit(0)
            ]);
            
            return {
                totalPosts: postsResult.status === 'fulfilled' ? postsResult.value.count : 0,
                totalNews: newsResult.status === 'fulfilled' ? newsResult.value.count : 0,
                totalMembers: membersResult.status === 'fulfilled' ? membersResult.value.count : 0
            };
        }, cacheKey, true);
    }

    // ========================================
    // エラーハンドリング
    // ========================================
    
    getErrorMessage(error, context = '') {
        if (!error) return '不明なエラーが発生しました';
        
        const errorMessage = error.message || error.details || error.hint || '不明なエラー';
        
        // エラータイプ別の処理
        if (errorMessage.includes('policy') || errorMessage.includes('RLS')) {
            return `${context}のアクセス権限に問題があります。管理者にお問い合わせください。`;
        }
        
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return 'ネットワークエラーが発生しました。接続を確認してください。';
        }
        
        if (errorMessage.includes('timeout')) {
            return 'リクエストがタイムアウトしました。しばらく待ってから再試行してください。';
        }
        
        return `${context}の処理中にエラーが発生しました: ${errorMessage}`;
    }

    // ========================================
    // ユーティリティ
    // ========================================
    
    async healthCheck() {
        if (!this.isAvailable) {
            return { status: 'unavailable', message: 'Supabase client not initialized' };
        }
        
        try {
            const { data, error } = await this.client
                .from('council_members')
                .select('id')
                .limit(1);
            
            if (error) {
                return { status: 'error', message: error.message };
            }
            
            return { status: 'healthy', message: 'Connection successful' };
            
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
    
    // メモリ使用量の監視
    getMemoryUsage() {
        const cacheSize = this.queryCache.size;
        const memoryUsage = {
            cacheEntries: cacheSize,
            cacheKeys: Array.from(this.queryCache.keys()),
            timestamp: new Date().toISOString()
        };
        
        return memoryUsage;
    }
}

// グローバルに公開
window.SupabaseQueries = OptimizedSupabaseQueries;
}

// ========================================
// 初期化と設定
// ========================================

// Supabaseクライアントの初期化
let supabaseClient = null;
let supabaseQueries = null;

function initSupabase() {
    if (typeof supabase !== 'undefined' && 
        CONFIG.SUPABASE.URL && 
        CONFIG.SUPABASE.ANON_KEY &&
        CONFIG.SUPABASE.URL !== 'YOUR_SUPABASE_URL_HERE' &&
        CONFIG.SUPABASE.ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
        
        try {
            supabaseClient = supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);
            window.supabaseClient = supabaseClient;
            
            supabaseQueries = new OptimizedSupabaseQueries(supabaseClient);
            window.supabaseQueries = supabaseQueries;
            
            console.log('Optimized Supabase client initialized successfully');
            
            // ヘルスチェック
            supabaseQueries.healthCheck().then(result => {
                console.log('Supabase health check:', result);
            });
            
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            supabaseClient = null;
            supabaseQueries = null;
            window.supabaseClient = null;
            window.supabaseQueries = null;
        }
    } else {
        console.warn('Supabase not available or not configured properly');
        supabaseClient = null;
        supabaseQueries = null;
        window.supabaseClient = null;
        window.supabaseQueries = null;
    }
}

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
} else {
    initSupabase();
}

// グローバルに公開
window.initSupabase = initSupabase;
