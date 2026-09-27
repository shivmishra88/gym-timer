# Gym Timer & Tracker — notes for Claude

Mobile-first workout timer + tracker (default plan is a Mon–Sat split, editable in the app), used on the owner's iPhone as a Home Screen app.
Live at https://shivmishra88.github.io/gym-timer/ (GitHub Pages, `main` branch root; every push to `main` deploys).

## Layout

- `index.html` — the whole app: HTML, CSS and one `<script>`. No build step, no dependencies.
- `sw.js` — service worker, cache-first with background refresh. **Bump `CACHE` whenever a cached file changes.**
- `manifest.json`, `icons/` — PWA manifest and generated dumbbell icons (180/192/512).
- `tests/` — Playwright browser tests (see Testing).

## How the script is organised

- `DEFAULT_DAYS` is the built-in plan; the live plan is `plan = {titles, days}` loaded from storage, with `W = plan.days` (`W[day] = [[name, sets, target, restSeconds], ...]`, days `mon`–`sun`, and a missing day is a rest day). The routine editor (`openEditor`/`saveEditor`) edits a draft and then calls `applyPlan`; renaming an exercise moves its logs and notes (`migrateRenames`). The editor is disabled mid-workout. `" + "` in a name = superset; a target like `"45–60 sec"` / `"30–45 min"` = timed exercise.
- State machine: `ready → countdown → work → rest → … → done`. One `tick()` every 250 ms computes everything from the wall clock (`endAt`), so timers survive the phone locking. In `work`, `endAt` is when the set *started*; in `countdown`/`rest` it's when the timer ends.
- `progress[name]` = sets completed this session; `skipped[name]`; `nextIncomplete()` drives Do later / Skip / tap-to-jump and wrap-around.
- The session is saved to `localStorage` on every transition and restored on load (discarded after 3 h).
- The lock-screen rest alert plays a generated WAV (silent, then 3-2-1 beeps) because iOS keeps audio playing while it suspends JS. It's opt-in because it pauses the user's music.

## Storage (localStorage, per browser — Safari and the Home Screen app are separate)

| Key | Shape |
|---|---|
| `gymTrackerLogsV1` | `{ "day::Exercise": [ {day, date:"YYYY-MM-DD" (local), session:<start ms>, sets:[{set, weight, reps, weight2, reps2, rpe, time}]} ] }` — lists kept in date order; legacy entries may lack `session` |
| `gymTrackerSessionV1` | in-progress workout state (see `saveSession`) |
| `gymTrackerNotesV1` | `{ "day::Exercise": "note" }` |
| `gymTrackerPrefsV1` | `{ lockAlert, inc }` (inc = weight increment for suggestions) |
| `gymTrackerPlanV1` | `{ titles:{day:title}, days:{day:[[name, sets, target, restSeconds]]} }` — validated by `validPlan` |

Export/Import writes and merges `{app:"gym-timer", version:1, logs, notes, plan}`; importing a different valid plan asks before replacing the routine. Don't rename keys or change the shape without a migration, because the owner has real data in them.

PRs and the chart score sets by: estimated 1RM (Epley, `modeOf` = `e1rm`) if the exercise has weight × reps, time for timed work, reps for bodyweight. A PR must beat every *earlier* session (the first session is never a PR).

Progression suggestions (`suggest`/`repTop`) are double progression, set by set: if last session's matching set reached the top of that set's rep target, pre-fill weight + increment and the target reps; otherwise keep the weight and show the target. Only for weighted sets with a parseable rep target (`"12, 10, 8, 6"` per set, `"15–20"` → 20, `"12 + 15"` per superset half).

## Testing

```bash
tests/run.sh      # installs playwright-core once, serves the repo on :8765, runs every tests/*.test.js
```
It needs Google Chrome installed (`channel: 'chrome'`). The tests use Playwright's fake clock, so allow ~300 ms of slack when checking displayed times (the ticker runs every 250 ms). 123 checks across 5 files, all passing as of step 5. Nothing has been verified on a real iPhone yet (see "Needs checking on device").

