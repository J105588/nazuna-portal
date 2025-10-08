/**
 * Simple Notification System Configuration
 * 既存のconfigとfirebase-configから統合された設定
 */

const SIMPLE_NOTIFICATION_CONFIG = {
  // Firebase設定（既存のfirebase-config.jsから取得）
  firebase: {
    apiKey: "AIzaSyDQ8g88Z4rW-nX6TzCGjxFvfDptju4fOIc",
    authDomain: "nazuna-portal.firebaseapp.com",
    projectId: "nazuna-portal",
    storageBucket: "nazuna-portal.firebasestorage.app",
    messagingSenderId: "181514532945",
    appId: "1:181514532945:web:65043ee5d7d435a7af6070",
    vapidKey: "BCEnp7nRdNubcooPI86iEEFqavkUxRal0t3AKkjsC1nB-PYLOUiE-EnGITJKfdANSRCG7zjyRzR6ERX3ZT0tZMQ"
  },
  
  // GAS設定（既存のconfig.jsから取得）
  gas: {
    scriptId: "AKfycbzm9aSS3-gKVBG4FZxTDvC_8BRIEo6TsO04GbEie6_zdXUwowEQETeFEdVJTv2ni-vP",
    baseUrl: "https://script.google.com/macros/s",
    url: "https://script.google.com/macros/s/AKfycbzm9aSS3-gKVBG4FZxTDvC_8BRIEo6TsO04GbEie6_zdXUwowEQETeFEdVJTv2ni-vP/exec"
  },
  
  // Supabase設定（既存のconfig.jsから取得）
  supabase: {
    url: "https://jirppalacwwinwnsyauo.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcnBwYWxhY3d3aW53bnN5YXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTYwNDUsImV4cCI6MjA3NTIzMjA0NX0.wbCEhrTTPETy1iOB3MmbNVtN4JQk5Be2Dxfs61x7fr4"
  },
  
  // 通知設定
  notification: {
    defaultIcon: "https://raw.githubusercontent.com/J105588/nazuna-portal/main/images/icon-192x192.png",
    defaultBadge: "/images/badge-72x72.png",
    defaultUrl: "/",
    maxRetries: 3,
    retryDelay: 1000
  },
  
  // デバッグ設定（既存のconfig.jsから取得）
  debug: {
    enabled: true,
    logLevel: 'info' // 'debug', 'info', 'warn', 'error'
  }
};

// 設定をグローバルに公開
window.SIMPLE_NOTIFICATION_CONFIG = SIMPLE_NOTIFICATION_CONFIG;

// デバッグ用のログ関数
window.debugLog = function(level, message, data = null) {
  if (!SIMPLE_NOTIFICATION_CONFIG.debug.enabled) return;
  
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevel = levels.indexOf(SIMPLE_NOTIFICATION_CONFIG.debug.logLevel);
  const messageLevel = levels.indexOf(level);
  
  if (messageLevel >= currentLevel) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  }
};

console.log('[Config] Simple notification system configuration loaded');
