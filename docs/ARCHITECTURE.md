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
