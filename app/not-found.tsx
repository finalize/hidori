import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "見つかりませんでした",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="wrap">
      <h1>見つかりませんでした</h1>
      <p>
        URL が間違っているか、保存期間を過ぎて削除されたか、主催者が消したかのいずれかです。
      </p>
      <p>
        <Link href="/">hidori で新しく作る</Link>
      </p>
    </main>
  );
}
