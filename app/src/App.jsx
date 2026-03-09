import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="min-h-screen bg-linear-to-br from-amber-100 via-orange-50 to-rose-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
        <section className="w-full rounded-[2rem] border border-white/70 bg-white/75 p-10 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-orange-600">
            React + Vite + Tailwind
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Simple Counter
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            A minimal starter with a small amount of polish. Use the controls to
            increment, decrement, or reset the count.
          </p>

          <div className="mt-10 rounded-[1.5rem] bg-slate-950 px-8 py-10 text-center text-white">
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
              Current Count
            </p>
            <p className="mt-4 text-7xl font-black tabular-nums">{count}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setCount((value) => value - 1)}
              className="flex-1 rounded-full bg-slate-200 px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-300"
            >
              Decrease
            </button>
            <button
              type="button"
              onClick={() => setCount(0)}
              className="flex-1 rounded-full border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setCount((value) => value + 1)}
              className="flex-1 rounded-full bg-orange-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-orange-600"
            >
              Increase
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
