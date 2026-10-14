# Architecture

## Client-only application
The initial implementation is a static HTML/CSS/JavaScript app. It has no API server, database, build step, or third-party runtime dependency.

## Modules
- UI shell (`index.html`): transport controls, track list, step grid, and melody grid.
- Styling (`src/styles.css`): responsive dark studio layout, grid controls, selected/muted states.
- Audio + state (`src/app.js`): track model, sequencer clock, Web Audio synthesis voices, per-track controls, JSON serialization, OfflineAudioContext WAV render.
- Docs (`docs/`): implementation notes and roadmap.

## State model
A session stores its name, tempo, master gain and tracks. A track stores identity, instrument, color, track gain, stereo pan, mute state, sixteen boolean step flags, and a step-to-MIDI-pitch map.

## Audio engine notes
The prototype uses browser Web Audio oscillators and generated noise. The playback loop currently uses a JavaScript interval and schedules each step close to the current audio time. A production version should adopt a look-ahead scheduler or AudioWorklet for lower timing jitter. The current WAV exporter repeats the 16-step pattern for four bars.

## Security and privacy
Project import parses local JSON and checks the expected format marker. Do not open arbitrary untrusted project JSON in an environment where scripts or custom plug-ins are executed; the present format stores data only. No account or upload is required.
