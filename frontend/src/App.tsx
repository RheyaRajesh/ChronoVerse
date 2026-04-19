import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Activity, Play, Pause, GitFork, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Event {
  event_id: string;
  timestamp: string;
  service_name: string;
  event_type: string;
  payload: any;
  correlation_id: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [forks, setForks] = useState<{ timestamp: string; snapshot: Event[] }[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'replay' | 'forks'>('live');
  const [connected, setConnected] = useState(false);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const isPausedRef = useRef(false);
  const isReplayingRef = useRef(false);

  const setIsPausedSynced = (val: boolean) => {
    setIsPaused(val);
    isPausedRef.current = val;
  };

  const setReplayingSynced = (val: boolean) => {
    setReplaying(val);
    isReplayingRef.current = val;
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Setup WebSocket connection to Visualization service (Now merged into Core API)
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
    const socket = io(socketUrl);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    
    socket.on('new_event', (event: Event) => {
      // Logic for stream control using refs to avoid stale closure
      if (isPausedRef.current || isReplayingRef.current) return;

      setEvents((prev) => [event, ...prev].slice(0, 100));
      
      // Mock simple anomaly UI reaction
      if (JSON.stringify(event.payload).toLowerCase().includes('error')) {
        setAnomalyCount(c => c + 1);
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleFork = async () => {
    if (events.length === 0) return;
    try {
      const topEvent = events[0];
      await axios.post(`http://localhost:8000/fork?target_timestamp=${encodeURIComponent(topEvent.timestamp)}`);
      
      const newFork = { timestamp: topEvent.timestamp, snapshot: [...events] };
      setForks(prev => [newFork, ...prev]);
      setActiveTab('forks');
      
      showToast('Timeline Fork Created at ' + topEvent.timestamp, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to create fork', 'error');
    }
  };

  const handleReplay = async () => {
    const timestamp = prompt("Enter target timestamp for replay (ISO format, e.g., 2026-04-19T20:00:00Z):", new Date().toISOString());
    if (!timestamp) return;

    try {
      setReplayingSynced(true);
      setActiveTab('replay');
      const response = await axios.get(`http://localhost:8000/replay/${encodeURIComponent(timestamp)}`);
      if (response.data.status === 'success') {
        const historicalEvents = response.data.raw_events;
        setEvents(historicalEvents.reverse()); // Reverse to show latest at top
        showToast(`Replayed ${historicalEvents.length} events up to ${timestamp}`, 'info');
      }
    } catch (e) {
      console.error(e);
      setReplayingSynced(false);
      showToast('Failed to fetch replay data', 'error');
    }
  };

  const handleResumeLive = () => {
    setReplayingSynced(false);
    setIsPausedSynced(false);
    setActiveTab('live');
    setEvents([]); // Clear to wait for new live events
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <nav className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                <Activity className="h-5 w-5 text-indigo-400" />
              </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                ChronoVerse
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold -mt-1">
                Debugging beyond time
              </span>
            </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-sm px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <div className={`h-2 w-2 rounded-full mr-2 ${connected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-red-400'}`} />
                {connected ? 'Live' : 'Disconnected'}
              </span>
              <button 
                onClick={handleFork}
                className="flex items-center space-x-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
              >
                <GitFork className="h-4 w-4" />
                <span>Fork Timeline</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-width-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-900/40 p-1 rounded-xl border border-white/5 max-w-md">
          <button 
            onClick={() => { setActiveTab('live'); handleResumeLive(); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'live' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Activity className="h-4 w-4" />
            <span>Live Stream</span>
          </button>
          <button 
            onClick={() => { setActiveTab('replay'); if (!replaying) handleReplay(); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'replay' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Time Travel</span>
          </button>
          <button 
            onClick={() => setActiveTab('forks')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'forks' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <GitFork className="h-4 w-4" />
            <span>Simulations</span>
            {forks.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-[8px] h-4 w-4 flex items-center justify-center rounded-full border-2 border-slate-950 font-bold">{forks.length}</span>}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center">
                  {activeTab === 'live' ? <Activity className="h-4 w-4 mr-2 text-indigo-400" /> : 
                   activeTab === 'replay' ? <RefreshCw className="h-4 w-4 mr-2 text-amber-400" /> : 
                   <GitFork className="h-4 w-4 mr-2 text-emerald-400" />}
                  {activeTab === 'live' ? 'Live Event Feed' : 
                   activeTab === 'replay' ? 'Historical Replay' : 'Simulation Forks'}
                </h2>
                {activeTab === 'live' && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setIsPausedSynced(false)}
                      className={`p-2 rounded border border-white/5 transition-colors ${isPaused ? 'bg-white/5 hover:bg-white/10 text-emerald-400' : 'bg-indigo-500 text-white'}`}
                      title="Play / Resume Live"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setIsPausedSynced(true)}
                      className={`p-2 rounded border border-white/5 transition-colors ${isPaused ? 'bg-indigo-500 text-white' : 'bg-white/5 hover:bg-white/10 text-amber-400'}`}
                      title="Pause Stream"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {activeTab === 'forks' ? (
                  forks.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 italic border border-dashed border-white/10 rounded-xl">
                      No simulations active. Fork a timeline to start.
                    </div>
                  ) : (
                    forks.map((fork, i) => (
                      <div key={i} className="p-4 bg-slate-950/60 border border-emerald-500/20 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-emerald-400 flex items-center">
                            <GitFork className="h-3 w-3 mr-2" /> Simulation @ {new Date(fork.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono italic">
                            Captured {fork.snapshot.length} events
                          </span>
                        </div>
                        <div className="space-y-2 opacity-80 scale-[0.98] origin-top">
                           {fork.snapshot.slice(0, 3).map(evt => (
                             <div key={evt.event_id} className="p-2 bg-black/40 border border-white/5 rounded text-[10px] font-mono text-slate-400 flex justify-between">
                               <span>{evt.event_type}</span>
                               <span>{evt.service_name}</span>
                             </div>
                           ))}
                           {fork.snapshot.length > 3 && <div className="text-[9px] text-center text-slate-600">... {fork.snapshot.length - 3} more events</div>}
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  events.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 italic border border-dashed border-white/10 rounded-xl">
                      {activeTab === 'replay' ? 'Pulling timeline data...' : 'Waiting for live events...'}
                    </div>
                  ) : (
                    events.map((evt, i) => (
                      <div key={evt.event_id} 
                           className="group relative p-4 bg-slate-950 border border-white/5 rounded-xl hover:border-indigo-500/50 transition-all cursor-pointer">
                        <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'replay' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-3">
                            <span className={`text-xs font-mono px-2 py-1 rounded ${activeTab === 'replay' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                              {evt.service_name}
                            </span>
                            <span className="text-sm font-medium text-slate-300">
                              {evt.event_type}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-3 p-3 bg-black/40 rounded-lg overflow-x-auto whitespace-pre">
                          {JSON.stringify(evt.payload, null, 2)}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1 space-y-6">
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold flex items-center mb-6">
                <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" /> System Health
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-white/5 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Total Events</div>
                  <div className="text-2xl font-bold text-slate-200">{events.length}</div>
                </div>
                <div className="p-4 bg-slate-950 border border-white/5 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Anomalies</div>
                  <div className="text-2xl font-bold text-amber-400 flex items-center">
                    {anomalyCount} {anomalyCount > 0 && <AlertTriangle className="h-4 w-4 ml-2" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
               <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
               <div className="space-y-3">
                 <button 
                   onClick={handleReplay}
                   className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors text-sm flex items-center justify-between"
                 >
                   <span>Replay specific timeframe</span>
                   {replaying && <span className="bg-amber-500 text-[10px] px-2 py-0.5 rounded-full text-white font-bold">REPLAYING</span>}
                 </button>
                 {replaying && (
                   <button 
                     onClick={handleResumeLive}
                     className="w-full text-left px-4 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl transition-colors text-sm text-indigo-400 font-medium"
                   >
                     Resume Live Monitoring
                   </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[100] animate-slide-up">
          <div className={`px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center space-x-3 
            ${(() => {
                if (toast.type === 'error') return 'bg-red-500/10 border-red-500/20 text-red-400';
                if (toast.type === 'success') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
              })()}`}>
            {(() => {
                if (toast.type === 'error') return <AlertTriangle className="h-5 w-5" />;
                if (toast.type === 'success') return <ShieldCheck className="h-5 w-5" />;
                return <Activity className="h-5 w-5" />;
              })()}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
