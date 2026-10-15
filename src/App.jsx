import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  Droplets,
  Fan,
  Settings2,
  Waves,
  Zap,
} from 'lucide-react';
import WaterTank from './components/WaterTank.jsx';
import LevelChart from './components/LevelChart.jsx';
import {
  getLevelHistory,
  getTankStatus,
  setControlMode,
  setMotor,
  updateSimulatedLevel,
  updateThresholds,
} from './services/waterApi.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function TankOverview({ level, startAt }) {
  return (
    <section className="card tank-card">
      <div className="section-heading tank-card-heading">
        <div className="section-icon"><Waves size={18} /></div>
        <div>
          <h2>Main tank</h2>
          <p>Current water level</p>
        </div>
        {level <= startAt && (
          <span className="low-water-badge"><AlertTriangle size={12} /> Low water</span>
        )}
      </div>
      <div className="tank-card-content">
        <WaterTank level={level} />
        <div className="level-summary">
          <div className="level-big-number">
            {Math.round(level)}<span>%</span>
          </div>
          <p className="litre-reading">{Math.round(level * 100)} <span>/ 10,000 L</span></p>
          <div className="level-progress-track" aria-label={`${Math.round(level)} percent full`}>
            <div className="level-progress-fill" style={{ width: `${level}%` }} />
          </div>
          <div className="level-meta">
            <span><span className="legend-dot" /> Tank capacity</span>
            <strong>10,000 L</strong>
          </div>
          <p className="tank-helper">Water level updates automatically in this preview.</p>
        </div>
      </div>
    </section>
  );
}

function PumpToggle({ motorOn, onToggle, busy }) {
  return (
    <button
      type="button"
      className={`pump-switch ${motorOn ? 'pump-switch-on' : 'pump-switch-off'}`}
      onClick={onToggle}
      disabled={busy}
      aria-label={motorOn ? 'Turn pump off' : 'Turn pump on'}
      aria-pressed={motorOn}
    >
      <span className="pump-switch-track"><span className="pump-switch-thumb" /></span>
      <span>{motorOn ? 'Pump active' : 'Pump inactive'}</span>
    </button>
  );
}

function MotorCard({ motorOn, mode, onToggleMotor, onSetMode, busy }) {
  return (
    <section className="card motor-card">
      <div className="section-heading">
        <div className="section-icon motor-icon"><Fan size={18} /></div>
        <div>
          <h2>Motor control</h2>
          <p>Water pump status</p>
        </div>
        <span className={`motor-status-dot ${motorOn ? 'status-running' : 'status-stopped'}`} />
      </div>

      <div className="motor-main-row">
        <div className={`pump-illustration ${motorOn ? 'pump-illustration-on' : 'pump-illustration-off'}`}>
          <Fan size={26} strokeWidth={1.8} />
        </div>
        <div className="motor-state-copy">
          <span className="motor-status-label">Motor</span>
          <h3>{motorOn ? 'Running' : 'Stopped'}</h3>
          <span className={`motor-caption ${motorOn ? 'text-positive' : 'text-muted'}`}>
            {motorOn ? 'Water is being filled' : 'Pump is not running'}
          </span>
        </div>
      </div>

      <div className="pump-toggle-row">
        <span className="pump-toggle-label">{motorOn ? 'Pump active' : 'Pump inactive'}</span>
        <PumpToggle motorOn={motorOn} onToggle={onToggleMotor} busy={busy} />
      </div>

      <div className="mode-row">
        <span className="mode-label">Control mode</span>
        <div className="mode-switch" role="group" aria-label="Control mode">
          <button type="button" className={mode === 'auto' ? 'mode-option selected' : 'mode-option'} onClick={() => onSetMode('auto')}>
            <Zap size={13} /> Auto
          </button>
          <button type="button" className={mode === 'manual' ? 'mode-option selected' : 'mode-option'} onClick={() => onSetMode('manual')}>
            Manual
          </button>
        </div>
      </div>
      {mode === 'auto' && <p className="mode-note">The pump follows your start and stop levels.</p>}
      {mode === 'manual' && <p className="mode-note">You control the pump with the switch above.</p>}
    </section>
  );
}

function ThresholdSlider({ title, value, min, max, onChange, helper, accent = 'cyan' }) {
  return (
    <div className={`threshold-control threshold-${accent}`}>
      <div className="threshold-label-row">
        <label htmlFor={title.toLowerCase().replaceAll(' ', '-')}>{title}</label>
        <strong>{value}<span>%</span></strong>
      </div>
      <input
        id={title.toLowerCase().replaceAll(' ', '-')}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--range-progress': `${((value - min) / Math.max(max - min, 1)) * 100}%` }}
      />
      <div className="range-end-labels"><span>{min}%</span><span>{max}%</span></div>
      <p>{helper}</p>
    </div>
  );
}

function ThresholdCard({ startAt, stopAt, onStartChange, onStopChange }) {
  return (
    <section className="card threshold-card">
      <div className="section-heading">
        <div className="section-icon settings-icon"><Settings2 size={18} /></div>
        <div>
          <h2>Fill thresholds</h2>
          <p>Choose when the pump starts and stops</p>
        </div>
      </div>
      <div className="threshold-grid">
        <ThresholdSlider
          title="Start motor at"
          value={startAt}
          min={5}
          max={stopAt - 5}
          onChange={onStartChange}
          helper="Pump turns on below this level"
          accent="blue"
        />
        <ThresholdSlider
          title="Stop motor at"
          value={stopAt}
          min={startAt + 5}
          max={100}
          onChange={onStopChange}
          helper="Pump stops at this level"
          accent="cyan"
        />
      </div>
      <div className="threshold-tip"><Check size={14} /> Keep a gap between start and stop levels to avoid frequent switching.</div>
    </section>
  );
}

