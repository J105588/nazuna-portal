/**
 * パフォーマンステストツール
 * 最適化の効果を測定・比較
 */

class PerformanceTester {
    constructor() {
        this.metrics = new Map();
        this.baselineMetrics = new Map();
        this.testResults = new Map();
        this.isRunning = false;
        
        this.init();
    }
    
    init() {
        this.setupPerformanceObserver();
        this.setupResourceTiming();
        this.setupNavigationTiming();
    }
    
    // ========================================
    // パフォーマンス測定
    // ========================================
    
    async runPerformanceTest(testName = 'default') {
        if (this.isRunning) {
            console.warn('Performance test is already running');
            return;
        }
        
        this.isRunning = true;
        console.log(`Starting performance test: ${testName}`);
        
        try {
            // テスト前の状態を記録
            const beforeMetrics = await this.collectCurrentMetrics();
            
            // ページ読み込み時間の測定
            const loadTime = await this.measurePageLoadTime();
            
            // リソース読み込み時間の測定
            const resourceMetrics = await this.measureResourceLoadTimes();
            
            // API応答時間の測定
            const apiMetrics = await this.measureAPIPerformance();
            
            // メモリ使用量の測定
            const memoryMetrics = await this.measureMemoryUsage();
            
            // レンダリング性能の測定
            const renderingMetrics = await this.measureRenderingPerformance();
            
            // テスト結果をまとめる
            const testResult = {
                testName,
                timestamp: new Date().toISOString(),
                beforeMetrics,
                loadTime,
                resourceMetrics,
                apiMetrics,
                memoryMetrics,
                renderingMetrics,
                summary: this.generateSummary({
                    loadTime,
                    resourceMetrics,
                    apiMetrics,
                    memoryMetrics,
                    renderingMetrics
                })
            };
            
            this.testResults.set(testName, testResult);
            
            console.log('Performance test completed:', testResult.summary);
            return testResult;
            
        } catch (error) {
            console.error('Performance test failed:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }
    
    // ========================================
    // 個別メトリクス測定
    // ========================================
    
    async measurePageLoadTime() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve(this.getNavigationTiming());
            } else {
                window.addEventListener('load', () => {
                    resolve(this.getNavigationTiming());
                });
            }
        });
    }
    
    getNavigationTiming() {
        const navigation = performance.getEntriesByType('navigation')[0];
        
        if (!navigation) {
            return {
                domContentLoaded: 0,
                loadComplete: 0,
                firstPaint: 0,
                firstContentfulPaint: 0,
                largestContentfulPaint: 0,
                firstInputDelay: 0,
                cumulativeLayoutShift: 0
            };
        }
        
        // Core Web Vitals
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        
        return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: firstPaint ? firstPaint.startTime : 0,
            firstContentfulPaint: firstContentfulPaint ? firstContentfulPaint.startTime : 0,
            totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            domComplete: navigation.domComplete - navigation.fetchStart
        };
    }
    
    async measureResourceLoadTimes() {
        const resources = performance.getEntriesByType('resource');
        const resourceMetrics = {
            totalResources: resources.length,
            totalSize: 0,
            totalLoadTime: 0,
            byType: {},
            slowestResources: [],
            failedResources: []
        };
        
        resources.forEach(resource => {
            const size = resource.transferSize || 0;
            const loadTime = resource.duration;
            
            resourceMetrics.totalSize += size;
            resourceMetrics.totalLoadTime += loadTime;
            
            // タイプ別の集計
            const type = resource.initiatorType;
            if (!resourceMetrics.byType[type]) {
                resourceMetrics.byType[type] = {
                    count: 0,
                    size: 0,
                    loadTime: 0,
                    averageLoadTime: 0
                };
            }
            
            resourceMetrics.byType[type].count++;
            resourceMetrics.byType[type].size += size;
            resourceMetrics.byType[type].loadTime += loadTime;
            
            // 遅いリソースの記録
            if (loadTime > 1000) { // 1秒以上
                resourceMetrics.slowestResources.push({
                    name: resource.name,
                    type: type,
                    loadTime: loadTime,
                    size: size
                });
            }
            
            // 失敗したリソースの記録
            if (resource.transferSize === 0 && resource.decodedBodySize === 0) {
                resourceMetrics.failedResources.push({
                    name: resource.name,
                    type: type
                });
            }
        });
        
        // 平均読み込み時間を計算
        Object.keys(resourceMetrics.byType).forEach(type => {
            const typeData = resourceMetrics.byType[type];
            typeData.averageLoadTime = typeData.loadTime / typeData.count;
        });
        
        // 遅いリソースをソート
        resourceMetrics.slowestResources.sort((a, b) => b.loadTime - a.loadTime);
        
        return resourceMetrics;
    }
    
    async measureAPIPerformance() {
        // API呼び出しのパフォーマンスを測定
        const apiMetrics = {
            totalCalls: 0,
            totalTime: 0,
            averageTime: 0,
            slowestCalls: [],
            failedCalls: 0,
            cacheHitRate: 0
        };
        
        // 実際のAPI呼び出しを監視するためのプロキシ
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const startTime = performance.now();
                apiMetrics.totalCalls++;
                
                try {
                    const response = await originalFetch(...args);
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    apiMetrics.totalTime += duration;
                    
                    if (duration > 2000) { // 2秒以上
                        apiMetrics.slowestCalls.push({
                            url: args[0],
                            duration: duration,
                            status: response.status
                        });
                    }
                    
                    if (!response.ok) {
                        apiMetrics.failedCalls++;
                    }
                    
                    return response;
                } catch (error) {
                    apiMetrics.failedCalls++;
                    throw error;
                }
            };
        }
        
        // キャッシュヒット率の計算（実装に応じて調整）
        if (window.cacheManager) {
            const cacheStats = window.cacheManager.getCacheStats();
            apiMetrics.cacheHitRate = cacheStats.memory.usage || 0;
        }
        
        return apiMetrics;
    }
    
    async measureMemoryUsage() {
        const memoryMetrics = {
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0,
            memoryPressure: 'normal'
        };
        
        if (performance.memory) {
            memoryMetrics.usedJSHeapSize = performance.memory.usedJSHeapSize;
            memoryMetrics.totalJSHeapSize = performance.memory.totalJSHeapSize;
            memoryMetrics.jsHeapSizeLimit = performance.memory.jsHeapSizeLimit;
            
            // メモリ圧迫度の判定
            const usageRatio = memoryMetrics.usedJSHeapSize / memoryMetrics.jsHeapSizeLimit;
            if (usageRatio > 0.9) {
                memoryMetrics.memoryPressure = 'high';
            } else if (usageRatio > 0.7) {
                memoryMetrics.memoryPressure = 'medium';
            }
        }
        
        return memoryMetrics;
    }
    
    async measureRenderingPerformance() {
        const renderingMetrics = {
            fps: 0,
            frameDrops: 0,
            layoutShifts: 0,
            paintTime: 0
        };
        
        // FPS測定
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFPS = (currentTime) => {
            frameCount++;
            if (currentTime - lastTime >= 1000) {
                renderingMetrics.fps = frameCount;
                frameCount = 0;
                lastTime = currentTime;
            }
            requestAnimationFrame(measureFPS);
        };
        
        // 1秒間FPSを測定
        requestAnimationFrame(measureFPS);
        
        // Layout Shift測定
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.hadRecentInput) continue;
                        renderingMetrics.layoutShifts += entry.value;
                    }
                });
                observer.observe({ entryTypes: ['layout-shift'] });
            } catch (error) {
                console.warn('Layout Shift measurement not supported:', error);
            }
        }
        
        return renderingMetrics;
    }
    
    // ========================================
    // パフォーマンス監視
    // ========================================
    
    setupPerformanceObserver() {
        if (!('PerformanceObserver' in window)) {
            console.warn('PerformanceObserver not supported');
            return;
        }
        
        // Long Task監視
        try {
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    console.warn('Long task detected:', {
                        duration: entry.duration,
                        startTime: entry.startTime,
                        name: entry.name
                    });
                }
            });
            longTaskObserver.observe({ entryTypes: ['longtask'] });
        } catch (error) {
            console.warn('Long task observation not supported:', error);
        }
        
        // Paint監視
        try {
            const paintObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.set(entry.name, entry.startTime);
                }
            });
            paintObserver.observe({ entryTypes: ['paint'] });
        } catch (error) {
            console.warn('Paint observation not supported:', error);
        }
    }
    
    setupResourceTiming() {
        // リソース読み込み完了時の処理
        window.addEventListener('load', () => {
            const resources = performance.getEntriesByType('resource');
            resources.forEach(resource => {
                this.metrics.set(`resource_${resource.name}`, resource.duration);
            });
        });
    }
    
    setupNavigationTiming() {
        // ナビゲーションタイミングの記録
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.metrics.set('navigation', {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
                });
            }
        });
    }
    
    // ========================================
    // ベースライン測定
    // ========================================
    
    async measureBaseline() {
        console.log('Measuring baseline performance...');
        
        const baseline = await this.runPerformanceTest('baseline');
        this.baselineMetrics = baseline;
        
        console.log('Baseline performance measured:', baseline.summary);
        return baseline;
    }
    
    async compareWithBaseline(testName = 'current') {
        if (!this.baselineMetrics) {
            console.warn('No baseline metrics available. Run measureBaseline() first.');
            return null;
        }
        
        const current = await this.runPerformanceTest(testName);
        const comparison = this.compareMetrics(this.baselineMetrics, current);
        
        console.log('Performance comparison:', comparison);
        return comparison;
    }
    
    compareMetrics(baseline, current) {
        const comparison = {
            testName: current.testName,
            timestamp: current.timestamp,
            improvements: [],
            regressions: [],
            summary: {}
        };
        
        // 読み込み時間の比較
        if (current.loadTime.totalLoadTime < baseline.loadTime.totalLoadTime) {
            const improvement = ((baseline.loadTime.totalLoadTime - current.loadTime.totalLoadTime) / baseline.loadTime.totalLoadTime) * 100;
            comparison.improvements.push({
                metric: 'Total Load Time',
                improvement: `${improvement.toFixed(1)}%`,
                baseline: baseline.loadTime.totalLoadTime,
                current: current.loadTime.totalLoadTime
            });
        } else {
            const regression = ((current.loadTime.totalLoadTime - baseline.loadTime.totalLoadTime) / baseline.loadTime.totalLoadTime) * 100;
            comparison.regressions.push({
                metric: 'Total Load Time',
                regression: `${regression.toFixed(1)}%`,
                baseline: baseline.loadTime.totalLoadTime,
                current: current.loadTime.totalLoadTime
            });
        }
        
        // リソース読み込み時間の比較
        if (current.resourceMetrics.totalLoadTime < baseline.resourceMetrics.totalLoadTime) {
            const improvement = ((baseline.resourceMetrics.totalLoadTime - current.resourceMetrics.totalLoadTime) / baseline.resourceMetrics.totalLoadTime) * 100;
            comparison.improvements.push({
                metric: 'Resource Load Time',
                improvement: `${improvement.toFixed(1)}%`,
                baseline: baseline.resourceMetrics.totalLoadTime,
                current: current.resourceMetrics.totalLoadTime
            });
        }
        
        // メモリ使用量の比較
        if (current.memoryMetrics.usedJSHeapSize < baseline.memoryMetrics.usedJSHeapSize) {
            const improvement = ((baseline.memoryMetrics.usedJSHeapSize - current.memoryMetrics.usedJSHeapSize) / baseline.memoryMetrics.usedJSHeapSize) * 100;
            comparison.improvements.push({
                metric: 'Memory Usage',
                improvement: `${improvement.toFixed(1)}%`,
                baseline: baseline.memoryMetrics.usedJSHeapSize,
                current: current.memoryMetrics.usedJSHeapSize
            });
        }
        
        // サマリーの生成
        comparison.summary = {
            totalImprovements: comparison.improvements.length,
            totalRegressions: comparison.regressions.length,
            overallScore: this.calculateOverallScore(comparison)
        };
        
        return comparison;
    }
    
    calculateOverallScore(comparison) {
        const improvements = comparison.improvements.length;
        const regressions = comparison.regressions.length;
        const total = improvements + regressions;
        
        if (total === 0) return 0;
        
        return Math.round((improvements / total) * 100);
    }
    
    // ========================================
    // レポート生成
    // ========================================
    
    generateSummary(metrics) {
        const summary = {
            score: 0,
            grade: 'F',
            recommendations: [],
            criticalIssues: []
        };
        
        // 読み込み時間の評価
        if (metrics.loadTime.totalLoadTime < 2000) {
            summary.score += 25;
        } else if (metrics.loadTime.totalLoadTime < 4000) {
            summary.score += 15;
        } else {
            summary.criticalIssues.push('ページ読み込み時間が遅すぎます');
            summary.recommendations.push('リソースの最適化を検討してください');
        }
        
        // リソース読み込み時間の評価
        if (metrics.resourceMetrics.totalLoadTime < 1000) {
            summary.score += 25;
        } else if (metrics.resourceMetrics.totalLoadTime < 2000) {
            summary.score += 15;
        } else {
            summary.criticalIssues.push('リソース読み込み時間が遅すぎます');
            summary.recommendations.push('画像の最適化やCDNの使用を検討してください');
        }
        
        // メモリ使用量の評価
        if (metrics.memoryMetrics.memoryPressure === 'normal') {
            summary.score += 25;
        } else if (metrics.memoryMetrics.memoryPressure === 'medium') {
            summary.score += 15;
        } else {
            summary.criticalIssues.push('メモリ使用量が高すぎます');
            summary.recommendations.push('メモリリークの確認と最適化を行ってください');
        }
        
        // レンダリング性能の評価
        if (metrics.renderingMetrics.fps > 55) {
            summary.score += 25;
        } else if (metrics.renderingMetrics.fps > 45) {
            summary.score += 15;
        } else {
            summary.criticalIssues.push('レンダリング性能が低すぎます');
            summary.recommendations.push('アニメーションの最適化を検討してください');
        }
        
        // グレードの決定
        if (summary.score >= 90) summary.grade = 'A';
        else if (summary.score >= 80) summary.grade = 'B';
        else if (summary.score >= 70) summary.grade = 'C';
        else if (summary.score >= 60) summary.grade = 'D';
        else summary.grade = 'F';
        
        return summary;
    }
    
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            tests: Array.from(this.testResults.entries()),
            summary: this.generateOverallSummary()
        };
        
        return report;
    }
    
    generateOverallSummary() {
        const tests = Array.from(this.testResults.values());
        const totalTests = tests.length;
        
        if (totalTests === 0) {
            return { message: 'No tests have been run yet' };
        }
        
        const averageScore = tests.reduce((sum, test) => sum + test.summary.score, 0) / totalTests;
        const averageGrade = this.calculateGrade(averageScore);
        
        return {
            totalTests,
            averageScore: Math.round(averageScore),
            averageGrade,
            bestTest: tests.reduce((best, current) => 
                current.summary.score > best.summary.score ? current : best
            ),
            worstTest: tests.reduce((worst, current) => 
                current.summary.score < worst.summary.score ? current : worst
            )
        };
    }
    
    calculateGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }
    
    // ========================================
    // ユーティリティ
    // ========================================
    
    async collectCurrentMetrics() {
        return {
            memoryUsage: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null,
            timestamp: Date.now()
        };
    }
    
    exportResults(format = 'json') {
        const report = this.generateReport();
        
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(report);
        }
        
        return report;
    }
    
    convertToCSV(report) {
        // CSV形式への変換（簡易版）
        const headers = ['Test Name', 'Score', 'Grade', 'Load Time', 'Resource Time', 'Memory Usage'];
        const rows = report.tests.map(([name, test]) => [
            name,
            test.summary.score,
            test.summary.grade,
            test.loadTime.totalLoadTime,
            test.resourceMetrics.totalLoadTime,
            test.memoryMetrics.usedJSHeapSize
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    clearResults() {
        this.testResults.clear();
        this.baselineMetrics = null;
        this.metrics.clear();
    }
}

// ========================================
// グローバル初期化
// ========================================

let performanceTester = null;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    performanceTester = new PerformanceTester();
    window.performanceTester = performanceTester;
    
    // デバッグモードでの自動テスト実行
    if (CONFIG && CONFIG.PERFORMANCE && CONFIG.PERFORMANCE.DEBUG) {
        setTimeout(() => {
            performanceTester.runPerformanceTest('auto-test');
        }, 5000); // 5秒後に自動テスト実行
    }
});

// グローバルに公開
window.PerformanceTester = PerformanceTester;
