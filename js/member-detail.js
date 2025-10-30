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

// メンバーデータ（実際はSupabaseから取得）
const membersData = {
    '1': {
        id: 1,
        name: '会長 山田太郎',
        role: '全体統括',
        grade: '3年A組',
        message: '皆さんの声を大切にし、より良い学校生活の実現に向けて全力で取り組みます。些細なことでもお気軽にご相談ください。',
        longMessage: '生徒会長として、全校生徒の皆さんが充実した学校生活を送れるよう、日々努力しています。私たちの活動は、皆さん一人ひとりの声があってこそ成り立ちます。なずなフォーラムやアンケートを通じて、積極的にご意見をお聞かせください。一緒に素晴らしい学校を作っていきましょう。',
        image: null,
        responsibilities: [
            '生徒会全体の統括・運営',
            '学校行事の企画・調整',
            '生徒総会の司会進行',
            '学校側との連絡・調整',
            '各委員会の活動支援'
        ],
        achievements: [
            {
                title: '体育祭の企画改革',
                description: '昨年度の体育祭で新しい競技を導入し、参加率が20%向上',
                date: '2024年6月'
            },
            {
                title: '生徒会だよりのデジタル化',
                description: 'ポータルサイトを活用した情報発信システムを構築',
                date: '2024年4月'
            },
            {
                title: '学食メニュー改善プロジェクト',
                description: 'アンケート結果を基に新メニューを3品追加',
                date: '2024年9月'
            }
        ],
        hobbies: ['読書', 'バスケットボール', 'プログラミング'],
        motto: '一歩ずつ、確実に前進する',
        joinDate: '2023年4月'
    },
    '2': {
        id: 2,
        name: '副会長 田中花子',
        role: '企画運営',
        grade: '2年B組',
        message: 'イベント企画を通じて、みんなが楽しめる学校生活を作ることが私の使命です。新しいアイデアをお待ちしています！',
        longMessage: '副会長として、主に学校行事の企画・運営を担当しています。文化祭、体育祭、卒業式など、皆さんの思い出に残る素晴らしいイベントを作ることが私の目標です。創造力豊かなアイデアと実行力で、学校生活をより彩り豊かにしていきたいと思います。',
        image: null,
        responsibilities: [
            '学校行事の企画・運営',
            '委員会間の連絡調整',
            'イベント予算の管理等',
            '外部団体との連携',
            '広報活動の企画'
        ],
        achievements: [
            {
                title: '文化祭来場者数記録更新',
                description: '新しい企画により来場者数が過去最高を記録',
                date: '2024年10月'
            },
            {
                title: '生徒交流イベント開催',
                description: '他校との交流イベントを企画・実施',
                date: '2024年7月'
            }
        ],
        hobbies: ['音楽', 'イラスト', '映画鑑賞'],
        motto: '創造力で未来を切り開く',
        joinDate: '2023年4月'
    },
    '3': {
        id: 3,
        name: '書記 鈴木一郎',
        role: '議事録作成・情報管理',
        grade: '2年C組',
        message: '透明性のある活動を目指し、正確な情報管理に努めています。皆さんに分かりやすい情報発信を心がけています。',
        longMessage: '書記として、生徒会の活動記録や情報管理を担当しています。会議の議事録作成、資料整理、情報の整理・発信など、生徒会活動の記録係として重要な役割を果たしています。透明性のある組織運営を支え、皆さんに正確で分かりやすい情報をお届けします。',
        image: null,
        responsibilities: [
            '会議の議事録作成',
            '資料・文書の管理',
            '情報の整理・発信',
            'ポータルサイトの更新',
            '各種報告書の作成'
        ],
        achievements: [
            {
                title: '議事録システムの効率化',
                description: 'デジタル化により議事録作成時間を50%短縮',
                date: '2024年5月'
            },
            {
                title: '情報公開制度の導入',
                description: '生徒会活動の透明性を高める仕組みを構築',
                date: '2024年8月'
            }
        ],
        hobbies: ['写真', '文章執筆', 'パソコン'],
        motto: '正確性と効率性の両立',
        joinDate: '2023年9月'
    },
    '4': {
        id: 4,
        name: '会計 佐藤美咲',
        role: '予算管理・会計',
        grade: '1年D組',
        message: '予算を有効活用し、生徒会活動をしっかりと支えます。お金の使い方について透明性を保ち、説明責任を果たします。',
        longMessage: '会計として、生徒会の予算管理と会計業務を担当しています。限られた予算の中で最大の効果を得られるよう、計画的で効率的な資金運用を心がけています。また、予算の使途について透明性を保ち、定期的に収支報告を行っています。皆さんからの貴重な予算を大切に使わせていただきます。',
        image: null,
        responsibilities: [
            '予算の策定・管理',
            '収支の記録・報告',
            '支出の承認・監査',
            '会計資料の作成',
            '予算執行の効率化'
        ],
        achievements: [
            {
                title: '予算管理システムの導入',
                description: 'デジタル家計簿システムで収支管理を効率化',
                date: '2024年11月'
            },
            {
                title: '予算削減プロジェクト',
                description: '無駄な支出を見直し、年間予算の10%を削減',
                date: '2024年12月'
            }
        ],
        hobbies: ['数学', '料理', 'ゲーム'],
        motto: '一円を笑う者は一円に泣く',
        joinDate: '2024年4月'
    }
};

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
                        joinDate: member.created_at || new Date().toISOString()
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
        
        // ページタイトルを更新
        document.title = `${member.name} - なずなポータル`;
        
        // ヘッダー情報を表示
        displayMemberHero(member);
        
        // 詳細情報を表示
        displayMemberProfile(member);
        displayMemberMessage(member);
        displayMemberResponsibilities(member);
        displayMemberAchievements(member);
        
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
                ${member.image ? 
                    `<img src="${member.image}" alt="${member.name}" class="member-image">` :
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

// プロフィール表示
function displayMemberProfile(member) {
    const profileContainer = document.getElementById('profile-content');
    if (!profileContainer) return;
    
    profileContainer.innerHTML = `
        <div class="profile-grid">
            <div class="profile-item">
                <div class="profile-label">
                    <i class="fas fa-graduation-cap"></i>
                    学年・クラス
                </div>
                <div class="profile-value">${member.grade}</div>
            </div>
            <div class="profile-item">
                <div class="profile-label">
                    <i class="fas fa-calendar-plus"></i>
                    活動開始
                </div>
                <div class="profile-value">${formatJoinDate(member.joinDate)}</div>
            </div>
            <div class="profile-item">
                <div class="profile-label">
                    <i class="fas fa-heart"></i>
                    趣味
              </div>
              <div class="profile-value">
                  ${member.hobbies.map(hobby => `<span class="hobby-tag">${hobby}</span>`).join('')}
              </div>
          </div>
          <div class="profile-item">
              <div class="profile-label">
                  <i class="fas fa-star"></i>
                  座右の銘
              </div>
              <div class="profile-value">"${member.motto}"</div>
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
                    ${member.image ? 
                        `<img src="${member.image}" alt="${member.name}">` :
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
