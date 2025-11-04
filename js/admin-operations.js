/**
 * なずなポータル管理画面 - データ操作モジュール
 * CRUD操作、通知、フォーラム管理など
 */

// =====================================
// 初期化
// =====================================
if (typeof window.setupAdminDataOperations === 'undefined') {
    window.setupAdminDataOperations = function() {
        // お知らせ管理
        const addNewsBtn = document.getElementById('add-news-btn');
        if (addNewsBtn) {
            addNewsBtn.addEventListener('click', () => openNewsModal());
        }
        
        // アンケート管理
        const addSurveyBtn = document.getElementById('add-survey-btn');
        if (addSurveyBtn) {
            addSurveyBtn.addEventListener('click', () => openSurveyModal());
        }
        
        // 部活動管理
        const addClubBtn = document.getElementById('add-club-btn');
        if (addClubBtn) {
            addClubBtn.addEventListener('click', () => openClubModal());
        }
        
        // 生徒会メンバー管理
        const addMemberBtn = document.getElementById('add-member-btn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => openMemberModal());
        }
        
        // 活動実績管理
        const addAchievementBtn = document.getElementById('add-achievement-btn');
        if (addAchievementBtn) {
            addAchievementBtn.addEventListener('click', () => openAchievementModal());
        }
        
        // フィルター
        const yearFilter = document.getElementById('achievement-year-filter');
        const monthFilter = document.getElementById('achievement-month-filter');
        const categoryFilter = document.getElementById('achievement-category-filter');
        const memberFilter = document.getElementById('member-filter');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        
        [yearFilter, monthFilter, categoryFilter, memberFilter].forEach(el => {
            if (el) el.addEventListener('change', () => loadAdminAchievementsList());
        });
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                if (yearFilter) yearFilter.value = '';
                if (monthFilter) monthFilter.value = '';
                if (categoryFilter) categoryFilter.value = '';
                if (memberFilter) memberFilter.value = '';
                loadAdminAchievementsList();
            });
        }
        
        // 通知送信
        const sendNotificationBtn = document.getElementById('send-notification-btn');
        if (sendNotificationBtn) {
            sendNotificationBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await sendNotification();
            });
        }
        
        const clearNotificationFormBtn = document.getElementById('clear-notification-form');
        if (clearNotificationFormBtn) {
            clearNotificationFormBtn.addEventListener('click', clearNotificationForm);
        }
        
        // アカウント管理
        const accountCreateBtn = document.getElementById('account-create-btn');
        if (accountCreateBtn) {
            accountCreateBtn.addEventListener('click', async () => {
                await createOrUpdateAdminAccount();
            });
        }
        
        const accountDeleteBtn = document.getElementById('account-delete-btn');
        if (accountDeleteBtn) {
            accountDeleteBtn.addEventListener('click', async () => {
                await deleteAdminAccountByEmail();
            });
        }
        
        const accountDebugBtn = document.getElementById('account-debug-btn');
        if (accountDebugBtn) {
            accountDebugBtn.addEventListener('click', async () => {
                try {
                    const res = await window.apiClient.sendRequest('debugAdminSettings');
                    window.adminPanel?.showSuccess('デバッグ情報を取得しました');
                    console.log('Admin Debug:', res);
                } catch (e) {
                    window.adminPanel?.showError('デバッグ情報の取得に失敗しました');
                }
            });
        }
        
        // メンテナンスモード管理
        const enableMaintenanceBtn = document.getElementById('enable-maintenance-btn');
        if (enableMaintenanceBtn) {
            enableMaintenanceBtn.addEventListener('click', enableMaintenanceMode);
        }
        
        const disableMaintenanceBtn = document.getElementById('disable-maintenance-btn');
        if (disableMaintenanceBtn) {
            disableMaintenanceBtn.addEventListener('click', disableMaintenanceMode);
        }
        
        const refreshMaintenanceStatusBtn = document.getElementById('refresh-maintenance-status-btn');
        if (refreshMaintenanceStatusBtn) {
            refreshMaintenanceStatusBtn.addEventListener('click', loadMaintenanceStatus);
        }
        
        const maintenanceToggle = document.getElementById('maintenance-toggle');
        if (maintenanceToggle) {
            maintenanceToggle.addEventListener('change', async (e) => {
                try {
                    if (e.target.checked) {
                        await enableMaintenanceMode();
                    } else {
                        await disableMaintenanceMode();
                    }
                } finally {
                    await loadMaintenanceStatus();
                }
            });
        }
        
        // PWA管理
        const pwaCheckUpdatesBtn = document.getElementById('pwa-check-updates-btn');
        if (pwaCheckUpdatesBtn) {
            pwaCheckUpdatesBtn.addEventListener('click', checkPWAUpdates);
        }
        
        const pwaShowModuleBtn = document.getElementById('pwa-show-module-btn');
        if (pwaShowModuleBtn) {
            pwaShowModuleBtn.addEventListener('click', showPWAModule);
        }
        
        const pwaClearCacheBtn = document.getElementById('pwa-clear-cache-btn');
        if (pwaClearCacheBtn) {
            pwaClearCacheBtn.addEventListener('click', clearPWACache);
        }
        
        // 通知システム管理
        const notificationTestBtn = document.getElementById('notification-test-btn');
        if (notificationTestBtn) {
            notificationTestBtn.addEventListener('click', sendTestNotification);
        }
        
        const notificationRefreshStatusBtn = document.getElementById('notification-refresh-status-btn');
        if (notificationRefreshStatusBtn) {
            notificationRefreshStatusBtn.addEventListener('click', loadNotificationSystemStatus);
        }
        
        // フォーラム管理
        const approvalFilter = document.getElementById('forum-approval-filter');
        if (approvalFilter) {
            approvalFilter.addEventListener('change', loadAdminForumPosts);
        }
        
        const forumRefreshBtn = document.getElementById('forum-refresh-btn');
        if (forumRefreshBtn) {
            forumRefreshBtn.addEventListener('click', loadAdminForumPosts);
        }
    };
}

// =====================================
// お知らせ管理
// =====================================
window.loadAdminNewsList = async function() {
    const tbody = document.getElementById('news-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="loading-state">読み込み中...</td></tr>';

    try {
        let data = [];
        // まずGAS APIを試す（失敗してもエラーにしない）
        try {
            const res = await window.apiClient.sendRequest('getNews', { limit: 200 }, { useCache: true });
            if (res && res.success && (res.data || res.news)) {
                data = res.data || res.news || [];
            }
        } catch (gasError) {
            // GASエラーは静かに処理（Spreadsheet未設定など）
            console.warn('GAS getNews failed, using Supabase fallback:', gasError.message);
        }
        
        // GASからデータが取得できなかった場合、Supabaseから取得
        if (!data || data.length === 0) {
            try {
                const { data: supaData, error } = await window.supabaseClient
                    .from('news')
                    .select('*')
                    .order('date', { ascending: false })
                    .limit(200);
                if (error) throw error;
                data = supaData || [];
            } catch (supaError) {
                console.error('Supabase getNews failed:', supaError);
                throw supaError;
            }
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">お知らせがありません</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${window.adminPanel?.escapeHtml(item.title || '')}</td>
                <td>${window.adminPanel?.escapeHtml(item.category || 'general')}</td>
                <td>${window.adminPanel?.formatDateTime(item.date)}</td>
                <td class="action-buttons">
                    <button class="btn btn-outline btn-sm" data-id="${item.id}" data-action="edit-news">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" data-id="${item.id}" data-action="delete-news">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('button[data-action="edit-news"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const { data } = await window.supabaseClient.from('news').select('*').eq('id', id).maybeSingle();
                openNewsModal(data || null);
            });
        });
        
        tbody.querySelectorAll('button[data-action="delete-news"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                await deleteNews(id);
            });
        });
    } catch (e) {
        console.error('Failed to load news:', e);
        tbody.innerHTML = '<tr><td colspan="4" class="error-state">読み込みに失敗しました</td></tr>';
    }
};

function openNewsModal(item = null) {
    const isEdit = !!item;
    const title = isEdit ? 'お知らせを編集' : 'お知らせを作成';
    const content = `
        <div class="form-group">
            <label>タイトル</label>
            <input id="news-title" class="form-control" value="${window.adminPanel?.escapeHtml(item?.title || '')}" />
        </div>
        <div class="form-group">
            <label>カテゴリ</label>
            <select id="news-category" class="form-control">
                <option value="general" ${item?.category === 'general' ? 'selected' : ''}>一般</option>
                <option value="event" ${item?.category === 'event' ? 'selected' : ''}>イベント</option>
                <option value="important" ${item?.category === 'important' ? 'selected' : ''}>重要</option>
            </select>
        </div>
        <div class="form-group">
            <label>本文</label>
            <textarea id="news-content" class="form-control" rows="6">${window.adminPanel?.escapeHtml(item?.content || '')}</textarea>
        </div>
        <div class="form-group">
            <label>公開</label>
            <select id="news-published" class="form-control">
                <option value="true" ${(item?.is_published ?? true) ? 'selected' : ''}>公開</option>
                <option value="false" ${(item?.is_published === false) ? 'selected' : ''}>非公開</option>
            </select>
        </div>
    `;
    showModal(title, content);

    const saveBtn = document.getElementById('modal-save');
    saveBtn.onclick = async () => {
        const payload = {
            title: document.getElementById('news-title').value.trim(),
            category: document.getElementById('news-category').value,
            content: document.getElementById('news-content').value,
            is_published: document.getElementById('news-published').value === 'true',
            date: item?.date || new Date().toISOString()
        };
        if (!payload.title) {
            window.adminPanel?.showError('タイトルを入力してください');
            return;
        }
        await saveNews(item?.id || null, payload);
    };
}

