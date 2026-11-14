import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { pickQuestion, questions, questionsIn, sampleQuestions } from '../data/bank';
import { noteMockFinished, percent, recordAnswer, saveCreative, type Badge } from '../lib/progress';
import type { Progress, Question, SectionId } from '../types';
import { sections } from '../sections';
import { QuestionCard } from './QuestionCard';
import { BadgeArt, QuestionSwap, Ring, Tap } from './visuals';

interface Shared {
  section: SectionId;
  topic: string;
  difficulty: number | 'all';
  progress: Progress;
  setProgress: (next: Progress, badges?: string[]) => void;
  addSession: (correct: boolean) => void;
  burst: () => void;
}

export function PracticeView(props: Shared) {
  const pool = useMemo(
    () => questionsIn(props.section, props.topic, props.difficulty),
    [props.section, props.topic, props.difficulty],
  );
  const [recent, setRecent] = useState<string[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    setPicked(null);
    setRecent([]);
    setCurrent(pickQuestion(pool));
  }, [pool]);

  if (!current) {
    return <p className="empty">No questions in this filter yet. Try another topic.</p>;
  }

  const pick = (index: number) => {
    if (picked != null || !current.scored) return;
    setPicked(index);
    const result = recordAnswer(props.progress, current, index);
    props.setProgress(result.state, result.newBadges);
    props.addSession(result.correct);
    if (result.correct) props.burst();
  };

  const next = () => {
    const avoid = [...recent, current.id].slice(-30);
    setRecent(avoid);
    setCurrent(pickQuestion(pool, avoid));
    setPicked(null);
  };

  return (
    <div className="practice-stack">
      <QuestionSwap id={current.id}>
        <QuestionCard
          question={current}
          picked={picked}
          onPick={pick}
          creativeNote={props.progress.creativeNotes[current.id] || ''}
          creativeDone={props.progress.creativeDone.includes(current.id)}
          onCreative={(note, done) => {
            const result = saveCreative(props.progress, current.id, note, done);
            props.setProgress(result.state, result.newBadges);
          }}
        />
      </QuestionSwap>
      {current.scored && picked != null && (
        <Tap type="button" className="primary next" onClick={next}>Next question</Tap>
      )}
      {current.scored && picked == null && (
        <Tap
          type="button"
          className="ghost next"
          onClick={() => setCurrent(pickQuestion(pool, [current.id]))}
        >
          Try a different one
        </Tap>
      )}
    </div>
  );
}

export function ReviewView(props: Shared) {
  const queue = props.progress.mistakes
    .map((id) => questions.find((question) => question.id === id))
    .filter((question): question is Question => Boolean(question));
  const [activeId, setActiveId] = useState<string | null>(queue[0]?.id ?? null);
  const [picked, setPicked] = useState<number | null>(null);
  const current = questions.find((question) => question.id === activeId) || null;

  useEffect(() => {
    if (!activeId && queue[0]) setActiveId(queue[0].id);
  }, [activeId, queue]);

  if (!current) {
    return <p className="empty">No mistakes are waiting. That is a good place to be.</p>;
  }

  return (
    <div className="practice-stack">
      <p className="count">{queue.length} to review</p>
      <QuestionSwap id={current.id}>
        <QuestionCard
          question={current}
          picked={picked}
          onPick={(choice) => {
            if (picked != null) return;
            setPicked(choice);
            const result = recordAnswer(props.progress, current, choice);
            props.setProgress(result.state, result.newBadges);
            props.addSession(result.correct);
            if (result.correct) props.burst();
          }}
        />
      </QuestionSwap>
      {picked != null && (
        <Tap
          type="button"
          className="primary next"
          onClick={() => {
            const remaining = queue.filter((question) => question.id !== current.id || picked !== current.answerIndex);
            setActiveId(remaining[0]?.id ?? null);
            setPicked(null);
          }}
        >
          Next mistake
        </Tap>
      )}
    </div>
  );
}

