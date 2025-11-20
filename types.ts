
export enum ScenarioType {
  LINEAR_MEET = 'LINEAR_MEET', // 直线相遇
  LINEAR_CHASE = 'LINEAR_CHASE', // 直线追及
  ROUND_TRIP = 'ROUND_TRIP', // 多次往返相遇
  CIRCULAR = 'CIRCULAR', // 环形跑道
}

export interface RunnerState {
  id: 'red' | 'blue';
  position: number; // Distance from start (0 to length)
  speed: number; // Current speed
  direction: 1 | -1; // 1 = forward, -1 = backward
  laps: number; // For circular
  totalDistance: number;
}

export interface SimulationConfig {
  trackLength: number; // meters
  redSpeed: number; // m/s
  blueSpeed: number; // m/s
  initialDistance: number; // meters (gap for chasing)
}

export interface HistoryPoint {
  t: number;
  redPos: number;
  bluePos: number;
}

export interface MeetingPoint {
  t: number;
  pos: number;
  type: 'meet' | 'chase'; // meet (head on) or chase (overtake)
  redTotalDistance: number;
  blueTotalDistance: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}
