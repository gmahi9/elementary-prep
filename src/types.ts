export type GradeNumber = 0 | 1 | 2 | 3 | 4 | 5;

export type SectionId = 'cogat' | 'iready' | 'map' | 'torrance';

export interface ResourceLink {
  label: string;
  href: string;
}

export interface Question {
  id: string;
  grade: GradeNumber;
  section: SectionId;
  topic: string;
  topicLabel: string;
  prompt: string;
  passageTitle?: string;
  passage?: string;
  figure?: {
    kind: string;
    alt?: string;
  } & Record<string, unknown>;
  choices: string[];
  choiceFigures?: unknown[];
  answerIndex: number;
  explanation: string;
  skill: string;
  skillLabel: string;
  difficulty: 1 | 2 | 3;
  links: ResourceLink[];
  scored: boolean;
  rubric?: string[];
  verify?: { kind: string } & Record<string, unknown>;
}

export interface SkillStat {
  label: string;
  correct: number;
  attempts: number;
}

export interface Progress {
  version: 1;
  allCorrect: number;
  allAnswered: number;
  streak: number;
  bestStreak: number;
  skills: Record<string, SkillStat>;
  mistakes: string[];
  clearedMistakes: number;
  badges: string[];
  creativeDone: string[];
  creativeNotes: Record<string, string>;
  mockTests: number;
  sectionAnswered: Record<string, number>;
  mockHistory: MockRun[];
}

export interface MockRun {
  id: string;
  at: number;
  section: string;
  correct: number;
  total: number;
}

export interface SessionStats {
  correct: number;
  answered: number;
}

export interface TopicCount {
  key: string;
  title: string;
  count: number;
}

export interface SectionCount {
  key: SectionId;
  title: string;
  area: string;
  sort: number;
  count: number;
  topics: TopicCount[];
}