export function MockView({ progress, setProgress, burst, addSession }: Pick<Shared, 'progress' | 'setProgress' | 'burst' | 'addSession'>) {
  const [section, setSection] = useState<SectionId | 'mix'>('mix');
  const [length, setLength] = useState(10);
  const [minutes, setMinutes] = useState(8);
  const [paper, setPaper] = useState<Question[] | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [left, setLeft] = useState(0);
  const [summary, setSummary] = useState<null | { correct: number; total: number; bySkill: Record<string, { label: string; correct: number; total: number }> }>(null);
  const ended = useRef(false);

  useEffect(() => {
    if (!paper || summary || minutes === 0) return undefined;
    const timer = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paper, summary, minutes]);

  useEffect(() => {
    ended.current = false;
  }, [paper]);

  useEffect(() => {
    if (paper && !summary && minutes > 0 && left === 0 && !ended.current) {
      ended.current = true;
      finish(paper, answers);
    }
  }, [left, paper, summary, minutes, answers]);

  const finish = (items: Question[], chosen: (number | null)[]) => {
    let state = progress;
    const fresh: string[] = [];
    let correct = 0;
    const bySkill: Record<string, { label: string; correct: number; total: number }> = {};
    items.forEach((question, index) => {
      const choice = chosen[index];
      const picked = choice == null ? -1 : choice;
      const result = recordAnswer(state, question, picked);
      state = result.state;
      addSession(result.correct);
      fresh.push(...result.newBadges);
      const bucket = bySkill[question.skill] || { label: question.skillLabel, correct: 0, total: 0 };
      bucket.total += 1;
      if (result.correct) {
        bucket.correct += 1;
        correct += 1;
      }
      bySkill[question.skill] = bucket;
    });
    const done = noteMockFinished(state, { section, correct, total: items.length });
    setProgress(done.state, [...fresh, ...done.newBadges]);
    if (correct / items.length >= 0.8) burst();
    setSummary({ correct, total: items.length, bySkill });
  };

  const start = () => {
    const pool = questions.filter((question) => question.scored && (section === 'mix' || question.section === section));
    const items = sampleQuestions(pool, length);
    setPaper(items);
    setAnswers(items.map(() => null));
    setStep(0);
    setSummary(null);
    setLeft(minutes * 60);
  };

  if (!paper) {
    return (
      <form
        className="setup"
        onSubmit={(event) => {
          event.preventDefault();
          start();
        }}
      >
        <h2>Mock test</h2>
        <p className="muted">Work through a short set. Feedback waits until the end, then you get a summary by skill.</p>
        <label>
          Questions from
          <select value={section} onChange={(event) => setSection(event.target.value as SectionId | 'mix')}>
            <option value="mix">Mix of reasoning, math, and reading</option>
            {sections.filter((item) => item.id !== 'torrance').map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          How many
          <select value={length} onChange={(event) => setLength(Number(event.target.value))}>
            <option value={10}>10 questions</option>
            <option value={20}>20 questions</option>
          </select>
        </label>
        <label>
          Time
          <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
            <option value={0}>Untimed</option>
            <option value={8}>8 minutes</option>
            <option value={12}>12 minutes</option>
            <option value={20}>20 minutes</option>
          </select>
        </label>
        <Tap type="submit" className="primary">Start</Tap>
      </form>
    );
  }

  if (summary) {
    return (
      <section className="summary">
        <h2 className="display">Test summary</h2>
        <p className="score-hero">{summary.correct} of {summary.total} · {percent(summary.correct, summary.total)}%</p>
        <table>
          <caption>Results by skill</caption>
          <thead>
            <tr><th>Skill</th><th>Correct</th><th>Questions</th></tr>
          </thead>
          <tbody>
            {Object.entries(summary.bySkill).map(([skill, row]) => (
              <tr key={skill}>
                <td>{row.label}</td>
                <td>{row.correct}</td>
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Tap type="button" className="primary" onClick={() => setPaper(null)}>Make another test</Tap>
      </section>
    );
  }

  const current = paper[step];
  if (!current) return null;
  const clock = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;

  return (
    <div className="practice-stack">
      <p className="count">
        Question {step + 1} of {paper.length}
        {minutes > 0 && <span aria-live="polite"> · Time left {clock}</span>}
      </p>
      <QuestionSwap id={current.id}>
        <QuestionCard
          question={current}
          picked={answers[step] ?? null}
          showWhy={false}
          onPick={(index) => {
            setAnswers((existing) => existing.map((value, position) => (position === step ? index : value)));
          }}
        />
      </QuestionSwap>
      <div className="pager">
        <Tap type="button" className="ghost" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Back</Tap>
        {step < paper.length - 1 ? (
          <Tap type="button" className="primary" onClick={() => setStep((value) => value + 1)}>Next</Tap>
        ) : (
          <Tap type="button" className="primary" onClick={() => finish(paper, answers)}>Finish test</Tap>
        )}
      </div>
    </div>
  );
}

export function BadgeView({ progress, catalog }: { progress: Progress; catalog: Badge[] }) {
  const earned = new Set(progress.badges);
  const reduce = useReducedMotion();
  return (
    <>
      <div className="page-intro">
        <h2>Badges</h2>
        <p>Little prizes for practice. Keep going and the pictures wake up.</p>
      </div>
      <ul className="badge-grid">
        {catalog.map((badge, index) => (
          <motion.li
            key={badge.id}
            className={earned.has(badge.id) ? 'badge on' : 'badge'}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: reduce ? 0 : index * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
          >
            <BadgeArt id={badge.id} earned={earned.has(badge.id)} />
            <h3>{badge.name}</h3>
            <p>{badge.detail}</p>
            <p>{earned.has(badge.id) ? 'Earned' : 'Not yet'}</p>
          </motion.li>
        ))}
      </ul>
    </>
  );
}

export function GrownupView({
  progress,
  signedIn,
  onCombine,
  onReset,
}: {
  progress: Progress;
  signedIn: boolean;
  onCombine?: () => void;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const reduce = useReducedMotion();
  const rows = Object.entries(progress.skills).sort((a, b) => a[1].label.localeCompare(b[1].label));
  const weak = [...rows].filter(([, skill]) => skill.attempts >= 3).sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts).slice(0, 3);
  const history = [...(progress.mockHistory || [])].reverse().slice(0, 8);

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sunny-steps-progress.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="grownups">
      <div className="page-intro">
        <h2>For grown-ups</h2>
        <p>{signedIn ? 'Scores are saved to this account.' : 'Scores stay on this device until you sign in.'}</p>
      </div>
      <p>{progress.allCorrect} correct out of {progress.allAnswered} answered. Best streak: {progress.bestStreak}. Mistakes waiting: {progress.mistakes.length}.</p>
      {weak.length > 0 && <p>Skills to practice next: {weak.map(([, skill]) => skill.label).join(', ')}.</p>}
      {rows.length === 0 ? (
        <p className="empty">Answer a few questions and this chart will fill in.</p>
      ) : (
        <ul className="skill-bento">
          {rows.map(([skill, stat], index) => {
            const value = percent(stat.correct, stat.attempts);
            return (
              <motion.li
                key={skill}
                className="skill-card"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: reduce ? 0 : Math.min(index, 8) * 0.03 }}
              >
                <Ring value={value} />
                <div>
                  <strong>{stat.label}</strong>
                  <div className="skill-code">{skill}</div>
                  <div>{stat.correct} of {stat.attempts} · {value}%</div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
      {history.length > 0 && (
        <>
          <h3>Mock tests</h3>
          <ul className="mock-list">
            {history.map((run) => (
              <li key={run.id}>{run.correct} of {run.total} · {run.section} · {new Date(run.at).toLocaleDateString()}</li>
            ))}
          </ul>
        </>
      )}
      <div className="pager">
        <Tap type="button" className="ghost" onClick={exportProgress}>Download progress</Tap>
        {signedIn && onCombine && (
          <Tap type="button" className="ghost" onClick={onCombine}>Combine this device</Tap>
        )}
        {!confirming ? (
          <Tap type="button" className="danger" onClick={() => setConfirming(true)}>Reset this device</Tap>
        ) : (
          <Tap type="button" className="danger" onClick={onReset}>Yes, erase progress</Tap>
        )}
      </div>
    </section>
  );
}
