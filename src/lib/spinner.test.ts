import { describe, expect, it } from 'vitest';

import { pickUniformIndex, simulateDistribution } from '@/lib/spinner';

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('pickUniformIndex', () => {
  it('always returns a valid index', () => {
    const random = mulberry32(42);
    for (let i = 0; i < 1000; i += 1) {
      const index = pickUniformIndex(7, random);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(7);
    }
  });
});

describe('simulateDistribution', () => {
  it('is approximately fair across 10,000 spins', () => {
    const optionsCount = 10;
    const spins = 10_000;
    const counts = simulateDistribution(optionsCount, spins, mulberry32(123456));
    const expected = spins / optionsCount;
    const sigma = Math.sqrt(expected * (1 - 1 / optionsCount));
    const maxDeviation = Math.max(...counts.map((count) => Math.abs(count - expected)));

    // With a stable seeded RNG this stays well within 5-sigma.
    expect(maxDeviation).toBeLessThanOrEqual(5 * sigma);
  });
});
