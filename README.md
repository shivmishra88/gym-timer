# Gym Timer & Tracker

A single-page, mobile-friendly workout timer and tracker for a Monday–Saturday split.

- 3-second countdown before each set, with sound and vibration cues
- Automatic rest timer per exercise, then auto-advance to the next set/exercise
- Pause, skip rest, reset, and total elapsed time
- Log weight and reps per set; shows your previous workout for each exercise
- Logs are stored in `localStorage` (on this device/browser only)
- PWA manifest so it can be added to the iPhone Home Screen

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
