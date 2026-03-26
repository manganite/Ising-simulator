/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Play, Pause, RotateCcw, Settings2, Activity, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Constants
const MAX_HISTORY = 100;
const STEPS_PER_FRAME = 5; // Number of Monte Carlo sweeps per animation frame
const CHART_UPDATE_INTERVAL = 30; // Update charts every 30 animation frames (approx 0.5s)

const TEMPS = {
  LOW: 1.5,
  CRIT: 2.269,
  HIGH: 3.5
};

const COLORS = {
  LOW: '#3b82f6',  // Blue
  CRIT: '#ef4444', // Red
  HIGH: '#f59e0b'  // Orange
};

interface SimulationData {
  time: number;
  mLow: number;
  mCrit: number;
  mHigh: number;
  eLow: number;
  eCrit: number;
  eHigh: number;
  chiLow: number;
  chiCrit: number;
  chiHigh: number;
  cvLow: number;
  cvCrit: number;
  cvHigh: number;
}

// Memoized Grid Component to prevent re-renders when history changes
const GridDisplay = memo(({ label, temp, color, canvasRef, m, e }: { 
  label: string, 
  temp: number, 
  color: string, 
  canvasRef: React.RefObject<HTMLCanvasElement | null>, 
  m: number, 
  e: number 
}) => (
  <div className="bg-white p-4 rounded-2xl shadow-lg border border-[#141414]/5 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
        <h3 className="text-xs font-mono uppercase tracking-widest">{label}</h3>
      </div>
      <span className="text-[10px] font-mono opacity-60">T = {temp}</span>
    </div>
    
    <div className="aspect-square w-full overflow-hidden rounded-lg border border-[#141414]/10 bg-[#E4E3E0]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>

    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
      <div className="bg-[#E4E3E0]/50 p-2 rounded">
        <p className="opacity-50 uppercase mb-1">Mag</p>
        <p className="font-bold">{m.toFixed(3)}</p>
      </div>
      <div className="bg-[#E4E3E0]/50 p-2 rounded">
        <p className="opacity-50 uppercase mb-1">Energy</p>
        <p className="font-bold">{e.toFixed(3)}</p>
      </div>
    </div>
  </div>
));

GridDisplay.displayName = 'GridDisplay';

// Memoized Chart Section to prevent re-renders when simulation runs (only updates on history change)
const StatsCharts = memo(({ history }: { history: SimulationData[] }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Magnetization Chart */}
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#141414]/5 h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Activity size={14} /> Magnetization Comparison
        </h3>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="time" 
            fontSize={10} 
            tickFormatter={(v) => v.toString()} 
            label={{ value: 'Steps', position: 'insideBottomRight', offset: -5, fontSize: 10, fontStyle: 'italic' }}
          />
          <YAxis 
            domain={[0, 1]} 
            ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
            fontSize={10} 
            tickFormatter={(v) => v.toFixed(1)} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '8px', color: '#E4E3E0', fontSize: '10px' }}
            itemStyle={{ fontSize: '10px' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
          <Line name="Below Tc" type="monotone" dataKey="mLow" stroke={COLORS.LOW} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="At Tc" type="monotone" dataKey="mCrit" stroke={COLORS.CRIT} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="Above Tc" type="monotone" dataKey="mHigh" stroke={COLORS.HIGH} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>

    {/* Energy Chart */}
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#141414]/5 h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Zap size={14} /> Energy Comparison
        </h3>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="time" 
            fontSize={10} 
            tickFormatter={(v) => v.toString()} 
            label={{ value: 'Steps', position: 'insideBottomRight', offset: -5, fontSize: 10, fontStyle: 'italic' }}
          />
          <YAxis 
            domain={[-2, 0]} 
            ticks={[-2.0, -1.5, -1.0, -0.5, 0]}
            fontSize={10} 
            tickFormatter={(v) => v.toFixed(1)} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '8px', color: '#E4E3E0', fontSize: '10px' }}
            itemStyle={{ fontSize: '10px' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
          <Line name="Below Tc" type="monotone" dataKey="eLow" stroke={COLORS.LOW} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="At Tc" type="monotone" dataKey="eCrit" stroke={COLORS.CRIT} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="Above Tc" type="monotone" dataKey="eHigh" stroke={COLORS.HIGH} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>

    {/* Susceptibility Chart */}
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#141414]/5 h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Activity size={14} /> Susceptibility (χ)
        </h3>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="time" 
            fontSize={10} 
            tickFormatter={(v) => v.toString()} 
            label={{ value: 'Steps', position: 'insideBottomRight', offset: -5, fontSize: 10, fontStyle: 'italic' }}
          />
          <YAxis fontSize={10} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '8px', color: '#E4E3E0', fontSize: '10px' }}
            itemStyle={{ fontSize: '10px' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
          <Line name="Below Tc" type="monotone" dataKey="chiLow" stroke={COLORS.LOW} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="At Tc" type="monotone" dataKey="chiCrit" stroke={COLORS.CRIT} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="Above Tc" type="monotone" dataKey="chiHigh" stroke={COLORS.HIGH} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>

    {/* Specific Heat Chart */}
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#141414]/5 h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
          <Zap size={14} /> Specific Heat (Cv)
        </h3>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="time" 
            fontSize={10} 
            tickFormatter={(v) => v.toString()} 
            label={{ value: 'Steps', position: 'insideBottomRight', offset: -5, fontSize: 10, fontStyle: 'italic' }}
          />
          <YAxis fontSize={10} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '8px', color: '#E4E3E0', fontSize: '10px' }}
            itemStyle={{ fontSize: '10px' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
          <Line name="Below Tc" type="monotone" dataKey="cvLow" stroke={COLORS.LOW} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="At Tc" type="monotone" dataKey="cvCrit" stroke={COLORS.CRIT} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="Above Tc" type="monotone" dataKey="cvHigh" stroke={COLORS.HIGH} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
));

