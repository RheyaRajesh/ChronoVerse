import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Activity, Play, Pause, GitFork, RefreshCw, AlertTriangle, ShieldCheck, Edit3, X, RotateCcw, Clock } from 'lucide-react';

interface ChronoEvent {
  event_id: string;
  timestamp: string;
  service_name: string;
  event_type: string;
  payload: any;
  correlation_id: string;
}

interface Fork {
  id: string;
  forkTimestamp: string;          // The point-in-time we branched from
  capturedAt: string;             // When the user clicked "fork"
  snapshot: ChronoEvent[];       // Events up to the fork point
  editedEvents: ChronoEvent[];   // User-modified alternate reality
  label: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

// ── Modal: Time-Travel Picker ───────────────────────────────────────────────
function ReplayModal({ events, onConfirm, onClose }: {
  events: ChronoEvent[];
  onConfirm: (ts: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(events[events.length - 1]?.timestamp || '');
  const [customTs, setCustomTs] = useState('');
  const [mode, setMode] = useState<'pick' | 'custom'>('pick');

  const confirm = () => {
    const ts = mode === 'pick' ? selected : customTs;
    if (ts) onConfirm(ts);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Time Travel — Pick a Moment
            </span>
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5"/></button>
        </div>

        <div className="flex gap-2 mb-4 p-1 bg-slate-950 rounded-lg">
          <button onClick={() => setMode('pick')}
            className={`flex-1 py-2 text-sm rounded-md transition-all ${mode === 'pick' ? 'bg-amber-500 text-white font-medium' : 'text-slate-400'}`}>
            Pick from Live Events
          </button>
          <button onClick={() => setMode('custom')}
            className={`flex-1 py-2 text-sm rounded-md transition-all ${mode === 'custom' ? 'bg-amber-500 text-white font-medium' : 'text-slate-400'}`}>
            Enter Custom Timestamp
          </button>
        </div>

        {mode === 'pick' ? (
          events.length === 0 ? (
            <div className="text-center py-8 text-slate-500 italic border border-dashed border-white/10 rounded-xl">
              No events in live stream yet. Generate some events first.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[...events].reverse().map(evt => (
                <button key={evt.event_id}
                  onClick={() => setSelected(evt.timestamp)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selected === evt.timestamp
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/5 bg-slate-950 hover:border-white/20'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-amber-400">{evt.service_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm text-slate-300 mt-0.5 font-medium">{evt.event_type}</div>
                </button>
              ))}
            </div>
          )
        ) : (
          <input
            type="text"
            value={customTs}
            onChange={e => setCustomTs(e.target.value)}
            placeholder="e.g. 2026-04-20T05:00:00Z"
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-slate-200 focus:outline-none focus:border-amber-500/50"
          />
        )}

        <p className="text-xs text-slate-500 mt-3 italic">
          All events <strong>before</strong> this moment will be re-loaded so you can inspect the exact system state before a failure.
        </p>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={confirm}
            className="flex-1 py-2.5 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-all">
            🕛 Travel Back in Time
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Fork Timeline Picker ─────────────────────────────────────────────
function ForkModal({ events, onConfirm, onClose }: {
  events: ChronoEvent[];
  onConfirm: (pivotEvent: ChronoEvent, label: string) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(events[0]?.event_id || '');
  const [label, setLabel] = useState('');

  const confirm = () => {
    const pivot = events.find(e => e.event_id === selectedId);
    if (pivot) onConfirm(pivot, label || `Simulation #${Math.floor(Math.random() * 9000) + 1000}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <GitFork className="h-5 w-5 text-emerald-400" />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Fork Timeline — Create Alternate Reality
            </span>
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5"/></button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Pick a <strong className="text-emerald-400">specific past event</strong> as your branching point. The system will capture all events up to that moment, giving you an isolated sandbox to simulate "What if this event had a different outcome?"
        </p>

        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-500 italic border border-dashed border-white/10 rounded-xl">
            No events available. Go to Live Stream and generate some events first.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mb-4">
            {events.map(evt => (
              <button key={evt.event_id}
                onClick={() => setSelectedId(evt.event_id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedId === evt.event_id
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-white/5 bg-slate-950 hover:border-white/20'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-emerald-400">{evt.service_name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-sm text-slate-300 mt-0.5 font-medium">{evt.event_type}</div>
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Label your simulation (e.g. 'What if payment succeeded?')"
          className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 mb-4"
        />

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={confirm} disabled={events.length === 0}
            className="flex-1 py-2.5 text-sm rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium transition-all">
            ⚡ Create Simulation Fork
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Simulation Sandbox Card ──────────────────────────────────────────────────
function SimulationCard({ fork, onDelete }: { fork: Fork; onDelete: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedPayload, setEditedPayload] = useState('');
  const [localEvents, setLocalEvents] = useState<ChronoEvent[]>(fork.editedEvents);
  const [simRan, setSimRan] = useState(false);

  const startEdit = (evt: ChronoEvent) => {
    setEditingId(evt.event_id);
    setEditedPayload(JSON.stringify(evt.payload, null, 2));
  };

  const saveEdit = (evtId: string) => {
    try {
      const parsed = JSON.parse(editedPayload);
      setLocalEvents(prev => prev.map(e => e.event_id === evtId ? { ...e, payload: parsed } : e));
      setEditingId(null);
      setSimRan(false);
    } catch {
      alert('Invalid JSON. Please check the payload format.');
    }
  };

  const runSimulation = () => {
    setSimRan(true);
  };

  const pivotIdx = localEvents.findIndex(e => e.event_id === fork.snapshot[0]?.event_id);
  const eventsBeforePivot = localEvents.slice(pivotIdx >= 0 ? pivotIdx + 1 : 0);

  return (
    <div className="p-5 bg-slate-950/60 border border-emerald-500/20 rounded-2xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <GitFork className="h-3.5 w-3.5" />
            {fork.label}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Branched from {new Date(fork.forkTimestamp).toLocaleTimeString()} · {fork.snapshot.length} events captured
          </div>
        </div>
        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Event List with Editor */}
      <div className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-1">
        Alternate Reality Editor
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {localEvents.map(evt => (
          <div key={evt.event_id}
            className={`rounded-xl border transition-all ${editingId === evt.event_id
              ? 'border-yellow-500/40 bg-yellow-500/5'
              : evt.event_id === fork.snapshot[0]?.event_id
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-white/5 bg-black/30'}`}>
            <div className="flex items-center justify-between p-2.5">
              <div className="flex items-center gap-2">
                {evt.event_id === fork.snapshot[0]?.event_id && (
                  <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">FORK POINT</span>
                )}
                <span className="text-[10px] font-mono text-emerald-400">{evt.service_name}</span>
                <span className="text-[10px] text-slate-300">{evt.event_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-600 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                {editingId !== evt.event_id ? (
                  <button onClick={() => startEdit(evt)}
                    className="text-slate-500 hover:text-yellow-400 transition-colors" title="Edit payload">
                    <Edit3 className="h-3 w-3" />
                  </button>
                ) : (
                  <button onClick={() => saveEdit(evt.event_id)}
                    className="text-[9px] bg-yellow-500 text-black px-2 py-0.5 rounded font-bold hover:bg-yellow-400">
                    SAVE
                  </button>
                )}
              </div>
            </div>
            {editingId === evt.event_id && (
              <div className="px-2.5 pb-2.5">
                <textarea
                  value={editedPayload}
                  onChange={e => setEditedPayload(e.target.value)}
                  className="w-full bg-black/50 border border-yellow-500/30 rounded-lg px-3 py-2 text-[10px] font-mono text-yellow-300 focus:outline-none resize-none"
                  rows={5}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Run Simulation Button */}
      <button onClick={runSimulation}
        className="w-full py-2.5 text-sm rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        <Play className="h-4 w-4" />
        Run Simulation with Modified Events
      </button>

      {/* Simulation Result */}
      {simRan && (
        <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
          <div className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Simulated Outcome
          </div>
          <div className="space-y-1">
            {localEvents.map(evt => (
              <div key={evt.event_id} className="flex justify-between text-[10px] font-mono text-slate-400">
                <span className="text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                <span className={evt.event_type.toLowerCase().includes('fail') || JSON.stringify(evt.payload).toLowerCase().includes('error')
                  ? 'text-red-400' : 'text-emerald-400'}>
                  {evt.event_type}
                </span>
                <span className="text-slate-600">{evt.service_name}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-500 italic">
            {localEvents.some(e => e.event_type.toLowerCase().includes('fail') || JSON.stringify(e.payload).toLowerCase().includes('error'))
              ? '⚠️ Simulation detected failures. Try editing the failing event payloads to see if the outcome changes.'
              : '✅ No failures detected in this alternate timeline. The system would have operated normally.'}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [events, setEvents] = useState<ChronoEvent[]>([]);
  const [replayedEvents, setReplayedEvents] = useState<ChronoEvent[]>([]);
  const [forks, setForks] = useState<Fork[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'replay' | 'forks'>('live');
  const [connected, setConnected] = useState(false);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [showForkModal, setShowForkModal] = useState(false);

  const isPausedRef = useRef(false);
  const isReplayingRef = useRef(false);

  const setIsPausedSynced = (val: boolean) => { setIsPaused(val); isPausedRef.current = val; };
  const setReplayingSynced = (val: boolean) => { setReplaying(val); isReplayingRef.current = val; };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
    const socket = io(socketUrl);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('new_event', (event: ChronoEvent) => {
      if (isPausedRef.current || isReplayingRef.current) return;
      setEvents(prev => [event, ...prev].slice(0, 100));
      if (JSON.stringify(event.payload).toLowerCase().includes('error')) {
        setAnomalyCount(c => c + 1);
      }
    });
    return () => { socket.disconnect(); };
  }, []);

  const handleReplayConfirm = async (timestamp: string) => {
    setShowReplayModal(false);
    const targetMs = new Date(timestamp).getTime();
    // Unified Backend: Engine logic is now inside the API service
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    try {
      setReplayingSynced(true);
      setActiveTab('replay');
      const response = await axios.get(`${apiUrl}/replay/${encodeURIComponent(timestamp)}`);
      
      if (response.data.status === 'success' && response.data.raw_events?.length > 0) {
        const hist = [...response.data.raw_events].reverse();
        setReplayedEvents(hist);
        showToast(`Replayed ${hist.length} events up to ${new Date(timestamp).toLocaleTimeString()}`, 'info');
      } else {
        // Fallback: use events already in the live feed up to the chosen timestamp
        // Correct Filter: Only events whose timestamp is <= targetMs
        const filtered = events.filter(e => new Date(e.timestamp).getTime() <= targetMs);
        setReplayedEvents(filtered);
        showToast(`Showing ${filtered.length} cached events up to ${new Date(timestamp).toLocaleTimeString()}`, 'info');
      }
    } catch {
      const filtered = events.filter(e => new Date(e.timestamp).getTime() <= targetMs);
      setReplayedEvents(filtered);
      showToast(`Engine offline — showing ${filtered.length} cached events`, 'info');
    }
  };

  const handleForkConfirm = async (pivotEvent: ChronoEvent, label: string) => {
    setShowForkModal(false);
    const pivotMs = new Date(pivotEvent.timestamp).getTime();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    try {
      await axios.post(`${apiUrl}/fork?target_timestamp=${encodeURIComponent(pivotEvent.timestamp)}`);
    } catch { /* fork still works client-side */ }

    // Correct Snapshot: we want every event that happened AT OR BEFORE the pivotEvent
    // Since 'events' is [Newest...Oldest], the historical section is from the pivotIdx to the END
    const pivotIdx = events.findIndex(e => e.event_id === pivotEvent.event_id);
    const snapshot = pivotIdx >= 0 ? events.slice(pivotIdx) : [pivotEvent];

    const newFork: Fork = {
      id: `fork-${Date.now()}`,
      forkTimestamp: pivotEvent.timestamp,
      capturedAt: new Date().toISOString(),
      snapshot,
      editedEvents: [...snapshot],
      label,
    };

    setForks(prev => [newFork, ...prev]);
    setActiveTab('forks');
    showToast(`Timeline forked at "${pivotEvent.event_type}" — ${snapshot.length} events captured`, 'success');
  };

  const handleResumeLive = () => {
    setReplayingSynced(false);
    setIsPausedSynced(false);
    setActiveTab('live');
    setReplayedEvents([]);
  };

  const displayEvents = activeTab === 'replay' ? replayedEvents : events;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Modals */}
      {showReplayModal && (
        <ReplayModal
          events={events}
          onConfirm={handleReplayConfirm}
          onClose={() => setShowReplayModal(false)}
        />
      )}
      {showForkModal && (
        <ForkModal
          events={events}
          onConfirm={handleForkConfirm}
          onClose={() => setShowForkModal(false)}
        />
      )}

      {/* Navbar */}
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
                onClick={() => { if (events.length === 0) { showToast('Generate some events first via generate_samples.ps1', 'error'); return; } setShowForkModal(true); }}
                className="flex items-center space-x-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
              >
                <GitFork className="h-4 w-4" />
                <span>Fork Timeline</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-900/40 p-1 rounded-xl border border-white/5 max-w-md">
          <button
            onClick={() => { setActiveTab('live'); handleResumeLive(); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'live' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Activity className="h-4 w-4" /><span>Live Stream</span>
          </button>
          <button
            onClick={() => { setActiveTab('replay'); if (!replaying) setShowReplayModal(true); }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'replay' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <RefreshCw className="h-4 w-4" /><span>Time Travel</span>
          </button>
          <button
            onClick={() => setActiveTab('forks')}
            className={`relative flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'forks' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <GitFork className="h-4 w-4" /><span>Simulations</span>
            {forks.length > 0 && (
              <span className="ml-1 bg-red-500 text-[8px] h-4 w-4 flex items-center justify-center rounded-full font-bold">
                {forks.length}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold flex items-center">
                  {activeTab === 'live' && <Activity className="h-4 w-4 mr-2 text-indigo-400" />}
                  {activeTab === 'replay' && <RefreshCw className="h-4 w-4 mr-2 text-amber-400" />}
                  {activeTab === 'forks' && <GitFork className="h-4 w-4 mr-2 text-emerald-400" />}
                  {activeTab === 'live' && 'Live Event Feed'}
                  {activeTab === 'replay' && 'Historical Replay'}
                  {activeTab === 'forks' && 'Simulation Sandbox'}
                </h2>
                {activeTab === 'live' && (
                  <div className="flex space-x-2">
                    <button onClick={() => setIsPausedSynced(false)}
                      className={`p-2 rounded border border-white/5 transition-colors ${isPaused ? 'bg-white/5 hover:bg-white/10 text-emerald-400' : 'bg-indigo-500 text-white'}`}
                      title="Play / Resume Live">
                      <Play className="h-4 w-4" />
                    </button>
                    <button onClick={() => setIsPausedSynced(true)}
                      className={`p-2 rounded border border-white/5 transition-colors ${isPaused ? 'bg-indigo-500 text-white' : 'bg-white/5 hover:bg-white/10 text-amber-400'}`}
                      title="Pause Stream">
                      <Pause className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {activeTab === 'replay' && replaying && (
                  <button onClick={handleResumeLive}
                    className="flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-colors">
                    <RotateCcw className="h-3 w-3" /> Back to Live
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {activeTab === 'forks' ? (
                  forks.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 border border-dashed border-white/10 rounded-xl">
                      <GitFork className="h-8 w-8 mx-auto mb-3 opacity-30" />
                      <p className="italic text-sm">No simulations yet.</p>
                      <p className="text-xs mt-1">Click <strong>Fork Timeline</strong> in the header to branch from a past event.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {forks.map(fork => (
                        <SimulationCard
                          key={fork.id}
                          fork={fork}
                          onDelete={() => setForks(prev => prev.filter(f => f.id !== fork.id))}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  displayEvents.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 italic border border-dashed border-white/10 rounded-xl">
                      {activeTab === 'replay' ? (
                        <div>
                          <RefreshCw className="h-7 w-7 mx-auto mb-2 opacity-30" />
                          <p>Click <strong>Time Travel</strong> tab again to pick a moment in time.</p>
                        </div>
                      ) : 'Waiting for live events...'}
                    </div>
                  ) : (
                    displayEvents.map(evt => (
                      <div key={evt.event_id}
                        className="group relative p-4 bg-slate-950 border border-white/5 rounded-xl hover:border-indigo-500/50 transition-all">
                        <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === 'replay' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-3">
                            <span className={`text-xs font-mono px-2 py-1 rounded ${activeTab === 'replay' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                              {evt.service_name}
                            </span>
                            <span className="text-sm font-medium text-slate-300">{evt.event_type}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => handleForkConfirm(evt, `Simulation from ${evt.event_type}`)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded transition-all"
                              title="Fork timeline from this event"
                            >
                              <GitFork className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs text-slate-500 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                          </div>
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

          {/* Sidebar */}
          <div className="col-span-1 space-y-6">
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold flex items-center mb-6">
                <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" /> System Health
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-white/5 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Live Events</div>
                  <div className="text-2xl font-bold text-slate-200">{events.length}</div>
                </div>
                <div className="p-4 bg-slate-950 border border-white/5 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Anomalies</div>
                  <div className="text-2xl font-bold text-amber-400 flex items-center">
                    {anomalyCount} {anomalyCount > 0 && <AlertTriangle className="h-4 w-4 ml-2" />}
                  </div>
                </div>
                <div className="p-4 bg-slate-950 border border-white/5 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Simulations</div>
                  <div className="text-2xl font-bold text-emerald-400">{forks.length}</div>
                </div>
                <div className="p-4 bg-slate-950 border border-white/5 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Replayed</div>
                  <div className="text-2xl font-bold text-amber-300">{replayedEvents.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => { setActiveTab('replay'); setShowReplayModal(true); }}
                  className="w-full text-left px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-colors text-sm flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-amber-400" /> Time Travel Replay</span>
                  {replaying && <span className="bg-amber-500 text-[10px] px-2 py-0.5 rounded-full text-white font-bold">ACTIVE</span>}
                </button>
                <button
                  onClick={() => { if (events.length === 0) { showToast('Generate some events first via generate_samples.ps1', 'error'); return; } setShowForkModal(true); }}
                  className="w-full text-left px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-colors text-sm flex items-center gap-2 group"
                >
                  <GitFork className="h-4 w-4 text-emerald-400" /> Fork & Simulate
                </button>
                {replaying && (
                  <button onClick={handleResumeLive}
                    className="w-full text-left px-4 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl transition-colors text-sm text-indigo-400 font-medium">
                    Resume Live Monitoring
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[100]">
          <div className={`px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center space-x-3 
            ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
            {toast.type === 'error' ? <AlertTriangle className="h-5 w-5" /> :
             toast.type === 'success' ? <ShieldCheck className="h-5 w-5" /> :
             <Activity className="h-5 w-5" />}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
