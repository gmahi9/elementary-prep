import type { GradeNumber } from '../types';

export interface PlanetStyle {
  id: GradeNumber;
  label: string;
  name: string;
  color: string;
  emissive: string;
}

export const planetStyles: PlanetStyle[] = [
  { id: 0, label: 'K', name: 'Sunbeam', color: '#ffc56a', emissive: '#ff9a3c' },
  { id: 1, label: '1', name: 'Bluebird', color: '#8fd0f5', emissive: '#3d9adf' },
  { id: 2, label: '2', name: 'Brook', color: '#7ed0c0', emissive: '#1f9d8a' },
  { id: 3, label: '3', name: 'Marmalade', color: '#ffb15a', emissive: '#e38a45' },
  { id: 4, label: '4', name: 'Ember', color: '#f3a06a', emissive: '#d4783a' },
  { id: 5, label: '5', name: 'Comet', color: '#c9b7f2', emissive: '#8b78d8' },
];

export interface OrbitGrade extends PlanetStyle {
  correct: number;
  answered: number;
  moons: number;
  mastery: number;
}

export const SECTION_MILESTONES = [5, 10, 20] as const;

export function masteryRatio(correct: number, answered: number): number {
  if (answered <= 0) return 0;
  return Math.max(0, Math.min(1, correct / answered));
}

export function litMoons(correct: number, answered: number): number {
  if (answered <= 0 || correct <= 0) return 0;
  const ratio = masteryRatio(correct, answered);
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.72) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.28) return 2;
  return 1;
}

export function decorateGrade(style: PlanetStyle, correct: number, answered: number): OrbitGrade {
  return {
    ...style,
    correct,
    answered,
    moons: litMoons(correct, answered),
    mastery: Math.round(masteryRatio(correct, answered) * 100),
  };
}

export function crossedSectionMilestone(before: number, after: number): boolean {
  return SECTION_MILESTONES.some((mark) => before < mark && after >= mark);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function webglAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}