async function saveNews(id, payload) {
    try {
        if (id) {
            const res = await window.apiClient.sendRequest('updateNews', { id, ...payload });
            if (!res || !res.success) throw new Error(res?.error || 'GAS updateNews failed');
        } else {
            const res = await window.apiClient.sendRequest('createNews', { ...payload });
            if (!res || !res.success) throw new Error(res?.error || 'GAS createNews failed');
        }
        document.getElementById('modal-overlay').classList.remove('active');
        window.adminPanel?.showSuccess('お知らせを保存しました');
        await window.loadAdminNewsList();
    } catch (err) {
        console.warn('GAS news save failed, trying Supabase fallback...', err);
        try {
            if (id) {
                const { error } = await window.supabaseClient.from('news').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient.from('news').insert([payload]);
                if (error) throw error;
            }
            document.getElementById('modal-overlay').classList.remove('active');
            window.adminPanel?.showSuccess('お知らせを保存しました');
            await window.loadAdminNewsList();
        } catch (e2) {
            console.error('Failed to save news via Supabase:', e2);
            window.adminPanel?.showError('お知らせの保存に失敗しました');
        }
    }
}

async function deleteNews(id) {
    if (!confirm('このお知らせを削除しますか？')) return;
    try {
        const res = await window.apiClient.sendRequest('updateNews', { id, _delete: true });
        if (!res || !res.success) throw new Error(res?.error || 'GAS updateNews delete failed');
        window.adminPanel?.showSuccess('お知らせを削除しました');
        await window.loadAdminNewsList();
    } catch (err) {
        console.warn('GAS news delete failed, trying Supabase fallback...', err);
        try {
            const { error } = await window.supabaseClient.from('news').delete().eq('id', id);
            if (error) throw error;
            window.adminPanel?.showSuccess('お知らせを削除しました');
            await window.loadAdminNewsList();
        } catch (e2) {
            console.error('Failed to delete news via Supabase:', e2);
            window.adminPanel?.showError('お知らせの削除に失敗しました');
        }
    }
}

// =====================================
// アンケート管理
// =====================================
window.loadAdminSurveysList = async function() {
    const tbody = document.getElementById('surveys-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="loading-state">読み込み中...</td></tr>';

    try {
        let data = [];
        // まずGAS APIを試す（失敗してもエラーにしない）
        try {
            const res = await window.apiClient.sendRequest('getSurveys', { limit: 200 }, { useCache: true });
            if (res && res.success && (res.data || res.surveys)) {
                data = res.data || res.surveys || [];
            }
        } catch (gasError) {
            console.warn('GAS getSurveys failed, using Supabase fallback:', gasError.message);
        }
        
        // GASからデータが取得できなかった場合、Supabaseから取得
        if (!data || data.length === 0) {
            try {
                const { data: supaData, error } = await window.supabaseClient
                    .from('surveys')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(200);
                if (error) throw error;
                data = supaData || [];
            } catch (supaError) {
                console.error('Supabase getSurveys failed:', supaError);
                throw supaError;
            }
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">アンケートがありません</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(s => `
            <tr>
                <td>${window.adminPanel?.escapeHtml(s.title || '')}</td>
                <td>${window.adminPanel?.escapeHtml(s.status || 'draft')}</td>
                <td>${s.responses_count ?? '-'}</td>
                <td>${s.deadline ? window.adminPanel?.formatDateTime(s.deadline) : '-'}</td>
                <td class="action-buttons">
                    <button class="btn btn-outline btn-sm" data-id="${s.id}" data-action="edit-survey">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" data-id="${s.id}" data-action="delete-survey">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('button[data-action="edit-survey"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const { data } = await window.supabaseClient.from('surveys').select('*').eq('id', id).maybeSingle();
                openSurveyModal(data || null);
            });
        });
        
        tbody.querySelectorAll('button[data-action="delete-survey"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                await deleteSurvey(id);
            });
        });
    } catch (e) {
        console.error('Failed to load surveys:', e);
        tbody.innerHTML = '<tr><td colspan="5" class="error-state">読み込みに失敗しました</td></tr>';
    }
};

function openSurveyModal(item = null) {
    const isEdit = !!item;
    const title = isEdit ? 'アンケートを編集' : 'アンケートを作成';
    const content = `
        <div class="form-group">
            <label>タイトル</label>
            <input id="survey-title" class="form-control" value="${window.adminPanel?.escapeHtml(item?.title || '')}" />
        </div>
        <div class="form-group">
            <label>ステータス</label>
            <select id="survey-status" class="form-control">
                <option value="draft" ${item?.status === 'draft' ? 'selected' : ''}>下書き</option>
                <option value="active" ${item?.status === 'active' ? 'selected' : ''}>実施中</option>
                <option value="closed" ${item?.status === 'closed' ? 'selected' : ''}>終了</option>
            </select>
        </div>
        <div class="form-group">
            <label>締切（任意）</label>
            <input id="survey-deadline" type="datetime-local" class="form-control" />
        </div>
        <div class="form-group">
            <label>設問（JSON）</label>
            <textarea id="survey-questions" class="form-control" rows="6">${window.adminPanel?.escapeHtml(item?.questions_json || '')}</textarea>
        </div>
    `;
    showModal(title, content);

    if (item?.deadline) {
        const d = new Date(item.deadline);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        const el = document.getElementById('survey-deadline');
        if (el) el.value = iso;
    }

    const saveBtn = document.getElementById('modal-save');
    saveBtn.onclick = async () => {
        const deadlineInput = document.getElementById('survey-deadline').value;
        const payload = {
            title: document.getElementById('survey-title').value.trim(),
            status: document.getElementById('survey-status').value,
            deadline: deadlineInput ? new Date(deadlineInput).toISOString() : null,
            questions_json: document.getElementById('survey-questions').value,
            is_active: true,
            is_published: document.getElementById('survey-status').value === 'active'
        };
        if (!payload.title) {
            window.adminPanel?.showError('タイトルを入力してください');
            return;
        }
        await saveSurvey(item?.id || null, payload);
    };
}

async function saveSurvey(id, payload) {
    try {
        const res = await window.apiClient.sendRequest('updateSurvey', { id, ...payload });
        if (!res || !res.success) throw new Error(res?.error || 'GAS updateSurvey failed');
        document.getElementById('modal-overlay').classList.remove('active');
        window.adminPanel?.showSuccess('アンケートを保存しました');
        await window.loadAdminSurveysList();
    } catch (err) {
        console.warn('GAS survey save failed, trying Supabase fallback...', err);
        try {
            if (id) {
                const { error } = await window.supabaseClient.from('surveys').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient.from('surveys').insert([payload]);
                if (error) throw error;
            }
            document.getElementById('modal-overlay').classList.remove('active');
            window.adminPanel?.showSuccess('アンケートを保存しました');
            await window.loadAdminSurveysList();
        } catch (e2) {
            console.error('Failed to save survey via Supabase:', e2);
            window.adminPanel?.showError('アンケートの保存に失敗しました');
        }
    }
}

async function deleteSurvey(id) {
    if (!confirm('このアンケートを削除しますか？')) return;
    try {
        const res = await window.apiClient.sendRequest('updateSurvey', { id, _delete: true });
        if (!res || !res.success) throw new Error(res?.error || 'GAS updateSurvey delete failed');
        window.adminPanel?.showSuccess('アンケートを削除しました');
        await window.loadAdminSurveysList();
    } catch (err) {
        console.warn('GAS survey delete failed, trying Supabase fallback...', err);
        try {
            const { error } = await window.supabaseClient.from('surveys').delete().eq('id', id);
            if (error) throw error;
            window.adminPanel?.showSuccess('アンケートを削除しました');
            await window.loadAdminSurveysList();
        } catch (e2) {
            console.error('Failed to delete survey via Supabase:', e2);
            window.adminPanel?.showError('アンケートの削除に失敗しました');
        }
    }
}

