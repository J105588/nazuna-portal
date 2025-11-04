// メンバー詳細ページ用JavaScript

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

// メンバーデータ（実際はSupabaseから取得）:削除済み


// URLパラメータからメンバーIDを取得
function getMemberIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || '1';
}

// ページ初期化
document.addEventListener('DOMContentLoaded', function() {
    const memberId = getMemberIdFromURL();
    console.log('Member detail page initializing...');
    console.log('Member ID from URL:', memberId);
    
    // 基本機能を初期化
    initNavigation();
    initSidebar();
    
    // Supabaseの初期化を待ってからメンバー詳細を読み込み
    waitForSupabaseInitialization();
    
    async function waitForSupabaseInitialization() {
        let attempts = 0;
        const maxAttempts = 50; // 5秒間待機 (100ms × 50)
        
        while (attempts < maxAttempts) {
            if (typeof window.supabaseQueries !== 'undefined' && window.supabaseQueries !== null) {
                console.log('SupabaseQueries initialized successfully');
                console.log('SupabaseQueries available:', typeof window.supabaseQueries !== 'undefined');
                
                // メンバー詳細を読み込み
                loadMemberDetail();
                
                // 他のメンバーリストを読み込み
                loadOtherMembers();
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.log('SupabaseQueries initialization timeout - using demo mode');
        console.log('SupabaseQueries available:', typeof window.supabaseQueries !== 'undefined');
        
        // タイムアウトしてもメンバー詳細を読み込み
        loadMemberDetail();
        loadOtherMembers();
    }
});

// メンバー詳細データキャッシュ
const memberDetailCache = {
    data: new Map(),
    lastFetch: new Map(),
    cacheDuration: 5 * 60 * 1000 // 5分
};

// キャッシュからメンバー詳細を取得
function getCachedMemberDetail(memberId) {
    if (!memberDetailCache.data.has(memberId) || !memberDetailCache.lastFetch.has(memberId)) {
        return null;
    }
    
    const now = Date.now();
    const lastFetch = memberDetailCache.lastFetch.get(memberId);
    if (now - lastFetch > memberDetailCache.cacheDuration) {
        // キャッシュ期限切れ
        memberDetailCache.data.delete(memberId);
        memberDetailCache.lastFetch.delete(memberId);
        return null;
    }
    
    return memberDetailCache.data.get(memberId);
}

// メンバー詳細をキャッシュに保存
function setCachedMemberDetail(memberId, data) {
    memberDetailCache.data.set(memberId, data);
    memberDetailCache.lastFetch.set(memberId, Date.now());
}

// メンバー詳細読み込み
async function loadMemberDetail() {
    const memberId = getMemberIdFromURL();
    
    // ローディング表示
    const heroContainer = document.getElementById('member-hero');
    if (heroContainer) {
        heroContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>メンバー情報を読み込み中...</p>
            </div>
        `;
    }
    
    try {
        let member = null;
        
        // まずキャッシュをチェック
        const cachedMember = getCachedMemberDetail(memberId);
        if (cachedMember) {
            console.log('Using cached member detail for ID:', memberId);
            member = cachedMember;
            showInfoMessage('キャッシュされたデータを表示しています。');
        } else {
            // Supabaseからデータを取得
            if (window.supabaseQueries) {
                console.log('Loading member detail from Supabase for ID:', memberId);
                console.log('SupabaseQueries instance:', window.supabaseQueries);
                console.log('SupabaseQueries.isAvailable:', window.supabaseQueries.isAvailable);
                
                const { data, error } = await window.supabaseQueries.getTableData('council_members', {
                    filters: { id: memberId },
                    limit: 1
                });
                
                if (error) {
                    console.error('Supabase error loading');
                    const errorMsg = error.message || error.details || error.hint || '不明なエラー';
                    showErrorMessage(`データベースから情報を取得できませんでした: ${errorMsg}`);
                    showMemberNotFound();
                    return;
                } else if (data && data.length > 0) {
                    console.log('Loaded member detail from Supabase:', data[0]);
                    member = data[0];
                    
                    // 必要なフィールドが存在するかチェック
                    console.log('Raw Supabase data:', member);
                    
                    // Supabaseデータ構造をフロントエンド用に変換
                    member = {
                        ...member,
                        name: member.name || 'データなし',
                        grade: member.grade || 'データなし',
                        message: member.message || 'よろしくお願いします',
                        longMessage: member.bio || member.message || '詳細メッセージは準備中です。',
                        
                        // responsibilities は TEXT[] -> array変換
                        responsibilities: Array.isArray(member.responsibilities) ? member.responsibilities : 
                                       (member.responsibilities ? [member.responsibilities] : ['準備中']),
                        
                        // achievements は新しい構造で処理
                        achievements: member.achievements || [],
                        
                        // hobbies のデフォルト設定
                        hobbies: ['準備中'],
                        motto: member.message || '準備中',
                        joinDate: member.join_date || member.created_at || new Date().toISOString()
                    };
                    
                    console.log('Processed member data:', member);
                    
                    // データをキャッシュに保存
                    setCachedMemberDetail(memberId, member);
                    showSuccessMessage('メンバー情報を正常に読み込みました。');
                } else {
                    console.log('No member found in Supabase - empty result');
                    console.log('Query details: ID filter =', memberId, ', RLS policy: is_active = true');
                    showErrorMessage('指定されたメンバーが見つかりませんでした。');
                    showMemberNotFound();
                    return;
                }
            } else {
                // Supabaseが利用できない場合はエラーを表示
                console.error('Supabase is not available. Cannot load member detail.');
                showErrorMessage('データベースに接続できません。メンバー情報を読み込むことができませんでした。');
                showMemberNotFound();
                return;
            }
        }
        
        if (!member) {
            showMemberNotFound();
            return;
        }
        
        // hobbiesとactivitiesをbioから復元
        if (member.bio) {
            try {
                const bioData = JSON.parse(member.bio);
                if (bioData.hobbies) {
                    member.hobbies = bioData.hobbies;
                }
                if (bioData.activities) {
                    member.activities = bioData.activities;
                }
                if (bioData.text) {
                    member.longMessage = bioData.text;
                }
            } catch (e) {
                // bioがJSONでない場合は無視
            }
        }
        
        // join_dateが存在する場合はそれを使用、なければcreated_atを使用
        if (member.join_date) {
            member.joinDate = member.join_date;
        } else if (!member.joinDate) {
            member.joinDate = member.created_at || new Date().toISOString();
        }
        
        // 活動実績をmember_achievementsテーブルから取得
        if (window.supabaseQueries && window.supabaseQueries.isAvailable) {
            try {
                console.log('Loading achievements for member ID:', memberId);
                const { data: achievements, error: achievementsError } = await window.supabaseQueries.getMemberAchievements(memberId, {
                    includePublicOnly: true,
                    limit: 100
                });
                
                if (achievementsError) {
                    console.error('Error loading achievements:', achievementsError);
                } else if (achievements && achievements.length > 0) {
                    console.log('Loaded achievements:', achievements.length);
                    // member_achievementsテーブルから取得した活動実績を使用
                    member.achievements = achievements;
                } else {
                    console.log('No achievements found in member_achievements table');
                    // member_achievementsテーブルに活動実績がない場合は、council_membersのachievementsフィールドを使用（後方互換性のため）
                    if (!member.achievements || member.achievements.length === 0) {
                        member.achievements = [];
                    }
                }
            } catch (error) {
                console.error('Error fetching achievements:', error);
                // エラーが発生しても、既存のachievementsフィールドを使用
            }
        }
        
        // 現在のメンバーデータを保存
        setCurrentMember(member);
        
        // ページタイトルを更新
        document.title = `${member.name} - なずなポータル`;
        
        // ヘッダー情報を表示
        displayMemberHero(member);
        
        // 詳細情報を表示
        displayMemberProfile(member);
        displayMemberMessage(member);
        displayMemberResponsibilities(member);
        displayMemberAchievements(member);
        
        // 活動予定を表示
        displayActivities(member);
        
    } catch (error) {
        console.error('Error loading member detail:', error);
        showErrorMessage('予期しないエラーが発生しました。');
        showMemberNotFound();
    }
}

// メンバーヒーロー表示
function displayMemberHero(member) {
    const heroContainer = document.getElementById('member-hero');
    if (!heroContainer) return;
    
    heroContainer.innerHTML = `
        <div class="member-hero-content">
            <div class="member-hero-avatar">
                ${member.image_url ? 
                    `<img src="${member.image_url}" alt="${member.name}" class="member-image" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'member-placeholder\\'><i class=\\'fas fa-user\\'></i></div>';">` :
                    `<div class="member-placeholder">
                        <i class="fas fa-user"></i>
                    </div>`
                }
            </div>
            <div class="member-hero-info">
                <h1 class="member-name">${member.name}</h1>
                <p class="member-role">${member.role}</p>
                <p class="member-grade">${member.grade}</p>
                <div class="member-meta">
                    <span class="member-join-date">
                        <i class="fas fa-calendar"></i>
                        ${formatJoinDate(member.joinDate)}から活動
                    </span>
                    <span class="member-motto">
                        <i class="fas fa-quote-left"></i>
                        ${member.motto}
                    </span>
                </div>
            </div>
        </div>
    `;
}

// 管理者チェック
function isAdmin() {
    const adminToken = sessionStorage.getItem('admin_token');
    const adminEmail = sessionStorage.getItem('admin_email');
    return !!(adminToken && adminEmail);
}

function isAdminPage() {
    const pathname = (window.location && window.location.pathname || '').toLowerCase();
    const href = (window.location && window.location.href || '').toLowerCase();
    return pathname.includes('admin.html') || href.includes('admin.html');
}

// プロフィール表示
function displayMemberProfile(member) {
    const profileContainer = document.getElementById('profile-content');
    if (!profileContainer) return;
    
    const canEdit = isAdmin() && isAdminPage();
    const hobbiesText = Array.isArray(member.hobbies) ? member.hobbies.join(', ') : (member.hobbies || '');
    
    profileContainer.innerHTML = `
        <div class="profile-grid" id="profile-grid">
            <div class="profile-item">
                <div class="profile-label">
                    <i class="fas fa-graduation-cap"></i>
                    学年・クラス
                </div>
                <div class="profile-value">${member.grade || '未設定'}</div>
            </div>
            <div class="profile-item" id="profile-join-date">
                <div class="profile-label">
                    <i class="fas fa-calendar-plus"></i>
                    活動開始
                    ${canEdit ? '<button class="edit-btn-small" onclick="editJoinDate()" title="編集"><i class="fas fa-edit"></i></button>' : ''}
                </div>
                <div class="profile-value" id="join-date-value">${formatJoinDate(member.joinDate)}</div>
                <div class="profile-edit" id="join-date-edit" style="display: none;">
                    <input type="date" id="join-date-input" class="form-control" value="${member.join_date ? formatDateForInput(member.join_date) : formatDateForInput(member.joinDate)}">
                    <button class="btn btn-sm btn-primary" onclick="saveJoinDate()">保存</button>
                    <button class="btn btn-sm btn-secondary" onclick="cancelEditJoinDate()">キャンセル</button>
                </div>
            </div>
            <div class="profile-item" id="profile-hobbies">
                <div class="profile-label">
                    <i class="fas fa-heart"></i>
                    趣味
                    ${canEdit ? '<button class="edit-btn-small" onclick="editHobbies()" title="編集"><i class="fas fa-edit"></i></button>' : ''}
                </div>
                <div class="profile-value" id="hobbies-value">
                    ${hobbiesText ? hobbiesText.split(',').map(hobby => `<span class="hobby-tag">${hobby.trim()}</span>`).join('') : '<span class="text-muted">未設定</span>'}
                </div>
                <div class="profile-edit" id="hobbies-edit" style="display: none;">
                    <textarea id="hobbies-input" class="form-control" rows="2" placeholder="趣味をカンマ区切りで入力">${hobbiesText}</textarea>
                    <button class="btn btn-sm btn-primary" onclick="saveHobbies()">保存</button>
                    <button class="btn btn-sm btn-secondary" onclick="cancelEditHobbies()">キャンセル</button>
                </div>
            </div>
            <div class="profile-item" id="profile-motto">
                <div class="profile-label">
                    <i class="fas fa-star"></i>
                    座右の銘
                    ${canEdit ? '<button class="edit-btn-small" onclick="editMotto()" title="編集"><i class="fas fa-edit"></i></button>' : ''}
                </div>
                <div class="profile-value" id="motto-value">"${member.motto || '未設定'}"</div>
                <div class="profile-edit" id="motto-edit" style="display: none;">
                    <input type="text" id="motto-input" class="form-control" value="${member.motto || ''}" placeholder="座右の銘を入力">
                    <button class="btn btn-sm btn-primary" onclick="saveMotto()">保存</button>
                    <button class="btn btn-sm btn-secondary" onclick="cancelEditMotto()">キャンセル</button>
                </div>
            </div>
        </div>
    `;
}

// メッセージ表示
function displayMemberMessage(member) {
    const messageContainer = document.getElementById('message-content');
    if (!messageContainer) return;
    
    messageContainer.innerHTML = `
        <div class="message-card">
            <div class="message-icon">
                <i class="fas fa-quote-left"></i>
            </div>
            <div class="message-text">
                <p>${member.longMessage}</p>
            </div>
        </div>
    `;
}

// 担当業務表示
function displayMemberResponsibilities(member) {
    const responsibilitiesContainer = document.getElementById('responsibilities-content');
    if (!responsibilitiesContainer) return;
    
    responsibilitiesContainer.innerHTML = `
        <div class="responsibilities-list">
            ${member.responsibilities.map(responsibility => `
                <div class="responsibility-item">
                    <i class="fas fa-check-circle"></i>
                    <span>${responsibility}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// 活動実績表示
function displayMemberAchievements(member) {
    const achievementsContainer = document.getElementById('achievements-content');
    if (!achievementsContainer) return;
    
    if (!member.achievements || member.achievements.length === 0) {
        achievementsContainer.innerHTML = `
            <div class="no-achievements">
                <i class="fas fa-info-circle"></i>
                <p>まだ実績情報が登録されていません。</p>
            </div>
        `;
        return;
    }
    
    // 年別にソートしてグループ化
    const achievementsByYear = {};
    member.achievements.forEach(achievement => {
        const year = achievement.year || 2024;
        if (!achievementsByYear[year]) {
            achievementsByYear[year] = [];
        }
        achievementsByYear[year].push(achievement);
    });
    
    // 年順（降順）でソート
    const sortedYears = Object.keys(achievementsByYear).sort((a, b) => b - a);
    
    achievementsContainer.innerHTML = `
        <div class="achievements-timeline">
            ${sortedYears.map(year => `
                <div class="achievements-year-group">
                    <h3 class="year-header">
                        <i class="fas fa-calendar-alt"></i>
                        ${year}年
                    </h3>
                    <div class="achievements-year-content">
                        ${achievementsByYear[year]
                            .sort((a, b) => (b.month || 1) - (a.month || 1))
                            .map(achievement => `
                                <div class="achievement-item ${achievement.category || 'general'}">
                                    <div class="achievement-date">
                                        <i class="fas fa-calendar"></i>
                                        ${achievement.month || 1}月
                                    </div>
                                    <div class="achievement-content">
                                        <h4>${achievement.title}</h4>
                                        <p>${achievement.description || ''}</p>
                                        ${achievement.category ? `
                                            <span class="achievement-category category-${achievement.category}">
                                                ${getAchievementCategoryLabel(achievement.category)}
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 活動実績カテゴリのラベル取得
function getAchievementCategoryLabel(category) {
    const categoryLabels = {
        'general': '一般',
        'academic': '学習',
        'cultural': '文化',
        'sports': 'スポーツ',
        'leadership': 'リーダーシップ',
        'volunteer': 'ボランティア',
        'event': 'イベント'
    };
    return categoryLabels[category] || category;
}

// 他のメンバー表示
async function loadOtherMembers() {
    const otherMembersContainer = document.getElementById('other-members');
    if (!otherMembersContainer) return;
    
    const currentMemberId = getMemberIdFromURL();
    
    try {
        let otherMembers = [];
        
        // まずキャッシュをチェック（council.htmlのキャッシュを使用）
        if (window.getCachedCouncilMembers) {
            const cachedData = window.getCachedCouncilMembers();
            if (cachedData) {
                console.log('Using cached data for other members');
                otherMembers = cachedData.filter(member => member.id.toString() !== currentMemberId);
            }
        }
        
        // キャッシュにデータがない場合はSupabaseから取得
        if (otherMembers.length === 0) {
            if (window.supabaseQueries) {
                console.log('Loading other members from Supabase...');
                const { data, error } = await window.supabaseQueries.getCouncilMembers({ activeOnly: true });
                
                if (error) {
                    console.error('Supabase error loading other members:', error);
                    showErrorMessage('他のメンバー情報の読み込みに失敗しました。');
                } else if (data && data.length > 0) {
                    console.log('Loaded other members from Supabase:', data.length);
                    otherMembers = data.filter(member => member.id.toString() !== currentMemberId);
                } else {
                    console.log('No other members found in Supabase');
                }
            } else {
                console.log('Supabase not available');
                showErrorMessage('データベースに接続できません。');
            }
        }
        
        if (otherMembers.length === 0) {
            otherMembersContainer.innerHTML = `
                <div class="no-other-members">
                    <i class="fas fa-users"></i>
                    <p>他のメンバー情報がありません</p>
                </div>
            `;
            return;
        }
        
        otherMembersContainer.innerHTML = otherMembers.map(member => `
            <div class="other-member-item">
                <div class="other-member-avatar">
                    ${member.image_url ? 
                        `<img src="${member.image_url}" alt="${member.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>';" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">` :
                        `<i class="fas fa-user"></i>`
                    }
                </div>
                <div class="other-member-info">
                    <h5>${member.name}</h5>
                    <p>${member.role}</p>
                    <a href="member-detail.html?id=${member.id}" class="other-member-link">
                        詳細を見る <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading other members:', error);
        showErrorMessage('他のメンバー情報の読み込み中にエラーが発生しました。');
        otherMembersContainer.innerHTML = `
            <div class="no-other-members">
                <i class="fas fa-exclamation-triangle"></i>
                <p>メンバー情報の読み込みに失敗しました</p>
            </div>
        `;
    }
}

// メンバーが見つからない場合
function showMemberNotFound() {
    const heroContainer = document.getElementById('member-hero');
    const mainContent = document.querySelector('.member-detail-content');
    
    if (heroContainer) {
        heroContainer.innerHTML = `
            <div class="member-not-found">
                <div class="not-found-icon">
                    <i class="fas fa-user-slash"></i>
                </div>
                <h1>メンバーが見つかりません</h1>
                <p>指定されたメンバーは存在しないか、削除された可能性があります。</p>
                <a href="council.html" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i>
                    生徒会紹介に戻る
                </a>
            </div>
        `;
    }
    
    if (mainContent) {
        mainContent.style.display = 'none';
    }
}

// 日付フォーマット
function formatJoinDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

// 日付をinput type="date"用にフォーマット
function formatDateForInput(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 現在のメンバーIDを保持
let currentMemberId = null;
let currentMemberData = null;

// メンバーデータを保存
function setCurrentMember(member) {
    currentMemberId = member.id;
    currentMemberData = member;
}

// 活動開始の編集
function editJoinDate() {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('プロフィール編集は管理画面からのみ可能です。');
        return;
    }
    document.getElementById('join-date-value').style.display = 'none';
    document.getElementById('join-date-edit').style.display = 'block';
}

// 活動開始の保存
async function saveJoinDate() {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('プロフィール編集は管理画面からのみ可能です。');
        return;
    }
    
    const input = document.getElementById('join-date-input');
    const newDate = input.value;
    
    if (!newDate) {
        showErrorMessage('日付を入力してください。');
        return;
    }
    
    try {
        const memberId = getMemberIdFromURL();
        
        if (window.supabaseClient) {
            // join_dateカラムを更新
            const { error } = await window.supabaseClient
                .from('council_members')
                .update({ join_date: newDate })
                .eq('id', memberId);
            
            if (error) throw error;
            
            // キャッシュを更新
            if (currentMemberData) {
                currentMemberData.joinDate = newDate;
                currentMemberData.join_date = newDate;
                setCachedMemberDetail(memberId, currentMemberData);
            }
            
            // 表示を更新
            document.getElementById('join-date-value').textContent = formatJoinDate(newDate);
            
            showSuccessMessage('活動開始日を保存しました。');
        } else {
            showErrorMessage('データベースに接続できません。');
        }
    } catch (error) {
        console.error('Error saving join date:', error);
        showErrorMessage('保存に失敗しました。' + (error.message || ''));
    }
    
    cancelEditJoinDate();
}

// 活動開始の編集キャンセル
function cancelEditJoinDate() {
    document.getElementById('join-date-value').style.display = 'block';
    document.getElementById('join-date-edit').style.display = 'none';
}

// 趣味の編集
function editHobbies() {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('プロフィール編集は管理画面からのみ可能です。');
        return;
    }
    document.getElementById('hobbies-value').style.display = 'none';
    document.getElementById('hobbies-edit').style.display = 'block';
}

// 趣味の保存
async function saveHobbies() {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('プロフィール編集は管理画面からのみ可能です。');
        return;
    }
    
    const input = document.getElementById('hobbies-input');
    const hobbiesText = input.value.trim();
    
    try {
        const memberId = getMemberIdFromURL();
        
        if (window.supabaseClient) {
            // hobbiesカラムが存在しない場合は、JSONBフィールドまたは別の方法で保存
            // 一時的にachievementsに保存するか、データベーススキーマを変更する必要がある
            // 現在はbioフィールドにJSONとして保存する方法を試行
            const hobbiesArray = hobbiesText ? hobbiesText.split(',').map(h => h.trim()).filter(h => h) : [];
            
            // bioにJSONとして保存（一時的な対応）
            const currentBio = currentMemberData?.bio || '';
            let bioData = {};
            try {
                bioData = currentBio ? JSON.parse(currentBio) : {};
            } catch (e) {
                // bioがJSONでない場合は、既存のbioを保持
                bioData = { original: currentBio, hobbies: hobbiesArray };
            }
            bioData.hobbies = hobbiesArray;
            
            const { error } = await window.supabaseClient
                .from('council_members')
                .update({ bio: JSON.stringify(bioData) })
                .eq('id', memberId);
            
            if (error) throw error;
            
            // キャッシュを更新
            if (currentMemberData) {
                currentMemberData.hobbies = hobbiesArray;
                currentMemberData.bio = JSON.stringify(bioData);
                setCachedMemberDetail(memberId, currentMemberData);
            }
            
            // 表示を更新
            const hobbiesDisplay = hobbiesArray.length > 0 
                ? hobbiesArray.map(hobby => `<span class="hobby-tag">${hobby}</span>`).join('')
                : '<span class="text-muted">未設定</span>';
            document.getElementById('hobbies-value').innerHTML = hobbiesDisplay;
            
            showSuccessMessage('趣味を保存しました。');
        } else {
            showErrorMessage('データベースに接続できません。');
        }
    } catch (error) {
        console.error('Error saving hobbies:', error);
        showErrorMessage('保存に失敗しました。');
    }
    
    cancelEditHobbies();
}

// 趣味の編集キャンセル
function cancelEditHobbies() {
    document.getElementById('hobbies-value').style.display = 'block';
    document.getElementById('hobbies-edit').style.display = 'none';
}

// 座右の銘の編集
function editMotto() {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('プロフィール編集は管理画面からのみ可能です。');
        return;
    }
    document.getElementById('motto-value').style.display = 'none';
    document.getElementById('motto-edit').style.display = 'block';
}

// 座右の銘の保存
async function saveMotto() {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('プロフィール編集は管理画面からのみ可能です。');
        return;
    }
    
    const input = document.getElementById('motto-input');
    const motto = input.value.trim();
    
    try {
        const memberId = getMemberIdFromURL();
        
        if (window.supabaseClient) {
            // mottoはmessageカラムに保存（または別のカラムを追加）
            // 現在はmessageカラムを更新
            const { error } = await window.supabaseClient
                .from('council_members')
                .update({ message: motto })
                .eq('id', memberId);
            
            if (error) throw error;
            
            // キャッシュを更新
            if (currentMemberData) {
                currentMemberData.motto = motto;
                currentMemberData.message = motto;
                setCachedMemberDetail(memberId, currentMemberData);
            }
            
            // 表示を更新
            document.getElementById('motto-value').textContent = `"${motto || '未設定'}"`;
            
            showSuccessMessage('座右の銘を保存しました。');
        } else {
            showErrorMessage('データベースに接続できません。');
        }
    } catch (error) {
        console.error('Error saving motto:', error);
        showErrorMessage('保存に失敗しました。');
    }
    
    cancelEditMotto();
}

// 座右の銘の編集キャンセル
function cancelEditMotto() {
    document.getElementById('motto-value').style.display = 'block';
    document.getElementById('motto-edit').style.display = 'none';
}

// 活動予定を表示
function displayActivities(member) {
    const activitiesContainer = document.getElementById('upcoming-activities');
    if (!activitiesContainer) return;
    
    const canEdit = isAdmin() && isAdminPage();
    const activities = member.activities || [];
    
    if (activities.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="no-activities">
                <p class="text-muted">活動予定が登録されていません</p>
                ${canEdit ? '<button class="btn btn-sm btn-primary" onclick="editActivities()"><i class="fas fa-plus"></i> 活動予定を追加</button>' : ''}
            </div>
        `;
        return;
    }
    
    activitiesContainer.innerHTML = `
        ${activities.map((activity, index) => `
            <div class="activity-item" id="activity-${index}">
                <div class="activity-date">${formatActivityDate(activity.date)}</div>
                <div class="activity-info">
                    <h5>${activity.title || '活動予定'}</h5>
                    <p>${activity.description || ''}</p>
                </div>
                ${canEdit ? `
                    <button class="edit-btn-small" onclick="deleteActivity(${index})" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `).join('')}
        ${canEdit ? '<button class="btn btn-sm btn-primary mt-2" onclick="editActivities()"><i class="fas fa-plus"></i> 活動予定を追加</button>' : ''}
    `;
}

// 活動予定の日付をフォーマット
function formatActivityDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

// 活動予定の編集
function editActivities() {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('活動予定の編集は管理画面からのみ可能です。');
        return;
    }
    
    const activities = currentMemberData?.activities || [];
    const activitiesText = activities.map(a => {
        const date = a.date ? formatDateForInput(a.date) : '';
        return `${date}|${a.title || ''}|${a.description || ''}`;
    }).join('\n');
    
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.innerHTML = `
        <div class="edit-modal-content">
            <div class="edit-modal-header">
                <h3>活動予定を編集</h3>
                <button class="close-btn" onclick="closeEditActivitiesModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="edit-modal-body">
                <p class="text-muted mb-2">形式: 日付|タイトル|説明（1行に1つの活動予定）</p>
                <textarea id="activities-input" class="form-control" rows="10" placeholder="例:&#10;2024-02-15|生徒会会議|定例会議&#10;2024-02-20|体育祭準備会|企画検討">${activitiesText}</textarea>
            </div>
            <div class="edit-modal-footer">
                <button class="btn btn-primary" onclick="saveActivities()">保存</button>
                <button class="btn btn-secondary" onclick="closeEditActivitiesModal()">キャンセル</button>
            </div>
        </div>
    `;
    modal.id = 'activities-edit-modal';
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// 活動予定モーダルを閉じる
function closeEditActivitiesModal() {
    const modal = document.getElementById('activities-edit-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// 活動予定を保存
async function saveActivities() {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('活動予定の編集は管理画面からのみ可能です。');
        return;
    }
    
    const input = document.getElementById('activities-input');
    const activitiesText = input.value.trim();
    
    try {
        const memberId = getMemberIdFromURL();
        
        // テキストをパースして活動予定配列を作成
        const activities = [];
        if (activitiesText) {
            const lines = activitiesText.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                const parts = line.split('|');
                if (parts.length >= 2) {
                    activities.push({
                        date: parts[0].trim(),
                        title: parts[1].trim(),
                        description: parts[2] ? parts[2].trim() : ''
                    });
                }
            });
        }
        
        if (window.supabaseClient) {
            // activitiesをbioにJSONとして保存
            const currentBio = currentMemberData?.bio || '';
            let bioData = {};
            try {
                bioData = currentBio ? JSON.parse(currentBio) : {};
            } catch (e) {
                // bioがJSONでない場合は、既存のbioを保持
                bioData = { original: currentBio };
            }
            bioData.activities = activities;
            
            const { error } = await window.supabaseClient
                .from('council_members')
                .update({ bio: JSON.stringify(bioData) })
                .eq('id', memberId);
            
            if (error) throw error;
            
            // キャッシュを更新
            if (currentMemberData) {
                currentMemberData.activities = activities;
                currentMemberData.bio = JSON.stringify(bioData);
                setCachedMemberDetail(memberId, currentMemberData);
            }
            
            // 表示を更新
            displayActivities(currentMemberData);
            
            showSuccessMessage('活動予定を保存しました。');
        } else {
            showErrorMessage('データベースに接続できません。');
        }
    } catch (error) {
        console.error('Error saving activities:', error);
        showErrorMessage('保存に失敗しました。');
    }
    
    closeEditActivitiesModal();
}

// 活動予定を削除
async function deleteActivity(index) {
    if (!isAdmin() || !isAdminPage()) {
        showErrorMessage('活動予定の編集は管理画面からのみ可能です。');
        return;
    }
    
    if (!confirm('この活動予定を削除しますか？')) return;
    
    try {
        const memberId = getMemberIdFromURL();
        const activities = [...(currentMemberData?.activities || [])];
        activities.splice(index, 1);
        
        if (window.supabaseClient) {
            // activitiesをbioにJSONとして保存
            const currentBio = currentMemberData?.bio || '';
            let bioData = {};
            try {
                bioData = currentBio ? JSON.parse(currentBio) : {};
            } catch (e) {
                bioData = { original: currentBio };
            }
            bioData.activities = activities;
            
            const { error } = await window.supabaseClient
                .from('council_members')
                .update({ bio: JSON.stringify(bioData) })
                .eq('id', memberId);
            
            if (error) throw error;
            
            // キャッシュを更新
            if (currentMemberData) {
                currentMemberData.activities = activities;
                currentMemberData.bio = JSON.stringify(bioData);
                setCachedMemberDetail(memberId, currentMemberData);
            }
            
            // 表示を更新
            displayActivities(currentMemberData);
            
            showSuccessMessage('活動予定を削除しました。');
        } else {
            showErrorMessage('データベースに接続できません。');
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        showErrorMessage('削除に失敗しました。');
    }
}

// 編集関数をグローバルに公開
window.editJoinDate = editJoinDate;
window.saveJoinDate = saveJoinDate;
window.cancelEditJoinDate = cancelEditJoinDate;
window.editHobbies = editHobbies;
window.saveHobbies = saveHobbies;
window.cancelEditHobbies = cancelEditHobbies;
window.editMotto = editMotto;
window.saveMotto = saveMotto;
window.cancelEditMotto = cancelEditMotto;
window.editActivities = editActivities;
window.saveActivities = saveActivities;
window.closeEditActivitiesModal = closeEditActivitiesModal;
window.deleteActivity = deleteActivity;

// 生徒会ページでこの関数を呼び出すために、グローバルに公開
window.makeCouncilMembersClickable = makeCouncilMembersClickable;

// メッセージ表示関数（app.jsから移植）
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showInfoMessage(message) {
    showMessage(message, 'info');
}

function showMessage(message, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `message-toast message-${type}`;
    messageEl.innerHTML = `
        <div class="message-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(messageEl);
    
    // アニメーション表示
    setTimeout(() => {
        messageEl.classList.add('show');
    }, 100);
    
    // 5秒後に自動で消す
    setTimeout(() => {
        messageEl.classList.remove('show');
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 300);
    }, 5000);
}

// デバッグ用関数
if (CONFIG && CONFIG.APP && CONFIG.APP.DEBUG) {
    window.memberDetailDebug = {
        loadMember: (id) => {
            window.history.pushState({}, '', `?id=${id}`);
            loadMemberDetail();
        },
        getMemberData: (id) => membersData[id],
        getAllMembers: () => membersData
    };
    console.log('Member detail debug functions available: memberDetailDebug.loadMember(id), etc.');
}
