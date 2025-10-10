// ニュース記事の動的読み込みシステム
class NewsLoader {
    constructor() {
        this.newsFolder = 'news/';
        this.newsList = [];
        this.filteredNews = [];
        this.currentFilters = {
            search: '',
            category: 'all',
            period: 'all'
        };
        this.categories = {
            'event': 'イベント',
            'newsletter': '月刊ぺんぺん草',
            'recruitment': '募集',
            'important': '重要',
            'general': 'お知らせ'
        };
    }

    // ニュース一覧を取得
    async loadNewsList() {
        try {
            // まずは manifest (news/index.json) を試す
            let newsFiles = [];
            try {
                const manifestResponse = await fetch(this.newsFolder + 'index.json', { cache: 'no-cache' });
                if (manifestResponse.ok) {
                    const list = await manifestResponse.json();
                    if (Array.isArray(list) && list.length) {
                        newsFiles = list.map(file => `${this.newsFolder}${file}`);
                    }
                }
            } catch (e) {
                // manifest が無い場合は後続のフォールバックへ
            }

            // フォールバック: ディレクトリ一覧のパース（サーバ設定に依存）
            if (newsFiles.length === 0) {
                const response = await fetch(this.newsFolder);
                if (!response.ok) {
                    throw new Error('ニュースフォルダにアクセスできません');
                }
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const links = doc.querySelectorAll('a[href$=".html"]');
                newsFiles = Array.from(links).map(link => link.href);
            }
            
            // 各ニュースファイルのメタデータを取得
            const newsPromises = newsFiles.map(file => this.getNewsMetadata(file));
            const newsData = await Promise.all(newsPromises);
            
            // 日付順でソート（新しい順）
            this.newsList = newsData
                .filter(news => news !== null)
                .sort((a, b) => {
                    const dateA = this.parseDate(a.date);
                    const dateB = this.parseDate(b.date);
                    return dateB - dateA; // 新しい順
                });
            
            return this.newsList;
        } catch (error) {
            console.error('ニュース一覧の読み込みに失敗しました:', error);
            return [];
        }
    }