StatsCharts.displayName = 'StatsCharts';

export default function App() {
  // Simulation parameters
  const [size, setSize] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<SimulationData[]>([]);
  
  // Simulation state (using refs for performance)
  const gridsRef = useRef<[Int8Array, Int8Array, Int8Array] | null>(null);
  const canvasRefs = [
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null)
  ];
  const requestRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Incremental values
  const energiesRef = useRef<Float64Array>(new Float64Array(3));
  const magnetizationsRef = useRef<Float64Array>(new Float64Array(3));

  // Canvas optimization
  const ctxRefs = useRef<(CanvasRenderingContext2D | null)[]>([null, null, null]);
  const imageDataRef = useRef<(ImageData | null)[]>([null, null, null]);

  // Stats accumulators for variance calculation
  const statsRef = useRef({
    low: { mSum: 0, m2Sum: 0, eSum: 0, e2Sum: 0, count: 0 },
    crit: { mSum: 0, m2Sum: 0, eSum: 0, e2Sum: 0, count: 0 },
    high: { mSum: 0, m2Sum: 0, eSum: 0, e2Sum: 0, count: 0 }
  });

  // Pre-calculated probabilities for Metropolis algorithm
  const probsRef = useRef<{ [key: number]: number[] }>({});

  const initProbs = useCallback(() => {
    const calculateProbs = (T: number) => {
      // dE can be -8, -4, 0, 4, 8
      const probs: { [key: number]: number } = {};
      [-8, -4, 0, 4, 8].forEach(dE => {
        probs[dE] = dE <= 0 ? 1 : Math.exp(-dE / T);
      });
      return probs;
    };
    probsRef.current = {
      [TEMPS.LOW]: calculateProbs(TEMPS.LOW),
      [TEMPS.CRIT]: calculateProbs(TEMPS.CRIT),
      [TEMPS.HIGH]: calculateProbs(TEMPS.HIGH)
    };
  }, []);

  // Drawing function
  const drawGrids = useCallback(() => {
    if (!gridsRef.current) return;
    
    gridsRef.current.forEach((grid, i) => {
      const ctx = ctxRefs.current[i];
      const imgData = imageDataRef.current[i];
      if (!ctx || !imgData) return;

      const L = size;
      const data = imgData.data;
      for (let j = 0; j < L * L; j++) {
        const val = grid[j] === 1 ? 20 : 228; // #141414 vs #E4E3E0
        const p = j * 4;
        data[p] = val;
        data[p+1] = val;
        data[p+2] = val;
        data[p+3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    });
  }, [size]);

  // Initialize grids
  const initGrids = useCallback((L: number) => {
    const g1 = new Int8Array(L * L);
    const g2 = new Int8Array(L * L);
    const g3 = new Int8Array(L * L);
    
    for (let i = 0; i < L * L; i++) {
      const val = Math.random() > 0.5 ? 1 : -1;
      g1[i] = val;
      g2[i] = val;
      g3[i] = val;
    }
    
    gridsRef.current = [g1, g2, g3];
    timeRef.current = 0;
    statsRef.current = {
      low: { mSum: 0, m2Sum: 0, eSum: 0, e2Sum: 0, count: 0 },
      crit: { mSum: 0, m2Sum: 0, eSum: 0, e2Sum: 0, count: 0 },
      high: { mSum: 0, m2Sum: 0, eSum: 0, e2Sum: 0, count: 0 }
    };

    // Initialize incremental values
    const calculateInitialStats = (grid: Int8Array) => {
      let energy = 0;
      let mag = 0;
      for (let y = 0; y < L; y++) {
        for (let x = 0; x < L; x++) {
          const s = grid[y * L + x];
          mag += s;
          const right = grid[y * L + (x + 1) % L];
          const down = grid[((y + 1) % L) * L + x];
          energy -= s * (right + down);
        }
      }
      return { energy, mag };
    };

    const s1 = calculateInitialStats(g1);
    const s2 = calculateInitialStats(g2);
    const s3 = calculateInitialStats(g3);

    energiesRef.current[0] = s1.energy;
    energiesRef.current[1] = s2.energy;
    energiesRef.current[2] = s3.energy;
    
    magnetizationsRef.current[0] = s1.mag;
    magnetizationsRef.current[1] = s2.mag;
    magnetizationsRef.current[2] = s3.mag;

    // Initialize canvas contexts and image data
    canvasRefs.forEach((ref, i) => {
      const canvas = ref.current;
      if (canvas) {
        canvas.width = L;
        canvas.height = L;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctxRefs.current[i] = ctx;
        imageDataRef.current[i] = ctx?.createImageData(L, L) || null;
      }
    });

    setHistory([]);
    drawGrids();
  }, [drawGrids]);

  // Optimized Metropolis step with incremental updates
  const metropolisStep = (grid: Int8Array, L: number, T: number, simIdx: number) => {
    const probs = probsRef.current[T];
    let dE_total = 0;
    let dM_total = 0;
    
    for (let n = 0; n < L * L; n++) {
      const x = Math.floor(Math.random() * L);
      const y = Math.floor(Math.random() * L);
      const idx = y * L + x;
      
      const s = grid[idx];
      const neighbors = 
        grid[y * L + (x + 1) % L] +
        grid[y * L + (x - 1 + L) % L] +
        grid[((y + 1) % L) * L + x] +
        grid[((y - 1 + L) % L) * L + x];
      
      const dE = 2 * s * neighbors;
      
      if (Math.random() < probs[dE]) {
        grid[idx] = -s;
        dE_total += dE;
        dM_total -= (2 * s);
      }
    }
    
    energiesRef.current[simIdx] += dE_total;
    magnetizationsRef.current[simIdx] += dM_total;
  };

  // Simulation loop
  const animate = useCallback(() => {
    if (!isRunning || !gridsRef.current) return;

    const L = size;
    const grids = gridsRef.current;
    const stats = statsRef.current;

    // Step each simulation
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      metropolisStep(grids[0], L, TEMPS.LOW, 0);
      metropolisStep(grids[1], L, TEMPS.CRIT, 1);
      metropolisStep(grids[2], L, TEMPS.HIGH, 2);
    }

    drawGrids();
    timeRef.current += 1;
    
    // Update history less frequently to save performance
    if (timeRef.current % CHART_UPDATE_INTERVAL === 0) {
      const area = L * L;
      const mLow = Math.abs(magnetizationsRef.current[0]) / area;
      const mCrit = Math.abs(magnetizationsRef.current[1]) / area;
      const mHigh = Math.abs(magnetizationsRef.current[2]) / area;
      
      const eLow = energiesRef.current[0] / area;
      const eCrit = energiesRef.current[1] / area;
      const eHigh = energiesRef.current[2] / area;

      // Update stats
      const updateStats = (s: any, m: number, e: number) => {
        s.mSum += m;
        s.m2Sum += m * m;
        s.eSum += e;
        s.e2Sum += e * e;
        s.count += 1;
      };

      updateStats(stats.low, mLow, eLow);
      updateStats(stats.crit, mCrit, eCrit);
      updateStats(stats.high, mHigh, eHigh);

      // Calculate Chi and Cv
      const getChiCv = (s: any, T: number) => {
        const n = s.count;
        const varM = (s.m2Sum / n) - (s.mSum / n) ** 2;
        const varE = (s.e2Sum / n) - (s.eSum / n) ** 2;
        const chi = (L * L / T) * varM;
        const cv = (L * L / (T * T)) * varE;
        return { chi, cv };
      };

      const resLow = getChiCv(stats.low, TEMPS.LOW);
      const resCrit = getChiCv(stats.crit, TEMPS.CRIT);
      const resHigh = getChiCv(stats.high, TEMPS.HIGH);
      
      setHistory(prev => {
        const newData = [...prev, { 
          time: timeRef.current, 
          mLow, mCrit, mHigh,
          eLow, eCrit, eHigh,
          chiLow: resLow.chi, chiCrit: resCrit.chi, chiHigh: resHigh.chi,
          cvLow: resLow.cv, cvCrit: resCrit.cv, cvHigh: resHigh.cv
        }];
        if (newData.length > MAX_HISTORY) return newData.slice(1);
        return newData;
      });
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [isRunning, size, drawGrids]);

  useEffect(() => {
    initProbs();
  }, [initProbs]);

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, animate]);

  // Initial setup
  useEffect(() => {
    initGrids(size);
  }, [size, initGrids]);

  const latest = history[history.length - 1] || { mLow: 0, mCrit: 0, mHigh: 0, eLow: 0, eCrit: 0, eHigh: 0 };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#141414] pb-4">
          <div>
            <h1 className="text-4xl font-serif italic tracking-tight">2D Ising Model Multi-Sim</h1>
            <p className="text-xs uppercase tracking-widest opacity-60 mt-1">Comparing Phase Transitions at Different Temperatures</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-white/50 p-3 rounded-xl border border-[#141414]/10">
            <div className="flex items-center gap-3 px-3 border-r border-[#141414]/10">
              <label className="text-[10px] font-mono uppercase opacity-60 flex items-center gap-1">
                <Settings2 size={12} /> Size:
              </label>
              <select 
                value={size} 
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="bg-transparent font-mono text-xs focus:outline-none cursor-pointer"
              >
                {[20, 30, 40, 50, 60, 80, 100].map(s => (
                  <option key={s} value={s}>{s}x{s}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "flex items-center gap-2 py-2 px-4 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all",
                  isRunning 
                    ? "bg-[#141414] text-[#E4E3E0]" 
                    : "bg-white border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0]"
                )}
              >
                {isRunning ? <Pause size={14} /> : <Play size={14} />}
                {isRunning ? 'Stop' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setIsRunning(false);
                  initGrids(size);
                }}
                className="flex items-center gap-2 py-2 px-4 rounded-lg font-mono text-[10px] uppercase tracking-wider border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Triple Grid Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GridDisplay label="Below Tc" temp={TEMPS.LOW} color={COLORS.LOW} canvasRef={canvasRefs[0]} m={latest.mLow} e={latest.eLow} />
          <GridDisplay label="At Tc" temp={TEMPS.CRIT} color={COLORS.CRIT} canvasRef={canvasRefs[1]} m={latest.mCrit} e={latest.eCrit} />
          <GridDisplay label="Above Tc" temp={TEMPS.HIGH} color={COLORS.HIGH} canvasRef={canvasRefs[2]} m={latest.mHigh} e={latest.eHigh} />
        </div>

        {/* Combined Charts */}
        <StatsCharts history={history} />

        {/* Legend/Info */}
        <div className="bg-[#141414] text-[#E4E3E0] p-6 rounded-2xl flex flex-wrap gap-8 items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
            <span className="text-xs font-mono uppercase tracking-widest">Ordered State (T &lt; Tc)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
            <span className="text-xs font-mono uppercase tracking-widest">Critical State (T ≈ Tc)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
            <span className="text-xs font-mono uppercase tracking-widest">Disordered State (T &gt; Tc)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
