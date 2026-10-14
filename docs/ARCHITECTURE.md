# Architecture

## Application layers

StudioWave is a static browser DAW with a separately deployable TypeScript/Express API and MySQL project store. The browser application can run locally without the backend. Cloud authentication and save controls are not yet connected to the UI.

## UI shell and menus

- **File:** new session, open JSON project, save project, WAV export, and pattern-note JSON export.
- **Edit:** clear, duplicate, rename; undo/redo are reserved entries and are not implemented yet.
- **Track:** add track, duplicate, mute, remove, and instrument-type submenu.
- **Controls:** play/pause, stop, rewind, and tempo increment/decrement.
- **View:** toggle Library, Sound Browser, Mixer, and Smart Controls.
- **Help:** keyboard shortcut reference, about dialog, API guide, and roadmap.
- **Left-pane tabs:** Tracks, Library presets, and searchable Sound Browser.
- **Arrangement pane:** 16-step sequencer, selected-track controls, melody/pitch grid.
- **Mixer pane:** per-track gain and mute/select actions.
- **Smart Controls pane:** instrument, level, pan, track name, and mute.

The menu commands are wired to the app state and existing transport/project functions. Keyboard shortcuts include Space for play/stop and Ctrl/Command+N, +O, and +S for new/open/save.

## Modules

- `index.html`: semantic app shell, menus/submenus, dialog, tabs, transport, arrangement and panels.
- `src/styles.css`: responsive dark studio layout, menus, panes, grids, mixer and dialog styling.
- `src/app.js`: track model, sequencer clock, Web Audio synthesis, project JSON, WAV rendering, menu actions, presets, mixer and smart controls.
- `server/src/index.ts`: separate TypeScript REST API for authentication and project CRUD.
- `db/schema.sql`: MySQL user and project tables.
- `docs/`: architecture, API instructions and roadmap.

## State model

A session stores its name, tempo, master gain and tracks. A track stores identity, instrument, color, gain, stereo pan, mute state, sixteen boolean step flags, and a step-to-MIDI-pitch map.

## Audio engine notes

The prototype uses browser Web Audio oscillators and generated noise. Playback currently uses a JavaScript interval and schedules each step close to the current audio time. A production version should adopt a look-ahead scheduler or AudioWorklet for lower timing jitter. The WAV exporter repeats the 16-step pattern for four bars.

## Security and privacy

Project import parses local JSON and checks the expected format marker. The current project format stores data, not executable scripts or plug-ins. The API uses password hashing, JWT bearer tokens, request validation, parameterized SQL, rate limiting and security headers. Keep credentials in environment variables and do not expose MySQL directly to the public internet.


## Audio asset workflow

- Audio files are selected locally through the browser file picker and decoded using `AudioContext.decodeAudioData`.
- Imported assets are represented as audio tracks with an in-memory `AudioBuffer`, per-track gain and stereo pan.
- Audio tracks loop while transport playback is active and are rendered into the stereo WAV export through `OfflineAudioContext`.
- Project JSON intentionally stores metadata rather than raw audio data. Imported source files must be reselected when opening a session on another device.
- A metronome toggle generates a short accent click on each beat. It is a monitoring aid and is not mixed into the exported arrangement.
- The browser's supported codecs determine which audio file types can be imported; WAV is the recommended interchange format.


## Multibar timeline

- Every track stores `startStep` and `lengthSteps` (sixteenth-note units) for a four-bar arrangement.
- The transport advances through 64 sixteenth-note steps; the step sequencer pattern repeats each bar.
- The timeline shows overlapping clip regions and provides bar-level move and trim controls.
- Imported audio is started at its region's beginning and stopped at the region boundary. The current implementation loops the full decoded asset inside that region; region-level in/out offsets and waveform-based editing remain future work.
- Project JSON persists clip positions and lengths, but imported audio data remains external and must be re-imported.


## MIDI and editing history

- Standard MIDI import parses SMF headers, track chunks, variable-length delta times, running status, and note-on/note-off pairs. SMPTE timing and advanced controller/tempo-map handling are not implemented.
- MIDI export writes an SMF type-1 file with tempo metadata and note events for melody steps; drum steps map to General MIDI percussion pitches.
- Undo/redo stores serialized project-model snapshots in a bounded in-memory history. Decoded audio buffers remain in memory and are matched by track ID during restoration.
- Imported audio waveform previews are drawn from the first decoded channel to a canvas; this is a visual overview, not a sample-accurate editing surface.


## Master effects signal flow

The Web Audio master gain feeds a shared effects input. The effects input fans out to a dry output, a convolution reverb send, and a feedback delay send; the three paths sum at the device output. Reverb mix, delay mix, delay time, and feedback are live controls. The rack is a global bus rather than per-track inserts, and the generated impulse response is intentionally synthetic.


The master bus also includes low-shelf and high-shelf biquad filters plus a configurable dynamics compressor before the dry/reverb/delay split. EQ ranges from -12 dB to +12 dB. Compressor intensity changes the threshold and ratio; it is a simple master-bus compressor, not a multiband or per-track dynamics processor.


## Built-in sound assets

The static `assets/sounds/` directory contains 21 original mono PCM WAV one-shots at 22.05 kHz/16-bit, indexed by `manifest.json`. The Sound Browser fetches and decodes files into an in-memory AudioBuffer cache. Preview creates a one-shot buffer source through the master gain/effects graph; Add Track creates an audio track referencing the decoded buffer for the current session. Kick, snare and closed-hi-hat sequencer events use matching cached samples when available and fall back to synthesized voices before assets load. URLs are derived from `import.meta.url` so the library works under the GitHub Pages repository subpath.
