import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { THEME_COOKIE, type Theme } from "../lib/theme";

export const metadata: Metadata = {
  title: {
    default: "hidori — 日取りを決める",
    template: "%s — hidori",
  },
  description:
    "URL を配るだけで日程を決められます。登録は要りません。自分の回答は自分だけが直せます。",
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
