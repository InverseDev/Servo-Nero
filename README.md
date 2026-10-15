# AquaSense — Smart Water Tank Dashboard

A responsive React/Vite frontend prototype for the AURA 2K26 water-tank overflow prevention project.

## Included

- Mobile-first dashboard that expands into a two-column layout on wider screens
- Animated tank illustration and live water-level percentage
- Pump switch that changes between active/green and inactive/red
- Automatic and manual control modes
- Adjustable start and stop thresholds with a 5% minimum gap
- Responsive 24-hour water-level graph
- Mock service boundary in `src/services/waterApi.js` for future backend/hardware integration

**The readings and pump behavior are simulated. This frontend does not control a real pump.** Do not connect it to a real motor until firmware safety limits, the backend, and electrical isolation have been designed and tested.

## Run locally

Install Node.js (LTS recommended), then from this folder run:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

To make a production build:

```bash
npm run build
```

The built site will be written to `dist/`.

## Where to connect the backend later

Open `src/services/waterApi.js`. The React UI calls these exported functions:

- `getTankStatus()`
- `getLevelHistory()`
- `setMotor(on)`
- `setControlMode(mode)`
- `updateThresholds({ startLevel, stopLevel })`

Currently `USE_MOCK_DATA` is `true`. When your team agrees on the API routes or MQTT architecture, replace the mock branches in this file with real communication and set the mock flag off. Keep component code calling the same service functions so the UI stays independent of whether the data comes from a simulator, ESP32, or backend.

Suggested data shape for `getTankStatus()`:

```js
{
  level: 68,
  motorOn: true,
  mode: 'auto', // 'auto' | 'manual'
  startLevel: 20,
  stopLevel: 90
}
```

## Safety integration note

Automatic overflow cutoff must live on the microcontroller and work even if the browser, Wi-Fi, or backend is unavailable. Treat browser commands as requests, not the only safety mechanism. Use suitably rated motor switching hardware and qualified supervision for mains-powered equipment.
