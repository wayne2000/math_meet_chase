
import React from 'react';
import { ScenarioType, SimulationConfig } from '../types';
import { Play, Pause, RotateCcw, BrainCircuit } from 'lucide-react';

interface ControlsProps {
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  scenario: ScenarioType;
  setScenario: (s: ScenarioType) => void;
  onExplain: () => void;
  isExplaining: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  config,
  setConfig,
  isPlaying,
  onTogglePlay,
  onReset,
  scenario,
  setScenario,
  onExplain,
  isExplaining
}) => {
  const handleChange = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-white border-t border-slate-200">
      
      {/* Scenario Selector */}
      <div className="col-span-1 space-y-4">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">选择场景 (Scenario)</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: ScenarioType.LINEAR_MEET, label: '直线相遇' },
            { id: ScenarioType.LINEAR_CHASE, label: '直线追及' },
            { id: ScenarioType.ROUND_TRIP, label: '多次往返' },
            { id: ScenarioType.CIRCULAR, label: '环形跑道' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setScenario(s.id as ScenarioType);
                onReset();
              }}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                scenario === s.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={onTogglePlay}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-colors ${
              isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isPlaying ? <><Pause size={18} /> 暂停 (Pause)</> : <><Play size={18} /> 开始 (Start)</>}
          </button>
          <button
            onClick={onReset}
            className="px-4 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            title="重置 (Reset)"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <button
            onClick={onExplain}
            disabled={isExplaining}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
          >
            <BrainCircuit size={18} />
            {isExplaining ? '思考中...' : 'AI 老师讲题'}
          </button>
      </div>

      {/* Sliders */}
      <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Red Settings */}
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-red-600">红队速度 (兔子)</span>
            <span className="text-sm font-mono bg-white px-2 py-1 rounded border border-red-200 text-red-600">{config.redSpeed} m/s</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={config.redSpeed}
            onChange={(e) => handleChange('redSpeed', Number(e.target.value))}
            className="w-full accent-red-500"
          />
        </div>

        {/* Blue Settings */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-blue-600">蓝队速度 (乌龟)</span>
            <span className="text-sm font-mono bg-white px-2 py-1 rounded border border-blue-200 text-blue-600">{config.blueSpeed} m/s</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={config.blueSpeed}
            onChange={(e) => handleChange('blueSpeed', Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Track Settings */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-600">跑道总长</span>
            <span className="text-sm font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">{config.trackLength} 米</span>
          </div>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={config.trackLength}
            onChange={(e) => handleChange('trackLength', Number(e.target.value))}
            className="w-full accent-slate-500"
          />
          
          {scenario === ScenarioType.LINEAR_CHASE && (
             <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-600">蓝队先跑距离 (追及起点差)</span>
                    <span className="text-sm font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">{config.initialDistance} 米</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max={config.trackLength - 50}
                    step="10"
                    value={config.initialDistance}
                    onChange={(e) => handleChange('initialDistance', Number(e.target.value))}
                    className="w-full accent-slate-500"
                />
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Controls;
