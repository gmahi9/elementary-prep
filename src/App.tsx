import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { cachedQuestions, fetchQuestionSet, fetchSections } from './lib/questionClient';
import { sampleQuestions } from './lib/sample';
import { downloadOffline } from './lib/offline';
import {
  clearAccountCache,
  declineMerge,
  loadProviders,
  loadRemote,
  loadSession,
  logoutRemote,
  mergeDeclined,
  mergeRemote,
  readAccountCache,
  saveRemote,
  startSignIn,
  writeAccountCache,
  type ProviderId,
} from './lib/account';
import {
  badges as badgeCatalog,
  bookHasActivity,
  emptyGradeBook,
  emptyProgress,
  emptySession,
  hasActivity,
  loadGuestBook,
  loadProgress,
  loadSession as loadSitting,
  mergeGradeBooks,
  percent,
  progressFor,
  readLastGrade,
  saveGuestBook,
  saveSession,
  writeLastGrade,
  type GradeBook,
} from './lib/progress';
import { gradeShort, grades, sections } from './sections';
import type { GradeNumber, Progress, Question, SectionCount, SectionId, SessionStats } from './types';
import { AccountBar } from './components/AccountBar';
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
  const [grade, setGrade] = useState<GradeNumber>(readLastGrade);
  const [section, setSection] = useState<SectionId>('cogat');
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState<number | 'all'>('all');
  const [book, setBook] = useState<GradeBook>(loadGuestBook);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<SessionStats>(() => loadSitting());
  const [menu, setMenu] = useState<SectionCount[]>([]);
  const [pool, setPool] = useState<Question[]>([]);
  const [reviewPool, setReviewPool] = useState<Question[]>([]);
  const [bankStatus, setBankStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState('');
  const [tips, setTips] = useState(false);
  const [providers, setProviders] = useState<ProviderId[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [pending, setPending] = useState<GradeBook | null>(null);
  const signedRef = useRef(false);
  const skipSave = useRef(true);
  const mergeRef = useRef<HTMLButtonElement>(null);
  const progress = progressFor(book, grade);

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
    let cancel = false;
    const boot = async () => {
      const listed = await loadProviders();
      if (cancel) return;
      setProviders(listed);
      const who = await loadSession();
      if (cancel) return;
      if (!who.signedIn || !who.provider || !who.displayName) {
        setHydrated(true);
        return;
      }
      skipSave.current = true;
      signedRef.current = true;
      setAccount({ name: who.displayName, provider: who.provider });
      const remote = await loadRemote();
      if (cancel) return;
      const cache = readAccountCache();
      const guest = loadGuestBook();
      if (!remote) {
        setToast('Saved scores could not be loaded.');
        if (cache) {
          skipSave.current = true;
          setBook(cache);
        }
        setHydrated(true);
        return;
      }
      if (remote.hasSaved && remote.book) {
        const next = cache ? mergeGradeBooks(cache, remote.book) : remote.book;
        skipSave.current = true;
        setBook(next);
        writeAccountCache(next);
        if (cache && JSON.stringify(next) !== JSON.stringify(remote.book)) void saveRemote(next);
        setHydrated(true);
        return;
      }
      const waiting = cache && bookHasActivity(cache) ? mergeGradeBooks(guest, cache) : guest;
      if (!mergeDeclined(who.provider) && bookHasActivity(waiting)) {
        setPending(waiting);
        skipSave.current = true;
        setBook(emptyGradeBook());
        setMergeOpen(true);
        setHydrated(true);
        return;
      }
      skipSave.current = true;
      setBook(cache && bookHasActivity(cache) ? cache : emptyGradeBook());
      setHydrated(true);
    };
    void boot();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return undefined;
    if (signedRef.current) {
      if (skipSave.current) {
        skipSave.current = false;
        return undefined;
      }
      writeAccountCache(book);
      const timer = window.setTimeout(() => {
        void saveRemote(book).then((ok) => {
          if (!ok) setToast('Scores could not be saved just now.');
        });
      }, 450);
      return () => window.clearTimeout(timer);
    }
    saveGuestBook(book);
    return undefined;
  }, [book, hydrated]);

  useEffect(() => {
    if (mergeOpen) mergeRef.current?.focus();
  }, [mergeOpen]);

  const topics = useMemo(() => {
    const current = menu.find((item) => item.key === section);
    if (current?.topics.length) return current.topics.map((item) => [item.key, item.title] as const);
    const map = new Map<string, string>();
    pool.filter((question) => question.section === section).forEach((question) => map.set(question.topic, question.topicLabel));
    return [...map.entries()];
  }, [menu, pool, section]);

  useEffect(() => {
    let cancel = false;
    void fetchSections(grade).then((sectionsForGrade) => {
      if (!cancel && sectionsForGrade) setMenu(sectionsForGrade);
    });
    return () => { cancel = true; };
  }, [grade, reload]);

  useEffect(() => {
    let cancel = false;
    setBankStatus('loading');
    void fetchQuestionSet({
      grade,
      section,
      type: topic === 'all' ? undefined : topic,
      limit: 48,
    }).then((result) => {
      if (cancel) return;
      if (result.questions) {
        setPool(result.questions);
        setBankStatus('ready');
        if (result.fromCache) setToast('Showing questions saved on this device.');
        return;
      }
      setPool([]);
      setBankStatus('error');
    });
    return () => { cancel = true; };
  }, [grade, section, topic, reload]);

  useEffect(() => {
    if (route !== 'review') return undefined;
    const ids = progress.mistakes;
    if (!ids.length) {
      setReviewPool([]);
      return undefined;
    }
    let cancel = false;
    void fetchQuestionSet({ grade, ids, limit: Math.min(40, ids.length) }).then((result) => {
      if (cancel) return;
      setReviewPool(result.questions || []);
      if (!result.questions) setBankStatus('error');
    });
    return () => { cancel = true; };
  }, [route, grade, progress.mistakes]);

  const info = sections.find((item) => item.id === section) || sections[0];
  const updateProgress = (next: Progress, fresh: string[] = []) => {
    setBook((current) => ({ version: 2, grades: { ...current.grades, [String(grade)]: next } }));
    if (fresh.length) {
      const names = fresh.map((id) => badgeCatalog.find((badge) => badge.id === id)?.name || id);
      setToast(`New badge: ${names.join(', ')}`);
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

  const acceptMerge = async () => {
    if (!pending) return;
    const merged = await mergeRemote(pending);
    setMergeOpen(false);
    if (!merged) {
      setToast('Scores could not be combined.');
      return;
    }
    skipSave.current = true;
    setBook(merged);
    writeAccountCache(merged);
    setToast('Scores from this visit are saved to the account.');
  };

  const decline = () => {
    if (account) declineMerge(account.provider);
    setMergeOpen(false);
    setPending(null);
  };

  const combine = async () => {
    const legacy = loadProgress();
    const local = hasActivity(legacy)
      ? mergeGradeBooks({ version: 2, grades: { '3': legacy } }, loadGuestBook())
      : loadGuestBook();
    if (!bookHasActivity(local)) {
      setToast('This visit does not have extra scores to combine.');
      return;
    }
    const merged = await mergeRemote(local);
    if (!merged) {
      setToast('Scores could not be combined.');
      return;
    }
    skipSave.current = true;
    setBook(merged);
    writeAccountCache(merged);
    setToast('Scores from this visit are saved to the account.');
  };

  const chooseGrade = (next: GradeNumber) => {
    if (next === grade) return;
    setGrade(next);
    writeLastGrade(next);
    setTopic('all');
    resetSession();
  };

  const loadSample = async (nextSection: SectionId | 'mix', count: number) => {
    if (nextSection === 'mix') {
      const parts = await Promise.all((['cogat', 'iready', 'map'] as const).map((id) => (
        fetchQuestionSet({ grade, section: id, limit: count, scored: true })
      )));
      const merged = parts.flatMap((part) => part.questions || []);
      return sampleQuestions(merged.filter((question) => question.scored), count);
    }
    const result = await fetchQuestionSet({ grade, section: nextSection, limit: count, scored: true });
    return (result.questions || []).filter((question) => question.scored).slice(0, count);
  };

  const logout = async () => {
    await logoutRemote();
    const restored = mergeGradeBooks(loadGuestBook(), book);
    saveGuestBook(restored);
    clearAccountCache();
    signedRef.current = false;
    skipSave.current = true;
    setAccount(null);
    setMergeOpen(false);
    setBook(restored);
  };

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
                <span className="tag">Grade {gradeShort(grade)} practice</span>
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
              <Tap type="button" className="ghost" onClick={() => downloadOffline(cachedQuestions(grade).length ? cachedQuestions(grade) : pool, `grade-${gradeShort(grade)}`)}>Offline</Tap>
              <AccountBar providers={providers} name={account?.name || null} onSignIn={startSignIn} onLogout={() => { void logout(); }} />
            </div>
          </div>
          <div className="score-row">
            <div className="grades" role="group" aria-label="Grade">
              {grades.map((item) => (
                <Tap
                  key={item.id}
                  type="button"
                  className={grade === item.id ? 'grade on' : 'grade'}
                  aria-pressed={grade === item.id}
                  onClick={() => chooseGrade(item.id)}
                >
                  {item.label}
                </Tap>
              ))}
            </div>
            <section className="scoreboard" aria-label="Scoreboard">
              <div className="stat"><span>Correct</span><strong><Counter value={session.correct} /></strong></div>
              <div className="stat"><span>Answered</span><strong><Counter value={session.answered} /></strong></div>
              <div className="stat"><span>Streak</span><strong><Counter value={progress.streak} /><Flame active={progress.streak > 0} /></strong></div>
              <div className="stat"><span>Score</span><strong><Counter value={score} />%</strong></div>
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
                  pool={pool}
                  status={bankStatus}
                  onRetry={() => setReload((value) => value + 1)}
                />
              )}
              {route === 'test' && (
                <MockView
                  progress={progress}
                  setProgress={updateProgress}
                  addSession={addSession}
                  burst={() => setBurst((value) => value + 1)}
                  loadSample={loadSample}
                />
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
                  queue={reviewPool}
                  status={bankStatus}
                  onRetry={() => setReload((value) => value + 1)}
                />
              )}
              {route === 'badges' && <BadgeView progress={progress} catalog={badgeCatalog} />}
              {route === 'grownups' && (
                <GrownupView
                  progress={progress}
                  signedIn={account !== null}
                  onCombine={account ? () => { void combine(); } : undefined}
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
          <p>Sunny Steps is unofficial practice for kindergarten through grade 5. It is not affiliated with, endorsed by, or a source of questions from CogAT, the Cognitive Abilities Test, i-Ready, Curriculum Associates, MAP Growth, NWEA, the Torrance Tests of Creative Thinking, or their publishers. Guests keep scores for this visit. Signed-in scores are saved for each grade.</p>
        </footer>
      </div>
      {mergeOpen && (
        <div className="merge">
          <section role="dialog" aria-modal="true" aria-labelledby="merge-title">
            <h2 id="merge-title">Save scores from this device?</h2>
            <p>Your account is new. The scores already on this device can be saved with it.</p>
            <div className="pager">
              <button type="button" className="ghost" onClick={decline}>Not now</button>
              <button type="button" className="primary" ref={mergeRef} onClick={() => { void acceptMerge(); }}>Save them</button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <p>{toast}</p>
          <button type="button" onClick={() => setToast('')}>Close</button>
        </div>
      )}
    </MotionConfig>
  );
}
