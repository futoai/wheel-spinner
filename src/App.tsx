import { type PointerEventHandler, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { buildConicGradient, computeTargetDelta, parseOptions, pickUniformIndex } from '@/lib/spinner';

const DEFAULT_OPTIONS = ['Pizza', 'Sushi', 'Burgers', 'Tacos', 'Pasta', 'Salad'];
const OPTIONS_PARAM = 'options';

function toOptionsText(options: string[]): string {
  return options.join('\n');
}

function optionsFromUrl(): string[] {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(OPTIONS_PARAM);

  if (!raw) {
    return DEFAULT_OPTIONS;
  }

  const parsed = parseOptions(raw);
  return parsed.length > 0 ? parsed : DEFAULT_OPTIONS;
}

type DragState = {
  active: boolean;
  lastAngle: number;
  lastTime: number;
  velocity: number;
  totalDelta: number;
};

function pointerAngle(clientX: number, clientY: number, element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radians = Math.atan2(clientY - cy, clientX - cx);
  let angle = (radians * 180) / Math.PI + 90;

  if (angle < 0) {
    angle += 360;
  }

  return angle;
}

function normalizeDelta(delta: number): number {
  let normalized = delta;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
}

function App() {
  const [optionsText, setOptionsText] = useState(() => toOptionsText(optionsFromUrl()));
  const options = useMemo(() => parseOptions(optionsText), [optionsText]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDurationMs, setSpinDurationMs] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const pendingWinnerIndexRef = useRef<number | null>(null);
  const dragRef = useRef<DragState>({
    active: false,
    lastAngle: 0,
    lastTime: 0,
    velocity: 0,
    totalDelta: 0,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (options.length > 0) {
      params.set(OPTIONS_PARAM, toOptionsText(options));
    } else {
      params.delete(OPTIONS_PARAM);
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, [options]);

  const startSpin = (direction: 1 | -1 = 1) => {
    if (isSpinning || options.length === 0) {
      return;
    }

    const winnerIndex = pickUniformIndex(options.length);
    const extraTurns = 4 + Math.floor(Math.random() * 4);
    const delta = computeTargetDelta(options.length, winnerIndex, rotation, direction, extraTurns);
    const duration = 4200 + Math.floor(Math.random() * 1800);

    pendingWinnerIndexRef.current = winnerIndex;
    setResult(null);
    setIsSpinning(true);
    setSpinDurationMs(duration);
    setRotation((prev) => prev + delta);
  };

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (isSpinning || !wheelRef.current) {
      return;
    }

    event.preventDefault();
    wheelRef.current.setPointerCapture(event.pointerId);
    const angle = pointerAngle(event.clientX, event.clientY, wheelRef.current);
    dragRef.current = {
      active: true,
      lastAngle: angle,
      lastTime: performance.now(),
      velocity: 0,
      totalDelta: 0,
    };
  };

  const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current.active || isSpinning || !wheelRef.current) {
      return;
    }

    const now = performance.now();
    const angle = pointerAngle(event.clientX, event.clientY, wheelRef.current);
    const delta = normalizeDelta(angle - dragRef.current.lastAngle);
    const dt = Math.max(now - dragRef.current.lastTime, 1);
    const velocity = delta / dt;

    dragRef.current.lastAngle = angle;
    dragRef.current.lastTime = now;
    dragRef.current.totalDelta += delta;
    dragRef.current.velocity = dragRef.current.velocity * 0.6 + velocity * 0.4;
    setRotation((prev) => prev + delta);
  };

  const onPointerEnd: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current.active) {
      return;
    }

    wheelRef.current?.releasePointerCapture(event.pointerId);
    const { totalDelta, velocity } = dragRef.current;
    dragRef.current.active = false;

    const hasSwipeIntent = Math.abs(totalDelta) > 24 || Math.abs(velocity) > 0.1;
    if (hasSwipeIntent) {
      startSpin(totalDelta >= 0 ? 1 : -1);
    }
  };

  const gradient = useMemo(() => buildConicGradient(options), [options]);
  const segment = options.length > 0 ? 360 / options.length : 360;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Wheel Spinner</h1>
        <p className="mt-2 text-muted-foreground">
          Add one option per line, then spin. Share your current list directly through the page URL.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Options</CardTitle>
            <CardDescription>Each non-empty line becomes a wheel segment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
              rows={12}
              placeholder={'Pizza\\nSushi\\nBurgers'}
              className="resize-y"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{options.length} entries</span>
              <span>URL updates automatically</span>
            </div>
            <Button onClick={() => startSpin(1)} disabled={isSpinning || options.length === 0} className="w-full">
              {isSpinning ? 'Spinning...' : 'Spin Wheel'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center gap-6 p-6 md:p-8">
            <div className="relative">
              <div className="absolute left-1/2 top-[-18px] z-20 h-0 w-0 -translate-x-1/2 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-foreground" />

              <div
                ref={wheelRef}
                role="button"
                aria-label="Wheel spinner"
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                className="relative size-[min(78vw,520px)] touch-none select-none rounded-full border-8 border-white shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  background: gradient,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.8, 0.18, 1)`
                    : 'none',
                }}
                onTransitionEnd={(event) => {
                  if (event.propertyName !== 'transform') return;
                  setIsSpinning(false);
                  if (pendingWinnerIndexRef.current != null) {
                    setResult(options[pendingWinnerIndexRef.current] ?? null);
                    pendingWinnerIndexRef.current = null;
                  }
                }}
              >
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_12%,rgba(255,255,255,0.14)_68%,rgba(255,255,255,0.35)_100%)]" />
                {options.map((option, index) => {
                  const angle = index * segment + segment / 2;
                  const radians = ((angle - 90) * Math.PI) / 180;
                  const labelRadiusPercent = 34;
                  const x = 50 + Math.cos(radians) * labelRadiusPercent;
                  const y = 50 + Math.sin(radians) * labelRadiusPercent;
                  return (
                    <span
                      key={`${option}-${index}`}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center text-[11px] font-semibold leading-tight text-slate-900 md:text-sm"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: '32%',
                        textShadow: '0 1px 0 rgba(255,255,255,0.35)',
                      }}
                    >
                      {option}
                    </span>
                  );
                })}
                <div className="absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-slate-900 shadow-xl" />
              </div>
            </div>

            <div className="w-full rounded-lg border bg-secondary/50 p-5 text-center">
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Selected</p>
              <p className="mt-2 min-h-8 text-2xl font-bold text-foreground">{result ?? (isSpinning ? '...' : 'Spin to choose')}</p>
              <p className="mt-2 text-xs text-muted-foreground">Mobile tip: drag or flick the wheel to spin.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default App;