// =====================================
// 部活動管理
// =====================================
window.loadAdminClubsList = async function() {
    const tbody = document.getElementById('clubs-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="loading-state">読み込み中...</td></tr>';

    try {
        let data = [];
        // まずGAS APIを試す（失敗してもエラーにしない）
        try {
            const res = await window.apiClient.sendRequest('getClubs', { limit: 200 }, { useCache: true });
            if (res && res.success && (res.data || res.clubs)) {
                data = res.data || res.clubs || [];
            }
        } catch (gasError) {
            console.warn('GAS getClubs failed, using Supabase fallback:', gasError.message);
        }
        
        // GASからデータが取得できなかった場合、Supabaseから取得
        if (!data || data.length === 0) {
            try {
                const { data: supaData, error } = await window.supabaseClient
                    .from('clubs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(200);
                if (error) throw error;
                data = supaData || [];
            } catch (supaError) {
                console.error('Supabase getClubs failed:', supaError);
                // display_orderカラムがない場合のフォールバック（既にcreated_atのみでソートしているので通常は発生しないが、念のため）
                if (supaError.code === '42703' && supaError.message?.includes('display_order')) {
                    try {
                        console.warn('display_order column not found, using fallback query');
                        const { data: fallbackData, error: fallbackError } = await window.supabaseClient
                            .from('clubs')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(200);
                        if (fallbackError) throw fallbackError;
                        data = fallbackData || [];
                    } catch (e) {
                        console.error('Fallback query also failed:', e);
                        throw supaError; // 元のエラーを再スロー
                    }
                } else {
                    throw supaError;
                }
            }
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">部活動がありません</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr>
                <td>${window.adminPanel?.escapeHtml(c.name || '')}</td>
                <td>${window.adminPanel?.escapeHtml(c.category || '')}</td>
                <td>${c.members ?? '-'}</td>
                <td>${window.adminPanel?.escapeHtml(c.schedule || '')}</td>
                <td class="action-buttons">
                    <button class="btn btn-outline btn-sm" data-id="${c.id}" data-action="edit-club">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" data-id="${c.id}" data-action="delete-club">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('button[data-action="edit-club"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const { data } = await window.supabaseClient.from('clubs').select('*').eq('id', id).maybeSingle();
                openClubModal(data || null);
            });
        });
        
        tbody.querySelectorAll('button[data-action="delete-club"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                await deleteClub(id);
            });
        });
    } catch (e) {
        console.error('Failed to load clubs:', e);
        // display_orderエラーの場合は特別なメッセージを表示
        if (e.code === '42703' && e.message?.includes('display_order')) {
            tbody.innerHTML = '<tr><td colspan="5" class="error-state">データベースのカラム構成に問題があります。管理者にお問い合わせください。</td></tr>';
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="error-state">読み込みに失敗しました</td></tr>';
        }
    }
};

function openClubModal(item = null) {
    const isEdit = !!item;
    const title = isEdit ? '部活動を編集' : '部活動を追加';
    const content = `
        <div class="form-group">
            <label>部活動名</label>
            <input id="club-name" class="form-control" value="${window.adminPanel?.escapeHtml(item?.name || '')}" />
        </div>
        <div class="form-group">
            <label>カテゴリ</label>
            <input id="club-category" class="form-control" value="${window.adminPanel?.escapeHtml(item?.category || '')}" />
        </div>
        <div class="form-group">
            <label>部員数</label>
            <input id="club-members" type="number" class="form-control" value="${item?.members ?? ''}" />
        </div>
        <div class="form-group">
            <label>活動日</label>
            <input id="club-schedule" class="form-control" value="${window.adminPanel?.escapeHtml(item?.schedule || '')}" />
        </div>
        <div class="form-group">
            <label>説明</label>
            <textarea id="club-description" class="form-control" rows="4">${window.adminPanel?.escapeHtml(item?.description || '')}</textarea>
        </div>
    `;
    showModal(title, content);

    const saveBtn = document.getElementById('modal-save');
    saveBtn.onclick = async () => {
        const payload = {
            name: document.getElementById('club-name').value.trim(),
            category: document.getElementById('club-category').value.trim(),
            members: Number(document.getElementById('club-members').value) || 0,
            schedule: document.getElementById('club-schedule').value.trim(),
            description: document.getElementById('club-description').value
        };
        if (!payload.name) {
            window.adminPanel?.showError('部活動名を入力してください');
            return;
        }
        await saveClub(item?.id || null, payload);
    };
}

async function saveClub(id, payload) {
    try {
        const res = await window.apiClient.sendRequest('updateClub', { id, ...payload });
        if (!res || !res.success) throw new Error(res?.error || 'GAS updateClub failed');
        document.getElementById('modal-overlay').classList.remove('active');
        window.adminPanel?.showSuccess('部活動を保存しました');
        await window.loadAdminClubsList();
    } catch (err) {
        console.warn('GAS club save failed, trying Supabase fallback...', err);
        try {
            if (id) {
                const { error } = await window.supabaseClient.from('clubs').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient.from('clubs').insert([payload]);
                if (error) throw error;
            }
            document.getElementById('modal-overlay').classList.remove('active');
            window.adminPanel?.showSuccess('部活動を保存しました');
            await window.loadAdminClubsList();
        } catch (e2) {
            console.error('Failed to save club via Supabase:', e2);
            window.adminPanel?.showError('部活動の保存に失敗しました');
        }
    }
}

async function deleteClub(id) {
    if (!confirm('この部活動を削除しますか？')) return;
    try {
        const res = await window.apiClient.sendRequest('updateClub', { id, _delete: true });
        if (!res || !res.success) throw new Error(res?.error || 'GAS updateClub delete failed');
        window.adminPanel?.showSuccess('部活動を削除しました');
        await window.loadAdminClubsList();
    } catch (err) {
        console.warn('GAS club delete failed, trying Supabase fallback...', err);
        try {
            const { error } = await window.supabaseClient.from('clubs').delete().eq('id', id);
            if (error) throw error;
            window.adminPanel?.showSuccess('部活動を削除しました');
            await window.loadAdminClubsList();
        } catch (e2) {
            console.error('Failed to delete club via Supabase:', e2);
            window.adminPanel?.showError('部活動の削除に失敗しました');
        }
    }
}

// =====================================
// モーダル表示
// =====================================
function showModal(title, content) {
    // まず既存のモーダルを探す
    let modalOverlay = document.getElementById('modal-overlay');
    let modalTitle = modalOverlay ? modalOverlay.querySelector('#modal-title') : null;
    let modalBody = modalOverlay ? modalOverlay.querySelector('#modal-body') : null;
    
    // モーダル要素が存在しない場合は動的に作成
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'modal-overlay';
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal" id="admin-modal">
                <div class="modal-header">
                    <h3 id="modal-title">タイトル</h3>
                    <button class="modal-close" id="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="modal-body"></div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modal-cancel">キャンセル</button>
                    <button class="btn btn-primary" id="modal-save">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);
        
        // 閉じるボタンのイベントリスナーを設定
        const closeBtn = modalOverlay.querySelector('#modal-close');
        const cancelBtn = modalOverlay.querySelector('#modal-cancel');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modalOverlay.classList.remove('active');
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modalOverlay.classList.remove('active');
            });
        }
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        });
        
        // 要素を再取得
        modalTitle = modalOverlay.querySelector('#modal-title');
        modalBody = modalOverlay.querySelector('#modal-body');
    }
    
    // タイトルと本文を設定（nullチェック付き）
    if (modalTitle) {
        modalTitle.textContent = title || '';
    } else {
        console.error('Modal title element not found');
    }
    
    if (modalBody) {
        modalBody.innerHTML = content || '';
    } else {
        console.error('Modal body element not found');
    }
    
    // モーダルを表示
    modalOverlay.classList.add('active');
}

// =====================================
// 通知フォームクリア
// =====================================
function clearNotificationForm() {
    const form = document.getElementById('notification-form');
    if (!form) return;
    form.querySelectorAll('input, textarea, select').forEach(element => {
        if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = false;
        } else {
            element.value = '';
        }
    });
}

