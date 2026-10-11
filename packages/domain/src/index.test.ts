import { describe, expect, it } from 'vitest';
import { calculateTaskProgress } from './index';

describe('calculateTaskProgress', () => {
  it('calculates deterministic completion percentage', () => {
    expect(calculateTaskProgress([
      { id: '1', title: 'A', completed: true },
      { id: '2', title: 'B', completed: false },
    ])).toBe(50);
  });
});
