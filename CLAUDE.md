@AGENTS.md

# hidori（日取り）

URL を配るだけで日程を決める道具。Next.js 16（App Router）を OpenNext で Cloudflare Workers に載せ、
データは D1 に置く。**誰でも使える公開ツール**として運用する。

## コマンド

| 目的 | コマンド |
|---|---|
| 開発サーバー | `pnpm dev`（http://localhost:3000。D1 はローカルの複製を使う） |
| 型・lint・配色の検査 | `pnpm check` |
| 配色だけ検査 | `pnpm run check:contrast` |
| 本番と同じ Worker で確認 | `pnpm preview` |
| デプロイ | `pnpm run ship` |
| マイグレーション（手元 / 本番） | `pnpm run db:local` / `pnpm run db:remote` |
| バインディングの型を作り直す | `pnpm run cf-typegen`（`wrangler.jsonc` を変えたら必ず） |

- **`deploy` という script 名は pnpm の組み込みと衝突して実行されない。** デプロイは `ship`。
- 通常のデプロイは main への push で GitHub Actions が行う。デプロイ前にマイグレーションを当てている。

## 構成

```
app/
├─ actions.ts          Server Actions（作成・回答・削除・候補追加）
├─ page.tsx            作成フォーム
├─ e/[id]/             出欠表・回答フォーム・共有 URL
│  ├─ claim/route.ts   ?t= のトークンを Cookie に移す
│  └─ manage/          主催者のページ
├─ privacy/            何を預かり、いつ消えるか
└─ globals.css         配色トークン
lib/
├─ db.ts               D1 アクセス（ORM は挟まない）
├─ schema.ts           zod と上限値とマークの定義
├─ id.ts               ID とトークンの生成
├─ tokens.ts           権限の根拠になる Cookie
├─ retention.ts        保存期間（90日）
└─ origin.ts           共有 URL を組み立てる
custom-worker.ts       OpenNext の fetch を包み、掃除の scheduled を足す
migrations/            手書きの SQL
```

## 他人のデータを預かっていることを忘れない

これは公開ツールで、知らない人の名前とコメントが入る。以下は仕様であって、あとで足す飾りではない。

- **保存期間は `lib/retention.ts` の1か所で決める。** cron の掃除と `/privacy` の文面が同じ値を見ている。
  片方だけ変えると、書いてあることと実際の挙動がずれる。
- **`expires_at` を書いて掃除を作らない、をやらない。** workspace の `synch` は索引まで用意して掃除が無い。
  hidori は `custom-worker.ts` の `scheduled` が実際に消す。変更したら `/cdn-cgi/handler/scheduled` を叩いて確かめる。
- **掃除は50件ずつに分ける。** D1 は1文の bind パラメータに上限（100）がある。
  まとめて消そうとすると、対象が増えたときにちょうど失敗する。
- 入力の上限は `lib/schema.ts` の `LIMITS` に集約する。画面の `maxLength` もそこを参照する。
- **zod のメッセージは必ず日本語で書く。** 既定は英語で、そのまま画面に出る（一度そうなった）。
- イベントのページは `robots: { index: false }` と `app/robots.ts` の両方で検索避けする。

## 権限は Cookie のトークンだけ

- 回答すると `edit_token` が発行され、そのイベントの path に限った httpOnly Cookie に入る。
  **URL を知っているだけの人が他人の回答を書き換えられない**のが調整さんとの一番の違い。
- 主催者は `admin_token`。候補の追加とイベント削除に要る。
- 別端末へ移すときは `?t=` 付きのリンク →`/e/[id]/claim` が Cookie に移して URL からトークンを消す。
- **`cookies().set` は Server Component の描画中には呼べない。** Server Action か Route Handler で行う。
- トークンの比較は `lib/id.ts` の `tokenEquals` を使う。生成は必ず `crypto.getRandomValues`。
  `Math.random()` は使わない。

## 配色

- **色はリテラルな hex で書く。** `scripts/check-contrast.mjs`（自作の contrast-kit を使用）が
  CSS をテキストとして読むので、`oklch()` / `color-mix()` / `var()` の間接参照は解決できない。
  破ると落ちるのではなく**黙って検査をすり抜ける**。
- **Tailwind を入れない。** `@theme` のトークン参照も同じ理由で読めない。
- `:root` はファイル中で最初に現れる `:root` である必要がある（セレクタを `indexOf` で探しているため）。
- ダークの値は2か所（`prefers-color-scheme` 側と `data-theme="dark"` 側）にある。
  検査スクリプトが両者の一致も見ているので、片方だけ直すと CI が落ちる。
- テーマはインラインスクリプトを使わず Cookie で解決する。ちらつきが出ない。

## 幅による切り替え

- 広い画面は表、狭い画面は候補ごとのカード。境目は 46rem。
- **切り替えのメディアクエリは CSS の末尾に置く。** 途中に書くと、あとから出てくる同じ詳細度の
  指定に上書きされて、広い画面で表とカードが両方出る（実際に一度そうなった）。

## Next.js 16 で引っかかったこと

- `"use server"` のファイルは**async 関数しか export できない**。定数を再 export するとビルドが落ちる。
- `middleware` は `proxy` に改名され、nodejs ランタイム専用になった。**OpenNext は未対応**なので使えない。
- そのため CSP の nonce が配れない。`script-src` だけ `'unsafe-inline'` にしてある（`next.config.ts` に理由を記載）。
- `params` / `searchParams` / `cookies()` は Promise。型は `pnpm exec next typegen` が生成するので、
  `tsc` より先に走らせる（`pnpm check` がその順序になっている）。
- **フォームは制御する。** 未制御だと送信後に React が初期化するので、検証で弾かれると入力が消える。
