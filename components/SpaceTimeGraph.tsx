
import React from 'react';
import { HistoryPoint, MeetingPoint } from '../types';

interface SpaceTimeGraphProps {
  history: HistoryPoint[];
  meetingPoints: MeetingPoint[];
  trackLength: number;
  timeWindow: number; 
}

const SpaceTimeGraph: React.FC<SpaceTimeGraphProps> = ({ history, meetingPoints, trackLength, timeWindow }) => {
  const width = 800;
  const height = 300;
  const padding = 40;

  const latestTime = history.length > 0 ? history[history.length - 1].t : 0;
  
  // Display Logic: Show window of time sliding to the left
  // X Axis = Time. Y Axis = Position on Track.
  const startTime = Math.max(0, latestTime - timeWindow);
  const endTime = startTime + timeWindow;
  
  const visibleHistory = history.filter(p => p.t >= startTime);
  const visibleMeetings = meetingPoints.filter(p => p.t >= startTime && p.t <= latestTime);

  // Map Time (X)
  const getX = (t: number) => {
      const progress = (t - startTime) / timeWindow;
      return padding + progress * (width - padding * 2);
  };
  
  // Map Position (Y)
  // Invert Y so 0 is at bottom, trackLength is at top
  const getY = (pos: number) => {
      const progress = pos / trackLength;
      return (height - padding) - progress * (height - padding * 2);
  };

  // Create SVG Polyline points string
  const createPolyline = (extractor: (p: HistoryPoint) => number) => {
    if (visibleHistory.length < 2) return "";
    return visibleHistory.map(p => `${getX(p.t)},${getY(extractor(p))}`).join(' ');
  };

  return (
    <div className="flex flex-col gap-4">
        {/* The Graph */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-700">运动轨迹图 (S-T 图)</h3>
                    <p className="text-xs text-slate-400">纵轴代表跑道位置，线条交叉点即为相遇点</p>
                </div>
                <div className="text-xs flex gap-3">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> 红队轨迹</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> 蓝队轨迹</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-amber-500 bg-white"></span> 相遇点</div>
                </div>
            </div>
            
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 bg-slate-50 rounded-lg border border-slate-100">
                {/* Grid Lines - Horizontal (Position) */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line 
                    key={`grid-y-${ratio}`}
                    x1={padding} 
                    y1={height - padding - ratio * (height - padding * 2)} 
                    x2={width - padding} 
                    y2={height - padding - ratio * (height - padding * 2)} 
                    stroke="#e2e8f0" 
                    strokeDasharray="4"
                />
                ))}
                
                {/* Grid Lines - Vertical (Time) - Keeping grid but removing detailed labels for simplicity */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
                <line 
                    key={`grid-x-${ratio}`}
                    x1={padding + ratio * (width - padding * 2)} 
                    y1={padding} 
                    x2={padding + ratio * (width - padding * 2)} 
                    y2={height - padding} 
                    stroke="#f1f5f9" 
                    strokeDasharray="4"
                />
                ))}
                
                {/* Axes */}
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="2" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="2" />
                
                {/* Y Axis Labels */}
                <text x={padding - 8} y={height - padding} textAnchor="end" dominantBaseline="middle" className="text-xs fill-slate-500">0m</text>
                <text x={padding - 8} y={padding} textAnchor="end" dominantBaseline="middle" className="text-xs fill-slate-500">{trackLength}m</text>
                <text x={padding - 8} y={height/2} textAnchor="end" dominantBaseline="middle" className="text-xs fill-slate-500 text-slate-300">位置</text>

                {/* Red Trajectory */}
                <polyline
                points={createPolyline(p => p.redPos)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeOpacity="0.8"
                strokeLinejoin="round"
                />
                
                {/* Blue Trajectory */}
                <polyline
                points={createPolyline(p => p.bluePos)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeOpacity="0.8"
                strokeLinejoin="round"
                />

                {/* Meeting Points Markers on Graph */}
                {visibleMeetings.map((meet, i) => (
                    <g key={i} transform={`translate(${getX(meet.t)}, ${getY(meet.pos)})`}>
                        <circle r="4" fill="white" stroke="#f59e0b" strokeWidth="2" />
                    </g>
                ))}
            </svg>
        </div>

        {/* Meeting Data Table */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex justify-between items-center">
                <h3 className="font-bold text-amber-800">📋 相遇数据记录表</h3>
                <span className="text-xs text-amber-600 bg-white px-2 py-1 rounded-md border border-amber-200">
                    共 {meetingPoints.length} 次相遇/追上
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr>
                            <th className="px-4 py-3">序号</th>
                            <th className="px-4 py-3">时间点</th>
                            <th className="px-4 py-3">相遇位置 (离左边)</th>
                            <th className="px-4 py-3 text-red-600">红队总路程</th>
                            <th className="px-4 py-3 text-blue-600">蓝队总路程</th>
                            <th className="px-4 py-3">类型</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {meetingPoints.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                    还没有相遇哦，请点击“开始”或调整速度观察。
                                </td>
                            </tr>
                        ) : (
                            [...meetingPoints].reverse().map((mp, index) => {
                                const realIndex = meetingPoints.length - index;
                                return (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-mono font-bold text-slate-400">#{realIndex}</td>
                                        <td className="px-4 py-3 font-mono">{mp.t.toFixed(1)}s</td>
                                        <td className="px-4 py-3 font-mono">{mp.pos.toFixed(0)}m</td>
                                        <td className="px-4 py-3 font-mono font-bold text-red-600 bg-red-50/50">{mp.redTotalDistance.toFixed(0)}m</td>
                                        <td className="px-4 py-3 font-mono font-bold text-blue-600 bg-blue-50/50">{mp.blueTotalDistance.toFixed(0)}m</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                mp.type === 'meet' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                                            }`}>
                                                {mp.type === 'meet' ? '🤝 相遇' : '⚡ 追上'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default SpaceTimeGraph;
