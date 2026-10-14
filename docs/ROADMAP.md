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


## Audio production milestones

- [x] Browser-generated drum and synthesizer instruments
- [x] Step sequencer and melodic piano grid
- [x] Track mixer with volume, pan and mute
- [x] Local JSON session save/open and stereo WAV export
- [x] Import decoded local audio files as looping tracks
- [x] Microphone capture to create an audio track (browser permission required)
- [x] Metronome monitoring click
- [ ] Non-destructive region trimming, arrangement timeline, automation lanes and undo/redo history
- [ ] MIDI file import/export and external MIDI controller support
- [ ] Persistent audio asset packaging and cloud project storage
- [ ] Advanced effect rack (EQ, compressor, reverb, delay) and plug-in hosting


## Arrangement editing

- [x] Four-bar arrangement overview with per-track clip regions
- [x] Move clip regions by one bar and trim/extend their ends in one-bar increments
- [x] Transport follows a four-bar loop and displays bar/beat/step position
- [x] Save clip start and length in project JSON
- [ ] Drag-and-drop region movement, arbitrary trim handles, split/join and snap/grid settings
- [ ] Per-region fades, gain, time stretching and waveform rendering


## MIDI, editing history and waveform work

- [x] Undo/redo stack for common pattern, track and control edits (session-local, bounded history)
- [x] Standard MIDI File import for note events
- [x] Standard MIDI File export for programmed notes and percussion steps
- [x] Waveform preview for imported audio assets
- [ ] Full MIDI tempo maps, program changes, controller automation, polyphonic piano-roll notes per step
- [ ] Audio region drag handles, splitting, fades and waveform zoom


## Live master effects

- [x] Stereo master reverb send with generated impulse response
- [x] Delay with adjustable wet mix, delay time and feedback
- [x] Master effects bypass and responsive controls
- [ ] Per-track insert effects, EQ bands, compressor metering, and automation lanes
