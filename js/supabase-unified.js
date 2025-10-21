/**
 * なずなポータルサイト - 統合Supabaseクエリ
 * supabase-queries.js + supabase-queries-optimized.js の統合版
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
// 統合SupabaseQueriesクラス
// ========================================

if (typeof window.SupabaseQueries === 'undefined') {
class UnifiedSupabaseQueries {
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
        
        // パフォーマンス監視
        this.performanceMetrics = new Map();
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
    
    clearCache() {
        this.queryCache.clear();
    }

    // ========================================
    // リトライ機能
    // ========================================
    
    async withRetry(operation, context = '') {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const startTime = performance.now();
                const result = await operation();
                const endTime = performance.now();
                
                // パフォーマンス記録
                this.recordPerformance(context, endTime - startTime);
                
                return result;
            } catch (error) {
                lastError = error;
                console.warn(`[Supabase] Attempt ${attempt} failed for ${context}:`, error.message);
                
                if (attempt < this.maxRetries) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        
        throw lastError;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    recordPerformance(context, duration) {
        if (!this.performanceMetrics.has(context)) {
            this.performanceMetrics.set(context, []);
        }
        
        const metrics = this.performanceMetrics.get(context);
        metrics.push(duration);
        
        // 最新100件のみ保持
        if (metrics.length > 100) {
            metrics.shift();
        }
    }
    
    getPerformanceMetrics() {
        const result = {};
        for (const [context, metrics] of this.performanceMetrics) {
            result[context] = {
                count: metrics.length,
                average: metrics.reduce((a, b) => a + b, 0) / metrics.length,
                min: Math.min(...metrics),
                max: Math.max(...metrics)
            };
        }
        return result;
    }

    // ========================================
    // 部活動関連クエリ
    // ========================================

    /**
     * 部活動データを取得
     */
    async getClubs(options = {}) {
        const {
            limit = 10,
            offset = 0,
            category = null,
            activeOnly = true
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        const cacheKey = this.getCacheKey('getClubs', { limit, offset, category, activeOnly });
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        return await this.withRetry(async () => {
            let query = this.client
                .from('clubs')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (category) {
                query = query.eq('category', category);
            }

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            const result = { data: data || [], error };
            this.setCachedData(cacheKey, result);
            return result;
        }, 'getClubs');
    }

    /**
     * 部活動を追加
     */
    async addClub(clubData) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }

        return await this.withRetry(async () => {
            const { data, error } = await this.client
                .from('clubs')
                .insert([clubData])
                .select()
                .single();

            if (!error) {
                this.clearCache(); // キャッシュをクリア
            }

            return { data, error };
        }, 'addClub');
    }

    /**
     * 部活動を更新
     */
    async updateClub(id, updates) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }

        return await this.withRetry(async () => {
            const { data, error } = await this.client
                .from('clubs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (!error) {
                this.clearCache(); // キャッシュをクリア
            }

            return { data, error };
        }, 'updateClub');
    }

    // ========================================
    // フォーラム関連クエリ
    // ========================================

    /**
     * フォーラム投稿を取得
     */
    async getPosts(options = {}) {
        const {
            limit = 10,
            offset = 0,
            category = null,
            status = 'published'
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        const cacheKey = this.getCacheKey('getPosts', { limit, offset, category, status });
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        return await this.withRetry(async () => {
            let query = this.client
                .from('forum_posts')
                .select('*')
                .eq('status', status)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            const result = { data: data || [], error };
            this.setCachedData(cacheKey, result);
            return result;
        }, 'getPosts');
    }

    /**
     * フォーラム投稿を追加
     */
    async addPost(postData) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }

        return await this.withRetry(async () => {
            const { data, error } = await this.client
                .from('forum_posts')
                .insert([postData])
                .select()
                .single();

            if (!error) {
                this.clearCache(); // キャッシュをクリア
            }

            return { data, error };
        }, 'addPost');
    }

    /**
     * フォーラム投稿を更新
     */
    async updatePost(id, updates) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }

        return await this.withRetry(async () => {
            const { data, error } = await this.client
                .from('forum_posts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (!error) {
                this.clearCache(); // キャッシュをクリア
            }

            return { data, error };
        }, 'updatePost');
    }

    // ========================================
    // お知らせ関連クエリ
    // ========================================

    /**
     * お知らせを取得
     */
    async getNews(options = {}) {
        const {
            limit = 10,
            offset = 0,
            category = null,
            published = true
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        const cacheKey = this.getCacheKey('getNews', { limit, offset, category, published });
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        return await this.withRetry(async () => {
            let query = this.client
                .from('news')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (category) {
                query = query.eq('category', category);
            }

            if (published) {
                query = query.eq('is_published', true);
            }

            const { data, error } = await query;

            const result = { data: data || [], error };
            this.setCachedData(cacheKey, result);
            return result;
        }, 'getNews');
    }

    /**
     * 最新のお知らせを取得
     */
    async getLatestNews(limit = 3) {
        return await this.getNews({ limit, published: true });
    }

    /**
     * お知らせを追加
     */
    async addNews(newsData) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }

        return await this.withRetry(async () => {
            const { data, error } = await this.client
                .from('news')
                .insert([newsData])
                .select()
                .single();

            if (!error) {
                this.clearCache(); // キャッシュをクリア
            }

            return { data, error };
        }, 'addNews');
    }

    // ========================================
    // アンケート関連クエリ
    // ========================================

    /**
     * アンケートを取得
     */
    async getSurveys(options = {}) {
        const {
            limit = 10,
            offset = 0,
            activeOnly = true
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        const cacheKey = this.getCacheKey('getSurveys', { limit, offset, activeOnly });
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        return await this.withRetry(async () => {
            let query = this.client
                .from('surveys')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            const result = { data: data || [], error };
            this.setCachedData(cacheKey, result);
            return result;
        }, 'getSurveys');
    }

    /**
     * アンケートを追加
     */
    async addSurvey(surveyData) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }

        return await this.withRetry(async () => {
            const { data, error } = await this.client
                .from('surveys')
                .insert([surveyData])
                .select()
                .single();

            if (!error) {
                this.clearCache(); // キャッシュをクリア
            }

            return { data, error };
        }, 'addSurvey');
    }

    /**
     * アンケート回答を送信
     */
    async submitSurveyResponse(surveyId, responses) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }

        return await this.withRetry(async () => {
            const { data, error } = await this.client
                .from('survey_responses')
                .insert([{
                    survey_id: surveyId,
                    responses: responses,
                    submitted_at: new Date().toISOString()
                }])
                .select()
                .single();

            return { data, error };
        }, 'submitSurveyResponse');
    }

    // ========================================
    // 生徒会メンバー関連クエリ
    // ========================================

    /**
     * 生徒会メンバーを取得
     */
    async getMembers(options = {}) {
        const {
            position = null,
            activeOnly = true
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        const cacheKey = this.getCacheKey('getMembers', { position, activeOnly });
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            return cached;
        }

        return await this.withRetry(async () => {
            let query = this.client
                .from('council_members')
                .select('*')
                .order('position_order', { ascending: true });

            if (position) {
                query = query.eq('position', position);
            }

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            const result = { data: data || [], error };
            this.setCachedData(cacheKey, result);
            return result;
        }, 'getMembers');
    }

    /**
     * 生徒会メンバーを更新
     */
    async updateMembers(membersData) {
        if (!this.isAvailable) {
            return { data: null, error: { message: 'Supabase not available' } };
        }

        return await this.withRetry(async () => {
            const { data, error } = await this.client
                .from('council_members')
                .upsert(membersData)
                .select();

            if (!error) {
                this.clearCache(); // キャッシュをクリア
            }

            return { data, error };
        }, 'updateMembers');
    }

    // ========================================
    // ユーティリティ関数
    // ========================================

    /**
     * データベース接続をテスト
     */
    async testConnection() {
        if (!this.isAvailable) {
            return { success: false, error: 'Supabase not available' };
        }

        try {
            const { data, error } = await this.client
                .from('clubs')
                .select('id')
                .limit(1);

            return { success: !error, error };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 統計情報を取得
     */
    async getStats() {
        if (!this.isAvailable) {
            return { data: null, error: 'Supabase not available' };
        }

        try {
            const [clubsResult, postsResult, newsResult, surveysResult] = await Promise.all([
                this.client.from('clubs').select('id', { count: 'exact' }),
                this.client.from('forum_posts').select('id', { count: 'exact' }),
                this.client.from('news').select('id', { count: 'exact' }),
                this.client.from('surveys').select('id', { count: 'exact' })
            ]);

            return {
                data: {
                    clubs: clubsResult.count || 0,
                    posts: postsResult.count || 0,
                    news: newsResult.count || 0,
                    surveys: surveysResult.count || 0
                },
                error: null
            };
        } catch (error) {
            return { data: null, error: error.message };
        }
    }

    /**
     * システム情報を取得
     */
    getSystemInfo() {
        return {
            isAvailable: this.isAvailable,
            cacheSize: this.queryCache.size,
            performanceMetrics: this.getPerformanceMetrics(),
            client: this.client ? 'Connected' : 'Not connected'
        };
    }
}

// グローバルに公開
window.SupabaseQueries = UnifiedSupabaseQueries;
}

