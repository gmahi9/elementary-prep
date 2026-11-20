import { describe, expect, it } from 'vitest';
import {
  crossedSectionMilestone,
  decorateGrade,
  litMoons,
  masteryRatio,
  planetStyles,
  prefersReducedMotion,
  webglAvailable,
} from './orbit';

describe('grade orbit', () => {
  it('keeps moons dark until an answer is correct', () => {
    expect(litMoons(0, 0)).toBe(0);
    expect(litMoons(0, 4)).toBe(0);
    expect(masteryRatio(0, 0)).toBe(0);
  });

  it('lights moons as accuracy climbs', () => {
    expect(litMoons(1, 10)).toBe(1);
    expect(litMoons(4, 10)).toBe(2);
    expect(litMoons(6, 10)).toBe(3);
    expect(litMoons(8, 10)).toBe(4);
    expect(litMoons(10, 10)).toBe(5);
  });

  it('flags section landmarks once', () => {
    expect(crossedSectionMilestone(4, 5)).toBe(true);
    expect(crossedSectionMilestone(5, 6)).toBe(false);
    expect(crossedSectionMilestone(9, 12)).toBe(true);
    expect(crossedSectionMilestone(19, 20)).toBe(true);
    expect(crossedSectionMilestone(20, 21)).toBe(false);
  });

  it('describes kindergarten through grade 5', () => {
    expect(planetStyles.map((planet) => planet.id)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(planetStyles.map((planet) => planet.color)).size).toBe(6);
    const grade = decorateGrade(planetStyles[0], 3, 4);
    expect(grade.name).toBe('Sunbeam');
    expect(grade.mastery).toBe(75);
    expect(grade.moons).toBe(4);
  });

  it('checks motion and webgl without throwing', () => {
    expect(typeof prefersReducedMotion()).toBe('boolean');
    expect(typeof webglAvailable()).toBe('boolean');
    if (typeof document === 'undefined') expect(webglAvailable()).toBe(false);
  });
});