// =====================================
// 生徒会メンバー管理
// =====================================
window.loadAdminCouncilMembersList = async function() {
    const grid = document.getElementById('members-grid');
    const memberFilter = document.getElementById('member-filter');
    if (!grid) return;
    grid.innerHTML = '<div class="loading">読み込み中...</div>';

    try {
        const { data, error } = await window.supabaseClient
            .from('council_members')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            grid.innerHTML = '<div class="empty-state">メンバーがありません</div>';
            return;
        }

        if (memberFilter) {
            memberFilter.innerHTML = '<option value="">メンバーを選択</option>' +
                data.map(m => `<option value="${m.id}">${window.adminPanel?.escapeHtml(m.name)}</option>`).join('');
        }

        grid.innerHTML = data.map(m => `
            <div class="member-card">
                <div class="member-header">
                    <div class="member-name">${window.adminPanel?.escapeHtml(m.name)}</div>
                    <div class="member-role">${window.adminPanel?.escapeHtml(m.role || '')}</div>
                </div>
                <div class="member-actions">
                    <button class="btn btn-outline btn-sm" data-id="${m.id}" data-action="edit-member">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" data-id="${m.id}" data-action="delete-member">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('button[data-action="edit-member"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const { data } = await window.supabaseClient.from('council_members').select('*').eq('id', id).maybeSingle();
                openMemberModal(data || null);
            });
        });
        
        grid.querySelectorAll('button[data-action="delete-member"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                await deleteMember(id);
            });
        });
    } catch (e) {
        console.error('Failed to load council members:', e);
        grid.innerHTML = '<div class="error-state">読み込みに失敗しました</div>';
    }
};

function openMemberModal(item = null) {
    const isEdit = !!item;
    const title = isEdit ? 'メンバーを編集' : 'メンバーを追加';
    
    // responsibilitiesを配列から改行区切りの文字列に変換
    const responsibilitiesText = Array.isArray(item?.responsibilities) 
        ? item.responsibilities.join('\n') 
        : (item?.responsibilities || '');
    
    // bio から構造化データを抽出（text/hobbies/activities）
    let bioText = item?.bio || '';
    let hobbiesText = '';
    let activitiesText = '';
    try {
        const bioData = item?.bio ? JSON.parse(item.bio) : null;
        if (bioData && typeof bioData === 'object') {
            bioText = bioData.text || '';
            if (Array.isArray(bioData.hobbies)) {
                hobbiesText = bioData.hobbies.join(', ');
            }
            if (Array.isArray(bioData.activities)) {
                activitiesText = bioData.activities.map(a => {
                    const date = a.date || '';
                    const title = a.title || '';
                    const description = a.description || '';
                    return `${date}|${title}|${description}`;
                }).join('\n');
            }
        }
    } catch (_) {}
    
    const content = `
        ${!isEdit ? `
        <div class="form-row">
            <div class="form-group">
                <label>ID（任意）</label>
                <input id="member-id" type="number" class="form-control" value="" min="1" placeholder="空欄の場合は自動生成" />
                <small class="form-text">IDを指定する場合は、既存のIDと重複しないようにしてください</small>
            </div>
        </div>
        ` : ''}
        <div class="form-row">
            <div class="form-group">
                <label>氏名 <span class="required">*</span></label>
                <input id="member-name" class="form-control" value="${window.adminPanel?.escapeHtml(item?.name || '')}" placeholder="例: 山田太郎" required />
            </div>
            <div class="form-group">
                <label>役職 <span class="required">*</span></label>
                <input id="member-role" class="form-control" value="${window.adminPanel?.escapeHtml(item?.role || '')}" placeholder="例: 生徒会長" required />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>学年・クラス</label>
                <input id="member-grade" class="form-control" value="${window.adminPanel?.escapeHtml(item?.grade || '')}" placeholder="例: 3年A組" />
            </div>
            <div class="form-group">
                <label>メールアドレス</label>
                <input id="member-email" type="email" class="form-control" value="${window.adminPanel?.escapeHtml(item?.email || '')}" placeholder="example@school.ac.jp" />
            </div>
        </div>
        <div class="form-group">
            <label>画像URL</label>
            <input id="member-image-url" class="form-control" value="${window.adminPanel?.escapeHtml(item?.image_url || '')}" placeholder="https://example.com/image.jpg" />
            <small class="form-text">画像のURLを入力してください（任意）</small>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>活動開始日（join_date）</label>
                <input id="member-join-date" type="date" class="form-control" value="${item?.join_date ? new Date(item.join_date).toISOString().slice(0,10) : ''}" />
            </div>
            <div class="form-group">
                <label>短いメッセージ</label>
                <textarea id="member-message" class="form-control" rows="2" placeholder="メンバーカードに表示される短いメッセージを入力してください（任意）">${window.adminPanel?.escapeHtml(item?.message || '')}</textarea>
            </div>
        </div>
        <div class="form-group">
            <label>短いメッセージ</label>
            <small class="form-text">すでに上で入力済みです。</small>
        </div>
        <div class="form-group">
            <label>詳細メッセージ（自己紹介）</label>
            <textarea id="member-bio" class="form-control" rows="4" placeholder="member-detail.htmlで表示される詳細な自己紹介文を入力してください（任意）">${window.adminPanel?.escapeHtml(bioText)}</textarea>
        </div>
        <div class="form-group">
            <label>趣味（カンマ区切り）</label>
            <input id="member-hobbies" class="form-control" value="${window.adminPanel?.escapeHtml(hobbiesText)}" placeholder="音楽, 読書, サッカー" />
            <small class="form-text">member-detailでタグ表示されます</small>
        </div>
        <div class="form-group">
            <label>活動予定（1行1件: 日付|タイトル|説明）</label>
            <textarea id="member-activities" class="form-control" rows="5" placeholder="例:\n2025-02-15|生徒会会議|定例会議\n2025-02-20|体育祭準備会|企画検討">${window.adminPanel?.escapeHtml(activitiesText)}</textarea>
            <small class="form-text">member-detailのサイドバーに表示されます</small>
        </div>
        <div class="form-group">
            <label>担当業務</label>
            <textarea id="member-responsibilities" class="form-control" rows="5" placeholder="担当業務を1行ずつ入力してください（例：&#10;生徒会全体の統括・運営&#10;学校行事の企画・調整&#10;生徒総会の司会進行）">${window.adminPanel?.escapeHtml(responsibilitiesText)}</textarea>
            <small class="form-text">各行が1つの担当業務として登録されます</small>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>表示順</label>
                <input id="member-order" type="number" class="form-control" value="${item?.display_order ?? 0}" min="0" />
                <small class="form-text">数値が小さいほど上に表示されます</small>
            </div>
            <div class="form-group">
                <label>公開設定</label>
                <select id="member-active" class="form-control">
                    <option value="true" ${(item?.is_active ?? true) ? 'selected' : ''}>公開</option>
                    <option value="false" ${(item?.is_active === false) ? 'selected' : ''}>非公開</option>
                </select>
            </div>
        </div>
        <div class="form-info">
            <i class="fas fa-info-circle"></i>
            <small>活動実績は「活動実績管理」セクションから別途登録できます</small>
        </div>
    `;
    showModal(title, content);

    const saveBtn = document.getElementById('modal-save');
    saveBtn.onclick = async () => {
        const name = document.getElementById('member-name').value.trim();
        const role = document.getElementById('member-role').value.trim();
        
        if (!name || !role) {
            window.adminPanel?.showError('氏名と役職は必須項目です');
            return;
        }
        
        // responsibilitiesを改行区切りの文字列から配列に変換
        const responsibilitiesText = document.getElementById('member-responsibilities').value.trim();
        const responsibilities = responsibilitiesText 
            ? responsibilitiesText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
            : [];
        
        const payload = {
            name: name,
            role: role,
            grade: document.getElementById('member-grade').value.trim() || null,
            email: document.getElementById('member-email').value.trim() || null,
            image_url: document.getElementById('member-image-url').value.trim() || null,
            message: document.getElementById('member-message').value.trim() || null,
            // bioは構造化JSONとして保存（text/hobbies/activities）
            bio: (() => {
                const text = document.getElementById('member-bio').value.trim();
                const hobbiesRaw = document.getElementById('member-hobbies').value.trim();
                const hobbies = hobbiesRaw ? hobbiesRaw.split(',').map(h => h.trim()).filter(h => h) : [];
                const activitiesRaw = document.getElementById('member-activities').value.trim();
                const activities = [];
                if (activitiesRaw) {
                    activitiesRaw.split('\n').forEach(line => {
                        const parts = line.split('|');
                        if (parts.length >= 2) {
                            activities.push({
                                date: (parts[0] || '').trim(),
                                title: (parts[1] || '').trim(),
                                description: (parts[2] || '').trim()
                            });
                        }
                    });
                }
                try {
                    return JSON.stringify({ text, hobbies, activities });
                } catch (_) {
                    return text;
                }
            })(),
            responsibilities: responsibilities.length > 0 ? responsibilities : null,
            display_order: Number(document.getElementById('member-order').value) || 0,
            is_active: document.getElementById('member-active').value === 'true'
        };
        // join_date
        const joinDate = document.getElementById('member-join-date').value;
        if (joinDate) payload.join_date = joinDate;
        
        // 新規追加時にIDが指定されている場合は取得
        let specifiedId = null;
        if (!isEdit) {
            const idInput = document.getElementById('member-id');
            if (idInput && idInput.value.trim()) {
                specifiedId = Number(idInput.value.trim());
                if (specifiedId > 0) {
                    payload.id = specifiedId;
                }
            }
        }
        
        await saveMember(item?.id || specifiedId || null, payload);
    };
}

async function saveMember(id, payload) {
    try {
        // 空の文字列をnullに変換（データベースの整合性のため）
        const cleanPayload = {};
        for (const [key, value] of Object.entries(payload)) {
            if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
                cleanPayload[key] = null;
            } else {
                cleanPayload[key] = value;
            }
        }
        
        // responsibilitiesがnullの場合は空配列として扱う
        if (cleanPayload.responsibilities === null) {
            cleanPayload.responsibilities = [];
        }
        
        console.log('Saving member:', { id, payload: cleanPayload });
        
        if (id) {
            const { error } = await window.supabaseClient
                .from('council_members')
                .update(cleanPayload)
                .eq('id', id);
            if (error) throw error;
            window.adminPanel?.showSuccess('メンバーを更新しました');
        } else {
            // 新規追加の場合、IDが指定されているかチェック
            if (cleanPayload.id) {
                // 既存のIDとの衝突をチェック
                const { data: existing, error: checkError } = await window.supabaseClient
                    .from('council_members')
                    .select('id')
                    .eq('id', cleanPayload.id)
                    .maybeSingle();
                
                if (checkError) throw checkError;
                
                if (existing) {
                    throw new Error(`ID ${cleanPayload.id} は既に使用されています。別のIDを指定してください。`);
                }
                
                // シーケンスを更新（PostgreSQLの場合）
                // 注: Supabaseでは直接シーケンスを操作できないため、
                // IDを明示的に指定する場合は、データベース側でシーケンスを更新する必要があります
                const specifiedId = cleanPayload.id;
                delete cleanPayload.id; // 一旦削除
                
                // IDを含めてinsert（PostgreSQLではこれで動作するはずですが、
                // SERIAL型のシーケンスが更新されない可能性があります）
                const { data: insertedData, error: insertError } = await window.supabaseClient
                    .from('council_members')
                    .insert([{ ...cleanPayload, id: specifiedId }])
                    .select();
                
                if (insertError) {
                    // 重複エラーの場合、より詳細なメッセージを表示
                    if (insertError.code === '23505') {
                        throw new Error(`ID ${specifiedId} は既に使用されています。別のIDを指定してください。`);
                    }
                    throw insertError;
                }
                
                // シーケンスを更新（SQLクエリを実行）
                // 注: SupabaseのRPCまたはSQLクエリで実行する必要があります
                // ここでは警告のみ表示
                if (insertedData && insertedData.length > 0) {
                    console.warn(`ID ${specifiedId} を手動で指定しました。シーケンスが自動更新されない場合があります。`);
                }
            } else {
                const { error } = await window.supabaseClient
                    .from('council_members')
                    .insert([cleanPayload]);
                if (error) throw error;
            }
            
            window.adminPanel?.showSuccess('メンバーを追加しました');
        }
        
        document.getElementById('modal-overlay').classList.remove('active');
        await window.loadAdminCouncilMembersList();
    } catch (err) {
        console.error('Failed to save member:', err);
        
        // RLSポリシーエラーの場合、より詳細なメッセージを表示
        let errorMessage = 'メンバーの保存に失敗しました';
        if (err.code === '42501') {
            errorMessage = '権限エラー: council_membersテーブルのRow Level Securityポリシーによって操作が拒否されました。SupabaseのRLS設定を確認してください。';
        } else if (err.code === '23505') {
            errorMessage = '重複エラー: 同じデータが既に存在します。';
        } else if (err.code === 'PGRST116') {
            errorMessage = 'エラー: リクエストが大きすぎます。担当業務の項目数を減らしてください。';
        } else if (err.message) {
            errorMessage = `エラー: ${err.message}`;
        }
        
        window.adminPanel?.showError(errorMessage);
    }
}

async function deleteMember(id) {
    if (!confirm('このメンバーを削除しますか？')) return;
    try {
        const { error } = await window.supabaseClient.from('council_members').delete().eq('id', id);
        if (error) throw error;
        window.adminPanel?.showSuccess('メンバーを削除しました');
        await window.loadAdminCouncilMembersList();
    } catch (err) {
        console.error('Failed to delete member:', err);
        window.adminPanel?.showError('メンバーの削除に失敗しました');
    }
}

// =====================================
// 活動実績管理
// =====================================
window.loadAdminAchievementsList = async function() {
    const tbody = document.getElementById('achievements-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="loading-state">読み込み中...</td></tr>';

    const memberId = document.getElementById('member-filter')?.value || '';
    const year = document.getElementById('achievement-year-filter')?.value || '';
    const month = document.getElementById('achievement-month-filter')?.value || '';
    const category = document.getElementById('achievement-category-filter')?.value || '';

    try {
        let query = window.supabaseClient.from('member_achievements').select('*')
            .order('achievement_year', { ascending: false })
            .order('achievement_month', { ascending: false })
            .order('priority', { ascending: true })
            .limit(500);
        if (memberId) query = query.eq('member_id', memberId);
        if (year) query = query.eq('achievement_year', Number(year));
        if (month) query = query.eq('achievement_month', Number(month));
        if (category) query = query.eq('category', category);

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">実績がありません</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(a => `
            <tr>
                <td>${a.member_id}</td>
                <td>${a.achievement_year}/${String(a.achievement_month).padStart(2,'0')}</td>
                <td>${window.adminPanel?.escapeHtml(a.title || '')}</td>
                <td>${window.adminPanel?.escapeHtml(a.category || '')}</td>
                <td>${window.adminPanel?.escapeHtml(a.description || '')}</td>
                <td>${a.is_public ? '公開' : '非公開'}</td>
                <td class="action-buttons">
                    <button class="btn btn-outline btn-sm" data-id="${a.id}" data-action="edit-achievement">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" data-id="${a.id}" data-action="delete-achievement">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('button[data-action="edit-achievement"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const { data } = await window.supabaseClient.from('member_achievements').select('*').eq('id', id).maybeSingle();
                openAchievementModal(data || null);
            });
        });
        
        tbody.querySelectorAll('button[data-action="delete-achievement"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                await deleteAchievement(id);
            });
        });
    } catch (e) {
        console.error('Failed to load achievements:', e);
        tbody.innerHTML = '<tr><td colspan="7" class="error-state">読み込みに失敗しました</td></tr>';
    }
};

