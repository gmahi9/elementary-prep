import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { questions } from './data/bank';
import { downloadOffline } from './lib/offline';
import {
  clearAccountCache,
  loadProviders,
  loadRemote,
  loadSession,
  logoutRemote,
  mergeRemote,
  readAccountCache,
  saveRemote,
  startSignIn,
  writeAccountCache,
  type ProviderId,
} from './lib/account';
import {
  badges as badgeCatalog,
  clearStoredGuestProgress,
  emptyProgress,
  emptySession,
  hasActivity,
  mergeProgress,
  percent,
  recallVisit,
  writeVisitCarry,
} from './lib/progress';
import { grades, sections } from './sections';
import type { Progress, SectionId, SessionStats } from './types';
import { AccountBar, SavePrompt } from './components/AccountBar';
import { BadgeView, GrownupView, MockView, PracticeView, ReviewView } from './components/Views';
import { Counter, Doodles, Flame, SectionIcon, Tap } from './components/visuals';

const Cheer = lazy(() => import('./components/Confetti'));

type Route = 'practice' | 'test' | 'review' | 'badges' | 'grownups';

interface Account {
  name: string;
  provider: ProviderId;
}

function readRoute(): Route {
  const path = (window.location.hash.replace(/^#/, '') || '/practice').split('?')[0] || '/practice';
  const name = path.replace(/^\//, '');
  if (name === 'test' || name === 'review' || name === 'badges' || name === 'grownups') return name;
  return 'practice';
}

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#eef6fc" />
      <rect x="1.25" y="1.25" width="61.5" height="61.5" rx="16.75" fill="none" stroke="#c5e2f6" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#8ec4ea" strokeWidth="1.6" />
      <circle cx="32" cy="30" r="8" fill="#e39455" />
      <path d="M18 42h28" stroke="#1b3148" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 48h16" stroke="#2f7eb8" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function App() {
  const reduce = useReducedMotion();
  const [route, setRoute] = useState<Route>(readRoute);
  const [section, setSection] = useState<SectionId>('cogat');
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState<number | 'all'>('all');
  const [progress, setProgressState] = useState<Progress>(() => recallVisit()?.progress ?? emptyProgress());
  const [session, setSession] = useState<SessionStats>(() => recallVisit()?.session ?? emptySession());
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState('');
  const [tips, setTips] = useState(false);
  const [providers, setProviders] = useState<ProviderId[]>([]);
  const [providersKnown, setProvidersKnown] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const signedRef = useRef(false);
  const skipSave = useRef(true);
  const progressRef = useRef(progress);
  const sessionRef = useRef(session);
  progressRef.current = progress;
  sessionRef.current = session;

  useEffect(() => {
    const sync = () => {
      setRoute(readRoute());
      if (window.location.hash.includes('auth=error')) {
        setToast('Sign-in did not finish. Please try again.');
        const next = window.location.hash.replace('?auth=error', '').replace('&auth=error', '');
        window.history.replaceState(null, '', next || '#/practice');
      }
    };
    sync();
    window.addEventListener('hashchange', sync);
    if (!window.location.hash) window.location.hash = '#/practice';
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void import('./components/Confetti'); }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    clearStoredGuestProgress();
    let cancel = false;
    const boot = async () => {
      const listed = await loadProviders();
      if (cancel) return;
      setProviders(listed);
      setProvidersKnown(true);
      const who = await loadSession();
      if (cancel || !who.signedIn || !who.provider || !who.displayName) return;
      const signingIn = recallVisit() !== null;
      const memory = progressRef.current;
      skipSave.current = true;
      signedRef.current = true;
      setAccount({ name: who.displayName, provider: who.provider });
      if (signingIn && hasActivity(memory)) {
        const merged = await mergeRemote(memory);
        if (cancel) return;
        if (!merged) {
          setToast('Scores could not be saved just now.');
          writeAccountCache(progressRef.current);
          return;
        }
        const latest = progressRef.current;
        const next = latest === memory ? merged : mergeProgress(latest, merged);
        skipSave.current = true;
        setProgressState(next);
        writeAccountCache(next);
        if (next !== merged) void saveRemote(next);
        return;
      }
      const remote = await loadRemote();
      if (cancel) return;
      const cache = signingIn ? null : readAccountCache();
      const during = progressRef.current;
      let next = remote?.hasSaved && remote.progress ? remote.progress : null;
      if (cache && hasActivity(cache)) next = next ? mergeProgress(cache, next) : cache;
      if (hasActivity(during)) next = next ? mergeProgress(during, next) : during;
      if (!remote) {
        setToast('Saved scores could not be loaded.');
        if (next) {
          skipSave.current = true;
          setProgressState(next);
          writeAccountCache(next);
        }
        return;
      }
      if (!next) return;
      const changed = !remote.progress || JSON.stringify(next) !== JSON.stringify(remote.progress);
      skipSave.current = true;
      setProgressState(next);
      writeAccountCache(next);
      if (changed && hasActivity(next)) void saveRemote(next);
    };
    void boot();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!account) return undefined;
    if (skipSave.current) {
      skipSave.current = false;
      return undefined;
    }
    writeAccountCache(progress);
    const timer = window.setTimeout(() => {
      void saveRemote(progress).then((ok) => {
        if (!ok) setToast('Scores could not be saved just now.');
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [account, progress]);

  const topics = useMemo(() => {
    const map = new Map<string, string>();
    questions.filter((question) => question.section === section).forEach((question) => map.set(question.topic, question.topicLabel));
    return [...map.entries()];
  }, [section]);

  const info = sections.find((item) => item.id === section) || sections[0];
  const updateProgress = (next: Progress, fresh: string[] = []) => {
    setProgressState(next);
    if (signedRef.current) writeAccountCache(next);
    if (fresh.length) {
      const names = fresh.map((id) => badgeCatalog.find((badge) => badge.id === id)?.name || id);
      setToast(`New badge: ${names.join(', ')}`);
    }
  };

  const addSession = (correct: boolean) => {
    setSession((current) => ({ correct: current.correct + (correct ? 1 : 0), answered: current.answered + 1 }));
  };

  const resetSession = () => {
    setSession(emptySession());
  };

  const signIn = (provider: ProviderId) => {
    writeVisitCarry(progressRef.current, sessionRef.current);
    startSignIn(provider);
  };

  const logout = async () => {
    await logoutRemote();
    clearAccountCache();
    signedRef.current = false;
    skipSave.current = true;
    setAccount(null);
  };

  const renderSavePrompt = () => (
    <SavePrompt signedIn={account !== null} known={providersKnown} providers={providers} onSignIn={signIn} />
  );

  const compact = route === 'practice' || route === 'review' || route === 'test';
  const score = percent(session.correct, session.answered);

  return (
    <MotionConfig reducedMotion="user">
      <a className="skip" href="#main">Skip to practice</a>
      <Doodles />
      {burst > 0 && (
        <Suspense fallback={null}>
          <Cheer burst={burst} />
        </Suspense>
      )}
      <div className={compact ? 'shell' : 'shell scroll'}>
        <header className="top">
          <div className="bar">
            <a className="brand" href="#/practice">
              <Mark />
              <span className="brand-copy">
                <span className="name">Sunny Steps</span>
                <span className="tag">Grade 3 practice</span>
              </span>
            </a>
            <nav aria-label="Pages">
              <a href="#/practice" aria-current={route === 'practice' ? 'page' : undefined}>Practice</a>
              <a href="#/test" aria-current={route === 'test' ? 'page' : undefined}>Mock test</a>
              <a href="#/review" aria-current={route === 'review' ? 'page' : undefined}>Review {progress.mistakes.length > 0 ? progress.mistakes.length : ''}</a>
              <a href="#/badges" aria-current={route === 'badges' ? 'page' : undefined}>Badges</a>
              <a href="#/grownups" aria-current={route === 'grownups' ? 'page' : undefined}>Grown-ups</a>
            </nav>
            <div className="cluster">
              <Tap type="button" className="ghost" onClick={() => downloadOffline()}>Offline</Tap>
              <AccountBar providers={providers} name={account?.name || null} onSignIn={signIn} onLogout={() => { void logout(); }} />
            </div>
          </div>
          <div className="score-row">
            <div className="grades" role="group" aria-label="Grade">
              {grades.map((grade) => (
                <Tap
                  key={grade.id}
                  type="button"
                  className={grade.ready ? 'grade ready' : 'grade'}
                  aria-disabled={!grade.ready}
                  aria-pressed={grade.ready}
                  onClick={() => { if (!grade.ready) return; }}
                >
                  {grade.label}
                  {!grade.ready && <small>Soon</small>}
                </Tap>
              ))}
            </div>
            <section className="scoreboard" aria-label="Scoreboard">
              <div className="stat"><span>Correct</span><strong><Counter value={session.correct} /></strong></div>
              <div className="stat"><span>Answered</span><strong><Counter value={session.answered} /></strong></div>
              <div className="stat"><span>Streak</span><strong><Counter value={progress.streak} /><Flame active={progress.streak > 0} /></strong></div>
              <div className="stat"><span>Score</span><strong><Counter value={score} />%</strong></div>
              {renderSavePrompt()}
            </section>
            <button type="button" className="texty" onClick={resetSession}>Reset</button>
          </div>
        </header>
        {(route === 'practice' || route === 'review') && (
          <LayoutGroup>
            <div className="tabs" role="tablist" aria-label="Practice sections">
              {sections.map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={section === item.id}
                  className={`tab ${item.id} ${section === item.id ? 'on' : ''}`}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  onClick={() => {
                    setSection(item.id);
                    setTopic('all');
                    if (route !== 'practice') window.location.hash = '#/practice';
                  }}
                >
                  {section === item.id && (
                    <motion.span layoutId="section-glider" className="glider" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                  )}
                  <SectionIcon id={item.id} />
                  <span className="tab-copy">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </motion.button>
              ))}
            </div>
          </LayoutGroup>
        )}
        {route === 'practice' && (
          <div className="filter-row">
            <div className="filters">
              <Tap type="button" className={topic === 'all' ? 'chip on' : 'chip'} onClick={() => setTopic('all')}>All</Tap>
              {topics.map(([id, label]) => (
                <Tap key={id} type="button" className={topic === id ? 'chip on' : 'chip'} onClick={() => setTopic(id)}>{label}</Tap>
              ))}
            </div>
            <label className="diff">
              Difficulty
              <select value={String(difficulty)} onChange={(event) => setDifficulty(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
                <option value="all">All</option>
                <option value="1">1 Easier</option>
                <option value="2">2 Practice</option>
                <option value="3">3 Stretch</option>
              </select>
            </label>
            <div className="tip-wrap">
              <Tap type="button" className="ghost" aria-expanded={tips} onClick={() => setTips((value) => !value)}>Tip</Tap>
              {tips && info && (
                <div className="tip-pop" role="note">
                  <h2>Test tips</h2>
                  <ul>{info.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        )}
        {compact && (
          <div className="session" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label="Session score">
            <motion.span className="session-fill" initial={false} animate={{ scaleX: score / 100 }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 22 }} />
          </div>
        )}
        <main id="main">
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              className="panel"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduce ? 0 : 0.22 }}
            >
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
                <MockView progress={progress} setProgress={updateProgress} addSession={addSession} burst={() => setBurst((value) => value + 1)} notice={renderSavePrompt()} />
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
                  signedIn={account !== null}
                  canSignIn={providers.length > 0}
                  providersKnown={providersKnown}
                  onReset={() => {
                    const next = emptyProgress();
                    updateProgress(next);
                    resetSession();
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer>
          <p>Sunny Steps is unofficial practice for Grade 3. It is not affiliated with, endorsed by, or a source of questions from CogAT, the Cognitive Abilities Test, i-Ready, Curriculum Associates, MAP Growth, NWEA, the Torrance Tests of Creative Thinking, or their publishers. Anyone can practice without signing in. Progress is saved only for a signed-in account. Without an account, scores from this visit reset when you leave.</p>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <p>{toast}</p>
          <button type="button" onClick={() => setToast('')}>Close</button>
        </div>
      )}
    </MotionConfig>
  );
}
