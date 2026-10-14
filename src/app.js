const $ = (s) => document.querySelector(s);
const COLORS = ["#7c6cff","#4ad6c8","#ffb454","#ff6f91","#68a5ff","#d58cff","#b2d36d","#ff8757"];
const ICONS = {kick:"◉",snare:"▧",hat:"✳",bass:"〰",lead:"♫",pad:"▱",keys:"▦"};
const PITCHES = [{name:"C5",midi:72},{name:"B4",midi:71},{name:"A4",midi:69},{name:"G4",midi:67},{name:"F4",midi:65},{name:"E4",midi:64},{name:"D4",midi:62},{name:"C4",midi:60}];
let nextId=1, selectedId=1, isPlaying=false, timer=null, step=0, audioCtx=null, master=null, tracks=[];
const makeTrack=(name,instrument,color,volume=.8)=>({id:nextId++,name,instrument,color,volume,pan:0,muted:false,steps:Array(16).fill(false),notes:{}});
function seed(){nextId=1;tracks=[makeTrack("Kick","kick",COLORS[0],.9),makeTrack("Snare","snare",COLORS[1],.75),makeTrack("Hi-hats","hat",COLORS[2],.5),makeTrack("Bass","bass",COLORS[3],.75),makeTrack("Lead","lead",COLORS[4],.7)];tracks[0].steps=[true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false];tracks[1].steps=[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false];tracks[2].steps=Array.from({length:16},(_,i)=>i%2===0);tracks[3].steps=[true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false];tracks[4].notes={"0":72,"3":67,"5":69,"8":72,"11":76,"13":74};selectedId=1}
seed();
const selected=()=>tracks.find(t=>t.id===selectedId)||tracks[0];
function ensureAudio(){if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();master.gain.value=Number($("#masterVolume").value);master.connect(audioCtx.destination)}if(audioCtx.state==="suspended")audioCtx.resume()}
function tone(freq,time,duration,type="sine",gain=.12,pan=0){const osc=audioCtx.createOscillator(),amp=audioCtx.createGain(),panner=audioCtx.createStereoPanner?audioCtx.createStereoPanner():null;osc.type=type;osc.frequency.setValueAtTime(freq,time);amp.gain.setValueAtTime(.0001,time);amp.gain.exponentialRampToValueAtTime(Math.max(.001,gain),time+.012);amp.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(amp);if(panner){panner.pan.value=pan;amp.connect(panner);panner.connect(master)}else amp.connect(master);osc.start(time);osc.stop(time+duration+.03)}
function noise(time,duration,gain,pan=0){const buffer=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*duration),audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const src=audioCtx.createBufferSource(),amp=audioCtx.createGain();src.buffer=buffer;amp.gain.setValueAtTime(gain,time);amp.gain.exponentialRampToValueAtTime(.001,time+duration);const p=audioCtx.createStereoPanner?.();src.connect(amp);if(p){p.pan.value=pan;amp.connect(p);p.connect(master)}else amp.connect(master);src.start(time)}
function playTrack(t,s,time){if(t.muted)return;const vol=t.volume,pan=t.pan,inst=t.instrument;if(t.steps[s]){if(inst==="kick"){tone(145,time,.2,"sine",.5*vol,pan);const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.setValueAtTime(120,time);o.frequency.exponentialRampToValueAtTime(42,time+.15);g.gain.setValueAtTime(.35*vol,time);g.gain.exponentialRampToValueAtTime(.001,time+.18);o.connect(g);g.connect(master);o.start(time);o.stop(time+.2)}else if(inst==="snare"){noise(time,.16,.28*vol,pan);tone(180,time,.08,"triangle",.1*vol,pan)}else if(inst==="hat")noise(time,.045,.12*vol,pan);else if(inst==="bass")tone(55,time,.23,"sawtooth",.2*vol,pan);else if(inst==="lead")tone(440,time,.18,"square",.13*vol,pan);else if(inst==="pad"){tone(220,time,.35,"triangle",.1*vol,pan);tone(330,time,.35,"sine",.07*vol,pan)}else if(inst==="keys"){tone(440,time,.22,"triangle",.18*vol,pan);tone(660,time,.16,"sine",.04*vol,pan)}}const pitch=t.notes[String(s)];if(pitch&&["bass","lead","pad","keys"].includes(inst)){const f=440*Math.pow(2,(pitch-69)/12);tone(f,time,.28,inst==="lead"?"square":inst==="bass"?"sawtooth":"triangle",.16*vol,pan)}}
function currentStep(){return Math.floor(step)%16}
function tick(){if(!isPlaying)return;ensureAudio();const s=currentStep(),time=audioCtx.currentTime+.02;tracks.forEach(t=>playTrack(t,s,time));renderGrid();$("#position").textContent=`1.${Math.floor(s/4)+1}.${s%4+1}`;step=(step+1)%16}
function start(){ensureAudio();if(isPlaying)return;isPlaying=true;$("#playBtn").textContent="Ⅱ";$("#statusText").textContent="Playing";$("#statusLed").parentElement.classList.add("playing");tick();timer=setInterval(tick,60000/Number($("#bpm").value)/4)}
function stop(){isPlaying=false;clearInterval(timer);timer=null;$("#playBtn").textContent="▶";$("#statusText").textContent="Ready to create";$("#statusLed").parentElement.classList.remove("playing");step=0;$("#position").textContent="1.1.1";renderGrid()}
function renderTracks(){const list=$("#trackList");list.innerHTML="";tracks.forEach(t=>{const el=document.createElement("div");el.className="track-item"+(t.id===selectedId?" selected":"");el.style.setProperty("--track-color",t.color);el.innerHTML=`<span class="track-color"></span><span class="track-icon">${ICONS[t.instrument]||"♫"}</span><span class="track-meta"><strong></strong><small></small></span><span class="track-mini-actions"><button title="Mute track" aria-label="Mute track">M</button><button title="Remove track" aria-label="Remove track">×</button></span>`;el.querySelector("strong").textContent=t.name;el.querySelector("small").textContent=t.instrument.toUpperCase();el.addEventListener("click",e=>{if(e.target.closest("button"))return;selectedId=t.id;renderAll()});const bs=el.querySelectorAll("button");bs[0].style.color=t.muted?"#ff6f91":"";bs[0].addEventListener("click",e=>{e.stopPropagation();t.muted=!t.muted;renderTracks()});bs[1].addEventListener("click",e=>{e.stopPropagation();if(tracks.length===1)return;tracks=tracks.filter(x=>x.id!==t.id);if(selectedId===t.id)selectedId=tracks[0].id;renderAll()});list.append(el)})}
function renderGrid(){const grid=$("#sequencer");grid.innerHTML="";const head=document.createElement("div");head.className="seq-head";head.innerHTML="<span>TRACK / STEP</span>"+Array.from({length:16},(_,i)=>`<span>${i+1}</span>`).join("");grid.append(head);tracks.forEach(t=>{const row=document.createElement("div");row.className="seq-row";row.style.setProperty("--track-color",t.color);const label=document.createElement("div");label.className="seq-label";label.innerHTML='<span class="tiny-color"></span><span></span>';label.querySelector("span:last-child").textContent=t.name;row.append(label);for(let i=0;i<16;i++){const b=document.createElement("button");b.className="seq-cell"+(i%4===0?" beat":"")+(t.steps[i]?" on":"")+(isPlaying&&currentStep()===i?" playhead":"");b.setAttribute("aria-label",`${t.name}, step ${i+1}`);b.addEventListener("click",()=>{t.steps[i]=!t.steps[i];renderGrid();updateCount()});row.append(b)}grid.append(row)});updateCount()}
function renderPiano(){const el=$("#pianoRoll");el.innerHTML="";const t=selected();PITCHES.forEach(p=>{const row=document.createElement("div");row.className="piano-row";const key=document.createElement("div");key.className="piano-key";key.textContent=p.name;row.append(key);for(let i=0;i<16;i++){const b=document.createElement("button");b.className="piano-cell"+(i%4===0?" beat":"")+(Number(t.notes[String(i)])===p.midi?" on":"");b.setAttribute("aria-label",`${p.name}, step ${i+1}`);b.addEventListener("click",()=>{if(Number(t.notes[String(i)])===p.midi)delete t.notes[String(i)];else t.notes[String(i)]=p.midi;renderPiano();updateCount()});row.append(b)}el.append(row)})}
function renderControls(){const t=selected();$("#selectedTrackName").textContent=t.name;$("#instrument").value=t.instrument;$("#trackVolume").value=t.volume;$("#trackVolumeLabel").textContent=Math.round(t.volume*100)+"%";$("#trackPan").value=t.pan;$("#panLabel").textContent=Math.abs(t.pan)<.05?"Center":t.pan<0?"L "+Math.round(-t.pan*100)+"%":"R "+Math.round(t.pan*100)+"%";$("#trackMute").checked=t.muted}
function updateCount(){let n=0;tracks.forEach(t=>{n+=t.steps.filter(Boolean).length+Object.keys(t.notes).length});$("#stepCount").textContent=`${n} ${n===1?"note":"notes"}`}
function renderAll(){renderTracks();renderGrid();renderPiano();renderControls()}
$("#playBtn").addEventListener("click",()=>isPlaying?stop():start());$("#stopBtn").addEventListener("click",stop);$("#rewindBtn").addEventListener("click",()=>{step=0;$("#position").textContent="1.1.1";renderGrid()});
$("#bpm").addEventListener("change",()=>{const v=Math.max(40,Math.min(240,Number($("#bpm").value)||120));$("#bpm").value=v;if(isPlaying){clearInterval(timer);timer=setInterval(tick,60000/v/4)}});$("#bpmDown").addEventListener("click",()=>{$("#bpm").value=Math.max(40,Number($("#bpm").value)-1);$("#bpm").dispatchEvent(new Event("change"))});$("#bpmUp").addEventListener("click",()=>{$("#bpm").value=Math.min(240,Number($("#bpm").value)+1);$("#bpm").dispatchEvent(new Event("change"))});
$("#masterVolume").addEventListener("input",e=>{const v=Number(e.target.value);if(master)master.gain.value=v;$("#masterValue").textContent=Math.round(v*100)+"%"});$("#addTrack").addEventListener("click",()=>{const t=makeTrack("Track "+(tracks.length+1),"lead",COLORS[(tracks.length)%COLORS.length]);tracks.push(t);selectedId=t.id;renderAll()});
$("#instrument").addEventListener("change",e=>{selected().instrument=e.target.value;renderAll()});$("#trackVolume").addEventListener("input",e=>{selected().volume=Number(e.target.value);renderControls()});$("#trackPan").addEventListener("input",e=>{selected().pan=Number(e.target.value);renderControls()});$("#trackMute").addEventListener("change",e=>{selected().muted=e.target.checked;renderTracks()});
$("#clearPattern").addEventListener("click",()=>{selected().steps.fill(false);selected().notes={};renderAll()});$("#clearMelody").addEventListener("click",()=>{selected().notes={};renderPiano();updateCount()});$("#duplicatePattern").addEventListener("click",()=>{const t=selected(),copy=makeTrack(t.name+" Copy",t.instrument,COLORS[tracks.length%COLORS.length],t.volume);copy.steps=[...t.steps];copy.notes={...t.notes};copy.pan=t.pan;tracks.push(copy);selectedId=copy.id;renderAll()});
function snapshot(){return {format:"studiowave-project",version:1,name:$("#projectName").value,bpm:Number($("#bpm").value),masterVolume:Number($("#masterVolume").value),tracks:tracks.map(t=>({...t,steps:[...t.steps],notes:{...t.notes}}))}}
function download(name,content,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$("#saveProject").addEventListener("click",()=>download((($("#projectName").value||"session").replace(/[^a-z0-9_-]+/gi,"-"))+".json",JSON.stringify(snapshot(),null,2),"application/json"));
$("#loadProject").addEventListener("click",()=>$("#filePicker").click());$("#filePicker").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(d.format!=="studiowave-project"||!Array.isArray(d.tracks))throw Error("Not a StudioWave project");tracks=d.tracks.map(t=>({...t,steps:Array.from({length:16},(_,i)=>!!t.steps?.[i]),notes:t.notes||{},color:t.color||COLORS[0]}));nextId=Math.max(0,...tracks.map(t=>t.id))+1;selectedId=tracks[0]?.id||1;$("#projectName").value=d.name||"Imported Session";$("#bpm").value=d.bpm||120;$("#masterVolume").value=d.masterVolume??.75;$("#masterValue").textContent=Math.round(Number($("#masterVolume").value)*100)+"%";if(master)master.gain.value=Number($("#masterVolume").value);renderAll()}catch(err){alert("Could not open project: "+err.message)}e.target.value=""});
$("#newProject").addEventListener("click",()=>{if(!confirm("Start a new session? Unsaved changes will be lost."))return;stop();seed();$("#projectName").value="Untitled Session";$("#bpm").value=120;renderAll()});
$("#exportWav").addEventListener("click",async()=>{const btn=$("#exportWav");btn.disabled=true;btn.textContent="Rendering…";const originalTracks=tracks,oldCtx=audioCtx,oldMaster=master;try{const snap=snapshot(),rate=44100,bpm=snap.bpm,stepDur=60/bpm/4,totalSteps=64,duration=totalSteps*stepDur+1,off=new OfflineAudioContext(2,Math.ceil(duration*rate),rate),out=off.createGain();out.gain.value=snap.masterVolume;out.connect(off.destination);audioCtx=off;master=out;tracks=snap.tracks.map(t=>({...t,audioBuffer:originalTracks.find(x=>x.id===t.id)?.audioBuffer||null,audioSource:null}));tracks.forEach(t=>{if(t.muted)return;for(let i=0;i<totalSteps;i++){const s=i%16;if(t.steps[s]||t.notes[String(s)])playTrack(t,s,i*stepDur)}});const rendered=await off.startRendering();const wav=audioBufferToWav(rendered);download((snap.name||"studiowave").replace(/[^a-z0-9_-]+/gi,"-")+".wav",wav,"audio/wav")}catch(err){console.error(err);alert("WAV export failed in this browser. Try a recent Chrome, Edge, or Safari browser with Web Audio enabled.")}finally{tracks=originalTracks;audioCtx=oldCtx;master=oldMaster;btn.disabled=false;btn.textContent="Export WAV"}});
function audioBufferToWav(buffer){const channels=buffer.numberOfChannels,length=buffer.length*channels*2+44,ab=new ArrayBuffer(length),v=new DataView(ab);let p=0;const s=x=>{for(let i=0;i<x.length;i++)v.setUint8(p++,x.charCodeAt(i))},u16=x=>{v.setUint16(p,x,true);p+=2},u32=x=>{v.setUint32(p,x,true);p+=4};s("RIFF");u32(length-8);s("WAVE");s("fmt ");u32(16);u16(1);u16(channels);u32(buffer.sampleRate);u32(buffer.sampleRate*channels*2);u16(channels*2);u16(16);s("data");u32(length-p-4);const data=Array.from({length:channels},(_,c)=>buffer.getChannelData(c));for(let i=0;i<buffer.length;i++)for(let c=0;c<channels;c++){const x=Math.max(-1,Math.min(1,data[c][i]));v.setInt16(p,x<0?x*32768:x*32767,true);p+=2}return ab}
renderAll();

