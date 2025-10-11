/**
 * 高度なキャッシュ管理システム
 * 複数レベルのキャッシュ戦略を実装
 */

class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.indexedDBCache = null;
        this.serviceWorkerCache = null;
        this.cacheStrategies = new Map();
        this.cacheConfig = {
            memory: {
                maxSize: 100,
                ttl: 5 * 60 * 1000, // 5分
                cleanupInterval: 60 * 1000 // 1分
            },
            indexedDB: {
                dbName: 'NazunaPortalCache',
                version: 1,
                stores: ['api', 'images', 'pages', 'assets'],
                ttl: 24 * 60 * 60 * 1000 // 24時間
            },
            serviceWorker: {
                cacheName: 'nazuna-portal-optimized-v30',
                strategies: {
                    'api': 'network-first',
                    'images': 'cache-first',
                    'pages': 'stale-while-revalidate',
                    'assets': 'cache-first'
                }
            }
        };
        
        this.init();
    }
    
    async init() {
        await this.initIndexedDB();
        this.initMemoryCache();
        this.initServiceWorkerCache();
        this.startCleanupTimer();
    }
    
    // ========================================
    // IndexedDB キャッシュ
    // ========================================
    
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(
                this.cacheConfig.indexedDB.dbName,
                this.cacheConfig.indexedDB.version
            );
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.indexedDBCache = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // ストアの作成
                this.cacheConfig.indexedDB.stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'key' });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('ttl', 'ttl', { unique: false });
                    }
                });
            };
        });
    }
    
    async setIndexedDBCache(store, key, data, ttl = null) {
        if (!this.indexedDBCache) return false;
        
        try {
            const transaction = this.indexedDBCache.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            
            const cacheItem = {
                key,
                data,
                timestamp: Date.now(),
                ttl: ttl || this.cacheConfig.indexedDB.ttl
            };
            
            await objectStore.put(cacheItem);
            return true;
        } catch (error) {
            console.error('IndexedDB cache set error:', error);
            return false;
        }
    }
    
    async getIndexedDBCache(store, key) {
        if (!this.indexedDBCache) return null;
        
        try {
            const transaction = this.indexedDBCache.transaction([store], 'readonly');
            const objectStore = transaction.objectStore(store);
            const request = objectStore.get(key);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (!result) {
                        resolve(null);
                        return;
                    }
                    
                    // TTLチェック
                    if (Date.now() - result.timestamp > result.ttl) {
                        // 期限切れの場合は削除
                        this.deleteIndexedDBCache(store, key);
                        resolve(null);
                        return;
                    }
                    
                    resolve(result.data);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('IndexedDB cache get error:', error);
            return null;
        }
    }
    
    async deleteIndexedDBCache(store, key) {
        if (!this.indexedDBCache) return false;
        
        try {
            const transaction = this.indexedDBCache.transaction([store], 'readwrite');
            const objectStore = transaction.objectStore(store);
            await objectStore.delete(key);
            return true;
        } catch (error) {
            console.error('IndexedDB cache delete error:', error);
            return false;
        }
    }
    
    async clearIndexedDBCache(store = null) {
        if (!this.indexedDBCache) return false;
        
        try {
            const stores = store ? [store] : this.cacheConfig.indexedDB.stores;
            
            for (const storeName of stores) {
                const transaction = this.indexedDBCache.transaction([storeName], 'readwrite');
                const objectStore = transaction.objectStore(storeName);
                await objectStore.clear();
            }
            
            return true;
        } catch (error) {
            console.error('IndexedDB cache clear error:', error);
            return false;
        }
    }
    
    // ========================================
    // メモリキャッシュ
    // ========================================
    
    initMemoryCache() {
        // メモリキャッシュの初期化
        this.memoryCache.clear();
    }
    
    setMemoryCache(key, data, ttl = null) {
        const cacheItem = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.cacheConfig.memory.ttl
        };
        
        this.memoryCache.set(key, cacheItem);
        
        // サイズ制限チェック
        if (this.memoryCache.size > this.cacheConfig.memory.maxSize) {
            this.cleanupMemoryCache();
        }
    }
    
    getMemoryCache(key) {
        const cacheItem = this.memoryCache.get(key);
        if (!cacheItem) return null;
        
        // TTLチェック
        if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
            this.memoryCache.delete(key);
            return null;
        }
        
        return cacheItem.data;
    }
    
    deleteMemoryCache(key) {
        return this.memoryCache.delete(key);
    }
    
    cleanupMemoryCache() {
        const now = Date.now();
        const entries = Array.from(this.memoryCache.entries());
        
        // TTL切れのエントリを削除
        entries.forEach(([key, item]) => {
            if (now - item.timestamp > item.ttl) {
                this.memoryCache.delete(key);
            }
        });
        
        // サイズ制限を超える場合は古いエントリから削除
        if (this.memoryCache.size > this.cacheConfig.memory.maxSize) {
            const sortedEntries = entries
                .filter(([key, item]) => now - item.timestamp <= item.ttl)
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toDelete = sortedEntries.slice(0, 
                this.memoryCache.size - this.cacheConfig.memory.maxSize
            );
            
            toDelete.forEach(([key]) => {
                this.memoryCache.delete(key);
            });
        }
    }
    
    // ========================================
    // Service Worker キャッシュ
    // ========================================
    
    initServiceWorkerCache() {
        if ('serviceWorker' in navigator && 'caches' in window) {
            this.serviceWorkerCache = caches.open(this.cacheConfig.serviceWorker.cacheName);
        }
    }
    
    async setServiceWorkerCache(url, data, strategy = 'cache-first') {
        if (!this.serviceWorkerCache) return false;
        
        try {
            const cache = await this.serviceWorkerCache;
            const response = new Response(JSON.stringify(data), {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'max-age=3600'
                }
            });
            
            await cache.put(url, response);
            return true;
        } catch (error) {
            console.error('Service Worker cache set error:', error);
            return false;
        }
    }
    
    async getServiceWorkerCache(url) {
        if (!this.serviceWorkerCache) return null;
        
        try {
            const cache = await this.serviceWorkerCache;
            const response = await cache.match(url);
            
            if (response) {
                return await response.json();
            }
            
            return null;
        } catch (error) {
            console.error('Service Worker cache get error:', error);
            return null;
        }
    }
    
    // ========================================
    // 統合キャッシュ API
    // ========================================
    
    async set(key, data, options = {}) {
        const {
            store = 'api',
            ttl = null,
            strategy = 'memory-first',
            priority = 'normal'
        } = options;
        
        const cacheKey = `${store}:${key}`;
        
        // メモリキャッシュに保存
        this.setMemoryCache(cacheKey, data, ttl);
        
        // 優先度に応じて追加のキャッシュに保存
        if (priority === 'high' || strategy === 'persistent') {
            await this.setIndexedDBCache(store, key, data, ttl);
        }
        
        if (strategy === 'service-worker') {
            await this.setServiceWorkerCache(key, data);
        }
    }
    
    async get(key, options = {}) {
        const {
            store = 'api',
            strategy = 'memory-first'
        } = options;
        
        const cacheKey = `${store}:${key}`;
        
        // 戦略に応じてキャッシュを検索
        switch (strategy) {
            case 'memory-first':
                // メモリ → IndexedDB → Service Worker
                let data = this.getMemoryCache(cacheKey);
                if (data) return data;
                
                data = await this.getIndexedDBCache(store, key);
                if (data) {
                    this.setMemoryCache(cacheKey, data);
                    return data;
                }
                
                data = await this.getServiceWorkerCache(key);
                if (data) {
                    this.setMemoryCache(cacheKey, data);
                    return data;
                }
                break;
                
            case 'persistent-first':
                // IndexedDB → メモリ → Service Worker
                data = await this.getIndexedDBCache(store, key);
                if (data) {
                    this.setMemoryCache(cacheKey, data);
                    return data;
                }
                
                data = this.getMemoryCache(cacheKey);
                if (data) return data;
                
                data = await this.getServiceWorkerCache(key);
                if (data) {
                    this.setMemoryCache(cacheKey, data);
                    return data;
                }
                break;
                
            case 'service-worker-first':
                // Service Worker → メモリ → IndexedDB
                data = await this.getServiceWorkerCache(key);
                if (data) {
                    this.setMemoryCache(cacheKey, data);
                    return data;
                }
                
                data = this.getMemoryCache(cacheKey);
                if (data) return data;
                
                data = await this.getIndexedDBCache(store, key);
                if (data) {
                    this.setMemoryCache(cacheKey, data);
                    return data;
                }
                break;
        }
        
        return null;
    }
    
    async delete(key, options = {}) {
        const { store = 'api' } = options;
        const cacheKey = `${store}:${key}`;
        
        // すべてのキャッシュから削除
        this.deleteMemoryCache(cacheKey);
        await this.deleteIndexedDBCache(store, key);
        
        if (this.serviceWorkerCache) {
            const cache = await this.serviceWorkerCache;
            await cache.delete(key);
        }
    }
    
    async clear(options = {}) {
        const { store = null } = options;
        
        // メモリキャッシュをクリア
        if (store) {
            const keys = Array.from(this.memoryCache.keys())
                .filter(key => key.startsWith(`${store}:`));
            keys.forEach(key => this.memoryCache.delete(key));
        } else {
            this.memoryCache.clear();
        }
        
        // IndexedDBキャッシュをクリア
        await this.clearIndexedDBCache(store);
        
        // Service Workerキャッシュをクリア
        if (this.serviceWorkerCache) {
            const cache = await this.serviceWorkerCache;
            if (store) {
                const keys = await cache.keys();
                const storeKeys = keys.filter(request => 
                    request.url.includes(store)
                );
                await Promise.all(storeKeys.map(key => cache.delete(key)));
            } else {
                await cache.keys().then(keys => 
                    Promise.all(keys.map(key => cache.delete(key)))
                );
            }
        }
    }
    
    // ========================================
    // キャッシュ戦略
    // ========================================
    
    setCacheStrategy(key, strategy) {
        this.cacheStrategies.set(key, strategy);
    }
    
    getCacheStrategy(key) {
        return this.cacheStrategies.get(key) || 'memory-first';
    }
    
    // ========================================
    // 統計とモニタリング
    // ========================================
    
    getCacheStats() {
        const memoryStats = {
            size: this.memoryCache.size,
            maxSize: this.cacheConfig.memory.maxSize,
            usage: (this.memoryCache.size / this.cacheConfig.memory.maxSize) * 100
        };
        
        return {
            memory: memoryStats,
            strategies: Array.from(this.cacheStrategies.entries()),
            config: this.cacheConfig
        };
    }
    
    async getDetailedStats() {
        const stats = this.getCacheStats();
        
        // IndexedDB統計
        if (this.indexedDBCache) {
            const transaction = this.indexedDBCache.transaction(
                this.cacheConfig.indexedDB.stores, 'readonly'
            );
            
            const storeStats = {};
            for (const storeName of this.cacheConfig.indexedDB.stores) {
                const store = transaction.objectStore(storeName);
                const count = await store.count();
                storeStats[storeName] = count;
            }
            
            stats.indexedDB = storeStats;
        }
        
        return stats;
    }
    
    // ========================================
    // クリーンアップ
    // ========================================
    
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupMemoryCache();
            this.cleanupIndexedDBCache();
        }, this.cacheConfig.memory.cleanupInterval);
    }
    
    async cleanupIndexedDBCache() {
        if (!this.indexedDBCache) return;
        
        const now = Date.now();
        
        for (const storeName of this.cacheConfig.indexedDB.stores) {
            const transaction = this.indexedDBCache.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index('timestamp');
            
            const range = IDBKeyRange.upperBound(now - this.cacheConfig.indexedDB.ttl);
            const request = index.openCursor(range);
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        }
    }
    
    // ========================================
    // ユーティリティ
    // ========================================
    
    async preloadData(key, fetcher, options = {}) {
        const data = await this.get(key, options);
        if (data) return data;
        
        const freshData = await fetcher();
        await this.set(key, freshData, options);
        return freshData;
    }
    
    async invalidatePattern(pattern) {
        const memoryKeys = Array.from(this.memoryCache.keys())
            .filter(key => key.includes(pattern));
        
        memoryKeys.forEach(key => this.memoryCache.delete(key));
        
        // IndexedDBとService Workerのパターンマッチングは複雑なため、
        // 必要に応じて個別実装
    }
    
    // ========================================
    // デバッグ
    // ========================================
    
    enableDebugMode() {
        this.debugMode = true;
        console.log('Cache Manager debug mode enabled');
    }
    
    logCacheOperation(operation, key, result) {
        if (this.debugMode) {
            console.log(`[Cache] ${operation}: ${key}`, result);
        }
    }
}

// ========================================
// グローバル初期化
// ========================================

let cacheManager = null;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        cacheManager = new CacheManager();
        await cacheManager.init();
        window.cacheManager = cacheManager;
        console.log('Cache Manager initialized successfully');
    } catch (error) {
        console.error('Cache Manager initialization failed:', error);
    }
});

// ページアンロード時にクリーンアップ
window.addEventListener('beforeunload', () => {
    if (cacheManager) {
        cacheManager.cleanup();
    }
});

// グローバルに公開
window.CacheManager = CacheManager;