## Pushing

The origin is HTTPS. The machine's SSH key belongs to a different GitHub account, so push with the gh credential helper:
```bash
git -c credential.helper= -c credential.helper='!gh auth git-credential' push
```
Then confirm the Pages build: `gh api repos/shivmishra88/gym-timer/pages/builds/latest --jq .status`.

## Roadmap status

Came from a PM + lifter review of v3 (the version originally built in ChatGPT).

- [x] **Step 1 — core fixes**: previous-session history (was showing today's sets), pre-filled inputs, per-set targets, wall-clock timers, pause also pauses elapsed, Screen Wake Lock, resume after reload, confirm before reset/day change, Start disabled mid-workout (was double-advancing), local dates.
- [x] **Step 2 — iPhone reliability**: opt-in lock-screen rest alert (audio clip), offline via service worker, JSON export (share sheet) / import (merge), `navigator.storage.persist()`.
- [x] **Step 3 — logging depth**: every set saved (blank = "not logged"), edit/delete/add sets, superset fields, work stopwatch + timed targets, RPE, per-exercise sticky notes, Do later / Skip exercise / tap-to-jump, HTML-escaping user input.
- [x] **Step 4 — motivation**: end-of-workout summary (duration, sets, volume, exercises, PRs), 🏆 PR badges + "New PR!" during rest, Progress section (this week, streak, total, 5-week calendar, per-exercise chart with tooltip, last 10 sessions editable).
- [x] **Step 5 — program**: in-app routine editor (rename/reorder/add/remove exercises, sets, targets, rest, day titles, Sunday or any rest day, reset to default), with validation and history migration on rename; plan in export/import; the day picker defaults to today's weekday; week/streak follow the plan's training days; per-set double-progression suggestions with a configurable increment.

The five-step roadmap from the original review is complete. Next, pick from the pending list below; the owner hasn't prioritised it yet.

## Pending items (everything not yet done)

**Program / training content** (the owner decides and can now change it in the in-app editor; suggest, don't change the default silently)
- Legs get 1 day a week vs 2 each for push and pull. Consider a second leg day, or turning Thursday into Legs 2 and spreading the abs across other days.
- Deadlift is 4th on Saturday; move it first.
- Shrugs are on both Friday and Saturday (back to back); drop one.
- No hip hinge for hamstrings (add RDL / good morning).
- Thursday has 7 ab exercises × 3 sets; trim to 3–4 with progression.
- Data inconsistencies: Leg Curl is 4 sets but the target is "15, 10"; Bench Dips target is "controlled".

**Features**
- Progression suggestions for timed work (hold longer) and bodyweight moves (more reps), and a "deload" hint after repeated misses.
- Move an exercise between days in the editor (currently remove + add, which doesn't carry history over).
- Swap an exercise for an alternative (e.g. machine taken → dumbbell version).
- Rest adjust ±30 s during rest.
- Warm-up sets (excluded from PRs/volume).
- Bodyweight / assisted weights (negative or "BW+10"), per-hand vs total dumbbell weight, lb units.
- Weekly volume per muscle group (needs a muscle tag per exercise).
- Lock-screen alert for timed *work* (e.g. 30-min cardio); it currently covers rest only.
- A backup reminder (e.g. prompt to export if the last export was over 2 weeks ago).
- Optional cloud sync (would need a backend or a GitHub-gist/Drive approach).
- Dark mode.
- The summary disappears on reload once the workout is done; maybe persist the last summary.
- Copy nit: countdown shows "GO NEXT!" at 1 s.
- After finishing, the log panel still shows the last exercise's empty fields; could collapse it.

**Needs checking on device** (only tested in desktop Chrome)
- Lock-screen rest alert, in both Safari and the Home Screen app (older iOS may stop background audio in Home Screen apps).
- Screen Wake Lock in the Home Screen app.
- Offline launch in airplane mode.
- Export via the share sheet.
- iOS has no Vibration API, so haptics never fire on iPhone (platform limitation).