// Menus, submenus, panes, mixer channels, presets, and keyboard tools.
const instrumentNames = {
  kick: "Deep Kick", snare: "Studio Snare", hat: "Closed Hi-hat",
  bass: "Synth Bass", lead: "Bright Lead", pad: "Warm Pad", keys: "Electric Keys"
};
function closeMenus(except = null) {
  document.querySelectorAll(".menubar details.menu[open]").forEach((menu) => {
    if (menu !== except) menu.open = false;
  });
}
document.querySelectorAll(".menubar > .menu").forEach((menu) => {
  menu.addEventListener("toggle", () => { if (menu.open) closeMenus(menu); });
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".menubar")) closeMenus();
});
function setLeftTab(name) {
  document.querySelectorAll("[data-left-tab]").forEach((button) => {
    const active = button.dataset.leftTab === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-left-pane]").forEach((pane) => {
    pane.hidden = pane.dataset.leftPane !== name;
  });
}
document.querySelectorAll("[data-left-tab]").forEach((button) => {
  button.addEventListener("click", () => setLeftTab(button.dataset.leftTab));
});
function addInstrumentTrack(instrument = "lead") {
  const name = instrumentNames[instrument] || "Instrument";
  const track = makeTrack(name, instrument, COLORS[tracks.length % COLORS.length]);
  tracks.push(track);
  selectedId = track.id;
  renderAll();
  renderMixer();
}
function setInstrument(instrument) {
  if (!instrumentNames[instrument]) return;
  selected().instrument = instrument;
  renderAll();
  renderMixer();
  $("#smartInstrument").value = instrument;
}
document.querySelectorAll("[data-instrument]").forEach((button) => {
  button.addEventListener("click", () => {
    setInstrument(button.dataset.instrument);
    if (button.classList.contains("preset-card")) setLeftTab("tracks");
    closeMenus();
  });
});
function renderMixer() {
  const host = $("#mixerChannels");
  if (!host) return;
  host.replaceChildren();
  tracks.forEach((track) => {
    const channel = document.createElement("div");
    channel.className = "mixer-channel";
    channel.style.borderTop = "3px solid " + track.color;
    const title = document.createElement("strong");
    title.textContent = track.name;
    title.title = track.name;
    const kind = document.createElement("small");
    kind.textContent = instrumentNames[track.instrument] || track.instrument;
    const slider = document.createElement("input");
    slider.type = "range"; slider.min = "0"; slider.max = "1"; slider.step = ".01";
    slider.value = String(track.volume); slider.setAttribute("aria-label", track.name + " volume");
    slider.addEventListener("input", () => {
      track.volume = Number(slider.value);
      if (track.id === selectedId) renderControls();
    });
    const value = document.createElement("small");
    value.textContent = Math.round(track.volume * 100) + "%";
    slider.addEventListener("input", () => { value.textContent = Math.round(track.volume * 100) + "%"; });
    const mute = document.createElement("button");
    mute.textContent = track.muted ? "Muted" : "Mute";
    mute.classList.toggle("muted", track.muted);
    mute.addEventListener("click", () => {
      track.muted = !track.muted;
      renderAll(); renderMixer();
    });
    const select = document.createElement("button");
    select.textContent = "Select";
    select.addEventListener("click", () => { selectedId = track.id; renderAll(); renderMixer(); });
    channel.append(title, kind, slider, value, mute, select);
    host.append(channel);
  });
}
function renderBrowser(query = "") {
  const host = $("#browserResults");
  if (!host) return;
  host.replaceChildren();
  const q = query.trim().toLowerCase();
  const entries = Object.entries(instrumentNames).filter(([key, name]) =>
    !q || key.includes(q) || name.toLowerCase().includes(q) ||
    (key === "kick" && "drum percussion".includes(q)) ||
    (key === "snare" && "drum percussion".includes(q)) ||
    (key === "hat" && "drum percussion".includes(q)));
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "pane-description";
    empty.textContent = "No matching sounds. Try bass, keys, lead, pad, or drums.";
    host.append(empty); return;
  }
  entries.forEach(([key, name]) => {
    const button = document.createElement("button");
    button.className = "browser-result";
    const label = document.createElement("span"); label.textContent = name;
    const add = document.createElement("small"); add.textContent = "Use preset +";
    button.append(label, add);
    button.addEventListener("click", () => { setInstrument(key); setLeftTab("tracks"); });
    host.append(button);
  });
}
$("#soundSearch")?.addEventListener("input", (event) => renderBrowser(event.target.value));
function syncInspector() {
  const t = selected();
  $("#smartInstrument").value = t.instrument;
  $("#smartVolume").value = t.volume;
  $("#smartPan").value = t.pan;
  $("#smartName").value = t.name;
  $("#smartMute").checked = t.muted;
}
$("#smartInstrument")?.addEventListener("change", (event) => {
  selected().instrument = event.target.value; renderAll(); renderMixer();
});
$("#smartVolume")?.addEventListener("input", (event) => {
  selected().volume = Number(event.target.value); renderControls(); renderMixer();
});
$("#smartPan")?.addEventListener("input", (event) => {
  selected().pan = Number(event.target.value); renderControls();
});
$("#smartName")?.addEventListener("change", (event) => {
  const value = event.target.value.trim();
  if (value) selected().name = value;
  else event.target.value = selected().name;
  renderAll(); renderMixer();
});
$("#smartMute")?.addEventListener("change", (event) => {
  selected().muted = event.target.checked; renderAll(); renderMixer();
});
function showDialog(title, body) {
  const dialog = $("#infoDialog");
  $("#dialogTitle").textContent = title;
  $("#dialogBody").innerHTML = body;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else alert(title + "\n\n" + $("#dialogBody").textContent);
}
$("#closeDialog")?.addEventListener("click", () => $("#infoDialog").close());
$("#infoDialog")?.addEventListener("click", (event) => {
  if (event.target === $("#infoDialog")) $("#infoDialog").close();
});
function duplicateSelected() {
  const t = selected();
  const copy = makeTrack(t.name + " Copy", t.instrument, COLORS[tracks.length % COLORS.length], t.volume);
  copy.steps = [...t.steps]; copy.notes = {...t.notes}; copy.pan = t.pan; copy.muted = t.muted;
  tracks.push(copy); selectedId = copy.id; renderAll(); renderMixer();
}
function removeSelected() {
  if (tracks.length <= 1) {
    showDialog("Track cannot be removed", "<p>A session must contain at least one track.</p>");
    return;
  }
  const oldName = selected().name;
  tracks = tracks.filter((track) => track.id !== selectedId);
  selectedId = tracks[0].id;
  renderAll(); renderMixer();
  $("#statusText").textContent = "Removed " + oldName;
}
function menuAction(action) {
  const bpm = $("#bpm");
  switch (action) {
    case "new": $("#newProject").click(); break;
    case "open": $("#loadProject").click(); break;
    case "save": $("#saveProject").click(); break;
    case "export": $("#exportWav").click(); break;
    case "download-midi": {
      const data = snapshot();
      download((data.name || "session").replace(/[^a-z0-9_-]+/gi, "-") + "-notes.json",
        JSON.stringify({format:"studiowave-pattern-notes", bpm:data.bpm,
          tracks:data.tracks.map(({name,instrument,steps,notes})=>({name,instrument,steps,notes}))}, null, 2),
        "application/json");
      break;
    }
    case "clear": $("#clearPattern").click(); break;
    case "duplicate": duplicateSelected(); break;
    case "rename": {
      const name = prompt("Track name:", selected().name);
      if (name && name.trim()) { selected().name = name.trim().slice(0,48); renderAll(); renderMixer(); }
      break;
    }
    case "add": addInstrumentTrack(); break;
    case "remove": removeSelected(); break;
    case "mute": selected().muted = !selected().muted; renderAll(); renderMixer(); break;
    case "play": isPlaying ? stop() : start(); break;
    case "stop": stop(); break;
    case "rewind": $("#rewindBtn").click(); break;
    case "tempo-down": bpm.value = Math.max(40, Number(bpm.value)-1); bpm.dispatchEvent(new Event("change")); break;
    case "tempo-up": bpm.value = Math.min(240, Number(bpm.value)+1); bpm.dispatchEvent(new Event("change")); break;
    case "focus-grid": $("#sequencer").focus(); break;
    case "shortcuts":
      showDialog("Keyboard shortcuts", "<ul><li><kbd>Space</kbd> — Play / stop</li><li><kbd>Ctrl/⌘ + N</kbd> — New session</li><li><kbd>Ctrl/⌘ + O</kbd> — Open JSON project</li><li><kbd>Ctrl/⌘ + S</kbd> — Save JSON project</li><li><kbd>Ctrl/⌘ + Z</kbd> — Undo is planned; not yet implemented</li><li>Use the File, Edit, Track, Controls, and View menus for additional actions.</li></ul>");
      break;
    case "about":
      showDialog("About StudioWave", "<p>StudioWave is an original browser-based digital audio workstation prototype.</p><p>Includes a step sequencer, Web Audio instruments, melody grid, track controls, local project files, and WAV export.</p><p>Cloud account and project endpoints are scaffolded separately; the current UI stores sessions locally.</p>");
      break;
  }
  closeMenus();
}
document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.action === "undo" || button.dataset.action === "redo") {
      showDialog("Editing history", "<p>Undo and redo are reserved menu entries. A complete edit-history stack is not implemented yet.</p>");
      return;
    }
    menuAction(button.dataset.action);
  });
});
document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    const panelName = button.dataset.panel;
    if (panelName === "library" || panelName === "browser") {
      const panel = $("#libraryPanel");
      panel.hidden = !panel.hidden;
      if (!panel.hidden) setLeftTab(panelName === "library" ? "library" : "browser");
    } else if (panelName === "mixer") {
      $("#mixerPanel").hidden = !$("#mixerPanel").hidden;
      if (!$("#mixerPanel").hidden) renderMixer();
    } else if (panelName === "inspector") {
      $("#inspectorPanel").hidden = !$("#inspectorPanel").hidden;
      if (!$("#inspectorPanel").hidden) syncInspector();
    }
    closeMenus();
  });
});
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const editing = target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(target.tagName));
  if (event.code === "Space" && !editing && !$("#infoDialog").open) {
    event.preventDefault(); isPlaying ? stop() : start();
  }
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
    const key = event.key.toLowerCase();
    if (key === "s") { event.preventDefault(); $("#saveProject").click(); }
    else if (key === "o") { event.preventDefault(); $("#loadProject").click(); }
    else if (key === "n") { event.preventDefault(); $("#newProject").click(); }
  }
});
const originalRenderAll = renderAll;
renderAll = function() {
  originalRenderAll();
  if ($("#smartInstrument")) syncInspector();
  if ($("#mixerChannels") && !$("#mixerPanel").hidden) renderMixer();
};
renderBrowser();
renderMixer();


