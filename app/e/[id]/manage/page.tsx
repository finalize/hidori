import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { loadEvent } from "../../../../lib/db";
import { adminCookie } from "../../../../lib/tokens";
import { origin } from "../../../../lib/origin";
import { ManagePanel } from "./manage-panel";
import styles from "../event.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "主催者のページ",
  robots: { index: false, follow: false },
};

export default async function Manage({ params }: PageProps<"/e/[id]/manage">) {
  const { id } = await params;
  const data = await loadEvent(id);
  if (!data) notFound();

  const token = (await cookies()).get(adminCookie(id))?.value;
  const isAdmin = token === data.event.admin_token;

  if (!isAdmin) {
    return (
      <main className="wrap">
        <h1 className={styles.title}>主催者のページ</h1>
        <p>
          この端末は <strong>{data.event.title}</strong> の主催者として記録されていません。
        </p>
        <p className={styles.note}>
          作成した端末なら開けます。別の端末で操作したい場合は、作成した端末でこのページを開き、
          そこに出る引き継ぎリンクを使ってください。
        </p>
        <p>
          <Link href={`/e/${id}`}>出欠表にもどる</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header className={styles.header}>
        <h1 className={styles.title}>{data.event.title}</h1>
        <p className={styles.note}>主催者のページ</p>
      </header>

      <ManagePanel
        eventId={id}
        handover={`${await origin()}/e/${id}/claim?t=${data.event.admin_token}`}
        candidateCount={data.candidates.length}
        participantCount={data.participants.length}
      />

      <p className={styles.footer}>
        <Link href={`/e/${id}`}>出欠表にもどる</Link>
      </p>
    </main>
  );
}
