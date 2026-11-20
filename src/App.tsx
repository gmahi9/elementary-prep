import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, LayoutGroup, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { cachedQuestions, fetchQuestionSet, fetchSections } from './lib/questionClient';
import { sampleQuestions } from './lib/sample';
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
  bookHasActivity,
  clearStoredGuestProgress,
  emptyGradeBook,
  emptyProgress,
  emptySession,
  mergeGradeBooks,
  percent,
  progressFor,
  readLastGrade,
  recallVisit,
  writeLastGrade,
  writeVisitBook,
  type GradeBook,
} from './lib/progress';
import { decorateGrade, planetStyles } from './lib/orbit';
import { gradeShort, grades, sections } from './sections';
import type { GradeNumber, Progress, Question, SectionCount, SectionId, SessionStats } from './types';
import { AccountBar, SavePrompt } from './components/AccountBar';
import { HomeView } from './components/HomeView';
import { Mascot } from './components/Mascot';
import { BadgeView, GrownupView, MockView, PracticeView, ReviewView } from './components/Views';
import { Backdrop, Counter, Flame, SectionIcon, Tap } from './components/visuals';

const Cheer = lazy(() => import('./components/Confetti'));

type Route = 'home' | 'practice' | 'test' | 'review' | 'badges' | 'grownups';

interface Account {
  name: string;
  provider: ProviderId;
}

