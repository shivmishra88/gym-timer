# Gym Timer & Tracker

A single-page, mobile-friendly workout timer and tracker for a Monday–Saturday split.

- 3-second countdown before each set, with sound and vibration cues
- Automatic rest timer per exercise, then auto-advance to the next set/exercise
- Pause, skip rest, reset, and total elapsed time
- Log weight and reps per set; shows last session's numbers and pre-fills them
- Per-set rep targets (e.g. set 2 of "15, 12, 10, 8" shows 12)
- Timers use the wall clock, so they stay correct after the phone locks; the screen is kept awake during a workout
- An in-progress workout survives a reload or the app being closed (for up to 3 hours)
- Optional lock-screen rest alert: plays the rest countdown as an audio clip, which iOS keeps playing while locked (this pauses other audio)
- Works offline after the first visit (service worker in `sw.js`)
- Logs are stored in `localStorage` (on this device/browser only); Export/Import writes and merges a JSON backup
- PWA manifest so it can be added to the iPhone Home Screen

When you change any cached file, bump `CACHE` in `sw.js` so installed copies pick it up.

## Running

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Hosting

Hosted with GitHub Pages from the `main` branch root:
https://shivmishra88.github.io/gym-timer/

On iPhone: open the link in Safari → Share → **Add to Home Screen**.

## Editing workouts

The routines live in the `W` object near the top of the `<script>` in `index.html`.
Each exercise is `[name, sets, target reps, rest seconds]`.
