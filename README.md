# Gym Timer & Tracker

A single-page, mobile-friendly workout timer and tracker for a Monday–Saturday split.

- 3-second countdown before each set, with sound and vibration cues
- Automatic rest timer per exercise, then auto-advance to the next set/exercise
- Pause, skip rest, reset, and total elapsed time
- Log weight and reps per set; shows last session's numbers and pre-fills them
- Every completed set is logged; edit, delete, or add sets from the Today list
- Supersets (names with " + ") log weight/reps for each half
- Optional RPE per set and a per-exercise note that carries over to next time
- Work phase shows a stopwatch; timed exercises (e.g. "45–60 sec") beep at the target and record the time
- Do later / Skip exercise, or tap any exercise in the list to jump to it; the workout ends when every exercise is done or skipped
- End-of-workout summary (duration, sets, volume, PRs) and 🏆 PR badges (estimated 1RM, time, or reps)
- Progress section: this week, streak, 5-week calendar, per-exercise chart, and editable past sessions
- Edit the routine in the app (✏️ Edit routine): exercises, sets, targets, rest, day titles, Sunday; renaming keeps history
- Progression suggestions: hit the top of a set's rep target last time → the weight is pre-filled with the next increment
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

Use **✏️ Edit routine** in the app. The built-in default plan is `DEFAULT_DAYS` in `index.html`
(each exercise is `[name, sets, target reps, rest seconds]`); your edited plan is stored on the device and included in backups.

## Tests

```bash
tests/run.sh
```

Runs the Playwright browser tests against a local server (requires Google Chrome).
