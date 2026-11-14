-- detail stores passage, choice figures, rubric, links, and labels used by the practice card.
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  grade INTEGER NOT NULL,
  section TEXT NOT NULL,
  skill TEXT NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  choices TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  lesson_url TEXT NOT NULL,
  figure TEXT,
  difficulty INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_grade_section_active
  ON questions (grade, section, active);
