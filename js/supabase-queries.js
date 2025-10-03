// シンプルなハッシュ（クライアント側）
async function sha256(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

window.sha256 = sha256;

// ========================================
// なずなポータルサイト 統一Supabaseクエリ
// ========================================

/**
 * 統一されたSupabaseクエリクラス
 * すべてのデータベース操作を統一された形式で提供
 */
class SupabaseQueries {
    constructor(supabaseClient) {
        this.client = supabaseClient;
        this.isAvailable = !!supabaseClient;
    }

    // ========================================
    // 基本システムテーブル用クエリ
    // ========================================

    /**
     * 部活動データを取得
     * @param {Object} options - クエリオプション
     * @returns {Promise<Object>} クエリ結果
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

        try {
            let query = this.client
                .from('clubs')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            return { data: data || [], error };
        } catch (error) {
            console.error('Error fetching clubs:', error);
            return { data: [], error };
        }
    }

    /**
     * お知らせデータを取得
     * @param {Object} options - クエリオプション
     * @returns {Promise<Object>} クエリ結果
     */
    async getNews(options = {}) {
        const {
            limit = 10,
            offset = 0,
            type = null,
            publishedOnly = true
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        try {
            let query = this.client
                .from('news')
                .select('*')
                .order('priority', { ascending: false })
                .order('date', { ascending: false })
                .range(offset, offset + limit - 1);

            if (publishedOnly) {
                query = query.eq('is_published', true);
            }

            if (type) {
                query = query.eq('type', type);
            }

            const { data, error } = await query;
            return { data: data || [], error };
        } catch (error) {
            console.error('Error fetching news:', error);
            return { data: [], error };
        }
    }

    /**
     * 生徒会メンバーデータを取得
     * @param {Object} options - クエリオプション
     * @returns {Promise<Object>} クエリ結果
     */
    async getCouncilMembers(options = {}) {
        const {
            activeOnly = true,
            orderBy = 'display_order'
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        try {
            let query = this.client
                .from('council_members')
                .select('*')
                .order(orderBy, { ascending: true });

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;
            return { data: data || [], error };
        } catch (error) {
            console.error('Error fetching council members:', error);
            return { data: [], error };
        }
    }

    // ========================================
    // フォーラム・投稿システム用クエリ
    // ========================================

    /**
     * 投稿データを取得
     * @param {Object} options - クエリオプション
     * @returns {Promise<Object>} クエリ結果
     */
    async getPosts(options = {}) {
        const {
            limit = 10,
            offset = 0,
            status = 'approved',
            category = null
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        try {
            let query = this.client
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (status) {
                if (Array.isArray(status)) {
                    query = query.in('status', status);
                } else {
                    query = query.eq('status', status);
                }
            }

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            return { data: data || [], error };
        } catch (error) {
            console.error('Error fetching posts:', error);
            return { data: [], error };
        }
    }

    /**
     * 新しい投稿を作成
     * @param {Object} postData - 投稿データ
     * @returns {Promise<Object>} クエリ結果
     */
    async createPost(postData) {
        if (!this.isAvailable) {
            return { data: null, error: null };
        }

        try {
            const { data, error } = await this.client
                .from('posts')
                .insert([{
                    content: postData.content,
                    category: postData.category || 'general',
                    priority: postData.priority || 0,
                    student_number: postData.student_number || null
                }])
                .select();

            return { data: data?.[0] || null, error };
        } catch (error) {
            console.error('Error creating post:', error);
            return { data: null, error };
        }
    }

    /**
     * 生徒番号で生徒を取得（認証用）
     * @param {string} studentNumber - 生徒番号
     * @returns {Promise<Object>} クエリ結果
     */
    async getStudentByNumber(studentNumber) {
        if (!this.isAvailable) {
            return { data: null, error: null };
        }

        try {
            const { data, error } = await this.client
                .from('students')
                .select('student_number, name, password_hash')
                .eq('student_number', studentNumber)
                .maybeSingle();
            return { data: data || null, error };
        } catch (error) {
            console.error('Error fetching student by number:', error);
            return { data: null, error };
        }
    }

    /**
     * 生徒登録
     * @param {Object} studentData - { student_number, name, password_hash }
     * @returns {Promise<Object>} クエリ結果
     */
    async registerStudent(studentData) {
        if (!this.isAvailable) {
            return { data: null, error: null };
        }

        try {
            const { data, error } = await this.client
                .from('students')
                .insert([{
                    student_number: studentData.student_number,
                    name: studentData.name,
                    password_hash: studentData.password_hash
                }])
                .select();
            return { data: data?.[0] || null, error };
        } catch (error) {
            console.error('Error registering student:', error);
            return { data: null, error };
        }
    }

    /**
     * チャットメッセージ送信
     * @param {Object} chatData - { post_id, sender, message, is_admin }
     * @returns {Promise<Object>} クエリ結果
     */
    async sendChat(chatData) {
        if (!this.isAvailable) {
            return { data: null, error: null };
        }

        try {
            const { data, error } = await this.client
                .from('chats')
                .insert([{
                    post_id: chatData.post_id,
                    sender: chatData.sender || null,
                    message: chatData.message,
                    is_admin: !!chatData.is_admin
                }])
                .select();
            return { data: data?.[0] || null, error };
        } catch (error) {
            console.error('Error sending chat:', error);
            return { data: null, error };
        }
    }

    /**
     * チャット一覧取得
     * @param {string|number} postId - 投稿ID
     * @param {Object} options - { limit }
     * @returns {Promise<Object>} クエリ結果
     */
    async listChats(postId, options = {}) {
        const { limit = 200 } = options;
        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        try {
            const { data, error } = await this.client
                .from('chats')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true })
                .limit(limit);
            return { data: data || [], error };
        } catch (error) {
            console.error('Error listing chats:', error);
            return { data: [], error };
        }
    }

    /**
     * 投稿のステータスを更新
     * @param {string} postId - 投稿ID
     * @param {string} status - 新しいステータス
     * @param {string} reply - 返信内容（オプション）
     * @returns {Promise<Object>} クエリ結果
     */
    async updatePostStatus(postId, status, reply = null) {
        if (!this.isAvailable) {
            return { data: null, error: null };
        }

        try {
            const updateData = { status };
            if (reply) {
                updateData.reply = reply;
                updateData.replied_at = new Date().toISOString();
            }

            const { data, error } = await this.client
                .from('posts')
                .update(updateData)
                .eq('id', postId)
                .select();

            return { data: data?.[0] || null, error };
        } catch (error) {
            console.error('Error updating post status:', error);
            return { data: null, error };
        }
    }

    // ========================================
    // アンケートシステム用クエリ
    // ========================================

    /**
     * アンケートデータを取得
     * @param {Object} options - クエリオプション
     * @returns {Promise<Object>} クエリ結果
     */
    async getSurveys(options = {}) {
        const {
            limit = 10,
            offset = 0,
            activeOnly = true,
            publishedOnly = true
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        try {
            let query = this.client
                .from('surveys')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            if (publishedOnly) {
                query = query.eq('is_published', true);
            }

            const { data, error } = await query;
            return { data: data || [], error };
        } catch (error) {
            console.error('Error fetching surveys:', error);
            return { data: [], error };
        }
    }

    /**
     * アンケート回答を送信
     * @param {Object} responseData - 回答データ
     * @returns {Promise<Object>} クエリ結果
     */
    async submitSurveyResponse(responseData) {
        if (!this.isAvailable) {
            return { data: null, error: null };
        }

        try {
            const { data, error } = await this.client
                .from('survey_responses')
                .insert([{
                    survey_id: responseData.survey_id,
                    answers: responseData.answers,
                    respondent_info: responseData.respondent_info || null
                }])
                .select();

            return { data: data?.[0] || null, error };
        } catch (error) {
            console.error('Error submitting survey response:', error);
            return { data: null, error };
        }
    }

    // ========================================
    // 通知システム用クエリ
    // ========================================

    /**
     * デバイス登録
     * @param {Object} deviceData - デバイスデータ
     * @returns {Promise<Object>} クエリ結果
     */
    async registerDevice(deviceData) {
        if (!this.isAvailable) {
            return { data: null, error: null };
        }

        try {
            const { data, error } = await this.client
                .from('device_registrations')
                .upsert([{
                    fcm_token: deviceData.fcm_token,
                    user_agent: deviceData.user_agent,
                    platform: deviceData.platform || 'web',
                    browser: deviceData.browser,
                    device_info: deviceData.device_info,
                    user_info: deviceData.user_info,
                    is_active: true
                }], {
                    onConflict: 'fcm_token'
                })
                .select();

            return { data: data?.[0] || null, error };
        } catch (error) {
            console.error('Error registering device:', error);
            return { data: null, error };
        }
    }

    /**
     * 通知テンプレートを取得
     * @param {string} category - カテゴリ（オプション）
     * @returns {Promise<Object>} クエリ結果
     */
    async getNotificationTemplates(category = null) {
        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        try {
            let query = this.client
                .from('notification_templates')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: false });

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            return { data: data || [], error };
        } catch (error) {
            console.error('Error fetching notification templates:', error);
            return { data: [], error };
        }
    }

    // ========================================
    // 汎用クエリ関数
    // ========================================

    /**
     * 汎用データ取得関数
     * @param {string} tableName - テーブル名
     * @param {Object} options - クエリオプション
     * @returns {Promise<Object>} クエリ結果
     */
    async getTableData(tableName, options = {}) {
        const {
            limit = 10,
            offset = 0,
            orderBy = 'created_at',
            orderDirection = 'desc',
            filters = {},
            search = null
        } = options;

        if (!this.isAvailable) {
            return { data: [], error: null };
        }

        try {
            let query = this.client
                .from(tableName)
                .select('*')
                .order(orderBy, { ascending: orderDirection === 'asc' })
                .range(offset, offset + limit - 1);

            // フィルターを適用
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (Array.isArray(value)) {
                        query = query.in(key, value);
                    } else {
                        query = query.eq(key, value);
                    }
                }
            });

            // 簡易検索（contentカラムの部分一致）
            if (search && typeof search === 'string' && search.trim()) {
                query = query.ilike('content', `%${search.trim()}%`);
            }

            const { data, error } = await query;
            return { data: data || [], error };
        } catch (error) {
            console.error(`Error fetching data from ${tableName}:`, error);
            return { data: [], error };
        }
    }

    /**
     * 統計データを取得
     * @returns {Promise<Object>} 統計データ
     */
    async getStatistics() {
        if (!this.isAvailable) {
            return {
                clubs_count: 0,
                news_count: 0,
                posts_count: 0,
                surveys_count: 0,
                members_count: 0
            };
        }

        try {
            const [clubsResult, newsResult, postsResult, surveysResult, membersResult] = await Promise.all([
                this.client.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
                this.client.from('news').select('id', { count: 'exact', head: true }).eq('is_published', true),
                this.client.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
                this.client.from('surveys').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_published', true),
                this.client.from('council_members').select('id', { count: 'exact', head: true }).eq('is_active', true)
            ]);

            return {
                clubs_count: clubsResult.count || 0,
                news_count: newsResult.count || 0,
                posts_count: postsResult.count || 0,
                surveys_count: surveysResult.count || 0,
                members_count: membersResult.count || 0
            };
        } catch (error) {
            console.error('Error fetching statistics:', error);
            return {
                clubs_count: 0,
                news_count: 0,
                posts_count: 0,
                surveys_count: 0,
                members_count: 0
            };
        }
    }

    // ========================================
    // エラーハンドリング
    // ========================================

    /**
     * エラーメッセージを統一形式で返す
     * @param {Error} error - エラーオブジェクト
     * @param {string} operation - 操作名
     * @returns {string} エラーメッセージ
     */
    getErrorMessage(error, operation = '操作') {
        if (!error) return `${operation}中にエラーが発生しました`;

        if (error.message) {
            return `${operation}中にエラーが発生しました: ${error.message}`;
        }

        return `${operation}中にエラーが発生しました`;
    }

    /**
     * 成功メッセージを統一形式で返す
     * @param {string} operation - 操作名
     * @returns {string} 成功メッセージ
     */
    getSuccessMessage(operation = '操作') {
        return `${operation}が正常に完了しました`;
    }
}

// グローバルに公開（クラスのみ）
window.SupabaseQueries = SupabaseQueries;
