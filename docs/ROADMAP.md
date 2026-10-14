# StudioWave development roadmap

## Implemented prototype
- Responsive DAW-style interface and transport.
- Multi-track 16-step sequencer with seeded beat patterns.
- Web Audio synthesized percussion and melodic voices.
- Basic note grid for bass, lead, pad, and keys.
- Track volume, pan, mute, add, duplicate, and remove.
- JSON project save and open.
- Four-bar stereo WAV export.

## Next: recording and timeline
- Microphone recording with getUserMedia and MediaRecorder.
- Timeline with draggable audio/MIDI clips, trim, fades, and snapping.
- Bar ruler, timeline zoom, loop range, count-in, metronome.
- Undo/redo history and project autosave/recovery.

## MIDI and editing
- MIDI device input (where supported by browser).
- Standard MIDI file import/export.
- Note lengths, velocity editing, quantization, chord tools.
- Automation lanes for volume, pan, and instrument parameters.
- Keyboard shortcuts and expanded accessibility support.

## Audio engine
- Look-ahead scheduling or AudioWorklet scheduling to reduce timer jitter.
- Mixer buses, EQ, compressor, reverb, delay, sends, and effect bypass.
- Audio file import and waveform visualization.
- Project schema migrations and robust rendering error handling.

## Deployment and backend (optional)
- GitHub Pages for the static browser app.
- Optional authentication and project-sync API.
- PostgreSQL/MySQL metadata storage and object storage for recordings.
- Permission checks, rate limits, and backup/restore.
