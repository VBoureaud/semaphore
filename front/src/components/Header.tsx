import { useEffect, useState } from 'react';
import { Activity, Wifi, Clock } from 'lucide-react';
import type { TopicSignal } from '../types';
import { systemStatus } from '../mockData';

interface Props {
  topics: TopicSignal[];
}

function SemaphoreFlag({ state, color }: { state: 'up' | 'mid' | 'down'; color: string }) {
  const rotation = state === 'up' ? -45 : state === 'mid' ? 0 : 45;
  return (
    <div
      className="relative"
      style={{ width: 28, height: 40 }}
    >
      {/* Pole */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-0.5"
        style={{ background: 'rgba(200, 135, 30, 0.4)', transform: 'translateX(-50%)' }}
      />
      {/* Flag */}
      <div
        className="absolute transition-transform duration-700"
        style={{
          width: 18,
          height: 12,
          background: color,
          top: '50%',
          left: '50%',
          transformOrigin: '0 50%',
          transform: `translateY(-50%) rotate(${rotation}deg)`,
          clipPath: 'polygon(0 0, 100% 20%, 100% 80%, 0 100%)',
          boxShadow: `0 0 6px ${color}60`,
        }}
      />
    </div>
  );
}

function TickerTape({ items }: { items: string[] }) {
  return (
    <div
      className="overflow-hidden py-1.5"
      style={{
        background: 'rgba(0,0,0,0.5)',
        borderTop: '1px solid rgba(94, 61, 27, 0.4)',
        borderBottom: '1px solid rgba(94, 61, 27, 0.4)',
      }}
    >
      <div className="animate-ticker-scroll ticker-tape" style={{ color: 'rgba(200, 135, 30, 0.8)' }}>
        {items.join('  ——  ')}  ——  {items.join('  ——  ')}
      </div>
    </div>
  );
}

export function Header({ topics }: Props) {
  const [time, setTime] = useState(new Date());
  const [flagCycle, setFlagCycle] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    const f = setInterval(() => setFlagCycle((c) => (c + 1) % 3), 2500);
    return () => { clearInterval(t); clearInterval(f); };
  }, []);

  const avgScore = Math.round(topics.reduce((s, t) => s + t.score, 0) / topics.length);
  const fearCount = topics.filter((t) => t.score < 40).length;
  const greedCount = topics.filter((t) => t.score > 60).length;
  const neutralCount = topics.length - fearCount - greedCount;

  const flagStates: ('up' | 'mid' | 'down')[] = [
    ['up', 'mid', 'down'][flagCycle % 3] as 'up' | 'mid' | 'down',
    ['mid', 'down', 'up'][flagCycle % 3] as 'up' | 'mid' | 'down',
    ['down', 'up', 'mid'][flagCycle % 3] as 'up' | 'mid' | 'down',
  ];

  const flagColors = ['#f03014', '#c8871e', '#52a843'];

  return (
    <header>
      {/* Main header */}
      <div
        className="relative"
        style={{
          background: 'linear-gradient(180deg, #120d08 0%, #1a1410 100%)',
          borderBottom: '1px solid rgba(94, 61, 27, 0.5)',
        }}
      >
        {/* Decorative top border */}
        <div
          className="h-1 w-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #5e3d1b 20%, #c8871e 50%, #5e3d1b 80%, transparent 100%)',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Semaphore flags + logo */}
            <div className="flex items-center gap-4">
              <div className="flex items-end gap-1 pb-1">
                {flagStates.map((state, i) => (
                  <SemaphoreFlag key={i} state={state} color={flagColors[i]} />
                ))}
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <h1
                    className="font-playfair font-black tracking-tight animate-flicker"
                    style={{
                      fontSize: '2rem',
                      color: '#f0d9ad',
                      textShadow: '0 0 20px rgba(200, 135, 30, 0.4), 0 2px 4px rgba(0,0,0,0.6)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Semaphore
                  </h1>
                  <span
                    className="font-typewriter text-xs uppercase tracking-widest hidden sm:block"
                    style={{ color: 'rgba(200, 135, 30, 0.5)', marginBottom: '2px' }}
                  >
                    Intelligence Bureau
                  </span>
                </div>
                <p
                  className="font-typewriter text-xs"
                  style={{ color: 'rgba(188, 149, 89, 0.5)', letterSpacing: '0.08em' }}
                >
                  On-Chain Narrative Verification Network — Est. 2024
                </p>
              </div>
            </div>

            {/* Right: Status indicators */}
            <div className="hidden md:flex items-center gap-6">
              {/* Network health */}
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end mb-0.5">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse-brass"
                    style={{ background: '#52a843' }}
                  />
                  <span className="font-typewriter text-xs uppercase tracking-wider" style={{ color: 'rgba(82, 168, 67, 0.8)' }}>
                    Network Active
                  </span>
                </div>
                <div className="font-mono text-xs" style={{ color: 'rgba(188, 149, 89, 0.5)' }}>
                  {systemStatus.networkHealth}% uptime
                </div>
              </div>

              {/* Clock */}
              <div
                className="px-3 py-2 rounded-sm"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(94, 61, 27, 0.5)',
                  minWidth: '120px',
                }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Clock size={10} style={{ color: 'rgba(200, 135, 30, 0.6)' }} />
                  <span className="font-typewriter text-xs uppercase tracking-widest" style={{ color: 'rgba(200, 135, 30, 0.5)' }}>
                    Station Time
                  </span>
                </div>
                <div
                  className="font-mono font-bold text-sm tabular-nums"
                  style={{ color: '#c8871e', letterSpacing: '0.1em' }}
                >
                  {time.toLocaleTimeString('en-US', { hour12: false })}
                </div>
              </div>

              {/* Transmissions counter */}
              <div className="text-right">
                <div className="font-typewriter text-xs uppercase tracking-widest mb-0.5" style={{ color: 'rgba(188, 149, 89, 0.45)' }}>
                  Transmissions
                </div>
                <div className="font-mono font-bold text-lg" style={{ color: '#f0d9ad' }}>
                  {systemStatus.totalTransmissions.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="border-t"
          style={{ borderColor: 'rgba(94, 61, 27, 0.3)' }}
        >
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center gap-6 overflow-x-auto">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Activity size={12} style={{ color: 'rgba(200, 135, 30, 0.6)' }} />
                <span className="font-typewriter text-xs uppercase tracking-wider" style={{ color: 'rgba(188, 149, 89, 0.5)' }}>
                  Market Composite:
                </span>
                <span
                  className="font-mono font-bold text-sm"
                  style={{
                    color: avgScore > 60 ? '#52a843' : avgScore < 40 ? '#f03014' : '#c8871e',
                  }}
                >
                  {avgScore}
                </span>
              </div>

              <div className="h-4 w-px flex-shrink-0" style={{ background: 'rgba(94, 61, 27, 0.4)' }} />

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#f03014' }} />
                  <span className="font-typewriter text-xs" style={{ color: 'rgba(188, 149, 89, 0.6)' }}>
                    Fear: {fearCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#c8871e' }} />
                  <span className="font-typewriter text-xs" style={{ color: 'rgba(188, 149, 89, 0.6)' }}>
                    Neutral: {neutralCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#52a843' }} />
                  <span className="font-typewriter text-xs" style={{ color: 'rgba(188, 149, 89, 0.6)' }}>
                    Greed: {greedCount}
                  </span>
                </div>
              </div>

              <div className="h-4 w-px flex-shrink-0" style={{ background: 'rgba(94, 61, 27, 0.4)' }} />

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Wifi size={11} style={{ color: 'rgba(200, 135, 30, 0.5)' }} />
                <span className="font-mono text-xs" style={{ color: 'rgba(188, 149, 89, 0.45)' }}>
                  Last sweep: {new Date(systemStatus.lastSweep).toLocaleTimeString('en-US', { hour12: false })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticker tape */}
      <TickerTape items={systemStatus.tickerItems} />
    </header>
  );
}
