
import React, { useState, useEffect, useRef, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';
import SpaceTimeGraph from './components/SpaceTimeGraph';
import { ScenarioType, RunnerState, SimulationConfig, HistoryPoint, MeetingPoint, ChatMessage } from './types';
import { chatWithMathTeacher } from './services/geminiService';
import { Activity, Clock, Send, MessageCircle, User, Bot } from 'lucide-react';

const INITIAL_CONFIG: SimulationConfig = {
  trackLength: 400,
  redSpeed: 10,
  blueSpeed: 6,
  initialDistance: 100,
};

const App: React.FC = () => {
  const [scenario, setScenario] = useState<ScenarioType>(ScenarioType.LINEAR_MEET);
  const [config, setConfig] = useState<SimulationConfig>(INITIAL_CONFIG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  
  // Physics State
  const [redRunner, setRedRunner] = useState<RunnerState>({ id: 'red', position: 0, speed: 10, direction: 1, laps: 0, totalDistance: 0 });
  const [blueRunner, setBlueRunner] = useState<RunnerState>({ id: 'blue', position: 0, speed: 6, direction: 1, laps: 0, totalDistance: 0 });
  
  // History for Graph
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [meetingPoints, setMeetingPoints] = useState<MeetingPoint[]>([]);

  // AI Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset Logic
  const resetSimulation = useCallback(() => {
    setIsPlaying(false);
    setTime(0);
    setHistory([]);
    setMeetingPoints([]);
    
    const { trackLength, initialDistance, redSpeed, blueSpeed } = config;

    // Initial Positions based on scenario
    let redPos = 0;
    let bluePos = 0;
    let blueDir: 1 | -1 = 1;

    switch (scenario) {
      case ScenarioType.LINEAR_MEET:
        redPos = 0;
        bluePos = trackLength;
        blueDir = -1;
        break;
      case ScenarioType.LINEAR_CHASE:
        redPos = 0;
        bluePos = initialDistance;
        blueDir = 1;
        break;
      case ScenarioType.ROUND_TRIP:
        redPos = 0;
        bluePos = trackLength; // Start opposite
        blueDir = -1;
        break;
      case ScenarioType.CIRCULAR:
        redPos = 0;
        bluePos = 0; // Start together
        blueDir = 1;
        break;
    }

    setRedRunner({ id: 'red', position: redPos, speed: redSpeed, direction: 1, laps: 0, totalDistance: 0 });
    setBlueRunner({ id: 'blue', position: bluePos, speed: blueSpeed, direction: blueDir, laps: 0, totalDistance: 0 });

    // Initial history point
    setHistory([{ t: 0, redPos, bluePos }]);
    
  }, [config, scenario]);

  // Initialize on load or scenario change
  useEffect(() => {
    resetSimulation();
    setMessages([]); // Clear chat on scenario change to avoid confusion
  }, [resetSimulation]);

  // Physics Loop
  const updatePhysics = (deltaTime: number) => {
    const dt = deltaTime / 1000; // seconds
    const newTime = time + dt;
    setTime(newTime);

    // Update function for a runner
    const updateRunner = (runner: RunnerState, speed: number, trackLen: number): RunnerState => {
        let newPos = runner.position;
        let newDir = runner.direction;
        let newLaps = runner.laps;
        const distMoved = speed * dt;

        if (scenario === ScenarioType.CIRCULAR) {
           // Circular logic
           const move = distMoved; // Always forward for circular
           newPos += move;
           if (newPos >= trackLen) {
             newPos -= trackLen;
             newLaps++;
           }
        } else if (scenario === ScenarioType.ROUND_TRIP) {
           // Bouncing Logic
           newPos += distMoved * newDir;
           
           // Bounce start
           if (newPos < 0) {
             newPos = -newPos;
             newDir = 1;
           }
           // Bounce end
           if (newPos > trackLen) {
             newPos = trackLen - (newPos - trackLen);
             newDir = -1;
           }
        } else {
           // Simple linear
           newPos += distMoved * newDir;
           
           // Clamp
           if (newPos > trackLen) newPos = trackLen;
           if (newPos < 0) newPos = 0;
        }

        return {
            ...runner,
            position: newPos,
            direction: newDir,
            speed: speed,
            laps: newLaps,
            totalDistance: runner.totalDistance + distMoved
        };
    };

    const nextRed = updateRunner(redRunner, config.redSpeed, config.trackLength);
    const nextBlue = updateRunner(blueRunner, config.blueSpeed, config.trackLength);

    setRedRunner(nextRed);
    setBlueRunner(nextBlue);

    // Check for meetings/crossings
    const prevDiff = redRunner.position - blueRunner.position;
    const nextDiff = nextRed.position - nextBlue.position;
    
    // Simple crossing check (sign change)
    // Note: For circular, we need to handle wrap-around logic more carefully if we wanted perfect exactness, 
    // but for visual simulation this diff check works for standard overtaking if sampled fast enough.
    // For circular overtaking: if red is fast and passes blue.
    
    let crossed = false;
    let type: 'meet' | 'chase' = 'meet';

    if (scenario === ScenarioType.CIRCULAR) {
        // Check if one overtook the other. 
        // Simplistic check: if totalDistance difference crosses a multiple of trackLength?
        // Or just stick to position crossing.
        // Position crossing happens when signs flip, but we need to ignore the wrap-around jump (e.g. 399 -> 1).
        const jump = Math.abs(nextRed.position - redRunner.position) > config.trackLength / 2 || 
                     Math.abs(nextBlue.position - blueRunner.position) > config.trackLength / 2;
        
        if (!jump && Math.sign(prevDiff) !== Math.sign(nextDiff)) {
            crossed = true;
            type = 'chase';
        }
    } else {
        // Linear / Round Trip
        if (Math.sign(prevDiff) !== Math.sign(nextDiff)) {
            crossed = true;
            // If directions are same, it's chase/overtake. If opposite, it's meet.
            type = (nextRed.direction === nextBlue.direction) ? 'chase' : 'meet';
        }
    }

    const isClose = Math.abs(nextDiff) < (config.trackLength / 5); // Generous window to avoid missing visual frames

    if (crossed && isClose) {
        const meetPos = (nextRed.position + nextBlue.position) / 2;
        setMeetingPoints(prev => {
            // Debounce: don't add if we just added one very recently (e.g. < 1s ago) to prevent jitter double-counts
            if (prev.length > 0 && (newTime - prev[prev.length - 1].t) < 1.0) {
                return prev;
            }
            return [...prev, {
                t: newTime,
                pos: meetPos,
                type: type,
                redTotalDistance: nextRed.totalDistance,
                blueTotalDistance: nextBlue.totalDistance
            }];
        });
    }

    // Record History
    setHistory(prev => {
        const newPoint: HistoryPoint = {
            t: newTime,
            redPos: nextRed.position,
            bluePos: nextBlue.position
        };
        const keep = prev.length > 1000 ? prev.slice(prev.length - 1000) : prev;
        return [...keep, newPoint];
    });
  };

  const animate = (currentTime: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = currentTime - previousTimeRef.current;
      const safeDelta = Math.min(deltaTime, 100); 
      updatePhysics(safeDelta);
    }
    previousTimeRef.current = currentTime;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      previousTimeRef.current = undefined;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, scenario, config, redRunner, blueRunner, time]);


  const handleChat = async (userText: string) => {
    if (!userText.trim() || isChatting) return;

    const newUserMsg: ChatMessage = { role: 'user', text: userText, timestamp: Date.now() };
    setMessages(prev => [...prev, newUserMsg]);
    setIsChatting(true);
    setInputQuestion(""); 

    const aiResponseText = await chatWithMathTeacher(
        userText,
        messages,
        scenario,
        config,
        time
    );

    const newAiMsg: ChatMessage = { role: 'ai', text: aiResponseText, timestamp: Date.now() };
    setMessages(prev => [...prev, newAiMsg]);
    setIsChatting(false);
  };

  const handleInitialExplain = () => {
     handleChat("老师，请帮我讲解一下现在的这个运动场景，要注意什么数学规律？");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-20 font-sans">
      
      {/* Header */}
      <header className="w-full bg-indigo-600 text-white py-6 px-4 shadow-lg mb-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold mb-2">奥数行程问题模拟器 🏃‍♂️🏃‍♀️</h1>
          <p className="opacity-90">让相遇和追及问题变得简单直观！</p>
        </div>
      </header>

      <main className="w-full max-w-5xl px-4 grid grid-cols-1 gap-6">
        
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-2">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Clock size={12} /> 耗时 (Time)
                </div>
                <div className="text-2xl font-mono font-bold text-slate-700">{time.toFixed(1)}s</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <div className="text-red-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Activity size={12} /> 红队里程
                </div>
                <div className="text-2xl font-mono font-bold text-red-600">{redRunner.totalDistance.toFixed(0)}m</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <div className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Activity size={12} /> 蓝队里程
                </div>
                <div className="text-2xl font-mono font-bold text-blue-600">{blueRunner.totalDistance.toFixed(0)}m</div>
            </div>
        </div>

        {/* Visualization - Simulation Canvas */}
        <SimulationCanvas 
            scenario={scenario} 
            trackLength={config.trackLength} 
            redRunner={redRunner} 
            blueRunner={blueRunner} 
        />

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <Controls 
                config={config} 
                setConfig={setConfig} 
                isPlaying={isPlaying} 
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onReset={resetSimulation}
                scenario={scenario}
                setScenario={setScenario}
                onExplain={handleInitialExplain}
                isExplaining={isChatting}
            />
        </div>
        
        {/* Graph and Meeting Table */}
        <SpaceTimeGraph 
            history={history} 
            meetingPoints={meetingPoints}
            trackLength={config.trackLength} 
            timeWindow={20} 
        />

        {/* Chat Interface (Moved to bottom) */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-[500px] mt-8">
            <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-indigo-800 font-bold">
                    <MessageCircle size={20} />
                    AI 数学老师答疑室
                </div>
                <div className="text-xs text-indigo-500">随时提问，我会根据当前模拟回答哦</div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 mt-20 px-10">
                        <p className="mb-2">👋 同学你好！我是你的 AI 老师。</p>
                        <p className="text-sm">你可以观察上面的运动，有问题随时问我！</p>
                        <p className="text-xs mt-4">比如：点击“AI 老师讲题”让我帮你分析。</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] md:max-w-[75%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-line ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {isChatting && (
                     <div className="flex justify-start w-full">
                        <div className="flex gap-2">
                             <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-white"><Bot size={16} /></div>
                             <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-slate-500 text-sm flex items-center gap-2">
                                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                             </div>
                        </div>
                     </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={inputQuestion}
                        onChange={(e) => setInputQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChat(inputQuestion)}
                        placeholder="输入你的问题..."
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button 
                        onClick={() => handleChat(inputQuestion)}
                        disabled={!inputQuestion.trim() || isChatting}
                        className="px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
};

export default App;
