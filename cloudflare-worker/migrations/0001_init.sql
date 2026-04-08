CREATE TABLE snapshot_counts (
  project    TEXT    NOT NULL,
  suite_id   TEXT    NOT NULL,
  date       TEXT    NOT NULL,
  total      INTEGER NOT NULL DEFAULT 0,
  automated  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (project, suite_id, date)
);

CREATE INDEX idx_snapshot_lookup
  ON snapshot_counts (project, suite_id, date DESC);
