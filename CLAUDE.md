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
| ファビコン・OGP 画像の再生成 | `pnpm run images` |

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
- `:root` はファイル中で最初に現れる `:root` である必要がある（セレクタを `indexOf` で探しているため）。
  **`:root:not([data-theme="light"])` を含む文字列をパレットより前に書かないこと。**
  `@custom-variant dark` を先頭に置いたら、検査がその中身を拾って誤検知した。
- ダークの値は2か所（`prefers-color-scheme` 側と `data-theme="dark"` 側）にある。
  検査スクリプトが両者の一致も見ているので、片方だけ直すと CI が落ちる。
- テーマはインラインスクリプトを使わず Cookie で解決する。ちらつきが出ない。

## Tailwind と shadcn（カレンダーのためだけに入っている）

画面は CSS Modules で組んでいる。Tailwind のユーティリティを普段使いしない。

- **preflight を読み込まない。** `@import "tailwindcss"` ではなく `theme.css` と `utilities.css` を
  個別に読んでいる。preflight を入れると素の `h1` やリストの見た目が変わり、既存の画面が崩れる。
  ただし `shadcn` の CLI はこの書き方を Tailwind 未導入と誤判定する。
  コンポーネントを追加するときは、一時的に `@import "tailwindcss";` に戻してから実行する。
- **`shadcn init` は `:root` に自分のトークンを oklch で書き込み、`--accent` と `--border` を
  上書きしてくる。** 受け入れてはいけない。shadcn 側の変数（`--background` / `--primary` など）は作らず、
  `@theme inline` の `--color-*` を hidori のトークンへ向けること。二重に値を持つと、
  片方だけ直したときにカレンダーだけ色が違う、という壊れ方をする。
- `shadcn init` は `next/font/google` をレイアウトに足してくる。**Web フォントは使わない**ので消す。
- カレンダーのマスの大きさは `--cell-size`。shadcn の既定 1.75rem は指で押すには小さいので広げてある。
  幅は親いっぱい（`w-fit` と `aspect-square` を打ち消してある）。
- **レイヤーの強さに注意。** Tailwind のユーティリティは `@layer utilities` にあり、
  レイヤーに属さない CSS はそれより**強い**。上書きしたいときは便利だが、意図せず効きすぎる。
  素の要素に当てる打ち消し（`button { background-color: transparent }` など）は
  必ず `@layer base` の中に置くこと。外に書いたら、選択中の日の `bg-primary` まで消えて
  白地に白文字になった。
- preflight を読み込んでいないので、ボタンにブラウザ既定の灰色の背景が残る。
  `@layer base` で透明にしてある。自前のボタンはすべて背景を明示しているので影響しない。

## 幅による切り替え

- 広い画面は表、狭い画面は候補ごとのカード。境目は 46rem。
- **切り替えのメディアクエリは CSS の末尾に置く。** 途中に書くと、あとから出てくる同じ詳細度の
  指定に上書きされて、広い画面で表とカードが両方出る（実際に一度そうなった）。

## ファビコンと OGP 画像

`scripts/generate-images.mjs` が SVG から `app/icon.svg` / `icon.png` / `apple-icon.png` /
`favicon.ico` と `public/og.png` を作る。ファビコンの図柄は「○」で、このアプリで押してもらう記号そのもの。
色を変えるときはスクリプトの `MARK` を `--accent` と揃えて再実行する。

- 置き場所は `app/` 直下。App Router がファイル名で拾って `<link rel="icon">` を出すので、
  `public/` には置かないし、レイアウトに手で書く必要もない。
- **アイコンを差し替えたら `.next` を消してからビルドすること。**
  `<link>` の内容がビルドキャッシュに残り、古い `sizes` のまま出る。
  実際に一度、差し替えたのに `sizes="256x256"`（Next の既定アイコンの値）のまま公開された。
- sharp は ICO を書けないので、`favicon.ico` は PNG に22バイトのヘッダを付けて作っている。
- **OGP 画像に実物のスクリーンショットを使わない。** 白地に細い記号なので、縮小にも
  マス目への変換にも耐えない（portfolio のサムネイルを作るときに実測して分かった）。
  大きく・平らで・色の差がはっきりした図柄にすること。
- OGP の絶対 URL は `lib/site.ts` の `SITE_URL`。共有 URL（`lib/origin.ts`）はヘッダから取るが、
  メタデータはリクエストの外で決まるのでここだけ固定値が要る。

## Next.js 16 で引っかかったこと

- `"use server"` のファイルは**async 関数しか export できない**。定数を再 export するとビルドが落ちる。
- `middleware` は `proxy` に改名され、nodejs ランタイム専用になった。**OpenNext は未対応**なので使えない。
- そのため CSP の nonce が配れない。`script-src` だけ `'unsafe-inline'` にしてある（`next.config.ts` に理由を記載）。
  **`'unsafe-eval'` は開発時だけ付ける。** React が開発モードで eval を使うので、無いと `next dev` で
  コンソールにエラーが出る。本番のバンドルには要らない。
- `params` / `searchParams` / `cookies()` は Promise。型は `pnpm exec next typegen` が生成するので、
  `tsc` より先に走らせる（`pnpm check` がその順序になっている）。
- **フォームは制御する。** 未制御だと送信後に React が初期化するので、検証で弾かれると入力が消える。
