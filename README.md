# StudioWave — Browser Music Studio

StudioWave is an original browser-based digital audio workstation (DAW) prototype inspired by desktop music-making workflows. It is not affiliated with or a copy of GarageBand's proprietary source code, branding, or assets.

## Run locally
Use a modern browser and a local static server. From the repository root:
```bash
python3 -m http.server 8080
```
Open http://localhost:8080. No backend or package install is required.

## Features
- Transport: play, stop, rewind, tempo, and master volume.
- Multi-track 16-step sequencer.
- Synthesized kick, snare, hi-hat, bass, lead, pad, and electric keys.
- Per-track instrument, volume, pan, and mute.
- Basic pitch-row melody editor.
- Add, duplicate, remove, and clear tracks/patterns.
- Save and load sessions as JSON.
- Export a four-bar stereo WAV file via OfflineAudioContext.

## Project structure
- `index.html` — app shell and control layout.
- `src/styles.css` — responsive dark DAW interface.
- `src/app.js` — sequencer, Web Audio synthesis, project serialization, WAV rendering.
- `docs/ROADMAP.md` — feature roadmap.

## Limitations and roadmap
This is a starter DAW, not commercial DAW feature parity. Microphone recording, audio clip timeline editing, MIDI device input, audio-file import, effect chains, plug-in hosting, automation, and waveform editing remain future work. See docs/ROADMAP.md.

Browser audio requires a user interaction. Sessions are downloaded locally; this app sends no audio or project data to a server.

## License
MIT. See LICENSE.
