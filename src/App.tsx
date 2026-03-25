/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
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

interface SimulationData {
  time: number;
  magnetization: number;
  energy: number;
}

export default function App() {
  // Simulation parameters
  const [size, setSize] = useState(50);
  const [temp, setTemp] = useState(2.269); // Critical temperature is ~2.269
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<SimulationData[]>([]);
  
  // Simulation state (using refs for performance in the loop)
  const gridRef = useRef<Int8Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Initialize grid
  const initGrid = useCallback((L: number) => {
    const newGrid = new Int8Array(L * L);
    for (let i = 0; i < L * L; i++) {
      newGrid[i] = Math.random() > 0.5 ? 1 : -1;
    }
    gridRef.current = newGrid;
    timeRef.current = 0;
    setHistory([]);
    drawGrid();
  }, []);

  // Calculate total energy
  const calculateEnergy = (grid: Int8Array, L: number) => {
    let energy = 0;
    for (let y = 0; y < L; y++) {
      for (let x = 0; x < L; x++) {
        const s = grid[y * L + x];
        const right = grid[y * L + (x + 1) % L];
        const down = grid[((y + 1) % L) * L + x];
        energy -= s * (right + down);
      }
    }
    return energy / (L * L);
  };

  // Calculate magnetization
  const calculateMagnetization = (grid: Int8Array, L: number) => {
    let mag = 0;
    for (let i = 0; i < L * L; i++) {
      mag += grid[i];
    }
    return Math.abs(mag) / (L * L);
  };

  // Metropolis step
  const metropolisStep = (grid: Int8Array, L: number, T: number) => {
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
      
      if (dE <= 0 || Math.random() < Math.exp(-dE / T)) {
        grid[idx] = -s;
      }
    }
  };

  // Drawing function
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!canvas || !grid) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const L = size;
    const cellSize = canvas.width / L;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < L; y++) {
      for (let x = 0; x < L; x++) {
        const s = grid[y * L + x];
        ctx.fillStyle = s === 1 ? '#141414' : '#E4E3E0';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }, [size]);

  // Simulation loop
  const animate = useCallback(() => {
    if (!isRunning || !gridRef.current) return;

    const L = size;
    const T = temp;
    const grid = gridRef.current;

    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      metropolisStep(grid, L, T);
    }

    drawGrid();
    
    timeRef.current += 1;
    
    // Update history every few frames to avoid too many state updates
    if (timeRef.current % 5 === 0) {
      const mag = calculateMagnetization(grid, L);
      const energy = calculateEnergy(grid, L);
      
      setHistory(prev => {
        const newData = [...prev, { time: timeRef.current, magnetization: mag, energy }];
        if (newData.length > MAX_HISTORY) return newData.slice(1);
        return newData;
      });
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [isRunning, size, temp, drawGrid]);

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
    initGrid(size);
  }, [size, initGrid]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header & Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border-b border-[#141414] pb-4">
            <h1 className="text-4xl font-serif italic tracking-tight">2D Ising Model</h1>
            <p className="text-xs uppercase tracking-widest opacity-60 mt-2">Metropolis Algorithm Simulation</p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm p-6 border border-[#141414]/10 rounded-xl space-y-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase opacity-60 flex items-center gap-2">
                  <Settings2 size={14} /> System Size (L)
                </label>
                <span className="font-mono text-sm">{size}x{size}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="10" 
                value={size} 
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  setSize(newSize);
                  setIsRunning(false);
                }}
                className="w-full h-1 bg-[#141414]/10 rounded-lg appearance-none cursor-pointer accent-[#141414]"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase opacity-60 flex items-center gap-2">
                  <Zap size={14} /> Temperature (T)
                </label>
                <span className="font-mono text-sm">{temp.toFixed(3)}</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="5.0" 
                step="0.01" 
                value={temp} 
                onChange={(e) => setTemp(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#141414]/10 rounded-lg appearance-none cursor-pointer accent-[#141414]"
              />
              <div className="flex justify-between text-[10px] font-mono opacity-40">
                <span>0.1 (Ordered)</span>
                <span>2.269 (Critical)</span>
                <span>5.0 (Disordered)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-mono text-xs uppercase tracking-wider transition-all",
                  isRunning 
                    ? "bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90" 
                    : "bg-white border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0]"
                )}
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? 'Stop' : 'Start'}
              </button>
              <button
                onClick={() => {
                  setIsRunning(false);
                  initGrid(size);
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-mono text-xs uppercase tracking-wider border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
              >
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          </div>

          <div className="p-6 border border-[#141414]/10 rounded-xl space-y-4 bg-[#141414] text-[#E4E3E0]">
            <h3 className="text-xs font-mono uppercase opacity-50">Current Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase opacity-50 mb-1">Magnetization</p>
                <p className="text-2xl font-mono">
                  {history.length > 0 ? history[history.length - 1].magnetization.toFixed(4) : '0.0000'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 mb-1">Energy / Spin</p>
                <p className="text-2xl font-mono">
                  {history.length > 0 ? history[history.length - 1].energy.toFixed(4) : '0.0000'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Visualization & Charts */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Spin Grid */}
          <div className="bg-white p-4 rounded-2xl shadow-xl border border-[#141414]/5">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} /> Spin Configuration
              </h2>
              <div className="flex gap-4 text-[10px] font-mono opacity-60">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#141414]"></div> Spin Up (+1)
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#E4E3E0] border border-[#141414]/10"></div> Spin Down (-1)
                </div>
              </div>
            </div>
            <div className="aspect-square w-full max-w-[600px] mx-auto overflow-hidden rounded-lg border border-[#141414]/10 bg-[#E4E3E0]">
              <canvas
                ref={canvasRef}
                width={600}
                height={600}
                className="w-full h-full"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#141414]/5 h-[300px]">
              <h3 className="text-xs font-mono uppercase tracking-widest mb-4 opacity-60">Magnetization vs Time</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 1]} fontSize={10} tickFormatter={(v) => v.toFixed(1)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '8px', color: '#E4E3E0', fontSize: '10px' }}
                    itemStyle={{ color: '#E4E3E0' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="magnetization" 
                    stroke="#141414" 
                    strokeWidth={2} 
                    dot={false} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#141414]/5 h-[300px]">
              <h3 className="text-xs font-mono uppercase tracking-widest mb-4 opacity-60">Energy vs Time</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[-2, 0]} fontSize={10} tickFormatter={(v) => v.toFixed(1)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', border: 'none', borderRadius: '8px', color: '#E4E3E0', fontSize: '10px' }}
                    itemStyle={{ color: '#E4E3E0' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="#141414" 
                    strokeWidth={2} 
                    dot={false} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
