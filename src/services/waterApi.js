/**
 * Water data / hardware integration boundary.
 *
 * The dashboard currently runs on local simulated data so the UI can be built
 * before the ESP32/backend is ready. When the team agrees on an API, replace
 * the mock branches below with fetch() calls (or MQTT client calls) while
 * keeping the same exported function names. The React UI should not need to
 * know how the hardware is connected.
 */
const USE_MOCK_DATA = true;

let tankState = {
  level: 68,
  motorOn: true,
  mode: 'auto',
  startLevel: 20,
  stopLevel: 90,
};

let levelHistory = [
  86, 84, 82, 80, 77, 73, 69, 65, 62, 58, 54, 50, 46,
  43, 39, 35, 31, 28, 24, 21, 40, 62, 82, 78, 68,
];

const pause = (ms = 90) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getTankStatus() {
  if (USE_MOCK_DATA) {
    await pause();
    return { ...tankState };
  }

  const response = await fetch('/api/tank');
  if (!response.ok) throw new Error('Could not load tank status.');
  return response.json();
}

export async function getLevelHistory() {
  if (USE_MOCK_DATA) {
    await pause();
    return [...levelHistory];
  }

  const response = await fetch('/api/tank/history?range=24h');
  if (!response.ok) throw new Error('Could not load water-level history.');
  return response.json();
}

export async function setMotor(on) {
  if (USE_MOCK_DATA) {
    await pause();
    tankState = { ...tankState, motorOn: Boolean(on) };
    return { ...tankState };
  }

  const response = await fetch('/api/tank/motor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ on: Boolean(on) }),
  });
  if (!response.ok) throw new Error('Could not update motor state.');
  return response.json();
}

export async function setControlMode(mode) {
  if (USE_MOCK_DATA) {
    await pause();
    tankState = { ...tankState, mode };
    return { ...tankState };
  }

  const response = await fetch('/api/tank/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!response.ok) throw new Error('Could not update control mode.');
  return response.json();
}

export async function updateThresholds({ startLevel, stopLevel }) {
  if (USE_MOCK_DATA) {
    await pause();
    tankState = { ...tankState, startLevel, stopLevel };
    return { ...tankState };
  }

  const response = await fetch('/api/tank/thresholds', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startLevel, stopLevel }),
  });
  if (!response.ok) throw new Error('Could not save tank thresholds.');
  return response.json();
}

/** Updates the mock reading during the UI demo. Not needed in the live API. */
export function updateSimulatedLevel(level) {
  tankState = { ...tankState, level };
  levelHistory = levelHistory.map((value, index) =>
    index === levelHistory.length - 1 ? level : value,
  );
}
