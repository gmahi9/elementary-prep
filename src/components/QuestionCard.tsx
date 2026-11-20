import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Question } from '../types';
import { canSpeak, questionSpeech, speak, stopSpeaking } from '../lib/speech';
import { ChoiceArt, FigureView } from './FigureView';
import { Tap, useTiltMotion } from './visuals';

const letters = ['A', 'B', 'C', 'D', 'E'];

interface Props {
  question: Question;
  picked: number | null;
  onPick: (index: number) => void;
  showWhy?: boolean;
  creativeNote?: string;
  creativeDone?: boolean;
  onCreative?: (note: string, done: boolean) => void;
}

export function QuestionCard({ question, picked, onPick, showWhy = true, creativeNote = '', creativeDone = false, onCreative }: Props) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const [speaking, setSpeaking] = useState(false);
  const [note, setNote] = useState(creativeNote);
  const [checks, setChecks] = useState<boolean[]>(() => (question.rubric || []).map(() => false));
  const answered = picked != null;
  const locked = showWhy && answered;
  const correct = locked && picked === question.answerIndex;
  const wrong = locked && !correct;
  const tilt = useTiltMotion(!wrong);

  useEffect(() => {
    setNote(creativeNote);
    setChecks((question.rubric || []).map(() => creativeDone));
    headingRef.current?.focus();
    stopSpeaking();
    setSpeaking(false);
  }, [question.id, creativeNote, creativeDone, question.rubric]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!question.scored || locked) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      const number = Number(event.key);
      if (number >= 1 && number <= question.choices.length) onPick(number - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, locked, onPick]);

  const hear = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const started = speak(questionSpeech(question));
    setSpeaking(started);
    if (started) {
      const watch = window.setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          setSpeaking(false);
          window.clearInterval(watch);
        }
      }, 300);
    }
  };

  return (
    <motion.article
      className="card"
      aria-labelledby={headingId}
      style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformPerspective: 900 }}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      animate={wrong && !reduce ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={wrong && !reduce ? { duration: 0.38 } : { duration: 0.2 }}
    >
      <div className="card-tools">
        <p className="eyebrow">
          <span>{question.topicLabel}</span>
          <span className="dots" aria-label={`Difficulty ${question.difficulty} of 3`}>
            {[1, 2, 3].map((level) => (
              <i key={level} className={level <= question.difficulty ? 'on' : ''} />
            ))}
          </span>
        </p>
        <Tap type="button" className="ghost" onClick={hear} disabled={!canSpeak()} aria-pressed={speaking}>
          {speaking ? 'Stop' : 'Hear it'}
        </Tap>
      </div>
      {question.passage && (
        <div className="passage">
          {question.passageTitle && <h3>{question.passageTitle}</h3>}
          <p>{question.passage}</p>
        </div>
      )}
      {question.figure && <FigureView figure={question.figure} />}
      <h2 id={headingId} ref={headingRef} tabIndex={-1}>
        {question.prompt}
      </h2>
      {question.scored ? (
        <motion.div
          role="radiogroup"
          aria-labelledby={headingId}
          className={question.choiceFigures ? 'choices figures' : 'choices'}
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.045 } } }}
        >
          {question.choices.map((choice, index) => {
            const status = !locked ? '' : index === question.answerIndex ? 'right' : index === picked ? 'wrong' : '';
            return (
              <motion.button
                key={`${question.id}-${choice}`}
                type="button"
                role="radio"
                aria-checked={picked === index}
                className={`choice ${status}`}
                disabled={locked}
                onClick={() => onPick(index)}
                variants={{
                  hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 },
                }}
                whileHover={reduce || locked ? undefined : { y: -2 }}
                whileTap={reduce || locked ? undefined : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              >
                <span className="letter">{letters[index]}</span>
                {question.choiceFigures?.[index] != null && <ChoiceArt figure={question.choiceFigures[index]} />}
                <span>{choice}</span>
              </motion.button>
            );
          })}
        </motion.div>
      ) : (
        <div className="creative">
          <p className="coach">This challenge is not scored. Ideas can be silly, careful, or brand new.</p>
          <label htmlFor={`${question.id}-note`}>My ideas</label>
          <textarea
            id={`${question.id}-note`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="List ideas here, or just say them out loud."
          />
          <ul className="rubric">
            {(question.rubric || []).map((item, index) => (
              <li key={item}>
                <label>
                  <input
                    type="checkbox"
                    checked={checks[index] || false}
                    onChange={() => {
                      const next = [...checks];
                      next[index] = !next[index];
                      setChecks(next);
                    }}
                  />
                  {item}
                </label>
              </li>
            ))}
          </ul>
          <Tap
            type="button"
            className="primary"
            onClick={() => onCreative?.(note, checks.every(Boolean))}
            disabled={!checks.every(Boolean)}
          >
            {creativeDone ? 'Saved' : 'I finished this checklist'}
          </Tap>
        </div>
      )}
      {question.scored && locked && (
        <motion.div
          className={correct ? 'feedback good' : 'feedback'}
          role="status"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="result">{correct ? 'Yes, that is it.' : 'Not yet. Here is a way to see it.'}</p>
          <p>{question.explanation}</p>
          <div className="links">
            <p>{correct ? 'Want more practice on this skill?' : 'Learn this skill'}</p>
            <ul>
              {question.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
      {question.scored && !answered && <p className="hint">Tap an answer, or press 1 to {question.choices.length}.</p>}
    </motion.article>
  );
}