    // 個別のニュースファイルからメタデータを取得
    async getNewsMetadata(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                return null;
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // メタデータを抽出
            const title = doc.querySelector('.news-title')?.textContent?.trim() || 'タイトル不明';
            
            // カテゴリを抽出（class属性から）
            const categoryElement = doc.querySelector('.news-category');
            let category = 'general';
            if (categoryElement) {
                // class属性からカテゴリを取得
                const classList = categoryElement.className.split(' ');
                const categoryClass = classList.find(cls => cls !== 'news-category');
                if (categoryClass) {
                    category = categoryClass;
                } else {
                    // フォールバック：テキスト内容からカテゴリを推測
                    const categoryText = categoryElement.textContent?.trim();
                    if (categoryText === 'イベント') category = 'event';
                    else if (categoryText === '生徒会だより' || categoryText === '月刊ぺんぺん草') category = 'newsletter';
                    else if (categoryText === '重要') category = 'important';
                    else if (categoryText === '募集') category = 'recruitment';
                }
            }
            
            const date = doc.querySelector('.news-date')?.textContent?.trim() || new Date().toISOString().split('T')[0];
            const lead = doc.querySelector('.news-lead')?.textContent?.trim() || '';
            
            // ファイル名からIDを生成
            const fileName = filePath.split('/').pop().replace('.html', '');
            
            // デバッグ用ログ（本番では削除可能）
            // console.log(`News metadata extracted:`, {
            //     fileName,
            //     title,
            //     category,
            //     date,
            //     lead: lead.substring(0, 50) + '...'
            // });
            
            return {
                id: fileName,
                title: title,
                category: category,
                date: date,
                lead: lead,
                filePath: filePath
            };
        } catch (error) {
            console.error(`ニュースファイルの読み込みに失敗しました: ${filePath}`, error);
            return null;
        }
    }

    // フィルタリングを適用
    applyFilters() {
        this.filteredNews = this.newsList.filter(news => {
            // カテゴリフィルター
            if (this.currentFilters.category !== 'all' && news.category !== this.currentFilters.category) {
                return false;
            }
            
            // 検索フィルター
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const titleMatch = news.title.toLowerCase().includes(searchTerm);
                const leadMatch = news.lead.toLowerCase().includes(searchTerm);
                if (!titleMatch && !leadMatch) {
                    return false;
                }
            }
            
            // 日付フィルター
            if (this.currentFilters.period !== 'all') {
                const newsDate = this.parseDate(news.date);
                const now = new Date();
                const isWithinPeriod = this.isWithinPeriod(newsDate, now, this.currentFilters.period);
                if (!isWithinPeriod) {
                    return false;
                }
            }
            
            return true;
        });
        
        // デバッグ用（本番では削除可能）
        // console.log('Applied filters:', this.currentFilters);
        // console.log('Filtered news count:', this.filteredNews.length);
        // console.log('Available categories:', [...new Set(this.newsList.map(n => n.category))]);
    }

    // 期間内かどうかをチェック
    isWithinPeriod(newsDate, now, period) {
        if (isNaN(newsDate.getTime())) return false;

        // 未来日付は除外
        if (newsDate > now) return false;

        // 日単位での差分（時刻起点のブレを排除）
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfNews = new Date(newsDate.getFullYear(), newsDate.getMonth(), newsDate.getDate());
        const diffDays = Math.floor((startOfToday - startOfNews) / (1000 * 60 * 60 * 24));

        switch (period) {
            case 'week':
                return diffDays <= 7;
            case 'month':
                return diffDays <= 30;
            case 'year':
                return diffDays <= 365;
            default:
                return true;
        }
    }

    // ニュース一覧を表示
    renderNewsList(container) {
        if (!container) return;
        
        this.applyFilters();
        
        if (this.filteredNews.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <div class="no-data-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3>お知らせが見つかりません</h3>
                    <p>検索条件に一致するお知らせがありませんでした。フィルターを調整してお試しください。</p>
                </div>
            `;
            this.updateNewsCount(0);
            return;
        }
        
        container.innerHTML = this.filteredNews.map(news => this.renderNewsItem(news)).join('');
        this.bindCardNavigation(container);
        this.updateNewsCount(this.filteredNews.length);
    }

    // 個別のニュースアイテムをレンダリング
    renderNewsItem(news) {
        const categoryLabel = this.categories[news.category] || news.category;
        const formattedDate = this.formatDate(news.date);
        
        return `
            <div class="news-item" data-category="${news.category}" data-href="${news.filePath}" tabindex="0" role="link" aria-label="${news.title}">
                <div class="news-date">${formattedDate}</div>
                <div class="news-content">
                    <h3><a href="${news.filePath}">${news.title}</a></h3>
                    <p>${news.lead}</p>
                </div>
                <span class="news-type ${news.category}">${categoryLabel}</span>
            </div>
        `;
    }

    // ニュースカードのクリック/キーボード操作での遷移を有効化
    bindCardNavigation(container) {
        if (!container) return;
        if (container.dataset.boundNav === 'true') return;

        container.addEventListener('click', (e) => {
            const item = e.target.closest('.news-item');
            if (!item) return;
            // aタグ自体のクリックは既存ナビに任せる
            if (e.target.closest('a')) return;
            const href = item.getAttribute('data-href');
            if (href) {
                window.location.href = href;
            }
        });

        container.addEventListener('keydown', (e) => {
            const item = e.target.closest('.news-item');
            if (!item) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const href = item.getAttribute('data-href');
                if (href) {
                    window.location.href = href;
                }
            }
        });

        container.dataset.boundNav = 'true';
    }

    // 日付を解析してDateオブジェクトを返す
    parseDate(dateString) {
        try {
            // 日付文字列を正規化
            let normalizedDate = dateString;
            
            // YYYY-MM-DD形式に変換を試行
            if (dateString.includes('年') && dateString.includes('月') && dateString.includes('日')) {
                // "2024年1月15日" -> "2024-01-15"
                const match = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                if (match) {
                    const year = match[1];
                    const month = match[2].padStart(2, '0');
                    const day = match[3].padStart(2, '0');
                    normalizedDate = `${year}-${month}-${day}`;
                }
            } else if (dateString.includes('/')) {
                // "2024/1/15" -> "2024-01-15"
                const parts = dateString.split('/');
                if (parts.length === 3) {
                    const year = parts[0];
                    const month = parts[1].padStart(2, '0');
                    const day = parts[2].padStart(2, '0');
                    normalizedDate = `${year}-${month}-${day}`;
                }
            }
            
            const date = new Date(normalizedDate);
            
            // 有効な日付かチェック
            if (isNaN(date.getTime())) {
                console.warn('Invalid date for sorting:', dateString);
                return new Date(0); // 古い日付を返してソートの最後に
            }
            
            return date;
        } catch (error) {
            console.warn('Date parsing error:', error, 'for date:', dateString);
            return new Date(0); // 古い日付を返してソートの最後に
        }
    }

    // 日付をフォーマット
    formatDate(dateString) {
        try {
            const date = this.parseDate(dateString);
            
            // 有効な日付かチェック
            if (isNaN(date.getTime()) || date.getTime() === 0) {
                return dateString; // 元の文字列を返す
            }
            
            return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        } catch (error) {
            console.warn('Date formatting error:', error, 'for date:', dateString);
            return dateString;
        }
    }

    // ニュース件数を更新
    updateNewsCount(count) {
        const countElement = document.getElementById('news-count');
        if (countElement) {
            countElement.textContent = `${count}件のお知らせ`;
        }
        
        // リセットボタンの表示/非表示
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            const hasActiveFilters = this.currentFilters.search || 
                                   this.currentFilters.category !== 'all' || 
                                   this.currentFilters.period !== 'all';
            resetBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';
        }
        
        // カテゴリ別件数を更新
        this.updateCategoryCounts();
    }

    // カテゴリ別件数を更新
    updateCategoryCounts() {
        const categories = ['all', 'event', 'newsletter', 'recruitment', 'important'];
        const periods = ['all', 'week', 'month', 'year'];
        
        // カテゴリ別件数
        categories.forEach(category => {
            const count = this.getCountByCategory(category);
            const countElement = document.getElementById(`count-${category}`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
        
        // 期間別件数
        periods.forEach(period => {
            const count = this.getCountByPeriod(period);
            const countElement = document.getElementById(`count-period-${period}`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    // カテゴリ別件数を取得
    getCountByCategory(category) {
        if (category === 'all') {
            return this.newsList.length;
        }
        return this.newsList.filter(news => news.category === category).length;
    }

    // 期間別件数を取得
    getCountByPeriod(period) {
        if (period === 'all') {
            return this.newsList.length;
        }
        
        const now = new Date();
        return this.newsList.filter(news => {
            const newsDate = this.parseDate(news.date);
            return this.isWithinPeriod(newsDate, now, period);
        }).length;
    }

    // フィルターをリセット
    resetFilters() {
        this.currentFilters = {
            search: '',
            category: 'all',
            period: 'all'
        };
        
        // UIをリセット
        const searchInput = document.getElementById('news-search');
        if (searchInput) searchInput.value = '';
        
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) clearBtn.style.display = 'none';
        
        // ボタンのアクティブ状態をリセット
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === 'all') tab.classList.add('active');
        });
        
        document.querySelectorAll('.date-controls .filter-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.period === 'all') tab.classList.add('active');
        });
        
        // ニュース一覧を再表示
        const container = document.querySelector('.news-container');
        if (container) this.renderNewsList(container);
    }

    // フィルターを初期化
    initFilters() {
        // 検索ボックス
        const searchInput = document.getElementById('news-search');
        const clearBtn = document.getElementById('clear-search');
        
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value.trim();
                    // console.log('Search filter changed to:', this.currentFilters.search);
                    this.renderNewsList(document.querySelector('.news-container'));
                }, 300);
            });
            
            // 検索ボックスの表示状態を更新
            searchInput.addEventListener('input', () => {
                if (clearBtn) {
                    clearBtn.style.display = searchInput.value ? 'inline-flex' : 'none';
                }
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (searchInput) {
                    searchInput.value = '';
                    this.currentFilters.search = '';
                    clearBtn.style.display = 'none';
                    // console.log('Search cleared');
                    this.renderNewsList(document.querySelector('.news-container'));
                }
            });
        }
        
        // カテゴリフィルター（カテゴリ領域に限定）
        const categoryTabs = document.querySelectorAll('.category-controls .filter-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // アクティブ状態の切り替え
                categoryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // フィルターを更新
                this.currentFilters.category = tab.dataset.category;
                // console.log('Category filter changed to:', this.currentFilters.category);
                
                // ニュース一覧を再表示
                const container = document.querySelector('.news-container');
                if (container) {
                    this.renderNewsList(container);
                }
            });
        });
        
        // 日付フィルター
        const dateFilterTabs = document.querySelectorAll('.date-controls .filter-tab');
        dateFilterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // アクティブ状態の切り替え
                dateFilterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // フィルターを更新
                this.currentFilters.period = tab.dataset.period;
                // console.log('Period filter changed to:', this.currentFilters.period);
                
                // ニュース一覧を再表示
                const container = document.querySelector('.news-container');
                if (container) {
                    this.renderNewsList(container);
                }
            });
        });
        
        // リセットボタン
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // console.log('Resetting all filters');
                this.resetFilters();
            });
        }
    }

    // ニュース一覧を初期化
    async init() {
        const container = document.querySelector('.news-container');
        if (!container) return;
        
        // ローディング表示
        container.innerHTML = '<div class="loading">読み込み中...</div>';
        
        try {
            // ニュース一覧を読み込み
            await this.loadNewsList();
            
            // フィルターを初期化
            this.initFilters();
            
            // ニュース一覧を表示
            this.renderNewsList(container);
            
        } catch (error) {
            console.error('ニュースの初期化に失敗しました:', error);
            container.innerHTML = `
                <div class="no-data-message">
                    <div class="no-data-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>読み込みエラー</h3>
                    <p>お知らせの読み込みに失敗しました。ページを再読み込みしてください。</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i>
                        再読み込み
                    </button>
                </div>
            `;
        }
    }
}

// グローバルに公開
window.NewsLoader = NewsLoader;