// ========================================
// Supabase初期化関数
// ========================================

function initSupabase() {
    // 既に初期化されている場合はスキップ
    if (window.supabaseClient && window.supabaseQueries) {
        console.log('Supabase client already initialized');
        return;
    }
    
    if (typeof supabase !== 'undefined' && 
        CONFIG.SUPABASE.URL && 
        CONFIG.SUPABASE.ANON_KEY &&
        CONFIG.SUPABASE.URL !== 'YOUR_SUPABASE_URL_HERE' &&
        CONFIG.SUPABASE.ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
        
        try {
            const supabaseClient = supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);
            window.supabaseClient = supabaseClient;
            
            if (typeof SupabaseQueries !== 'undefined') {
                const supabaseQueries = new SupabaseQueries(supabaseClient);
                window.supabaseQueries = supabaseQueries;
                console.log('Supabase client and queries initialized successfully');
            } else {
                throw new Error('SupabaseQueries class not available');
            }
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            console.log('Continuing with demo mode...');
            window.supabaseClient = null;
            window.supabaseQueries = null;
        }
    } else {
        console.warn('Supabase not available or not configured properly');
        console.log('Using demo mode with fallback data');
        window.supabaseClient = null;
        window.supabaseQueries = null;
    }
}

// グローバル初期化関数を公開
window.initSupabase = initSupabase;

console.log('[Supabase Unified] Loaded successfully');
