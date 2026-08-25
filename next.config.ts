import type { NextConfig } from "next";

/**
 * レスポンスヘッダー。public/_headers は静的アセットにしか効かないので、
 * 画面（SSR）にも付けたいものはここで指定する。
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' を外したいが、外すと Next.js が動かない。
      // App Router は RSC のペイロードをリクエストごとに違うインラインスクリプトで流すので、
      // ハッシュでは指定できない。nonce を配る道は middleware（Next 16 では proxy）が要るが、
      // proxy は nodejs ランタイム専用で OpenNext が未対応。
      // 実測: 'self' だけにするとインラインスクリプトが7件ブロックされ、
      // React が #412（ハイドレーション失敗）で落ちた。
      // 残りのディレクティブは絞ったままにしてある。
      "script-src 'self' 'unsafe-inline'",
      // CSS Modules は外部ファイルだが、Next が一部のスタイルをインラインで出す
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      // 送信先を自分自身に限る。フォームを他所へ飛ばす細工を防ぐ
      "form-action 'self'",
      // 埋め込み禁止。X-Frame-Options: DENY の後継
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;

// next dev でも Cloudflare のバインディング（D1 など）を使えるようにする
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
