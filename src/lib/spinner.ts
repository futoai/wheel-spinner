export type RandomFn = () => number;

export function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function pickUniformIndex(length: number, random: RandomFn = Math.random): number {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('length must be a positive integer');
  }

  return Math.floor(random() * length);
}

export function computeTargetDelta(
  optionCount: number,
  winnerIndex: number,
  currentRotation: number,
  direction: 1 | -1,
  extraTurns: number,
): number {
  if (optionCount <= 0) {
    throw new Error('optionCount must be positive');
  }
  if (winnerIndex < 0 || winnerIndex >= optionCount) {
    throw new Error('winnerIndex is out of range');
  }

  const segment = 360 / optionCount;
  const winnerCenter = winnerIndex * segment + segment / 2;
  const desired = normalizeRotation(360 - winnerCenter);
  const current = normalizeRotation(currentRotation);

  if (direction === 1) {
    const cwToTarget = (desired - current + 360) % 360;
    return extraTurns * 360 + cwToTarget;
  }

  const ccwToTarget = -((current - desired + 360) % 360);
  return -(extraTurns * 360) + ccwToTarget;
}

export function parseOptions(text: string): string[] {
  return text
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function buildConicGradient(options: string[]): string {
  const palette = [
    '#f97316',
    '#facc15',
    '#4ade80',
    '#22d3ee',
    '#60a5fa',
    '#a78bfa',
    '#f472b6',
    '#fb7185',
  ];

  if (options.length === 0) {
    return 'conic-gradient(#d1d5db 0deg 360deg)';
  }

  const segment = 360 / options.length;
  const segments = options.map((_, index) => {
    const start = index * segment;
    const end = start + segment;
    const color = palette[index % palette.length];
    return `${color} ${start.toFixed(4)}deg ${end.toFixed(4)}deg`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

export function simulateDistribution(
  optionsCount: number,
  spins: number,
  random: RandomFn,
): number[] {
  if (optionsCount <= 0 || spins <= 0) {
    throw new Error('optionsCount and spins must be positive');
  }

  const counts = Array.from({ length: optionsCount }, () => 0);

  for (let i = 0; i < spins; i += 1) {
    counts[pickUniformIndex(optionsCount, random)] += 1;
  }

  return counts;
}
