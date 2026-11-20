import { Component, lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { GradeNumber } from '../types';
import { webglAvailable, type OrbitGrade } from '../lib/orbit';
import { Mascot } from './Mascot';

const OrbitScene = lazy(() => import('./OrbitScene'));

class OrbitBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onFail();
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function FlatOrbit({ grades, selected, onPick }: {
  grades: OrbitGrade[];
  selected: GradeNumber;
  onPick: (grade: GradeNumber) => void;
}) {
  return (
    <div className="flat-orbit" aria-hidden="true">
      <div className="orbit-ring" />
      <div className="orbit-ring inner" />
      <div className="orbit-sun"><Mascot className="sun-mascot" /></div>
      {grades.map((planet, index) => {
        const turn = -Math.PI / 2 + (index / grades.length) * Math.PI * 2;
        const left = 50 + Math.cos(turn) * 32;
        const top = 50 + Math.sin(turn) * 27;
        return (
          <button
            key={planet.id}
            type="button"
            tabIndex={-1}
            className={planet.id === selected ? 'planet-btn on' : 'planet-btn'}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              '--planet': planet.color,
              '--mastery': String(planet.mastery),
            } as CSSProperties}
            onClick={() => onPick(planet.id)}
          >
            <span className="planet-face">{planet.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function OrbitPicker({
  grades,
  selected,
  onPick,
}: {
  grades: OrbitGrade[];
  selected: GradeNumber;
  onPick: (grade: GradeNumber) => void;
}) {
  const [mode, setMode] = useState<'pending' | 'flat' | 'webgl'>('pending');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const current = grades.find((planet) => planet.id === selected) || grades[0];

  useEffect(() => {
    setMode(webglAvailable() ? 'webgl' : 'flat');
  }, []);

  const live = mode === 'webgl' && ready && !failed;
  const caption = !current
    ? ''
    : current.answered > 0
      ? `${current.name} · ${current.moons} of 5 moons lit · ${current.mastery}% correct`
      : `${current.name} · answer a question and a moon lights up`;

  return (
    <div className="stage-frame">
      <div className="stage-chrome" aria-hidden="true">
        <span className="traffic"><i /><i /><i /></span>
        <span>Grades K–5</span>
      </div>
      <div className="orbit-stage">
        <div className={live ? 'flat-layer away' : 'flat-layer'}>
          <FlatOrbit grades={grades} selected={selected} onPick={onPick} />
        </div>
        {mode === 'webgl' && !failed && (
          <OrbitBoundary onFail={() => setFailed(true)}>
            <Suspense fallback={null}>
              <div className={live ? 'orbit-live ready' : 'orbit-live'}>
                <OrbitScene grades={grades} selected={selected} onPick={onPick} onReady={() => setReady(true)} />
              </div>
            </Suspense>
          </OrbitBoundary>
        )}
      </div>
      <p className="orbit-caption">{caption}</p>
      <div className="grade-dock" role="group" aria-label="Grade">
        {grades.map((planet) => (
          <button
            key={planet.id}
            type="button"
            className={planet.id === selected ? 'dock-btn on' : 'dock-btn'}
            aria-pressed={planet.id === selected}
            aria-label={`${planet.name}, grade ${planet.label}, ${planet.moons} of 5 moons lit`}
            style={{ '--planet': planet.color, '--mastery': String(planet.mastery) } as CSSProperties}
            onClick={() => onPick(planet.id)}
          >
            <span className="planet-face" aria-hidden="true">{planet.label}</span>
            <span className="moon-pips" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <i key={index} className={index < planet.moons ? 'lit' : ''} />
              ))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
