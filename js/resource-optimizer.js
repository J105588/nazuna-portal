/**
 * リソース最適化マネージャー
 * 画像、フォント、その他リソースの最適化を管理
 */

class ResourceOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.fontCache = new Map();
        this.loadingQueue = new Set();
        this.observer = null;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        
        this.init();
    }
    
    init() {
        this.setupImageOptimization();
        this.setupFontOptimization();
        this.setupLazyLoading();
        this.setupPreloading();
    }
    
    // ========================================
    // 画像最適化
    // ========================================
    
    setupImageOptimization() {
        // 画像の遅延読み込み
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
            
            // 既存の画像を監視
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.observer.observe(img);
            });
        }
        
        // 画像の最適化処理
        this.optimizeImages();
    }
    
    optimizeImages() {
        const images = document.querySelectorAll('img');
        
        images.forEach(img => {
            // WebP対応チェック
            if (this.supportsWebP() && !img.src.includes('.webp')) {
                this.convertToWebP(img);
            }
            
            // レスポンシブ画像の設定
            this.setupResponsiveImage(img);
            
            // 画像のプリロード
            if (img.dataset.preload === 'true') {
                this.preloadImage(img.src);
            }
        });
    }
    
    async loadImage(img) {
        if (this.loadingQueue.has(img.src)) {
            return;
        }
        
        this.loadingQueue.add(img.src);
        
        try {
            const src = img.dataset.src || img.src;
            const optimizedSrc = await this.getOptimizedImageUrl(src);
            
            // 画像の読み込み
            const imageLoader = new Image();
            imageLoader.onload = () => {
                img.src = optimizedSrc;
                img.classList.add('loaded');
                img.classList.remove('loading');
                this.loadingQueue.delete(img.src);
            };
            
            imageLoader.onerror = () => {
                console.warn('Failed to load image:', src);
                img.classList.add('error');
                img.classList.remove('loading');
                this.loadingQueue.delete(img.src);
            };
            
            img.classList.add('loading');
            imageLoader.src = optimizedSrc;
            
        } catch (error) {
            console.error('Image loading error:', error);
            img.classList.add('error');
            img.classList.remove('loading');
            this.loadingQueue.delete(img.src);
        }
    }
    
    async getOptimizedImageUrl(originalUrl) {
        // キャッシュチェック
        if (this.imageCache.has(originalUrl)) {
            return this.imageCache.get(originalUrl);
        }
        
        let optimizedUrl = originalUrl;
        
        // WebP変換
        if (this.supportsWebP() && !originalUrl.includes('.webp')) {
            optimizedUrl = originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
        
        // サイズ最適化（必要に応じて）
        if (this.shouldResizeImage(originalUrl)) {
            optimizedUrl = this.addResizeParams(optimizedUrl);
        }
        
        // キャッシュに保存
        this.imageCache.set(originalUrl, optimizedUrl);
        
        return optimizedUrl;
    }
    
    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    
    shouldResizeImage(url) {
        // 特定の条件でリサイズが必要かチェック
        return url.includes('images/') && !url.includes('icon');
    }
    
    addResizeParams(url, width = 800, quality = 80) {
        // 画像リサイズパラメータを追加（実装に応じて調整）
        const params = new URLSearchParams();
        params.set('w', width.toString());
        params.set('q', quality.toString());
        
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}${params.toString()}`;
    }
    
    async convertToWebP(img) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const image = new Image();
            
            image.crossOrigin = 'anonymous';
            
            image.onload = () => {
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const webpUrl = URL.createObjectURL(blob);
                        img.src = webpUrl;
                    }
                }, 'image/webp', 0.8);
            };
            
            image.src = img.src;
        } catch (error) {
            console.warn('WebP conversion failed:', error);
        }
    }
    
    setupResponsiveImage(img) {
        // レスポンシブ画像の設定
        if (!img.srcset) {
            const src = img.src;
            const baseName = src.replace(/\.[^/.]+$/, '');
            const extension = src.split('.').pop();
            
            img.srcset = `
                ${baseName}-320w.${extension} 320w,
                ${baseName}-640w.${extension} 640w,
                ${baseName}-1024w.${extension} 1024w
            `;
            img.sizes = '(max-width: 320px) 320px, (max-width: 640px) 640px, 1024px';
        }
    }
    
    // ========================================
    // フォント最適化
    // ========================================
    
    setupFontOptimization() {
        // フォントのプリロード
        this.preloadFonts();
        
        // フォント読み込み状態の監視
        this.monitorFontLoading();
    }
    
    preloadFonts() {
        const fontUrls = [
            'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap'
        ];
        
        fontUrls.forEach(url => {
            if (!this.fontCache.has(url)) {
                this.preloadResource(url, 'style');
                this.fontCache.set(url, true);
            }
        });
    }
    
    monitorFontLoading() {
        if ('fonts' in document) {
            document.fonts.ready.then(() => {
                console.log('Fonts loaded successfully');
                document.body.classList.add('fonts-loaded');
            });
        }
    }
    
    // ========================================
    // 遅延読み込み
    // ========================================
    
    setupLazyLoading() {
        // 遅延読み込み対象の要素を監視
        if ('IntersectionObserver' in window) {
            const lazyObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyContent(entry.target);
                        lazyObserver.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '100px 0px',
                threshold: 0.1
            });
            
            // 遅延読み込み対象を監視
            document.querySelectorAll('[data-lazy]').forEach(element => {
                lazyObserver.observe(element);
            });
        }
    }
    
    loadLazyContent(element) {
        const lazyType = element.dataset.lazy;
        
        switch (lazyType) {
            case 'image':
                this.loadImage(element);
                break;
            case 'script':
                this.loadScript(element.dataset.src);
                break;
            case 'style':
                this.loadStyle(element.dataset.href);
                break;
            case 'content':
                this.loadContent(element);
                break;
        }
    }
    
    async loadScript(src) {
        if (document.querySelector(`script[src="${src}"]`)) {
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async loadStyle(href) {
        if (document.querySelector(`link[href="${href}"]`)) {
            return;
        }
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }
    
    async loadContent(element) {
        const src = element.dataset.src;
        if (!src) return;
        
        try {
            const response = await fetch(src);
            const content = await response.text();
            element.innerHTML = content;
            element.classList.add('loaded');
        } catch (error) {
            console.error('Failed to load content:', error);
            element.classList.add('error');
        }
    }
    
    // ========================================
    // プリロード
    // ========================================
    
    setupPreloading() {
        // 重要なリソースをプリロード
        this.preloadCriticalResources();
        
        // ユーザー行動に基づくプリロード
        this.setupPredictivePreloading();
    }
    
    preloadCriticalResources() {
        const criticalResources = [
            { href: 'css/style-optimized.css', as: 'style' },
            { href: 'js/app-optimized.js', as: 'script' },
            { href: 'images/icon-192x192.png', as: 'image' }
        ];
        
        criticalResources.forEach(resource => {
            this.preloadResource(resource.href, resource.as);
        });
    }
    
    preloadResource(href, as) {
        if (document.querySelector(`link[href="${href}"]`)) {
            return;
        }
        
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        
        if (as === 'style') {
            link.onload = () => {
                link.rel = 'stylesheet';
            };
        }
        
        document.head.appendChild(link);
    }
    
    setupPredictivePreloading() {
        // リンクホバー時のプリロード
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.shouldPreloadLink(link)) {
                this.preloadLink(link);
            }
        });
    }
    
    shouldPreloadLink(link) {
        const href = link.href;
        const isInternal = href.startsWith(window.location.origin);
        const isHtml = href.endsWith('.html') || href.endsWith('/');
        
        return isInternal && isHtml;
    }
    
    preloadLink(link) {
        const href = link.href;
        
        if (this.loadingQueue.has(href)) {
            return;
        }
        
        this.loadingQueue.add(href);
        
        // ページのプリロード
        fetch(href, { method: 'HEAD' })
            .then(() => {
                // 成功時は実際のコンテンツをプリロード
                this.preloadResource(href, 'document');
            })
            .catch(() => {
                // エラー時は何もしない
            })
            .finally(() => {
                this.loadingQueue.delete(href);
            });
    }
    
    // ========================================
    // パフォーマンス監視
    // ========================================
    
    measureResourcePerformance() {
        const resources = performance.getEntriesByType('resource');
        const resourceMetrics = {
            totalResources: resources.length,
            totalSize: 0,
            loadTime: 0,
            byType: {}
        };
        
        resources.forEach(resource => {
            resourceMetrics.totalSize += resource.transferSize || 0;
            resourceMetrics.loadTime += resource.duration;
            
            const type = resource.initiatorType;
            if (!resourceMetrics.byType[type]) {
                resourceMetrics.byType[type] = {
                    count: 0,
                    size: 0,
                    loadTime: 0
                };
            }
            
            resourceMetrics.byType[type].count++;
            resourceMetrics.byType[type].size += resource.transferSize || 0;
            resourceMetrics.byType[type].loadTime += resource.duration;
        });
        
        return resourceMetrics;
    }
    
    // ========================================
    // クリーンアップ
    // ========================================
    
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.imageCache.clear();
        this.fontCache.clear();
        this.loadingQueue.clear();
        this.retryAttempts.clear();
    }
    
    // ========================================
    // ユーティリティ
    // ========================================
    
    async preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    getLoadingQueue() {
        return Array.from(this.loadingQueue);
    }
    
    getCacheStats() {
        return {
            imageCache: this.imageCache.size,
            fontCache: this.fontCache.size,
            loadingQueue: this.loadingQueue.size
        };
    }
}

// ========================================
// グローバル初期化
// ========================================

let resourceOptimizer = null;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    resourceOptimizer = new ResourceOptimizer();
    window.resourceOptimizer = resourceOptimizer;
});

// ページアンロード時にクリーンアップ
window.addEventListener('beforeunload', () => {
    if (resourceOptimizer) {
        resourceOptimizer.cleanup();
    }
});

// グローバルに公開
window.ResourceOptimizer = ResourceOptimizer;
