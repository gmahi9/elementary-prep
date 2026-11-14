import { useEffect, useMemo, useState } from 'react';
import { questions } from './data/bank';
import { downloadOffline } from './lib/offline';
import {
  badges as badgeCatalog,
  emptyProgress,
  emptySession,
  loadProgress,
  loadSession,
  percent,
  saveProgress,
  saveSession,
} from './lib/progress';
import { grades, sections } from './sections';
import type { Progress, SectionId, SessionStats } from './types';
import { Confetti } from './components/Confetti';
import { BadgeView, GrownupView, MockView, PracticeView, ReviewView } from './components/Views';

type Route = 'practice' | 'test' | 'review' | 'badges' | 'grownups';

function readRoute(): Route {
  const path = (window.location.hash.replace(/^#/, '') || '/practice').split('?')[0] || '/practice';
  const name = path.replace(/^\//, '');
  if (name === 'test' || name === 'review' || name === 'badges' || name === 'grownups') return name;
  return 'practice';
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [section, setSection] = useState<SectionId>('cogat');
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState<number | 'all'>('all');
  const [progress, setProgressState] = useState<Progress>(() => loadProgress());
  const [session, setSession] = useState<SessionStats>(() => loadSession());
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<string[]>([]);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    if (!window.location.hash) window.location.hash = '#/practice';
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const topics = useMemo(() => {
    const map = new Map<string, string>();
    questions.filter((question) => question.section === section).forEach((question) => map.set(question.topic, question.topicLabel));
    return [...map.entries()];
  }, [section]);

  const info = sections.find((item) => item.id === section) || sections[0];
  const updateProgress = (next: Progress, fresh: string[] = []) => {
    setProgressState(next);
    saveProgress(next);
    if (fresh.length) {
      const names = fresh.map((id) => badgeCatalog.find((badge) => badge.id === id)?.name || id);
      setToast(names);
    }
  };

  const addSession = (correct: boolean) => {
    setSession((current) => {
      const next = { correct: current.correct + (correct ? 1 : 0), answered: current.answered + 1 };
      saveSession(next);
      return next;
    });
  };

  const resetSession = () => {
    const next = emptySession();
    setSession(next);
    saveSession(next);
  };

  return (
    <>
      <a className="skip" href="#main">Skip to practice</a>
      <Confetti burst={burst} />
      <header className="top">
        <div className="brand">
          <svg className="sun" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="14" fill="#ffc857" stroke="#241b38" strokeWidth="3" />
            <circle cx="27" cy="30" r="2" fill="#241b38" />
            <circle cx="37" cy="30" r="2" fill="#241b38" />
            <path d="M25 37c2 3 12 3 14 0" fill="none" stroke="#241b38" strokeWidth="3" strokeLinecap="round" />
            <path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4 4M45 45l4 4M49 15l-4 4M19 45l-4 4" stroke="#ef7b2d" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div>
            <p className="name">Sunny Steps</p>
            <p className="tag">Unofficial elementary practice</p>
          </div>
        </div>
        <nav aria-label="Pages">
          <a href="#/practice" aria-current={route === 'practice' ? 'page' : undefined}>Practice</a>
          <a href="#/test" aria-current={route === 'test' ? 'page' : undefined}>Mock test</a>
          <a href="#/review" aria-current={route === 'review' ? 'page' : undefined}>Review {progress.mistakes.length > 0 ? progress.mistakes.length : ''}</a>
          <a href="#/badges" aria-current={route === 'badges' ? 'page' : undefined}>Badges</a>
          <a href="#/grownups" aria-current={route === 'grownups' ? 'page' : undefined}>Grown-ups</a>
        </nav>
        <button type="button" className="ghost" onClick={() => downloadOffline()}>Download for offline</button>
      </header>
      <section className="scoreboard" aria-label="Scoreboard">
        <div><span>Correct</span><strong>{session.correct}</strong></div>
        <div><span>Answered</span><strong>{session.answered}</strong></div>
        <div><span>Streak</span><strong>{progress.streak} <span aria-hidden="true">🔥</span></strong></div>
        <div><span>Score</span><strong>{percent(session.correct, session.answered)}%</strong></div>
      </section>
      <div className="grades" role="group" aria-label="Grade">
        {grades.map((grade) => (
          <button
            key={grade.id}
            type="button"
            className={grade.ready ? 'grade ready' : 'grade'}
            aria-disabled={!grade.ready}
            aria-pressed={grade.ready}
            onClick={() => {
              if (!grade.ready) return;
            }}
          >
            {grade.label}
            {!grade.ready && <small>Soon</small>}
          </button>
        ))}
        <button type="button" className="texty" onClick={resetSession}>Reset session</button>
      </div>
      {(route === 'practice' || route === 'review') && (
        <>
          <div className="tabs" role="tablist" aria-label="Practice sections">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={section === item.id}
                className={`tab ${item.id} ${section === item.id ? 'on' : ''}`}
                onClick={() => {
                  setSection(item.id);
                  setTopic('all');
                  if (route !== 'practice') window.location.hash = '#/practice';
                }}
              >
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>
          {info && (
            <aside className="tips">
              <h2>Test tips</h2>
              <ul>
                {info.tips.map((tip) => <li key={tip}>{tip}</li>)}
              </ul>
            </aside>
          )}
        </>
      )}
      {route === 'practice' && (
        <div className="filters">
          <button type="button" className={topic === 'all' ? 'chip on' : 'chip'} onClick={() => setTopic('all')}>All</button>
          {topics.map(([id, label]) => (
            <button key={id} type="button" className={topic === id ? 'chip on' : 'chip'} onClick={() => setTopic(id)}>{label}</button>
          ))}
          <label className="diff">
            Difficulty
            <select value={String(difficulty)} onChange={(event) => setDifficulty(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
              <option value="all">All</option>
              <option value="1">1 Easier</option>
              <option value="2">2 Practice</option>
              <option value="3">3 Stretch</option>
            </select>
          </label>
        </div>
      )}
      <main id="main">
        {route === 'practice' && (
          <PracticeView
            section={section}
            topic={topic}
            difficulty={difficulty}
            progress={progress}
            setProgress={updateProgress}
            addSession={addSession}
            burst={() => setBurst((value) => value + 1)}
          />
        )}
        {route === 'test' && (
          <MockView progress={progress} setProgress={updateProgress} addSession={addSession} burst={() => setBurst((value) => value + 1)} />
        )}
        {route === 'review' && (
          <ReviewView
            section={section}
            topic="all"
            difficulty="all"
            progress={progress}
            setProgress={updateProgress}
            addSession={addSession}
            burst={() => setBurst((value) => value + 1)}
          />
        )}
        {route === 'badges' && <BadgeView progress={progress} catalog={badgeCatalog} />}
        {route === 'grownups' && (
          <GrownupView
            progress={progress}
            onReset={() => {
              const next = emptyProgress();
              updateProgress(next);
              resetSession();
            }}
          />
        )}
      </main>
      {toast.length > 0 && (
        <div className="toast" role="status">
          <p>New badge: {toast.join(', ')}</p>
          <button type="button" onClick={() => setToast([])}>Close</button>
        </div>
      )}
      <footer>
        <p>Sunny Steps is unofficial practice for Grade 3. It is not affiliated with, endorsed by, or a source of questions from CogAT, the Cognitive Abilities Test, i-Ready, Curriculum Associates, MAP Growth, NWEA, the Torrance Tests of Creative Thinking, or their publishers.</p>
        <p>Questions are original. Progress is saved only on this device.</p>
      </footer>
    </>
  );
}