function openAchievementModal(item = null) {
    const isEdit = !!item;
    const title = isEdit ? '実績を編集' : '実績を追加';
    const content = `
        <div class="form-group">
            <label>メンバーID</label>
            <input id="ach-member" class="form-control" value="${item?.member_id ?? ''}" />
        </div>
        <div class="form-group">
            <label>年</label>
            <input id="ach-year" type="number" class="form-control" value="${item?.achievement_year ?? ''}" />
        </div>
        <div class="form-group">
            <label>月</label>
            <input id="ach-month" type="number" class="form-control" value="${item?.achievement_month ?? ''}" />
        </div>
        <div class="form-group">
            <label>タイトル</label>
            <input id="ach-title" class="form-control" value="${window.adminPanel?.escapeHtml(item?.title || '')}" />
        </div>
        <div class="form-group">
            <label>カテゴリ</label>
            <input id="ach-category" class="form-control" value="${window.adminPanel?.escapeHtml(item?.category || 'general')}" />
        </div>
        <div class="form-group">
            <label>詳細</label>
            <textarea id="ach-desc" class="form-control" rows="4">${window.adminPanel?.escapeHtml(item?.description || '')}</textarea>
        </div>
        <div class="form-group">
            <label>公開</label>
            <select id="ach-public" class="form-control">
                <option value="true" ${(item?.is_public ?? true) ? 'selected' : ''}>公開</option>
                <option value="false" ${(item?.is_public === false) ? 'selected' : ''}>非公開</option>
            </select>
        </div>
    `;
    showModal(title, content);

    const saveBtn = document.getElementById('modal-save');
    saveBtn.onclick = async () => {
        const payload = {
            member_id: Number(document.getElementById('ach-member').value),
            achievement_year: Number(document.getElementById('ach-year').value),
            achievement_month: Number(document.getElementById('ach-month').value),
            title: document.getElementById('ach-title').value.trim(),
            category: document.getElementById('ach-category').value.trim() || 'general',
            description: document.getElementById('ach-desc').value,
            is_public: document.getElementById('ach-public').value === 'true'
        };
        if (!payload.member_id || !payload.achievement_year || !payload.achievement_month || !payload.title) {
            window.adminPanel?.showError('必須項目を入力してください');
            return;
        }
        await saveAchievement(item?.id || null, payload);
    };
}

async function saveAchievement(id, payload) {
    try {
        if (id) {
            const { error } = await window.supabaseClient.from('member_achievements').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await window.supabaseClient.from('member_achievements').insert([payload]);
            if (error) throw error;
        }
        document.getElementById('modal-overlay').classList.remove('active');
        window.adminPanel?.showSuccess('実績を保存しました');
        await window.loadAdminAchievementsList();
    } catch (err) {
        console.error('Failed to save achievement:', err);
        window.adminPanel?.showError('実績の保存に失敗しました');
    }
}

