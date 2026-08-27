import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { THEME_COOKIE, type Theme } from "../lib/theme";
import { SITE_URL } from "../lib/site";

const DESCRIPTION =
  "URL を配るだけで日程を決められます。登録は要りません。自分の回答は自分だけが直せます。";

export const metadata: Metadata = {
  // 相対パスの OGP 画像をここからの絶対 URL に直すのに要る
  metadataBase: new URL(SITE_URL),
  title: {
    default: "hidori — 日取りを決める",
    template: "%s — hidori",
  },
  description: DESCRIPTION,
  // URL を配るのがこのツールの全部なので、貼った先で何のリンクか分かるようにする
  openGraph: {
    type: "website",
    siteName: "hidori",
    title: "hidori — 日取りを決める",
    description: DESCRIPTION,
    locale: "ja_JP",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "hidori" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "hidori — 日取りを決める",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // テーマはインラインスクリプトではなく Cookie で解決する。
  // 未設定なら data-theme を付けず、CSS の prefers-color-scheme に任せる。
  // こうするとちらつきが出ず、スクリプトも増えない。
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  const theme: Theme | undefined =
    stored === "light" || stored === "dark" ? stored : undefined;

  return (
    <html lang="ja" {...(theme ? { "data-theme": theme } : {})}>
      <body>{children}</body>
    </html>
  );
}
