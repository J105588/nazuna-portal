# 既存システム統合ガイド

## 概要
既存のGASとconfigを活用して、シンプルなFCM通知システムを統合する手順です。

## 統合手順

### 1. 既存GASへの統合（完了済み）

✅ **統合完了**: 既存の `gas-sample.gs` にシンプル通知機能を統合済み

**統合された機能:**
- `registerDeviceSimple()` - デバイス登録（シンプル版）
- `sendNotificationSimple()` - 通知送信（シンプル版）
- `getDevicesSimple()` - デバイス取得（シンプル版）
- `getPlatformFromUserAgent()` - プラットフォーム判定

**新しいアクション:**
- `registerDeviceSimple` - シンプルデバイス登録
- `sendNotificationSimple` - シンプル通知送信
- `getDevicesSimple` - シンプルデバイス取得

#### 1.1 GAS再デプロイ
1. GASエディタで「デプロイ」→「新しいデプロイ」
2. バージョンを「新バージョン」に設定
3. 「デプロイ」をクリック

### 2. クライアント側の統合

#### 2.1 設定ファイルの配置
- `config-simple.js` をプロジェクトルートに配置
- `js/simple-notification-manager.js` を `js/` フォルダに配置

#### 2.2 HTMLファイルの更新
既存のHTMLファイルに以下を追加：

```html
<!-- 既存のscriptタグの後に追加 -->
<script src="config-simple.js"></script>
<script src="js/simple-notification-manager.js"></script>
```

#### 2.3 Service Workerの更新（オプション）
既存の `sw.js` を `sw-simple.js` の内容で置き換えるか、段階的に移行

### 3. 管理者UIの統合

#### 3.1 管理者ページの追加
- `admin-simple.html` をプロジェクトルートに配置
- 既存の管理者ページにリンクを追加

#### 3.2 既存のadmin.htmlとの統合
既存の `admin.html` にシンプル通知機能を追加：

```html
<!-- 既存のadmin.htmlに追加 -->
<section class="admin-section" id="simple-notifications-section">
    <div class="section-header">
        <h2><i class="fas fa-bell"></i> シンプル通知</h2>
    </div>
    
    <div class="notification-form">
        <div class="form-group">
            <label for="simple-title">タイトル</label>
            <input type="text" id="simple-title" class="form-control" placeholder="通知のタイトル">
        </div>
        
        <div class="form-group">
            <label for="simple-message">メッセージ</label>
            <textarea id="simple-message" class="form-control" rows="3" placeholder="通知メッセージ"></textarea>
        </div>
        
        <div class="form-group">
            <label for="simple-target">配信対象</label>
            <select id="simple-target" class="form-control">
                <option value="all">全ユーザー</option>
                <option value="web">Webユーザー</option>
                <option value="ios">iOSユーザー</option>
                <option value="android">Androidユーザー</option>
            </select>
        </div>
        
        <button id="send-simple-notification" class="btn btn-primary">
            <i class="fas fa-paper-plane"></i> 通知を送信
        </button>
    </div>
</section>
```

### 4. JavaScript統合

#### 4.1 既存のadmin.jsに追加
既存の `js/admin.js` に以下を追加：

```javascript
// シンプル通知送信
async function sendSimpleNotification() {
    const title = document.getElementById('simple-title').value.trim();
    const message = document.getElementById('simple-message').value.trim();
    const target = document.getElementById('simple-target').value;
    
    if (!title || !message) {
        alert('タイトルとメッセージを入力してください。');
        return;
    }
    
    try {
        const result = await window.simpleNotificationManager.sendNotification(title, message, target);
        
        if (result.success) {
            alert('通知を送信しました。');
            // フォームをクリア
            document.getElementById('simple-title').value = '';
            document.getElementById('simple-message').value = '';
        } else {
            throw new Error(result.error || '送信に失敗しました。');
        }
    } catch (error) {
        console.error('Error sending simple notification:', error);
        alert(`送信エラー: ${error.message}`);
    }
}

// イベントリスナーを設定
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('send-simple-notification');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendSimpleNotification);
    }
});
```

### 5. テスト手順

#### 5.1 基本動作テスト
1. `admin-simple.html` にアクセス
2. 通知のタイトルとメッセージを入力
3. 「通知を送信」ボタンをクリック
4. コンソールでエラーがないか確認

#### 5.2 GAS通信テスト
1. ブラウザの開発者ツールでネットワークタブを確認
2. GASへのリクエストが正常に送信されているか確認
3. レスポンスが正常に返ってきているか確認

#### 5.3 通知表示テスト
1. 別のブラウザ/デバイスでサイトにアクセス
2. 通知権限を許可
3. 管理者から通知を送信
4. 通知が表示されるか確認

### 6. トラブルシューティング

#### 6.1 GAS通信エラー
- GASのURLが正しいか確認
- GASが再デプロイされているか確認
- ネットワーク接続を確認

#### 6.2 通知が表示されない
- ブラウザの通知権限を確認
- Service Workerが正しく登録されているか確認
- FCMトークンが正しく取得されているか確認

#### 6.3 設定エラー
- `config-simple.js` の設定値が正しいか確認
- 既存の `js/config.js` の設定を確認
- Firebase設定が正しいか確認

## 移行戦略

### 段階的移行
1. **第1段階**: 新しいシンプル通知システムを並行運用
2. **第2段階**: 既存の複雑な通知システムを段階的に無効化
3. **第3段階**: 完全にシンプルシステムに移行

### ロールバック計画
- 既存の通知システムを完全に削除しない
- 必要に応じて既存システムに戻すことができるよう準備

## サポート

問題が発生した場合は、以下を確認してください：

1. ブラウザの開発者ツールでエラーログを確認
2. GASの実行ログを確認
3. Firebase Consoleでメッセージ送信状況を確認
4. Supabaseのデータベースログを確認
