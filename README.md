# hidori（日取り）

URL を配るだけで日程を決められます。登録は要りません。

**https://hidori.shgysd.workers.dev**

## 調整さんと違うところ

- **自分の回答は自分だけが直せます。** 回答すると、その端末にだけ編集用のトークンが保存されます。
  URL を知っているだけの人が他人の行を書き換えることはできません。別の端末から直したいときのために、
  初回だけ引き継ぎリンクを表示します。
- **スマホで読める表になります。** 画面が狭いときは表をやめ、候補ごとの集計をカードで出します。
  回答するときも、表のセルではなく大きなボタンを押します。
- **90日で自動的に消えます。** 最後に更新してから数えます。他人の名前を無期限に持ち続けません。

## 作り

| | |
|---|---|
| フレームワーク | Next.js 16（App Router / Server Actions） |
| 実行環境 | Cloudflare Workers（OpenNext 経由） |
| データ | Cloudflare D1（SQLite） |
| 掃除 | Cron Trigger（毎日 11:30 JST） |
| 配色の検査 | 自作の [contrast-kit](https://www.npmjs.com/package/contrast-kit) を CI で実行 |

集計表は Server Component で、○△× を選ぶところだけが Client Component です。
書き込みはすべて Server Actions で、入力は zod で検証しています。

## 開発

```bash
pnpm install
cp .dev.vars.example .dev.vars
pnpm run db:local     # 手元の D1 にマイグレーションを当てる
pnpm dev
```

`pnpm check` で型・lint・配色を検査します。`pnpm preview` は本番と同じ Worker で動かします。

デプロイは main への push で自動的に行われます（`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID`
が設定されている場合。未設定ならスキップされて CI は落ちません）。

## ライセンス

MIT
