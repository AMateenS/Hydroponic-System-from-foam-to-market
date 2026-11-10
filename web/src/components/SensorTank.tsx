"use client";
import { motion } from "framer-motion";
import { CountUp, EASE, useReduced } from "./motion";

const T = { x: 34, y: 14, w: 132, h: 232, r: 22 };
const BUBBLES = [
  { cx: 62, r: 4, d: 3.4, delay: 0 },
  { cx: 90, r: 3, d: 4.2, delay: 1.1 },
  { cx: 118, r: 5, d: 3.8, delay: 2.2 },
  { cx: 140, r: 3, d: 4.6, delay: 0.6 },
  { cx: 76, r: 2.5, d: 3.1, delay: 1.9 },
  { cx: 106, r: 3.5, d: 4.4, delay: 2.8 },
];

/**
 * The tank fills to the real soil-moisture reading from the farm sensor.
 * `percent` is null until the first reading arrives.
 */
export default function SensorTank({ percent, live }: { percent: number | null; live: boolean }) {
  const reduce = useReduced();
  const level = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const surface = T.y + T.h * (1 - level / 100); // y of the water surface

  return (
    <div className="surface p-6 sm:p-8">
      <div className="flex items-center gap-6 sm:gap-10">
        <svg
          viewBox="0 0 200 260"
          className="h-64 w-auto shrink-0 sm:h-72"
          role="img"
          aria-label={percent === null ? "Soil moisture tank, waiting for a reading" : `Soil moisture tank, ${level} percent full`}
        >
          <defs>
            <clipPath id="tank-clip">
              <rect x={T.x} y={T.y} width={T.w} height={T.h} rx={T.r} />
            </clipPath>
            <linearGradient id="tank-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3ebb82" stopOpacity="0.95" />
              <stop offset="1" stopColor="#0f6a46" />
            </linearGradient>
          </defs>

          {/* glass */}
          <rect x={T.x} y={T.y} width={T.w} height={T.h} rx={T.r} style={{ fill: "var(--surface-2)" }} />

          {/* water, bubbles and wave all move with the surface */}
          <g clipPath="url(#tank-clip)">
            <motion.g
              initial={{ y: T.y + T.h }}
              animate={{ y: surface }}
              transition={{ duration: 1.8, ease: EASE, delay: 0.45 }}
            >
              <motion.path
                d="M-80 8 Q-60 -2 -40 8 T0 8 T40 8 T80 8 T120 8 T160 8 T200 8 T240 8 T280 8 V320 H-80 Z"
                fill="url(#tank-water)"
                animate={reduce ? undefined : { x: [0, 80] }}
                transition={{ duration: 3.4, ease: "linear", repeat: Infinity }}
              />
              {!reduce &&
                BUBBLES.map((b, i) => (
                  <motion.circle
                    key={i}
                    cx={b.cx}
                    cy={300}
                    r={b.r}
                    fill="#ffffff"
                    fillOpacity={0.55}
                    animate={{ cy: [300, 14], opacity: [0, 0.9, 0] }}
                    transition={{ duration: b.d, delay: b.delay, repeat: Infinity, ease: "linear" }}
                  />
                ))}
            </motion.g>
          </g>

          {/* glass outline + scale */}
          <rect
            x={T.x}
            y={T.y}
            width={T.w}
            height={T.h}
            rx={T.r}
            fill="none"
            strokeWidth={3}
            style={{ stroke: "var(--line-strong)" }}
          />
          {[0, 25, 50, 75, 100].map((t) => {
            const y = T.y + T.h * (1 - t / 100);
            return (
              <g key={t}>
                <line x1={T.x + T.w + 6} x2={T.x + T.w + 14} y1={y} y2={y} strokeWidth={1.5} style={{ stroke: "var(--line-strong)" }} />
                <text x={T.x + T.w + 18} y={y + 3} fontSize="9" style={{ fill: "var(--muted)" }}>
                  {t}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="min-w-0">
          <p className="muted text-sm font-medium">Soil moisture</p>
          <p className="font-display text-6xl font-bold tabular-nums leading-none sm:text-7xl">
            {percent === null ? "--" : <CountUp value={level} suffix="%" duration={1.8} />}
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              {live && !reduce && (
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-green-500"
                  animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? "bg-green-500" : "bg-gray-400"}`} />
            </span>
            <span className="muted">{live ? "Live from the farm sensor" : "Waiting for the first reading"}</span>
          </div>
        </div>
      </div>
      <div className="ph-ribbon mt-6 h-[3px] w-full rounded-full" />
    </div>
  );
}