async function deleteAchievement(id) {
    if (!confirm('この実績を削除しますか？')) return;
    try {
        const { error } = await window.supabaseClient.from('member_achievements').delete().eq('id', id);
        if (error) throw error;
        window.adminPanel?.showSuccess('実績を削除しました');
        await window.loadAdminAchievementsList();
    } catch (err) {
        console.error('Failed to delete achievement:', err);
        window.adminPanel?.showError('実績の削除に失敗しました');
    }
}

// =====================================
// 通知送信
// =====================================
async function sendNotification() {
    const titleEl = document.getElementById('notification-title');
    const bodyEl = document.getElementById('notification-message');
    const targetEl = document.getElementById('notification-target');
    const sendButton = document.getElementById('send-notification-btn');
    
    const title = (titleEl && titleEl.value.trim()) || '';
    const body = (bodyEl && bodyEl.value.trim()) || '';
    const target = (targetEl && targetEl.value) || 'all';
    
    if (!title || !body) {
        window.adminPanel?.showError('タイトルと本文を入力してください');
        return;
    }
    
    if (sendButton) { sendButton.disabled = true; sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...'; }
    
    try {
        const result = await window.apiClient.sendRequest('sendNotification', {
            title: title,
            message: body,
            url: document.getElementById('notification-url')?.value || '/',
            targetType: target || 'all',
            adminEmail: window.adminPanel?.currentUser()?.email || ''
        });
        
        if (result.success) {
            const successCount = (result.data?.successfulSends ?? result.data?.success) || 0;
            const failureCount = (result.data?.failedSends ?? result.data?.failed) || 0;
            const totalRecipients = (result.data?.totalRecipients ?? (successCount + failureCount)) || 0;
            window.adminPanel?.showSuccess(`通知を送信しました（送信先: ${totalRecipients}件、成功: ${successCount}件、失敗: ${failureCount}件）`);
            
            if (titleEl) titleEl.value = '';
            if (bodyEl) bodyEl.value = '';
            
            await window.loadAdminNotificationHistory();
        } else {
            throw new Error(result.error || '通知の送信に失敗しました');
        }
    } catch (error) {
        console.error('Notification send error:', error);
        // より詳細なエラーメッセージを表示
        let errorMessage = '通知の送信に失敗しました';
        if (error.message) {
            if (error.message.includes('ネットワークエラー') || error.message.includes('NETWORK')) {
                errorMessage = 'ネットワークエラーが発生しました。しばらく待ってから再試行してください。';
            } else {
                errorMessage = error.message;
            }
        }
        window.adminPanel?.showError(errorMessage);
    } finally {
        if (sendButton) { sendButton.disabled = false; sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> 通知を送信'; }
    }
}

// =====================================
// 通知履歴読み込み
// =====================================
window.loadAdminNotificationHistory = async function() {
    const historyContainer = document.getElementById('notification-history');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '<p class="loading">読み込み中...</p>';
    
    try {
        // まずGAS APIを試す
        try {
            const res = await window.apiClient.sendRequest('getNotificationHistory', { limit: 50 }, { useCache: false });
            if (res && res.success && res.data) {
                const data = Array.isArray(res.data) ? res.data : [];
                if (data.length === 0) {
                    historyContainer.innerHTML = '<p class="no-data">通知履歴がありません</p>';
                    return;
                }
                
                const html = data.map(log => `
                    <div class="notification-log-item">
                        <div class="log-title">${window.adminPanel?.escapeHtml(log.title || '')}</div>
                        <div class="log-body">${window.adminPanel?.escapeHtml(log.body || '')}</div>
                        <div class="log-meta">
                            <span class="log-time">${window.adminPanel?.formatDateTime(log.sent_at || log.created_at)}</span>
                            <span class="log-category">${window.adminPanel?.escapeHtml(log.category || 'general')}</span>
                            ${log.successful_sends !== undefined ? `<span class="log-stats">成功: ${log.successful_sends}件</span>` : ''}
                        </div>
                    </div>
                `).join('');
                
                historyContainer.innerHTML = html;
                return;
            }
        } catch (gasError) {
            console.warn('GAS notification history failed, trying Supabase:', gasError);
        }
        
        // GASが失敗した場合、Supabaseを試す
        const { data, error } = await window.supabaseClient
            .from('notification_history')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(50);
        
        if (error) {
            // テーブルが存在しない場合は空のメッセージを表示
            if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
                console.warn('Notification history table not found');
                historyContainer.innerHTML = '<p class="no-data">通知履歴テーブルが設定されていません</p>';
                return;
            }
            throw error;
        }
        
        if (!data || data.length === 0) {
            historyContainer.innerHTML = '<p class="no-data">通知履歴がありません</p>';
            return;
        }
        
        const html = data.map(log => `
            <div class="notification-log-item">
                <div class="log-title">${window.adminPanel?.escapeHtml(log.title || '')}</div>
                <div class="log-body">${window.adminPanel?.escapeHtml(log.body || '')}</div>
                <div class="log-meta">
                    <span class="log-time">${window.adminPanel?.formatDateTime(log.sent_at || log.created_at)}</span>
                    <span class="log-category">${window.adminPanel?.escapeHtml(log.category || 'general')}</span>
                    ${log.successful_sends !== undefined ? `<span class="log-stats">成功: ${log.successful_sends}件</span>` : ''}
                </div>
            </div>
        `).join('');
        
        historyContainer.innerHTML = html;
    } catch (error) {
        console.error('Failed to load notification history:', error);
        historyContainer.innerHTML = '<p class="error">履歴の読み込みに失敗しました</p>';
    }
};

// =====================================
// 通知統計読み込み
// =====================================
window.loadAdminNotificationStatistics = async function() {
    try {
        const res = await window.apiClient.sendRequest('getNotificationStatistics', {}, { useCache: false });
        
        // GASがエラーを返した場合、デフォルト値を表示
        if (!res || !res.success) {
            console.warn('GAS notification statistics failed:', res?.error);
            
            // デフォルト値を設定
            const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v ?? 0); };
            setText('stat-notifications-sent', 0);
            setText('stat-devices-registered', 0);
            setText('stat-delivery-success', 0);
            setText('stat-delivery-failed', 0);
            
            const tbody = document.getElementById('statistics-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state">統計データを取得できませんでした</td></tr>';
            }
            return;
        }

        const s = res.data || {};
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v ?? 0); };
        setText('stat-notifications-sent', s.notificationsSent ?? s.totalSent ?? 0);
        setText('stat-devices-registered', s.devicesRegistered ?? s.totalDevices ?? 0);
        setText('stat-delivery-success', s.deliverySuccess ?? s.totalSuccess ?? 0);
        setText('stat-delivery-failed', s.deliveryFailed ?? s.totalFailed ?? 0);

        const tbody = document.getElementById('statistics-table-body');
        if (tbody) {
            const rows = (s.periods || []).map(p => `
                <tr>
                    <td>${window.adminPanel?.escapeHtml(p.period || '')}</td>
                    <td>${p.sent ?? 0}</td>
                    <td>${p.success ?? 0}</td>
                    <td>${p.failed ?? 0}</td>
                </tr>
            `).join('');
            tbody.innerHTML = rows || '<tr><td colspan="4" class="empty-state">データがありません</td></tr>';
        }
    } catch (e) {
        console.error('Failed to load notification statistics:', e);
        // エラー時もデフォルト値を表示
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v ?? 0); };
        setText('stat-notifications-sent', 0);
        setText('stat-devices-registered', 0);
        setText('stat-delivery-success', 0);
        setText('stat-delivery-failed', 0);
        
        const tbody = document.getElementById('statistics-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">統計の取得に失敗しました</td></tr>';
        }
    }
};