export default function App() {
  const [level, setLevel] = useState(68);
  const levelRef = useRef(68);
  const [motorOn, setMotorOn] = useState(true);
  const [mode, setMode] = useState('auto');
  const [startAt, setStartAt] = useState(20);
  const [stopAt, setStopAt] = useState(90);
  const [history, setHistory] = useState([86, 84, 82, 80, 77, 73, 69, 65, 62, 58, 54, 50, 46, 43, 39, 35, 31, 28, 24, 21, 40, 62, 82, 78, 68]);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getTankStatus(), getLevelHistory()])
      .then(([status, readings]) => {
        if (!mounted) return;
        levelRef.current = status.level;
        setLevel(status.level);
        setMotorOn(status.motorOn);
        setMode(status.mode);
        setStartAt(status.startLevel);
        setStopAt(status.stopLevel);
        setHistory(readings);
      })
      .catch(() => {
        if (mounted) setApiError('Unable to load tank data. Retrying after reconnect.');
      });
    return () => { mounted = false; };
  }, []);

  // Preview-only simulation: level rises while the pump is on and falls slowly
  // as water is used. Replace this timer with data from the real backend later.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = levelRef.current;
      let nextMotor = motorOn;
      if (mode === 'auto') {
        if (current >= stopAt) nextMotor = false;
        else if (current <= startAt) nextMotor = true;
      }

      let nextLevel;
      if (nextMotor) {
        const upperLimit = mode === 'auto' ? stopAt : 100;
        nextLevel = Math.min(upperLimit, current + (mode === 'auto' ? 1.0 : 0.8));
      } else {
        nextLevel = Math.max(0, current - 0.28);
      }

      // In automatic mode the motor stops at the upper threshold and starts
      // again at the lower threshold. A 100% reading is always a hard stop.
      if (mode === 'auto' && nextLevel >= stopAt) nextMotor = false;
      if (mode === 'auto' && nextLevel <= startAt) nextMotor = true;
      if (nextLevel >= 100) nextMotor = false;

      if (nextMotor !== motorOn) {
        setMotorOn(nextMotor);
        void setMotor(nextMotor).catch(() => setApiError('Motor command could not be sent.'));
      }
      const rounded = Number(nextLevel.toFixed(1));
      levelRef.current = rounded;
      setLevel(rounded);
      updateSimulatedLevel(rounded);
      setHistory((previous) => previous.map((value, index) => index === previous.length - 1 ? rounded : value));
    }, 2400);
    return () => window.clearInterval(timer);
  }, [motorOn, mode, startAt, stopAt]);

  const handleMotorToggle = useCallback(async () => {
    const desired = !motorOn;
    setBusy(true);
    setApiError('');
    // Using the motor switch is an explicit manual override.
    setMode('manual');
    setMotorOn(desired);
    try {
      await Promise.all([setControlMode('manual'), setMotor(desired)]);
    } catch {
      setApiError('Could not send the motor command.');
    } finally {
      setBusy(false);
    }
  }, [motorOn]);

  const handleModeChange = useCallback(async (nextMode) => {
    setMode(nextMode);
    setApiError('');
    let nextMotor = motorOn;
    if (nextMode === 'auto') {
      if (level >= stopAt) nextMotor = false;
      else if (level <= startAt) nextMotor = true;
    }
    setMotorOn(nextMotor);
    try {
      await Promise.all([setControlMode(nextMode), setMotor(nextMotor)]);
    } catch {
      setApiError('Could not update the control mode.');
    }
  }, [level, motorOn, startAt, stopAt]);

  const handleStartChange = useCallback(async (value) => {
    const nextStart = clamp(value, 5, stopAt - 5);
    setStartAt(nextStart);
    try {
      await updateThresholds({ startLevel: nextStart, stopLevel: stopAt });
    } catch {
      setApiError('Could not save the start threshold.');
    }
  }, [stopAt]);

  const handleStopChange = useCallback(async (value) => {
    const nextStop = clamp(value, startAt + 5, 100);
    setStopAt(nextStop);
    try {
      await updateThresholds({ startLevel: startAt, stopLevel: nextStop });
    } catch {
      setApiError('Could not save the stop threshold.');
    }
  }, [startAt]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Droplets size={23} strokeWidth={2.2} /></div>
          <div>
            <h1>AquaSense</h1>
            <p>SMART WATER CONTROL</p>
          </div>
        </div>
        <div className="topbar-tank-select">
          <span className="topbar-tank-dot" />
          <span>Main tank</span>
          <ChevronDown size={15} />
        </div>
      </header>

      <div className="page-intro">
        <div>
          <p className="eyebrow">WATER MANAGEMENT</p>
          <h2>Your tank at a glance</h2>
          <p className="intro-subtitle">Monitor the level. Control the pump.</p>
        </div>
        <div className="current-reading"><span className="reading-pulse" /> PREVIEW</div>
      </div>

      {apiError && <div className="error-banner" role="status"><AlertTriangle size={15} /> {apiError}</div>}

      <div className="dashboard-grid">
        <TankOverview level={level} startAt={startAt} />
        <MotorCard motorOn={motorOn} mode={mode} onToggleMotor={handleMotorToggle} onSetMode={handleModeChange} busy={busy} />
        <ThresholdCard startAt={startAt} stopAt={stopAt} onStartChange={handleStartChange} onStopChange={handleStopChange} />
        <LevelChart history={history} currentLevel={level} />
      </div>
      <footer className="page-footer"><span className="footer-watermark"><Activity size={13} /> AQUASENSE</span><span>Prototype interface · values are simulated</span></footer>
    </main>
  );
}
