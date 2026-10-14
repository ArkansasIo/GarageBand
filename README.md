# StudioWave — Browser Music Studio

StudioWave is an original browser-based digital audio workstation (DAW) prototype inspired by desktop music-making workflows. It is not affiliated with or a copy of GarageBand's proprietary source code, branding, or assets.

## Browser app

Use a modern browser and a local static server. From the repository root:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080. The standalone browser app can run without installing the backend.

## Features

- Transport: play, stop, rewind, tempo, and master volume.
- Multi-track 16-step sequencer and synthesized drum, bass, lead, pad, and electric-key sounds.
- Per-track instrument, volume, pan, mute, duplicate, and remove controls.
- Basic pitch-row melody editor.
- Save and load sessions as JSON.
- Export a four-bar stereo WAV file via OfflineAudioContext.

## TypeScript API and MySQL

A separate backend scaffold is available for account authentication and cloud project persistence. It is not required for the local-only browser app.

1. Install Node.js 20+ and MySQL 8+.
2. Initialize the database: `mysql -u root -p < db/schema.sql`.
3. Copy `.env.example` to `.env`, then configure credentials and a secure JWT secret.
4. Run `npm install`.
5. Start the API: `npm run dev:api`.
6. Check `http://localhost:8787/api/health`.

API details, routes, and production notes: [docs/API_AND_DATABASE.md](docs/API_AND_DATABASE.md).

The API provides registration/login and authenticated create/read/update/delete project endpoints. The current browser UI still saves locally; cloud sign-in and cloud-save controls have not yet been wired into the UI. GitHub Pages hosts only the static app; deploy the API and MySQL separately.

## Project structure

- `index.html` — browser app shell.
- `src/styles.css` — responsive dark DAW interface.
- `src/app.js` — sequencer, Web Audio synthesis, project serialization, WAV rendering.
- `server/src/index.ts` — TypeScript REST API.
- `db/schema.sql` — MySQL schema.
- `docs/API_AND_DATABASE.md` — backend setup and endpoint reference.
- `docs/ROADMAP.md` — planned DAW features.

## Limitations and roadmap

This is a starter DAW, not commercial DAW feature parity. Microphone recording, audio clip timeline editing, MIDI device input, audio-file import, effect chains, plug-in hosting, automation, and waveform editing remain future work. See docs/ROADMAP.md.

Browser audio requires a user interaction. The local-only mode sends no audio or project data to a server.

## License

MIT. See LICENSE.


## Audio and production tools

StudioWave supports locally synthesized drum and synth tracks, 16-step programming, a melody/piano grid, track mute/volume/pan, a channel mixer, preset browsing, project JSON save/open, and stereo WAV rendering. Import audio files with **Import audio** to add local backing tracks, vocals, loops, and samples; supported formats depend on the browser's Web Audio decoder. Imported audio is looped during playback and included in WAV rendering. The project JSON records the imported filename, but audio binaries are not embedded, so re-import the source file after opening a project on another device.

Use a current browser with Web Audio support. GitHub Pages serves the static client; the separately scaffolded TypeScript/MySQL API must be hosted independently.