// =====================================
// フォーラム管理
// =====================================
window.loadAdminForumPosts = async function() {
    const container = document.getElementById('forum-table-body');
    const alertDiv = document.getElementById('approval-alert');
    const pendingCountSpan = document.getElementById('pending-count');
    
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="7" class="loading-state">読み込み中...</td></tr>';
    
    try {
        const approvalFilter = document.getElementById('forum-approval-filter')?.value || 'all';
        
        let data = [];
        // まずGAS APIを試す（失敗してもエラーにしない）
        try {
            const params = {};
            if (approvalFilter !== 'all') params.approval = approvalFilter;
            const res = await window.apiClient.sendRequest('getPosts', params, { useCache: false });
            if (res && res.success && (res.data || res.posts)) {
                data = res.data || res.posts || [];
            }
        } catch (gasError) {
            console.warn('GAS getPosts failed, using Supabase fallback:', gasError.message);
        }
        
        // GASからデータが取得できなかった場合、Supabaseから取得
        if (!data || data.length === 0) {
            try {
                let query = window.supabaseClient
                    .from('posts')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (approvalFilter !== 'all') query = query.eq('approval_status', approvalFilter);
                const { data: supaData, error } = await query;
                if (error) throw error;
                data = supaData || [];
            } catch (supaError) {
                console.error('Supabase getPosts failed:', supaError);
                throw supaError;
            }
        }
        
        if (pendingCountSpan && data) {
            const pendingCount = data.filter(p => p.approval_status === 'pending').length;
            pendingCountSpan.textContent = pendingCount;
            
            if (alertDiv) {
                alertDiv.style.display = pendingCount > 0 ? 'block' : 'none';
            }
        }
        
        if (data && data.length > 0) {
            container.innerHTML = data.map(post => renderForumPostRow(post)).join('');
            
            // 承認・却下・保留ボタンのイベントリスナー
            container.querySelectorAll('button[data-action="approve"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    approvePost(id);
                });
            });
            
            container.querySelectorAll('button[data-action="reject"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    rejectPostPrompt(id);
                });
            });
            
            container.querySelectorAll('button[data-action="set-pending"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    setPendingStatus(id);
                });
            });
            
            container.querySelectorAll('button[data-action="view"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    viewPostDetails(id);
                });
            });
        } else {
            container.innerHTML = '<tr><td colspan="7" class="empty-state">投稿がありません</td></tr>';
        }
    } catch (error) {
        console.error('Error loading forum posts:', error);
        container.innerHTML = '<tr><td colspan="7" class="error-state">読み込みエラーが発生しました</td></tr>';
    }
};

function renderForumPostRow(post) {
    const approvalBadge = getApprovalStatusBadge(post.approval_status);
    const statusBadge = getStatusBadge(post.status || 'pending');
    const category = getCategoryLabel(post.category);
    const contentPreview = post.content.length > 100 
        ? post.content.substring(0, 100) + '...' 
        : post.content;
    const createdDate = window.adminPanel?.formatDateTime(post.created_at);
    
    let actionButtons = '';
    if (post.approval_status === 'pending') {
        actionButtons = `
            <button class="btn btn-success btn-sm" data-action="approve" data-id="${post.id}">
                <i class="fas fa-check"></i> 承認
            </button>
            <button class="btn btn-danger btn-sm" data-action="reject" data-id="${post.id}">
                <i class="fas fa-times"></i> 却下
            </button>
        `;
    } else if (post.approval_status === 'approved') {
        actionButtons = `
            <button class="btn btn-outline btn-sm" data-action="set-pending" data-id="${post.id}">
                <i class="fas fa-undo"></i> 保留に戻す
            </button>
            <button class="btn btn-danger btn-sm" data-action="reject" data-id="${post.id}">
                <i class="fas fa-times"></i> 却下
            </button>
        `;
    } else if (post.approval_status === 'rejected') {
        actionButtons = `
            <button class="btn btn-outline btn-sm" data-action="set-pending" data-id="${post.id}">
                <i class="fas fa-undo"></i> 保留に戻す
            </button>
            <button class="btn btn-success btn-sm" data-action="approve" data-id="${post.id}">
                <i class="fas fa-check"></i> 承認
            </button>
        `;
    }
    
    return `
        <tr>
            <td>${post.id.substring(0, 8)}...</td>
            <td>${window.adminPanel?.escapeHtml(contentPreview)}</td>
            <td>${category}</td>
            <td>${approvalBadge}</td>
            <td>${statusBadge}</td>
            <td>${createdDate}</td>
            <td class="action-buttons">
                ${actionButtons}
                <button class="btn btn-outline btn-sm" data-action="view" data-id="${post.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `;
}

function getApprovalStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending"><i class="fas fa-clock"></i> 承認待ち</span>',
        'approved': '<span class="status-badge status-active"><i class="fas fa-check-circle"></i> 承認済み</span>',
        'rejected': '<span class="status-badge status-closed"><i class="fas fa-times-circle"></i> 却下済み</span>'
    };
    return badges[status] || status;
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="status-badge status-pending">対応待ち</span>',
        'in_progress': '<span class="status-badge status-active">対応中</span>',
        'resolved': '<span class="status-badge status-resolved">解決済み</span>',
        'closed': '<span class="status-badge status-closed">終了</span>'
    };
    return badges[status] || status;
}

function getCategoryLabel(category) {
    const categories = {
        'suggestion': '提案・要望',
        'complaint': '苦情・問題',
        'question': '質問',
        'event': 'イベント',
        'facility': '施設・設備',
        'other': 'その他',
        'general': '一般'
    };
    return categories[category] || category;
}

async function approvePost(postId) {
    if (!confirm('この投稿を承認しますか？')) return;
    
    try {
        const currentUserEmail = window.adminPanel?.currentUser()?.email || 'admin@school.ac.jp';
        
        const { error } = await window.supabaseClient
            .from('posts')
            .update({
                approval_status: 'approved',
                approval_admin_email: currentUserEmail,
                approval_date: new Date().toISOString()
            })
            .eq('id', postId);
        
        if (error) throw error;
        
        window.adminPanel?.showSuccess('投稿を承認しました');
        await window.loadAdminForumPosts();
    } catch (error) {
        console.error('Error approving post:', error);
        window.adminPanel?.showError('承認に失敗しました');
    }
}

function rejectPostPrompt(postId) {
    const reason = prompt('却下理由を入力してください（任意）');
    if (reason !== null) {
        rejectPost(postId, reason);
    }
}

async function setPendingStatus(postId) {
    if (!confirm('この投稿を承認待ち（保留）に戻しますか？')) return;
    try {
        const currentUserEmail = window.adminPanel?.getCurrentUserEmail?.() || null;
        const { error } = await window.supabaseClient
            .from('posts')
            .update({
                approval_status: 'pending',
                approval_admin_email: currentUserEmail,
                approval_date: null,
                rejection_reason: null
            })
            .eq('id', postId);
        if (error) throw error;
        window.adminPanel?.showSuccess('承認待ちに戻しました');
        loadForumPosts();
    } catch (error) {
        console.error('Error setting pending status:', error);
        window.adminPanel?.showError('保留への変更に失敗しました');
    }
}

async function rejectPost(postId, reason = '') {
    try {
        const currentUserEmail = window.adminPanel?.currentUser()?.email || 'admin@school.ac.jp';
        
        const { error } = await window.supabaseClient
            .from('posts')
            .update({
                approval_status: 'rejected',
                approval_admin_email: currentUserEmail,
                approval_date: new Date().toISOString(),
                rejection_reason: reason
            })
            .eq('id', postId);
        
        if (error) throw error;
        
        window.adminPanel?.showSuccess('投稿を却下しました');
        await window.loadAdminForumPosts();
    } catch (error) {
        console.error('Error rejecting post:', error);
        window.adminPanel?.showError('却下に失敗しました');
    }
}

async function viewPostDetails(postId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
        
        if (error) throw error;
        
        showModal('投稿詳細', `
            <div class="post-details">
                <p><strong>投稿ID:</strong> ${data.id}</p>
                <p><strong>内容:</strong></p>
                <p>${window.adminPanel?.escapeHtml(data.content)}</p>
                <p><strong>カテゴリ:</strong> ${getCategoryLabel(data.category)}</p>
                <p><strong>承認状態:</strong> ${getApprovalStatusBadge(data.approval_status)}</p>
                <p><strong>投稿日:</strong> ${window.adminPanel?.formatDateTime(data.created_at)}</p>
                ${data.rejection_reason ? `<p><strong>却下理由:</strong> ${window.adminPanel?.escapeHtml(data.rejection_reason)}</p>` : ''}
            </div>
        `);
    } catch (error) {
        console.error('Error viewing post details:', error);
        window.adminPanel?.showError('投稿詳細の取得に失敗しました');
    }
}

// =====================================
// アカウント管理
// =====================================
async function createOrUpdateAdminAccount() {
    const email = document.getElementById('account-email')?.value.trim();
    const password = document.getElementById('account-password')?.value || '';
    const name = document.getElementById('account-name')?.value.trim() || '';
    const role = document.getElementById('account-role')?.value || 'admin';
    const permissionsText = document.getElementById('account-permissions')?.value || '{}';
    
    if (!email || !password) {
        window.adminPanel?.showError('メールとパスワードを入力してください');
        return;
    }
    
    let permissions;
    try {
        permissions = JSON.parse(permissionsText || '{}');
    } catch {
        permissions = {};
    }
    
    try {
        const passwordHash = await hashPassword(password);
        const res = await window.apiClient.sendRequest('createAdminAccount', {
            email,
            password: passwordHash,
            name,
            role,
            permissions: JSON.stringify(permissions)
        });
        
        if (!res || !res.success) {
            throw new Error(res?.error || 'アカウント作成に失敗しました');
        }
        
        window.adminPanel?.showSuccess('アカウントを作成/更新しました');
    } catch (e) {
        console.error('Account create/update failed:', e);
        window.adminPanel?.showError('アカウントの作成/更新に失敗しました');
    }
}