function readRoute(): Route {
  const path = (window.location.hash.replace(/^#/, '') || '/').split('?')[0] || '/';
  const name = path.replace(/^\//, '');
  if (name === 'practice' || name === 'test' || name === 'review' || name === 'badges' || name === 'grownups') return name;
  return 'home';
}

export function App() {
  const reduce = useReducedMotion();
  const [route, setRoute] = useState<Route>(readRoute);
  const [grade, setGrade] = useState<GradeNumber>(readLastGrade);
  const [section, setSection] = useState<SectionId>('cogat');
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState<number | 'all'>('all');
  const [book, setBook] = useState<GradeBook>(() => {
    const carried = recallVisit();
    if (carried?.book) return carried.book;
    if (carried?.progress) return { version: 2, grades: { [String(readLastGrade())]: carried.progress } };
    return emptyGradeBook();
  });
  const [session, setSession] = useState<SessionStats>(() => recallVisit()?.session ?? emptySession());
  const [menu, setMenu] = useState<SectionCount[]>([]);
  const [pool, setPool] = useState<Question[]>([]);
  const [reviewPool, setReviewPool] = useState<Question[]>([]);
  const [bankStatus, setBankStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const [burst, setBurst] = useState(0);
  const [finale, setFinale] = useState(false);
  const [toast, setToast] = useState('');
  const [tips, setTips] = useState(false);
  const [providers, setProviders] = useState<ProviderId[]>([]);
  const [providersKnown, setProvidersKnown] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const signedRef = useRef(false);
  const skipSave = useRef(true);
  const bookRef = useRef(book);
  const sessionRef = useRef(session);
  bookRef.current = book;
  sessionRef.current = session;
  const progress = progressFor(book, grade);
  const orbitGrades = useMemo(
    () => planetStyles.map((style) => {
      const stats = progressFor(book, style.id);
      return decorateGrade(style, stats.allCorrect, stats.allAnswered);
    }),
    [book],
  );

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
    if (!window.location.hash) window.location.hash = '#/';
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
      const memory = bookRef.current;
      skipSave.current = true;
      signedRef.current = true;
      setAccount({ name: who.displayName, provider: who.provider });
      if (signingIn && bookHasActivity(memory)) {
        const merged = await mergeRemote(memory);
        if (cancel) return;
        if (!merged) {
          setToast('Scores could not be saved just now.');
          writeAccountCache(bookRef.current);
          return;
        }
        const latest = bookRef.current;
        const next = latest === memory ? merged : mergeGradeBooks(latest, merged);
        skipSave.current = true;
        setBook(next);
        writeAccountCache(next);
        if (next !== merged) void saveRemote(next);
        return;
      }
      const remote = await loadRemote();
      if (cancel) return;
      const cache = signingIn ? null : readAccountCache();
      const during = bookRef.current;
      let next = remote?.hasSaved && remote.book ? remote.book : null;
      if (cache && bookHasActivity(cache)) next = next ? mergeGradeBooks(cache, next) : cache;
      if (bookHasActivity(during)) next = next ? mergeGradeBooks(during, next) : during;
      if (!remote) {
        setToast('Saved scores could not be loaded.');
        if (next) {
          skipSave.current = true;
          setBook(next);
          writeAccountCache(next);
        }
        return;
      }
      if (!next) return;
      const changed = !remote.book || JSON.stringify(next) !== JSON.stringify(remote.book);
      skipSave.current = true;
      setBook(next);
      writeAccountCache(next);
      if (changed && bookHasActivity(next)) void saveRemote(next);
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
    writeAccountCache(book);
    const timer = window.setTimeout(() => {
      void saveRemote(book).then((ok) => {
        if (!ok) setToast('Scores could not be saved just now.');
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [account, book]);

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
    setSession((current) => ({ correct: current.correct + (correct ? 1 : 0), answered: current.answered + 1 }));
  };

  const resetSession = () => {
    setSession(emptySession());
  };

  const signIn = (provider: ProviderId) => {
    writeVisitBook(bookRef.current, sessionRef.current);
    startSignIn(provider);
  };

  const celebrate = (big = false) => {
    setFinale(big);
    setBurst((value) => value + 1);
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
      <a className="skip" href="#main">Skip to content</a>
      <Backdrop />
      {burst > 0 && (
        <Suspense fallback={null}>
          <Cheer burst={burst} finale={finale} />
        </Suspense>
      )}
      <div className={compact ? 'shell' : 'shell scroll'}>
        <header className="top">
          <div className="bar">
            <a className="brand" href="#/">
              <Mascot className="mark" />
              <span className="brand-copy">
                <span className="name">Sunny Steps</span>
                <span className="tag">Grade {gradeShort(grade)} practice</span>
              </span>
            </a>
            <nav aria-label="Pages">
              <a href="#/" aria-current={route === 'home' ? 'page' : undefined}>Home</a>
              <a href="#/practice" aria-current={route === 'practice' ? 'page' : undefined}>Practice</a>
              <a href="#/test" aria-current={route === 'test' ? 'page' : undefined}>Mock test</a>
              <a href="#/review" aria-current={route === 'review' ? 'page' : undefined}>Review {progress.mistakes.length > 0 ? progress.mistakes.length : ''}</a>
              <a href="#/badges" aria-current={route === 'badges' ? 'page' : undefined}>Badges</a>
              <a href="#/grownups" aria-current={route === 'grownups' ? 'page' : undefined}>Grown-ups</a>
            </nav>
            <div className="cluster">
              <Tap type="button" className="ghost" onClick={() => downloadOffline(cachedQuestions(grade).length ? cachedQuestions(grade) : pool, `grade-${gradeShort(grade)}`)}>Offline</Tap>
              <AccountBar providers={providers} name={account?.name || null} onSignIn={signIn} onLogout={() => { void logout(); }} />
            </div>
          </div>
          <div className="score-row">
            {route !== 'home' && (
              <div className="grades" role="group" aria-label="Grade">
                {grades.map((item) => (
                  <Tap
                    key={item.id}
                    type="button"
                    className={grade === item.id ? 'grade on' : 'grade'}
                    style={{ '--planet': planetStyles.find((planet) => planet.id === item.id)?.color || '#ffc56a' } as CSSProperties}
                    aria-pressed={grade === item.id}
                    onClick={() => chooseGrade(item.id)}
                  >
                    {item.label}
                  </Tap>
                ))}
              </div>
            )}
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
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -10 }}
              transition={{ duration: reduce ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {route === 'home' && (
                <HomeView
                  grade={grade}
                  grades={orbitGrades}
                  onPick={chooseGrade}
                  onSection={(id) => {
                    setSection(id);
                    setTopic('all');
                    window.location.hash = '#/practice';
                  }}
                />
              )}
              {route === 'practice' && (
                <PracticeView
                  section={section}
                  topic={topic}
                  difficulty={difficulty}
                  progress={progress}
                  setProgress={updateProgress}
                  addSession={addSession}
                  burst={celebrate}
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
                  burst={celebrate}
                  loadSample={loadSample}
                  notice={renderSavePrompt()}
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
                  burst={celebrate}
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
          <p>Sunny Steps is unofficial practice for kindergarten through grade 5. It is not affiliated with, endorsed by, or a source of questions from CogAT, the Cognitive Abilities Test, i-Ready, Curriculum Associates, MAP Growth, NWEA, the Torrance Tests of Creative Thinking, or their publishers. Anyone can practice without signing in. Progress is saved only for a signed-in account. Without an account, scores from this visit reset when you leave. Signed-in scores are saved for each grade.</p>
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
