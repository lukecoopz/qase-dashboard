CREATE TABLE suite_hierarchy (
  project    TEXT NOT NULL,
  suite_id   TEXT NOT NULL,
  parent_id  TEXT,
  PRIMARY KEY (project, suite_id)
);