async function deleteAdminAccountByEmail() {
    const email = document.getElementById('account-email')?.value.trim();
    if (!email) {
        window.adminPanel?.showError('メールを入力してください');
        return;
    }
    
    if (!confirm('このアカウントを削除しますか？')) return;
    
    try {
        const res = await window.apiClient.sendRequest('deleteAdminAccount', { email });
        if (!res || !res.success) {
            throw new Error(res?.error || 'アカウント削除に失敗しました');
        }
        window.adminPanel?.showSuccess('アカウントを削除しました');
    } catch (e) {
        console.error('Account delete failed:', e);
        window.adminPanel?.showError('アカウントの削除に失敗しました');
    }
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =====================================
// メンテナンスモード管理
// =====================================
async function loadMaintenanceStatus() {
    const statusDiv = document.getElementById('maintenance-status');
    if (!statusDiv) return;
    
    try {
        const result = await window.apiClient.sendRequest('checkMaintenance', {}, { useCache: false });
        if (!result || !result.success) throw new Error(result?.error || 'Failed to get maintenance status');
        
        const isEnabled = result.maintenance || false;
        const message = result.message || '';
        const endTime = result.endTime || null;
        
        const maintenanceToggle = document.getElementById('maintenance-toggle');
        if (maintenanceToggle) {
            maintenanceToggle.checked = !!isEnabled;
        }

        if (isEnabled) {
            statusDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>メンテナンスモード有効</strong>
                    <p>${window.adminPanel?.escapeHtml(message)}</p>
                    ${endTime ? `<p><i class="fas fa-clock"></i> 終了予定: ${window.adminPanel?.formatDateTime(endTime)}</p>` : ''}
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <strong>メンテナンスモード無効</strong>
                    <p>システムは通常通り動作しています。</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load maintenance status:', error);
        statusDiv.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i>
                <strong>状態の取得に失敗しました</strong>
            </div>
        `;
    }
}

async function enableMaintenanceMode() {
    const messageEl = document.getElementById('maintenance-message');
    const endTimeEl = document.getElementById('maintenance-end-time');
    
    const message = messageEl?.value.trim() || 'システムメンテナンス中です。しばらくお待ちください。';
    const endTime = endTimeEl?.value || null;
    
    if (!confirm('メンテナンスモードを有効にしますか？\n一般ユーザーはアクセスできなくなります。')) {
        return;
    }
    
    try {
        const result = await window.apiClient.sendRequest('enableMaintenance', {
            message: message,
            endTime: endTime ? new Date(endTime).toISOString() : null
        });
        
        if (result.success) {
            window.adminPanel?.showSuccess('メンテナンスモードを有効にしました');
            await loadMaintenanceStatus();
            
            // メンテナンスチェッカーにも通知
            if (window.maintenanceChecker) {
                await window.maintenanceChecker.checkMaintenanceStatus();
            }
        } else {
            throw new Error(result.error || 'メンテナンスモードの有効化に失敗しました');
        }
    } catch (error) {
        console.error('Failed to enable maintenance mode:', error);
        window.adminPanel?.showError('メンテナンスモードの有効化に失敗しました');
    }
}

async function disableMaintenanceMode() {
    if (!confirm('メンテナンスモードを無効にしますか？')) {
        return;
    }
    
    try {
        const result = await window.apiClient.sendRequest('disableMaintenance');
        
        if (result.success) {
            window.adminPanel?.showSuccess('メンテナンスモードを無効にしました');
            await loadMaintenanceStatus();
            
            // メンテナンスチェッカーにも通知
            if (window.maintenanceChecker) {
                await window.maintenanceChecker.checkMaintenanceStatus();
            }
        } else {
            throw new Error(result.error || 'メンテナンスモードの無効化に失敗しました');
        }
    } catch (error) {
        console.error('Failed to disable maintenance mode:', error);
        window.adminPanel?.showError('メンテナンスモードの無効化に失敗しました');
    }
}

// =====================================
// PWA管理
// =====================================
async function loadPWAStatus() {
    const statusDiv = document.getElementById('pwa-status');
    if (!statusDiv) return;
    
    try {
        const status = window.pwaUpdater?.getPWAStatus() || {
            registered: false,
            updateAvailable: false,
            controller: false,
            scope: null
        };
        
        statusDiv.innerHTML = `
            <div class="pwa-status-info">
                <div class="status-item">
                    <span class="status-label">Service Worker:</span>
                    <span class="status-value ${status.registered ? 'status-active' : 'status-inactive'}">
                        ${status.registered ? '✓ 登録済み' : '✗ 未登録'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">更新利用可能:</span>
                    <span class="status-value ${status.updateAvailable ? 'status-active' : 'status-inactive'}">
                        ${status.updateAvailable ? '✓ あり' : '✗ なし'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">コントローラー:</span>
                    <span class="status-value ${status.controller ? 'status-active' : 'status-inactive'}">
                        ${status.controller ? '✓ アクティブ' : '✗ 非アクティブ'}
                    </span>
                </div>
                ${status.scope ? `<div class="status-item"><span class="status-label">スコープ:</span><span class="status-value">${window.adminPanel?.escapeHtml(status.scope)}</span></div>` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Failed to load PWA status:', error);
        statusDiv.innerHTML = '<p class="error">状態の取得に失敗しました</p>';
    }
}

async function checkPWAUpdates() {
    try {
        if (window.pwaUpdater) {
            await window.pwaUpdater.checkForUpdates();
            window.adminPanel?.showSuccess('アップデートをチェックしました');
            await loadPWAStatus();
        } else {
            window.adminPanel?.showError('PWAアップデーターが初期化されていません');
        }
    } catch (error) {
        console.error('Failed to check PWA updates:', error);
        window.adminPanel?.showError('アップデートチェックに失敗しました');
    }
}

function showPWAModule() {
    if (window.pwaUpdater) {
        window.pwaUpdater.showUpdateModule();
    } else {
        window.adminPanel?.showError('PWAアップデーターが初期化されていません');
    }
}

async function clearPWACache() {
    if (!confirm('キャッシュをクリアしてページを再読み込みしますか？')) {
        return;
    }
    
    try {
        if (window.pwaUpdater) {
            await window.pwaUpdater.manualCacheClearAndReload();
        } else {
            window.adminPanel?.showError('PWAアップデーターが初期化されていません');
        }
    } catch (error) {
        console.error('Failed to clear PWA cache:', error);
        window.adminPanel?.showError('キャッシュのクリアに失敗しました');
    }
}

// =====================================
// 通知システム管理
// =====================================
async function loadNotificationSystemStatus() {
    const statusDiv = document.getElementById('notification-system-status');
    if (!statusDiv) return;
    
    try {
        const manager = window.notificationManager;
        if (!manager) {
            statusDiv.innerHTML = '<p class="error">通知マネージャーが初期化されていません</p>';
            return;
        }
        
        const permission = manager.permission || 'default';
        const fcmToken = manager.fcmToken || null;
        const isInitialized = manager.isInitialized || false;
        
        statusDiv.innerHTML = `
            <div class="notification-system-info">
                <div class="status-item">
                    <span class="status-label">初期化状態:</span>
                    <span class="status-value ${isInitialized ? 'status-active' : 'status-inactive'}">
                        ${isInitialized ? '✓ 初期化済み' : '✗ 未初期化'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">通知権限:</span>
                    <span class="status-value ${permission === 'granted' ? 'status-active' : permission === 'denied' ? 'status-error' : 'status-inactive'}">
                        ${permission === 'granted' ? '✓ 許可済み' : permission === 'denied' ? '✗ 拒否' : '？ 未設定'}
                    </span>
                </div>
                <div class="status-item">
                    <span class="status-label">FCMトークン:</span>
                    <span class="status-value ${fcmToken ? 'status-active' : 'status-inactive'}">
                        ${fcmToken ? '✓ 取得済み' : '✗ 未取得'}
                    </span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load notification system status:', error);
        statusDiv.innerHTML = '<p class="error">状態の取得に失敗しました</p>';
    }
}

async function sendTestNotification() {
    try {
        const result = await window.apiClient.sendRequest('sendNotification', {
            title: 'テスト通知',
            message: 'これは管理者によるテスト通知です。',
            url: '/',
            targetType: 'all',
            adminEmail: window.adminPanel?.currentUser()?.email || ''
        });
        
        if (result.success) {
            window.adminPanel?.showSuccess('テスト通知を送信しました');
        } else {
            throw new Error(result.error || 'テスト通知の送信に失敗しました');
        }
    } catch (error) {
        console.error('Failed to send test notification:', error);
        window.adminPanel?.showError('テスト通知の送信に失敗しました');
    }
}

// システム管理セクションのデータ読み込み
window.loadAdminSystemData = async function() {
    await loadMaintenanceStatus();
    await loadPWAStatus();
    await loadNotificationSystemStatus();
};
