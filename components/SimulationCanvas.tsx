
import React from 'react';
import { RunnerState, ScenarioType } from '../types';
import { Flag, Zap } from 'lucide-react';

interface SimulationCanvasProps {
  scenario: ScenarioType;
  trackLength: number;
  redRunner: RunnerState;
  blueRunner: RunnerState;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  scenario,
  trackLength,
  redRunner,
  blueRunner,
}) => {
  const isCircular = scenario === ScenarioType.CIRCULAR;

  // SVG Viewport Config
  const width = 800;
  const height = 300;
  const padding = 40;
  
  // Linear Track Calc
  const trackStart = padding;
  const trackEnd = width - padding;
  const trackPixelWidth = trackEnd - trackStart;
  const scale = trackPixelWidth / trackLength;

  // Circular Track Calc
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 100;
  
  const getLinearX = (pos: number) => trackStart + pos * scale;
  
  const getCircularPos = (pos: number) => {
    // Map pos (0 to trackLength) to angle (-PI/2 start for top)
    // Linear mapping: 0 -> -90deg, L -> 270deg
    const angle = (pos / trackLength) * 2 * Math.PI - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      angle: angle // useful for rotation
    };
  };

  const renderLinear = () => {
    const redX = getLinearX(redRunner.position);
    const blueX = getLinearX(blueRunner.position);

    return (
      <>
        {/* Track Line */}
        <line 
          x1={trackStart} 
          y1={centerY} 
          x2={trackEnd} 
          y2={centerY} 
          stroke="#e2e8f0" 
          strokeWidth="16" 
          strokeLinecap="round" 
        />
        {/* Distance Markers */}
        <line x1={trackStart} y1={centerY - 20} x2={trackStart} y2={centerY + 20} stroke="#94a3b8" strokeWidth="2" />
        <text x={trackStart} y={centerY + 40} textAnchor="middle" className="text-xs fill-slate-500">起点 0m</text>
        
        <line x1={trackEnd} y1={centerY - 20} x2={trackEnd} y2={centerY + 20} stroke="#94a3b8" strokeWidth="2" />
        <text x={trackEnd} y={centerY + 40} textAnchor="middle" className="text-xs fill-slate-500">终点 {trackLength}m</text>

        {/* Red Runner (Top Lane) */}
        <g transform={`translate(${redX}, ${centerY - 15})`}>
           <circle r="12" fill="#ef4444" />
           <text y="5" x="0" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">红</text>
           <circle r="14" fill="none" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.5" className="animate-ping" />
        </g>

        {/* Blue Runner (Bottom Lane) */}
        <g transform={`translate(${blueX}, ${centerY + 15})`}>
           <circle r="12" fill="#3b82f6" />
           <text y="5" x="0" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">蓝</text>
        </g>
      </>
    );
  };

  const renderCircular = () => {
    const redPos = getCircularPos(redRunner.position);
    const bluePos = getCircularPos(blueRunner.position);

    return (
      <>
        {/* Track Circle */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={radius} 
          fill="none" 
          stroke="#e2e8f0" 
          strokeWidth="16" 
        />
        
        {/* Start Line Marker (Top) */}
        <line 
          x1={centerX} y1={centerY - radius - 10} 
          x2={centerX} y2={centerY - radius + 10} 
          stroke="#94a3b8" strokeWidth="3" 
        />
        <text x={centerX} y={centerY - radius - 20} textAnchor="middle" className="text-xs fill-slate-500">起点/终点</text>

        {/* Red Runner */}
        <g transform={`translate(${redPos.x}, ${redPos.y})`}>
           <circle r="12" fill="#ef4444" stroke="white" strokeWidth="2"/>
           <text y="5" x="0" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">红</text>
        </g>

        {/* Blue Runner */}
        <g transform={`translate(${bluePos.x}, ${bluePos.y})`}>
           <circle r="12" fill="#3b82f6" stroke="white" strokeWidth="2" />
           <text y="5" x="0" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">蓝</text>
        </g>
      </>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <div className="flex items-center gap-1 text-red-500 font-bold text-sm bg-red-50 px-2 py-1 rounded-md border border-red-100">
          <Zap size={14} /> 红队: {redRunner.speed} m/s
        </div>
        <div className="flex items-center gap-1 text-blue-500 font-bold text-sm bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
          <Flag size={14} /> 蓝队: {blueRunner.speed} m/s
        </div>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 md:h-80 bg-slate-50">
        {isCircular ? renderCircular() : renderLinear()}
      </svg>
    </div>
  );
};

export default SimulationCanvas;
