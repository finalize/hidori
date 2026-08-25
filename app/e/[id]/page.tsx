import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { loadEvent, type AnswerRow } from "../../../lib/db";
import { adminCookie, editCookie } from "../../../lib/tokens";
import { MARK_LABEL, MARKS, type Mark } from "../../../lib/schema";
import { RETENTION_DAYS } from "../../../lib/retention";
import { origin } from "../../../lib/origin";
import { AnswerForm } from "./answer-form";
import { ShareBox } from "./share-box";
import styles from "./event.module.css";

// 回答は常に最新を出す。キャッシュしない
export const dynamic = "force-dynamic";

// イベントのページは URL を知っている人だけのもの。検索結果に出さない
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Tally = { yes: number; maybe: number; no: number };

/** 候補ごとの集計。○が多い順、同数なら△の多い順で有力とみなす */
function tally(answers: AnswerRow[], candidateId: number): Tally {
  const counts: Tally = { yes: 0, maybe: 0, no: 0 };
  for (const answer of answers) {
    if (answer.candidate_id === candidateId) counts[answer.mark]++;
  }
  return counts;
}

function score(counts: Tally): number {
  // ○を主、△を従にして1つの数にする。参加者は200人までなので桁は足りる
  return counts.yes * 1000 + counts.maybe;
}

export default async function EventPage({ params, searchParams }: PageProps<"/e/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;

  const data = await loadEvent(id);
  if (!data) notFound();

  const { event, candidates, participants, answers } = data;

  const shareUrl = `${await origin()}/e/${id}`;

  const jar = await cookies();
  const isAdmin = jar.get(adminCookie(id))?.value === event.admin_token;
  const myToken = jar.get(editCookie(id))?.value;
  const me = myToken ? participants.find((p) => p.edit_token === myToken) : undefined;

  const byParticipant = new Map<string, Mark>();
  for (const answer of answers) {
    byParticipant.set(`${answer.participant_id}:${answer.candidate_id}`, answer.mark);
  }

  const rows = candidates.map((candidate) => ({
    candidate,
    counts: tally(answers, candidate.id),
  }));
  const best = participants.length === 0 ? -1 : Math.max(...rows.map((row) => score(row.counts)));
  const isBest = (counts: Tally) => best > 0 && score(counts) === best;

  return (
    <main className="wrap">
      <header className={styles.header}>
        <h1 className={styles.title}>{event.title}</h1>
        {event.note && <p className={styles.note}>{event.note}</p>}
      </header>

      <ShareBox url={shareUrl} eventId={id} justCreated={Boolean(created)} isAdmin={isAdmin} />

      <section aria-labelledby="results-heading">
        <h2 id="results-heading" className={styles.h2}>
          いまの集計
        </h2>

        {participants.length === 0 ? (
          <p className={styles.empty}>まだ誰も回答していません。</p>
        ) : (
          <>
            {/* 広い画面: 縦が候補日、横が参加者の表 */}
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <caption className="visually-hidden">
                  候補日ごとの出欠。行が候補日、列が参加者です。
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className={styles.stickyCorner}>
                      候補日
                    </th>
                    {MARKS.map((mark) => (
                      <th key={mark} scope="col" className={styles.countHead}>
                        {MARK_LABEL[mark].symbol}
                      </th>
                    ))}
                    {participants.map((participant) => (
                      <th key={participant.id} scope="col" className={styles.nameHead}>
                        {participant.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ candidate, counts }) => (
                    <tr key={candidate.id} className={isBest(counts) ? styles.bestRow : undefined}>
                      <th scope="row" className={styles.stickyCell}>
                        {candidate.label}
                        {isBest(counts) && <span className={styles.badge}>有力</span>}
                      </th>
                      {MARKS.map((mark) => (
                        <td key={mark} className={styles.count}>
                          {counts[mark]}
                        </td>
                      ))}
                      {participants.map((participant) => {
                        const mark = byParticipant.get(`${participant.id}:${candidate.id}`);
                        return (
                          <td key={participant.id} className={styles.cell}>
                            {mark ? (
                              <span className={styles[mark]} title={MARK_LABEL[mark].text}>
                                {MARK_LABEL[mark].symbol}
                                <span className="visually-hidden">{MARK_LABEL[mark].text}</span>
                              </span>
                            ) : (
                              <span className={styles.blank} aria-label="未回答">
                                －
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 狭い画面: 表をやめ、候補ごとの集計を主役にする。
                スマホで知りたいのは「どの日が有力か」なので、誰が何を答えたかは折りたたむ */}
            <ul className={styles.cards}>
              {rows.map(({ candidate, counts }) => (
                <li
                  key={candidate.id}
                  className={`${styles.card} ${isBest(counts) ? styles.bestCard : ""}`}
                >
                  <div className={styles.cardHead}>
                    <span className={styles.cardLabel}>{candidate.label}</span>
                    {isBest(counts) && <span className={styles.badge}>有力</span>}
                  </div>
                  <div className={styles.cardCounts}>
                    {MARKS.map((mark) => (
                      <span key={mark} className={styles[mark]}>
                        {MARK_LABEL[mark].symbol} {counts[mark]}
                        <span className="visually-hidden">人が{MARK_LABEL[mark].text}</span>
                      </span>
                    ))}
                  </div>
                  <details className={styles.details}>
                    <summary>だれが答えたか</summary>
                    <ul className={styles.who}>
                      {participants.map((participant) => {
                        const mark = byParticipant.get(`${participant.id}:${candidate.id}`);
                        return (
                          <li key={participant.id}>
                            <span className={mark ? styles[mark] : styles.blank}>
                              {mark ? MARK_LABEL[mark].symbol : "－"}
                            </span>{" "}
                            {participant.name}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>

            {participants.some((participant) => participant.comment) && (
              <section aria-labelledby="comments-heading">
                <h2 id="comments-heading" className={styles.h2}>
                  ひとこと
                </h2>
                <ul className={styles.comments}>
                  {participants
                    .filter((participant) => participant.comment)
                    .map((participant) => (
                      <li key={participant.id}>
                        <span className={styles.commentName}>{participant.name}</span>
                        <span className={styles.commentBody}>{participant.comment}</span>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>

      <AnswerForm
        eventId={id}
        candidates={candidates.map((candidate) => ({ id: candidate.id, label: candidate.label }))}
        me={
          me
            ? {
                name: me.name,
                comment: me.comment ?? "",
                marks: Object.fromEntries(
                  answers
                    .filter((answer) => answer.participant_id === me.id)
                    .map((answer) => [String(answer.candidate_id), answer.mark]),
                ),
              }
            : undefined
        }
      />

      <footer className={styles.footer}>
        <p>
          このイベントは最後に更新してから {RETENTION_DAYS} 日で自動的に消えます。
          <Link href="/privacy">預かるもの</Link>
        </p>
        <p>
          <Link href="/">hidori で新しく作る</Link>
        </p>
      </footer>
    </main>
  );
}
