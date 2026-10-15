import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Fan,
  Settings2,
  Waves,
  Zap,
  Bell,
  X,
  Github,
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

const UNITS = ['L', 'ml'];

// Keeps the capacity field clean. Litres allow up to 3 decimals (1 ml = 0.001 L);
// millilitres are whole numbers only.
function sanitizeCapacity(raw, unit) {
  if (unit === 'ml') return raw.replace(/[^0-9]/g, '').slice(0, 12);
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const [whole = '', ...rest] = cleaned.split('.');
  const decimals = rest.join('').slice(0, 3);
  const head = whole.slice(0, 9);
  return rest.length > 0 ? `${head}.${decimals}` : head;
}

function toLitres(value, unit) {
  const number = parseFloat(value) || 0;
  return unit === 'ml' ? number / 1000 : number;
}

function convertCapacity(value, from, to) {
  if (from === to) return value;
  const number = parseFloat(value);
  if (!Number.isFinite(number)) return value;
  return to === 'ml'
    ? String(Math.round(number * 1000))
    : String(Number((number / 1000).toFixed(3)));
}

function TankOverview({ level, startAt, capacityLitres, capacityInput, unit, onCapacityChange, onUnitChange }) {
  const capacityInUnit = unit === 'ml' ? capacityLitres * 1000 : capacityLitres;
  const volumeInUnit = (level / 100) * capacityInUnit;
  const fractionDigits = unit === 'ml' ? 0 : 2;
  const formatAmount = (amount) => amount.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });

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
          <p className="litre-reading">{formatAmount(volumeInUnit)} <span>/ {formatAmount(capacityInUnit)} {unit}</span></p>
          <div className="level-progress-track" aria-label={`${Math.round(level)} percent full`}>
            <div className="level-progress-fill" style={{ width: `${level}%` }} />
          </div>
          <div className="capacity-editor">
            <div className="capacity-editor-head">
              <label htmlFor="tank-capacity">Tank capacity</label>
              <div className="unit-switch" role="group" aria-label="Capacity unit">
                {UNITS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={option === unit ? 'unit-option selected' : 'unit-option'}
                    aria-pressed={option === unit}
                    onClick={() => onUnitChange(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="capacity-input-wrap">
              <input
                id="tank-capacity"
                type="text"
                inputMode={unit === 'ml' ? 'numeric' : 'decimal'}
                value={capacityInput}
                onChange={(event) => onCapacityChange(event.target.value)}
                aria-label={`Tank capacity in ${unit === 'ml' ? 'millilitres' : 'litres'}`}
              />
              <span>{unit}</span>
            </div>
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
  const [capacity, setCapacity] = useState('10000');
  const [capacityUnit, setCapacityUnit] = useState('L');
  const [notifications, setNotifications] = useState([]);
  const [exitingNotificationIds, setExitingNotificationIds] = useState([]);
  const previousLevelRef = useRef(null);
  const notificationIdRef = useRef(0);

  const addNotification = useCallback((title, message, kind = 'info') => {
    const item = { id: ++notificationIdRef.current, title, message, kind, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setNotifications((items) => [item, ...items].slice(0, 3));
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  }, []);

  const dismissNotification = useCallback((id) => {
    setExitingNotificationIds((ids) => ids.includes(id) ? ids : [...ids, id]);
    window.setTimeout(() => {
      setNotifications((items) => items.filter((item) => item.id !== id));
      setExitingNotificationIds((ids) => ids.filter((itemId) => itemId !== id));
    }, 280);
  }, []);

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

  useEffect(() => {
    const previous = previousLevelRef.current;
    if (previous !== null) {
      if (previous > startAt && level <= startAt) {
        addNotification('Low water threshold reached', `Tank level is at ${Math.round(level)}%. The pump should start in automatic mode.`, 'low');
      }
      if (previous < stopAt && level >= stopAt) {
        addNotification('Upper threshold reached', `Tank level is at ${Math.round(level)}%. The pump should stop in automatic mode.`, 'high');
      }
    }
    previousLevelRef.current = level;
  }, [level, startAt, stopAt, addNotification]);

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

  // Switching units converts the typed amount too (2 L <-> 2000 ml).
  const handleUnitChange = useCallback((nextUnit) => {
    if (nextUnit === capacityUnit) return;
    setCapacity((current) => convertCapacity(current, capacityUnit, nextUnit));
    setCapacityUnit(nextUnit);
  }, [capacityUnit]);

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
    <main className="app-shell water-dashboard">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        :root { color-scheme: dark; background: #0d141f; }
        html, body, #root { min-height: 100%; margin: 0; background: #0d141f !important; }
        .water-dashboard, .water-dashboard * { font-family: Montserrat, sans-serif !important; }
        .water-dashboard { width: 100%; max-width: none; margin: 0; background: radial-gradient(1100px 520px at 15% -8%, #172438 0%, #0d141f 62%) #0d141f !important; color: #edf3fc; min-height: 100vh; padding: 22px 24px 22px; box-sizing: border-box; }
        .water-dashboard .card { background: #162132 !important; border-color: #27364d !important; box-shadow: 0 10px 28px #05090f55, inset 0 1px 0 #ffffff0d !important; }
        .water-dashboard .section-icon, .water-dashboard .pump-illustration { opacity: 1 !important; }
        .water-dashboard svg { opacity: 1 !important; stroke-opacity: 1 !important; }
        .water-dashboard .text-muted, .water-dashboard .mode-note, .water-dashboard .tank-helper,
        .water-dashboard .threshold-control p, .water-dashboard .range-end-labels { color: #a7b6ca !important; }
        .water-dashboard .servo-header { display: flex; align-items: center; min-height: 46px; margin: 0 0 20px; padding: 0 0 14px; border-bottom: 1px solid #27364d; }
        .water-dashboard .servo-header h1 { margin: 0; color: #f1f6ff; font-size: 25px; line-height: 1.25; letter-spacing: -0.045em; font-weight: 800; }
        .water-dashboard .servo-header h1 span { color: #38bdf8; }
        .water-dashboard .servo-header-mark { width: 4px; height: 26px; margin-right: 12px; border-radius: 8px; background: linear-gradient(180deg, #67e8f9, #3b82f6); box-shadow: 0 0 18px #38bdf844; }
        .water-dashboard .dashboard-grid { margin-top: 0; }
        .water-dashboard .servo-footer { display: flex; justify-content: center; margin-top: 22px; padding-top: 14px; }
        .water-dashboard .github-link { display: inline-flex; align-items: center; gap: 8px; color: #aebed4; text-decoration: none; font-size: 12px; font-weight: 600; transition: color 160ms ease; }
        .water-dashboard .github-link:hover { color: #f1f6ff; }
        .water-dashboard .github-link svg { color: #d9e4f5; }
        @media (max-width: 640px) { .water-dashboard { padding: 18px 14px 20px; } .water-dashboard .servo-header { margin-bottom: 14px; } .water-dashboard .servo-header h1 { font-size: 23px; } }
        .water-dashboard .capacity-editor { display: flex; flex-direction: column; gap: 8px; margin-top: 18px; }
        .water-dashboard .capacity-editor label { color: #c6d3e5; font-size: 12px; font-weight: 700; }
        .water-dashboard .capacity-input-wrap { display: flex; align-items: center; max-width: 220px; gap: 10px; }
        .water-dashboard .capacity-input-wrap input { width: 100%; min-width: 0; background: #0f1826; color: #f3f7ff; border: 1px solid #3a4a63; border-radius: 9px; padding: 10px 12px; font: inherit; outline: none; }
        .water-dashboard .capacity-input-wrap input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px #38bdf833; }
        .water-dashboard .capacity-input-wrap span { color: #cbd8e8; font-weight: 700; }
        .water-dashboard .notification-stack { display: grid; gap: 8px; margin-bottom: 14px; }
        .water-dashboard .notification-item { display: flex; align-items: flex-start; gap: 10px; background: #1c2a3f; border: 1px solid #34465e; border-left: 3px solid #38bdf8; padding: 12px 14px; border-radius: 10px; overflow: hidden; max-height: 140px; opacity: 1; transform: translateY(0); transition: opacity 240ms ease, transform 240ms ease, max-height 280ms ease, padding 280ms ease, border-width 280ms ease, margin 280ms ease; }
        .water-dashboard .notification-item.is-exiting { opacity: 0; transform: translateY(-8px) scale(.985); max-height: 0; padding-top: 0; padding-bottom: 0; border-top-width: 0; border-bottom-width: 0; border-left-width: 0; margin-top: -8px; pointer-events: none; }
        .water-dashboard .notification-item.low { border-left-color: #f59e0b; }
        .water-dashboard .notification-item.high { border-left-color: #34d399; }
        .water-dashboard .notification-copy { flex: 1; min-width: 0; }
        .water-dashboard .notification-copy strong { display: block; font-size: 13px; color: #f4f7fb; }
        .water-dashboard .notification-copy p { margin: 3px 0 0; color: #b6c4d8; font-size: 12px; line-height: 1.5; }
        .water-dashboard .notification-copy time { display: block; margin-top: 5px; font-size: 10px; color: #8fa2bb; }
        .water-dashboard .notification-dismiss { background: transparent; color: #cbd5e1; border: 0; padding: 2px; cursor: pointer; }
        .water-dashboard .notification-heading { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #cbd8e8; }
        .water-dashboard .compact-error { margin-bottom: 12px; }
        .water-dashboard .mode-option, .water-dashboard .pump-switch { opacity: 1 !important; }

        .water-dashboard .capacity-editor-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .water-dashboard .unit-switch { display: inline-flex; padding: 3px; gap: 2px; background: #0f1826; border: 1px solid #34465e; border-radius: 9px; }
        .water-dashboard .unit-option { min-width: 38px; padding: 5px 11px; border: 0; border-radius: 7px; background: transparent; color: #a7b6ca; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 140ms ease, color 140ms ease; }
        .water-dashboard .unit-option:hover { color: #f1f6ff; }
        .water-dashboard .unit-option.selected { background: #38bdf8; color: #06223a; }
        .water-dashboard .unit-option:focus-visible { outline: 2px solid #f1f6ff; outline-offset: 2px; }
        .water-dashboard .pump-illustration-on { background: #16a34a !important; border: 2px solid #4ade80 !important; color: #ffffff !important; box-shadow: 0 6px 16px #16a34a66 !important; }
        .water-dashboard .pump-illustration-off { background: #dc2626 !important; border: 2px solid #f87171 !important; color: #ffffff !important; box-shadow: 0 6px 16px #dc262666 !important; }
        .water-dashboard .pump-illustration svg { color: #ffffff !important; stroke: #ffffff !important; stroke-width: 2.2 !important; }
        .water-dashboard .motor-status-dot { width: 14px !important; height: 14px !important; border-radius: 50% !important; opacity: 1 !important; animation: none !important; border: 2px solid #ffffff !important; }
        .water-dashboard .motor-status-dot.status-running { background: #22c55e !important; box-shadow: 0 0 0 3px #22c55e55 !important; }
        .water-dashboard .motor-status-dot.status-stopped { background: #ef4444 !important; box-shadow: 0 0 0 3px #ef444455 !important; }
        .water-dashboard .pump-switch-on .pump-switch-track { background: #16a34a !important; border-color: #4ade80 !important; }
        .water-dashboard .pump-switch-off .pump-switch-track { background: #dc2626 !important; border-color: #f87171 !important; }
        .water-dashboard .pump-switch-thumb { background: #ffffff !important; }
        .water-dashboard .text-positive { color: #4ade80 !important; font-weight: 700; }
        .water-dashboard .low-water-badge { background: #dc2626 !important; border: 1px solid #f87171 !important; color: #ffffff !important; font-weight: 700; opacity: 1 !important; }
        .water-dashboard .low-water-badge svg { color: #ffffff !important; stroke: #ffffff !important; }
        @media (max-width: 640px) { .water-dashboard .capacity-input-wrap { max-width: 100%; } }
      `}</style>

      <header className="servo-header">
        <span className="servo-header-mark" aria-hidden="true" />
        <h1>Servo-<span>Nero</span></h1>
      </header>

      {apiError && <div className="error-banner compact-error" role="status"><AlertTriangle size={15} /> {apiError}</div>}

      {notifications.length > 0 && (
        <section className="notification-stack" aria-live="polite" aria-label="Tank notifications">
          <div className="notification-heading"><Bell size={15} /> Notifications</div>
          {notifications.map((item) => (
            <div className={`notification-item ${item.kind} ${exitingNotificationIds.includes(item.id) ? 'is-exiting' : ''}`} key={item.id}>
              <AlertTriangle size={17} />
              <div className="notification-copy">
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <time>{item.time}</time>
              </div>
              <button className="notification-dismiss" type="button" aria-label="Dismiss notification" onClick={() => dismissNotification(item.id)}><X size={15} /></button>
            </div>
          ))}
        </section>
      )}

      <div className="dashboard-grid">
        <TankOverview
          level={level}
          startAt={startAt}
          capacityLitres={Math.max(0.001, toLitres(capacity, capacityUnit))}
          capacityInput={capacity}
          unit={capacityUnit}
          onCapacityChange={(value) => setCapacity(sanitizeCapacity(value, capacityUnit))}
          onUnitChange={handleUnitChange}
        />
        <MotorCard motorOn={motorOn} mode={mode} onToggleMotor={handleMotorToggle} onSetMode={handleModeChange} busy={busy} />
        <ThresholdCard startAt={startAt} stopAt={stopAt} onStartChange={handleStartChange} onStopChange={handleStopChange} />
        <LevelChart history={history} currentLevel={level} />
      </div>
      <footer className="servo-footer">
        <a className="github-link" href="https://github.com/InverseDev/Servo-Nero" target="_blank" rel="noreferrer">
          <Github size={16} strokeWidth={2.2} />
          <span>View on GitHub</span>
        </a>
      </footer>
    </main>
  );
}