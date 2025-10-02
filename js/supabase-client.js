// Supabaseクライアント設定ファイル

// Supabase CDNから読み込み（HTMLで事前に読み込む必要があります）
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = CONFIG.APP.MAX_RETRIES;
        this.init();
    }

    // Supabaseクライアントを初期化
    init() {
        try {
            if (typeof supabase === 'undefined') {
                console.error('Supabase library not loaded. Please include the Supabase CDN script.');
                return;
            }

            if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
                console.error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in config.js');
                return;
            }

            this.client = supabase.createClient(
                CONFIG.SUPABASE.URL,
                CONFIG.SUPABASE.ANON_KEY
            );

            this.isConnected = true;
            console.log('Supabase client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            this.isConnected = false;
        }
    }

    // 接続状態をチェック
    checkConnection() {
        return this.isConnected && this.client !== null;
    }

    // データを取得（SELECT）
    async getData(table, options = {}) {
        if (!this.checkConnection()) {
            throw new Error('Supabase client not connected');
        }

        try {
            let query = this.client.from(table).select(options.select || '*');

            // フィルター条件を適用
            if (options.filters) {
                options.filters.forEach(filter => {
                    query = query[filter.method](...filter.args);
                });
            }

            // ソート条件を適用
            if (options.orderBy) {
                query = query.order(options.orderBy.column, { 
                    ascending: options.orderBy.ascending !== false 
                });
            }

            // リミットを適用
            if (options.limit) {
                query = query.limit(options.limit);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error(`Error fetching data from ${table}:`, error);
            throw error;
        }
    }

    // データを挿入（INSERT）
    async insertData(table, data) {
        if (!this.checkConnection()) {
            throw new Error('Supabase client not connected');
        }

        try {
            const { data: result, error } = await this.client
                .from(table)
                .insert(data)
                .select();

            if (error) {
                throw error;
            }

            return result;
        } catch (error) {
            console.error(`Error inserting data to ${table}:`, error);
            throw error;
        }
    }

    // データを更新（UPDATE）
    async updateData(table, data, filters) {
        if (!this.checkConnection()) {
            throw new Error('Supabase client not connected');
        }

        try {
            let query = this.client.from(table).update(data);

            // フィルター条件を適用
            if (filters) {
                filters.forEach(filter => {
                    query = query[filter.method](...filter.args);
                });
            }

            const { data: result, error } = await query.select();

            if (error) {
                throw error;
            }

            return result;
        } catch (error) {
            console.error(`Error updating data in ${table}:`, error);
            throw error;
        }
    }

    // データを削除（DELETE）
    async deleteData(table, filters) {
        if (!this.checkConnection()) {
            throw new Error('Supabase client not connected');
        }

        try {
            let query = this.client.from(table).delete();

            // フィルター条件を適用
            if (filters) {
                filters.forEach(filter => {
                    query = query[filter.method](...filter.args);
                });
            }

            const { error } = await query;

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error(`Error deleting data from ${table}:`, error);
            throw error;
        }
    }

    // リアルタイム購読を設定
    subscribeToChanges(table, callback, options = {}) {
        if (!this.checkConnection()) {
            console.error('Supabase client not connected');
            return null;
        }

        try {
            const subscription = this.client
                .channel(`${table}_changes`)
                .on('postgres_changes', 
                    { 
                        event: options.event || '*', 
                        schema: 'public', 
                        table: table 
                    }, 
                    callback
                )
                .subscribe();

            return subscription;
        } catch (error) {
            console.error(`Error subscribing to ${table} changes:`, error);
            return null;
        }
    }

    // 購読を解除
    unsubscribe(subscription) {
        if (subscription) {
            this.client.removeChannel(subscription);
        }
    }
}

// データベース操作用のヘルパークラス
class DatabaseHelper {
    constructor(supabaseClient) {
        this.db = supabaseClient;
    }

    // 部活動データを取得
    async getClubs(options = {}) {
        try {
            const clubs = await this.db.getData(CONFIG.TABLES.CLUBS, {
                orderBy: { column: 'created_at', ascending: false },
                ...options
            });
            return clubs;
        } catch (error) {
            console.error('Error fetching clubs:', error);
            return [];
        }
    }

    // 投稿データを取得
    async getPosts(options = {}) {
        try {
            const posts = await this.db.getData(CONFIG.TABLES.POSTS, {
                orderBy: { column: 'created_at', ascending: false },
                ...options
            });
            return posts;
        } catch (error) {
            console.error('Error fetching posts:', error);
            return [];
        }
    }

    // ニュースデータを取得
    async getNews(options = {}) {
        try {
            const news = await this.db.getData(CONFIG.TABLES.NEWS, {
                orderBy: { column: 'created_at', ascending: false },
                ...options
            });
            return news;
        } catch (error) {
            console.error('Error fetching news:', error);
            return [];
        }
    }

    // アンケートデータを取得
    async getSurveys(options = {}) {
        try {
            const surveys = await this.db.getData(CONFIG.TABLES.SURVEYS, {
                orderBy: { column: 'created_at', ascending: false },
                ...options
            });
            return surveys;
        } catch (error) {
            console.error('Error fetching surveys:', error);
            return [];
        }
    }

    // 生徒会メンバーデータを取得
    async getCouncilMembers(options = {}) {
        try {
            const members = await this.db.getData(CONFIG.TABLES.COUNCIL_MEMBERS, {
                orderBy: { column: 'position_order', ascending: true },
                ...options
            });
            return members;
        } catch (error) {
            console.error('Error fetching council members:', error);
            return [];
        }
    }

    // 投稿を送信
    async submitPost(content) {
        try {
            const postData = {
                content: content,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            const result = await this.db.insertData(CONFIG.TABLES.POSTS, postData);
            return result[0];
        } catch (error) {
            console.error('Error submitting post:', error);
            throw error;
        }
    }

    // アンケート回答を送信
    async submitSurveyResponse(surveyId, answers) {
        try {
            const responseData = {
                survey_id: surveyId,
                answers: answers,
                submitted_at: new Date().toISOString()
            };

            const result = await this.db.insertData(CONFIG.TABLES.SURVEY_RESPONSES, responseData);
            return result[0];
        } catch (error) {
            console.error('Error submitting survey response:', error);
            throw error;
        }
    }
}

// グローバルインスタンスを作成
let supabaseClient = null;
let dbHelper = null;

// 初期化関数
function initializeSupabase() {
    try {
        supabaseClient = new SupabaseClient();
        dbHelper = new DatabaseHelper(supabaseClient);
        console.log('Supabase initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// エクスポート（モジュール形式でない場合はグローバル変数として使用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseClient, DatabaseHelper, initializeSupabase };
}
