// メンバー詳細ページ用JavaScript

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
            'イベント予算の管理',
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
        longMessage: '書記として、生徒会の活動記録や情報管理を担当しています。会議の議事録作成、資料整理、情報の整理・発信など、生徒会活動の「記録係」として重要な役割を果たしています。透明性のある組織運営を支え、皆さんに正確で分かりやすい情報をお届けします。',
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
    console.log('Member detail page initializing...');
    
    // 基本機能を初期化
    initNavigation();
    initSidebar();
    
    // メンバー詳細を読み込み
    loadMemberDetail();
    
    // 他のメンバーリストを読み込み
    loadOtherMembers();
});

// メンバー詳細読み込み
function loadMemberDetail() {
    const memberId = getMemberIdFromURL();
    const member = membersData[memberId];
    
    if (!member) {
        showMemberNotFound();
        return;
    }
    
    // ページタイトルを更新
    document.title = `${member.name} - 生徒会ポータルサイト`;
    
    // ヘッダー情報を表示
    displayMemberHero(member);
    
    // 詳細情報を表示
    displayMemberProfile(member);
    displayMemberMessage(member);
    displayMemberResponsibilities(member);
    displayMemberAchievements(member);
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
    
    achievementsContainer.innerHTML = `
        <div class="achievements-timeline">
            ${member.achievements.map(achievement => `
                <div class="achievement-item">
                    <div class="achievement-date">
                        <i class="fas fa-calendar"></i>
                        ${achievement.date}
                    </div>
                    <div class="achievement-content">
                        <h4>${achievement.title}</h4>
                        <p>${achievement.description}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 他のメンバー表示
function loadOtherMembers() {
    const otherMembersContainer = document.getElementById('other-members');
    if (!otherMembersContainer) return;
    
    const currentMemberId = getMemberIdFromURL();
    const otherMembers = Object.values(membersData).filter(member => member.id.toString() !== currentMemberId);
    
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

// 生徒会ページのメンバーカードにクリックイベントを追加する関数
function makeCouncilMembersClickable() {
    const memberCards = document.querySelectorAll('.member-card');
    
    memberCards.forEach((card, index) => {
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.3s ease';
        
        // ホバー効果を強化
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '';
        });
        
        // クリックイベント
        card.addEventListener('click', function() {
            const memberId = index + 1; // インデックスベースでIDを決定
            window.location.href = `member-detail.html?id=${memberId}`;
        });
        
        // アクセシビリティのためのキーボード操作
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `${card.querySelector('h3').textContent}の詳細を見る`);
        
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

// 生徒会ページでこの関数を呼び出すために、グローバルに公開
window.makeCouncilMembersClickable = makeCouncilMembersClickable;

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
