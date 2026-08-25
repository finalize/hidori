-- イベント本体。id は URL に出るので推測されにくいランダム文字列
CREATE TABLE events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  note        TEXT,
  -- 作成者だけが持つ。候補の追加とイベント削除に要る
  admin_token TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  -- 保存期間はここから数える
  updated_at  TEXT NOT NULL
);

-- 保存期間を過ぎたものを消す cron が使う
CREATE INDEX idx_events_updated ON events (updated_at);

CREATE TABLE candidates (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id  TEXT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  -- 表示用の文字列。"8/30(日) 19:00" のようにそのまま出す
  label     TEXT NOT NULL,
  -- 並び替え用。将来 .ics を出すならここを使う
  starts_at TEXT,
  position  INTEGER NOT NULL
);

CREATE INDEX idx_candidates_event ON candidates (event_id, position);

CREATE TABLE participants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   TEXT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  comment    TEXT,
  -- 本人だけが自分の行を直せる。URL さえ知っていれば他人の回答を書き換えられる調整さんとの違い
  edit_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_participants_event ON participants (event_id, id);

CREATE TABLE answers (
  participant_id INTEGER NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  candidate_id   INTEGER NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  mark           TEXT NOT NULL CHECK (mark IN ('yes', 'maybe', 'no')),
  PRIMARY KEY (participant_id, candidate_id)
);
