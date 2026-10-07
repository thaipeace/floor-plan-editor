import { describe, it, expect } from 'vitest';
import { closestPointOnSegment, dist } from './geometry';

describe('geometry', () => {
  it('calculates the distance between two points', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  describe('closestPointOnSegment', () => {
    it('projects onto a horizontal segment', () => {
      const p = { x: 4, y: 3 };
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 0 };
      const closest = closestPointOnSegment(p, a, b);
      expect(closest).toEqual({ x: 4, y: 0 });
    });

    it('projects onto a vertical segment', () => {
      const p = { x: 2, y: 7 };
      const a = { x: 5, y: 0 };
      const b = { x: 5, y: 10 };
      const closest = closestPointOnSegment(p, a, b);
      expect(closest).toEqual({ x: 5, y: 7 });
    });

    it('clamps to segment start when projection falls before start', () => {
      const p = { x: -3, y: 4 };
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 0 };
      const closest = closestPointOnSegment(p, a, b);
      expect(closest).toEqual({ x: 0, y: 0 });
    });

    it('clamps to segment end when projection falls past end', () => {
      const p = { x: 14, y: 4 };
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 0 };
      const closest = closestPointOnSegment(p, a, b);
      expect(closest).toEqual({ x: 10, y: 0 });
    });

    it('handles zero-length segments safely without NaN', () => {
      const p = { x: 5, y: 5 };
      const a = { x: 2, y: 2 };
      const b = { x: 2, y: 2 };
      const closest = closestPointOnSegment(p, a, b);
      expect(closest).toEqual({ x: 2, y: 2 });
    });
  });
});