// Imported audio assets, metronome and expanded session persistence.
const audioFilePicker = $("#audioFilePicker");
const audioAssetList = $("#audioAssetList");
const audioAssetStatus = $("#audioAssetStatus");
let metronomeEnabled = false;
let metronomeLastBeat = -1;
const originalPlayTrack = playTrack;
playTrack = function(track, s, time) {
  if (track.audioBuffer) {
    if (s === 0 && !track.muted && !track.audioSource && audioCtx && typeof audioCtx.createBufferSource === "function") {
      try {
        const source = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        source.buffer = track.audioBuffer;
        source.loop = true;
        gain.gain.value = track.volume;
        const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
        source.connect(gain);
        if (panner) { panner.pan.value = track.pan; gain.connect(panner); panner.connect(master); }
        else gain.connect(master);
        source.onended = () => { if (track.audioSource === source) track.audioSource = null; };
        source.start(time);
        track.audioSource = source;
      } catch (error) { console.error("Could not start imported audio", error); }
    }
    return;
  }
  return originalPlayTrack(track, s, time);
};
const originalStop = stop;
stop = function() {
  tracks.forEach(track => {
    if (track.audioSource) {
      try { track.audioSource.stop(); } catch (_) {}
      track.audioSource = null;
    }
  });
  originalStop();
};
$("#stopBtn").addEventListener("click", () => { tracks.forEach(track => { if (track.audioSource) { try { track.audioSource.stop(); } catch (_) {} track.audioSource = null; } }); });
$("#rewindBtn").addEventListener("click", () => {
  tracks.forEach(track => { if (track.audioSource) { try { track.audioSource.stop(); } catch (_) {} track.audioSource = null; } });
});
function humanDuration(seconds) {
  if (!Number.isFinite(seconds)) return "Unknown duration";
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return m + ":" + String(s).padStart(2, "0");
}
function renderAudioAssets() {
  if (!audioAssetList) return;
  audioAssetList.replaceChildren();
  const assets = tracks.filter(track => track.audioBuffer);
  audioAssetStatus.textContent = assets.length ? assets.length + (assets.length === 1 ? " audio track" : " audio tracks") : "No imported audio";
  assets.forEach(track => {
    const card = document.createElement("div");
    card.className = "audio-asset-card";
    const icon = document.createElement("span"); icon.className = "audio-asset-icon"; icon.textContent = "♫";
    const meta = document.createElement("span"); meta.className = "audio-asset-meta";
    const title = document.createElement("strong"); title.textContent = track.name; title.title = track.audioFileName || track.name;
    const details = document.createElement("small"); details.textContent = humanDuration(track.audioBuffer.duration) + " · " + track.audioBuffer.numberOfChannels + " ch · " + Math.round(track.audioBuffer.sampleRate / 1000) + " kHz";
    meta.append(title, details);
    const select = document.createElement("button"); select.textContent = "Select"; select.addEventListener("click", () => { selectedId = track.id; renderAll(); renderMixer(); });
    const remove = document.createElement("button"); remove.className = "remove-audio"; remove.textContent = "×"; remove.title = "Remove audio track"; remove.addEventListener("click", () => { if (track.audioSource) { try { track.audioSource.stop(); } catch (_) {} } tracks = tracks.filter(t => t.id !== track.id); if (!tracks.some(t => t.id === selectedId)) selectedId = tracks[0].id; renderAll(); renderMixer(); renderAudioAssets(); });
    card.append(icon, meta, select, remove); audioAssetList.append(card);
  });
}
async function importAudioFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  ensureAudio();
  for (const file of files) {
    if (!file.type.startsWith("audio/") && !/\.(wav|mp3|ogg|m4a|aac|flac|aiff?)$/i.test(file.name)) continue;
    try {
      const buffer = await audioCtx.decodeAudioData(await file.arrayBuffer());
      const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 48) || "Imported audio";
      const track = makeTrack(baseName, "audio", COLORS[tracks.length % COLORS.length], .8);
      track.audioBuffer = buffer;
      track.audioFileName = file.name;
      track.steps.fill(false);
      tracks.push(track);
      selectedId = track.id;
    } catch (error) {
      showDialog("Audio import failed", "<p>The browser could not decode <strong></strong>. Try a WAV or MP3 file.</p>");
      const strong = $("#dialogBody strong"); if (strong) strong.textContent = file.name;
    }
  }
  renderAll(); renderMixer(); renderAudioAssets();
  $("#statusText").textContent = "Audio assets ready";
}
$("#importAudioBtn")?.addEventListener("click", () => audioFilePicker.click());
audioFilePicker?.addEventListener("change", async event => {
  await importAudioFiles(event.target.files);
  event.target.value = "";
});
$("#metronomeBtn")?.addEventListener("click", () => {
  metronomeEnabled = !metronomeEnabled;
  $("#metronomeBtn").setAttribute("aria-pressed", String(metronomeEnabled));
  $("#metronomeBtn").textContent = "♩ Metronome: " + (metronomeEnabled ? "On" : "Off");
  if (metronomeEnabled) { ensureAudio(); metronomeClick(audioCtx.currentTime + .02, true); }
});
function metronomeClick(time, accented = false) {
  if (!audioCtx || !metronomeEnabled) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = "sine"; osc.frequency.setValueAtTime(accented ? 1500 : 1000, time);
  gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(.14, time + .003); gain.gain.exponentialRampToValueAtTime(.0001, time + .035);
  osc.connect(gain); gain.connect(master); osc.start(time); osc.stop(time + .04);
}
const oldTick = tick;
tick = function() {
  if (!isPlaying) return;
  const beat = Math.floor(currentStep() / 4);
  if (metronomeEnabled && beat !== metronomeLastBeat) {
    ensureAudio(); metronomeClick(audioCtx.currentTime + .015, beat === 0);
    metronomeLastBeat = beat;
  }
  oldTick();
  if (currentStep() === 0) metronomeLastBeat = -1;
};
const oldSnapshot = snapshot;
snapshot = function() {
  const data = oldSnapshot();
  data.version = 2;
  data.tracks = data.tracks.map(({audioBuffer, audioSource, audioFileName, ...track}) => ({
    ...track,
    audioFileName: audioFileName || null,
    audioAssetRequired: Boolean(audioFileName)
  }));
  return data;
};
const oldRenderAllForAudio = renderAll;
renderAll = function() {
  oldRenderAllForAudio();
  renderAudioAssets();
};
renderAudioAssets();
