# 学食注文・管理システム

## 概要

このアプリケーションは、学食の注文管理と顧客向けオーダーシステムを提供するNext.jsベースのウェブアプリケーションです。顧客はメニューを閲覧し、注文をオンラインで行うことができ、管理者は商品やユーザー、注文を管理できます。

## 主な機能

### 顧客向け機能

- **メニュー閲覧**: 商品一覧を表示し、詳細を確認できます
- **カート機能**: 商品をカートに追加し、数量・サイズ・イートイン/テイクアウトを選択できます
- **お知らせ表示**: 店舗からのお知らせを確認できます
- **注文機能**: カートの商品を注文できます

### 管理者向け機能

- **メニュー管理**: 商品の追加・編集・削除、公開設定
- **ユーザー管理**: ユーザー情報の確認・管理
- **注文管理**: 注文履歴・状況の確認
- **営業カレンダー**: 営業時間と休業日の管理
- **お知らせ管理**: お知らせの作成・編集・公開設定

## 技術スタック

- **フレームワーク**: Next.js (App Router)
- **スタイリング**: Tailwind CSS
- **バックエンド**: Supabase (認証・データベース・ストレージ)
- **アイコン**: Lucide React
- **通知**: React Toastify
- **日付処理**: date-fns

## 制限事項

- テイクアウト注文は11:30までのみ受け付け
- カートには最大5個までしか商品を追加できません
- 同じ商品は最大3個までしか注文できません

## 画面構成

### 顧客向け画面

- ログイン画面
- 商品一覧・注文画面
- カート確認画面
- お知らせ一覧・詳細画面

### 管理者向け画面

- 管理者ダッシュボード
- メニュー管理画面
- ユーザー管理画面
- 注文管理画面
- 営業カレンダー管理画面
- お知らせ管理画面

## インストール方法

```bash
# リポジトリのクローン
git clone [リポジトリURL]

# 依存関係のインストール
cd [プロジェクト名]
npm install

# 環境変数の設定
cp .env.production.example .env.local
# .env.localファイルを編集して、実際の値を設定

# 開発サーバーの起動
npm run dev
```

## 本番環境（react-order-app.vercel.app）でのPayPay決済対応

### 1. 環境変数の設定

本番環境では以下の環境変数をVercelで設定してください：

```
# PayPay API設定
PAYPAY_API_KEY=your_paypay_api_key
PAYPAY_SECRET=your_paypay_secret_key
MERCHANT_ID=your_merchant_id

# アプリケーション設定
NEXT_PUBLIC_BASE_URL=https://react-order-app.vercel.app
NEXTAUTH_URL=https://react-order-app.vercel.app
NODE_ENV=production
```

### 2. PayPay開発者ポータルでの重要な設定

1. [PayPay for Developers](https://developer.paypay.ne.jp/)にログイン
2. アプリケーション設定で以下のリダイレクトURLを登録：
   ```
   https://react-order-app.vercel.app/orders/payment-status/*
   ```
3. サンドボックス環境の認証情報を使用中の場合、本番運用時は本番環境の認証情報に変更

### 3. Vercelでのデプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# プロジェクトのデプロイ
vercel

# 環境変数の設定
vercel env add PAYPAY_API_KEY
vercel env add PAYPAY_SECRET
vercel env add MERCHANT_ID
vercel env add NEXT_PUBLIC_BASE_URL

# 再デプロイ
vercel --prod
```

### 4. 決済フローの確認

本番環境での決済フロー：

1. `https://react-order-app.vercel.app/orders/cart/payment/[id]` で決済開始
2. PayPay決済処理
3. `https://react-order-app.vercel.app/orders/payment-status/[id]` にリダイレクト
4. 決済ステータスの確認・更新

## Supabaseの設定

このアプリケーションはSupabaseをバックエンドとして使用しています。必要なテーブル構造：

- **foods**: メニュー商品情報
- **announcements**: お知らせ情報
- **cart**: ユーザーのカート情報
- **orders**: 注文情報
