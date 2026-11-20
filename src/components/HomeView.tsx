import { motion, useReducedMotion } from 'motion/react';
import type { GradeNumber, SectionId } from '../types';
import type { OrbitGrade } from '../lib/orbit';
import { gradeShort, sections } from '../sections';
import { OrbitPicker } from './OrbitPicker';
import { RevealLines, TypeLine } from './Kinetic';
import { Mascot } from './Mascot';
import { SectionIcon, useTiltMotion } from './visuals';

const LINE = 'Grades are planets. Practice lights the moons.';
const LINES = ['Pick a planet.', 'Take a sunny step.'] as const;

function SectionPick({
  id,
  label,
  hint,
  index,
  onSection,
}: {
  id: SectionId;
  label: string;
  hint: string;
  index: number;
  onSection: (id: SectionId) => void;
}) {
  const reduce = useReducedMotion();
  const tilt = useTiltMotion();
  return (
    <motion.li
      className="section-slot"
      style={{ rotateX: tilt.rotateX, rotateY: tilt.rotateY, transformPerspective: 800 }}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: reduce ? 0 : index * 0.05, duration: reduce ? 0 : 0.35 }}
    >
      <button type="button" className={`section-card ${id}`} onClick={() => onSection(id)}>
        <SectionIcon id={id} />
        <strong>{label}</strong>
        <small>{hint}</small>
      </button>
    </motion.li>
  );
}

export function HomeView({
  grade,
  grades,
  onPick,
  onSection,
}: {
  grade: GradeNumber;
  grades: OrbitGrade[];
  onPick: (grade: GradeNumber) => void;
  onSection: (id: SectionId) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="home">
      <div className="home-copy">
        <p className="kicker">Kindergarten through grade 5</p>
        <RevealLines lines={LINES} />
        <p className="lede">
          <span className="sr-only">{LINE}</span>
          <TypeLine text={LINE} />
        </p>
        <div className="home-actions">
          <a className="primary" href="#/practice">
            <motion.span
              key={grade}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Practice grade {gradeShort(grade)}
            </motion.span>
          </a>
          <a className="ghost" href="#/test">Mock test</a>
        </div>
        <Mascot className="home-mascot" />
      </div>
      <OrbitPicker grades={grades} selected={grade} onPick={onPick} />
      <ul className="section-grid">
        {sections.map((item, index) => (
          <SectionPick
            key={item.id}
            id={item.id}
            label={item.label}
            hint={item.hint}
            index={index}
            onSection={onSection}
          />
        ))}
      </ul>
    </div>
  );
}
