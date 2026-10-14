const $ = (s) => document.querySelector(s);
const COLORS = ["#7c6cff","#4ad6c8","#ffb454","#ff6f91","#68a5ff","#d58cff","#b2d36d","#ff8757"];
const ICONS = {kick:"◉",snare:"▧",hat:"✳",bass:"〰",lead:"♫",pad:"▱",keys:"▦"};
const PITCHES = [{name:"C5",midi:72},{name:"B4",midi:71},{name:"A4",midi:69},{name:"G4",midi:67},{name:"F4",midi:65},{name:"E4",midi:64},{name:"D4",midi:62},{name:"C4",midi:60}];
let nextId=1, selectedId=1, isPlaying=false, timer=null, step=0, audioCtx=null, master=null, tracks=[];
const makeTrack=(name,instrument,color,volume=.8)=>({id:nextId++,name,instrument,color,volume,pan:0,muted:false,steps:Array(16).fill(false),notes:{},startStep:0,lengthSteps:64});
function seed(){nextId=1;tracks=[makeTrack("Kick","kick",COLORS[0],.9),makeTrack("Snare","snare",COLORS[1],.75),makeTrack("Hi-hats","hat",COLORS[2],.5),makeTrack("Bass","bass",COLORS[3],.75),makeTrack("Lead","lead",COLORS[4],.7)];tracks[0].steps=[true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false];tracks[1].steps=[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false];tracks[2].steps=Array.from({length:16},(_,i)=>i%2===0);tracks[3].steps=[true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false];tracks[4].notes={"0":72,"3":67,"5":69,"8":72,"11":76,"13":74};selectedId=1}
seed();
const selected=()=>tracks.find(t=>t.id===selectedId)||tracks[0];
let effectsInput=null,effectsDry=null,reverbSend=null,reverbWet=null,delaySend=null,delayNode=null,delayFeedbackNode=null,delayWet=null,effectsBypassed=false;
function makeImpulse(context,seconds=2.2,decay=2.5){
  const length=Math.floor(context.sampleRate*seconds),buffer=context.createBuffer(2,length,context.sampleRate);
  for(let ch=0;ch<2;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<length;i++){const fade=Math.pow(1-i/length,decay);data[i]=(Math.random()*2-1)*fade}}
  return buffer;
}
function setupMasterEffects(){
  if(!audioCtx||effectsInput)return;
  effectsInput=audioCtx.createGain();effectsDry=audioCtx.createGain();
  const convolver=audioCtx.createConvolver();convolver.buffer=makeImpulse(audioCtx);
  reverbSend=audioCtx.createGain();reverbWet=audioCtx.createGain();
  delaySend=audioCtx.createGain();delayNode=audioCtx.createDelay(1);
  delayFeedbackNode=audioCtx.createGain();delayWet=audioCtx.createGain();
  effectsInput.connect(effectsDry);effectsDry.connect(audioCtx.destination);
  effectsInput.connect(reverbSend);reverbSend.connect(convolver);convolver.connect(reverbWet);reverbWet.connect(audioCtx.destination);
  effectsInput.connect(delaySend);delaySend.connect(delayNode);delayNode.connect(delayWet);delayWet.connect(audioCtx.destination);
  delayNode.connect(delayFeedbackNode);delayFeedbackNode.connect(delayNode);
  applyMasterEffects();
}
function applyMasterEffects(){
  if(!audioCtx||!effectsInput)return;
  const reverb=Number($("#reverbMix")?.value??.18),delay=Number($("#delayMix")?.value??.12),time=Number($("#delayTime")?.value??.28),feedback=Number($("#delayFeedback")?.value??.28);
  effectsDry.gain.value=effectsBypassed?1:Math.cos(reverb*Math.PI/2)*Math.cos(delay*Math.PI/2);
  reverbSend.gain.value=effectsBypassed?0:reverb;
  reverbWet.gain.value=effectsBypassed?0:.8;
  delaySend.gain.value=effectsBypassed?0:delay;
  delayNode.delayTime.value=time;delayFeedbackNode.gain.value=effectsBypassed?0:feedback;
  delayWet.gain.value=effectsBypassed?0:.8;
}
function ensureAudio(){if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();master.gain.value=Number($("#masterVolume").value);setupMasterEffects();master.connect(effectsInput||audioCtx.destination)}if(audioCtx.state==="suspended")audioCtx.resume()}
function tone(freq,time,duration,type="sine",gain=.12,pan=0){const osc=audioCtx.createOscillator(),amp=audioCtx.createGain(),panner=audioCtx.createStereoPanner?audioCtx.createStereoPanner():null;osc.type=type;osc.frequency.setValueAtTime(freq,time);amp.gain.setValueAtTime(.0001,time);amp.gain.exponentialRampToValueAtTime(Math.max(.001,gain),time+.012);amp.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(amp);if(panner){panner.pan.value=pan;amp.connect(panner);panner.connect(master)}else amp.connect(master);osc.start(time);osc.stop(time+duration+.03)}
function noise(time,duration,gain,pan=0){const buffer=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*duration),audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const src=audioCtx.createBufferSource(),amp=audioCtx.createGain();src.buffer=buffer;amp.gain.setValueAtTime(gain,time);amp.gain.exponentialRampToValueAtTime(.001,time+duration);const p=audioCtx.createStereoPanner?.();src.connect(amp);if(p){p.pan.value=pan;amp.connect(p);p.connect(master)}else amp.connect(master);src.start(time)}
function playTrack(t,s,time){if(t.muted)return;const vol=t.volume,pan=t.pan,inst=t.instrument;if(t.steps[s]){if(inst==="kick"){tone(145,time,.2,"sine",.5*vol,pan);const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.setValueAtTime(120,time);o.frequency.exponentialRampToValueAtTime(42,time+.15);g.gain.setValueAtTime(.35*vol,time);g.gain.exponentialRampToValueAtTime(.001,time+.18);o.connect(g);g.connect(master);o.start(time);o.stop(time+.2)}else if(inst==="snare"){noise(time,.16,.28*vol,pan);tone(180,time,.08,"triangle",.1*vol,pan)}else if(inst==="hat")noise(time,.045,.12*vol,pan);else if(inst==="bass")tone(55,time,.23,"sawtooth",.2*vol,pan);else if(inst==="lead")tone(440,time,.18,"square",.13*vol,pan);else if(inst==="pad"){tone(220,time,.35,"triangle",.1*vol,pan);tone(330,time,.35,"sine",.07*vol,pan)}else if(inst==="keys"){tone(440,time,.22,"triangle",.18*vol,pan);tone(660,time,.16,"sine",.04*vol,pan)}}const pitch=t.notes[String(s)];if(pitch&&["bass","lead","pad","keys"].includes(inst)){const f=440*Math.pow(2,(pitch-69)/12);tone(f,time,.28,inst==="lead"?"square":inst==="bass"?"sawtooth":"triangle",.16*vol,pan)}}
function currentStep(){return Math.floor(step)%16}
function tick(){if(!isPlaying)return;ensureAudio();const globalStep=Math.floor(step),s=currentStep(),time=audioCtx.currentTime+.02;tracks.forEach(t=>{const start=Number(t.startStep)||0,end=start+(Number(t.lengthSteps)||64);if(globalStep>=start&&globalStep<end){if(t.audioBuffer){if(globalStep===start&&!t.muted&&!t.audioSource)playTrack(t,s,time,globalStep)}else playTrack(t,s,time,globalStep)}});renderGrid();renderTimeline();$("#position").textContent=`${Math.floor(globalStep/16)+1}.${Math.floor(s/4)+1}.${s%4+1}`;step=(step+1)%64}
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
function snapshot(){return {format:"studiowave-project",version:2,name:$("#projectName").value,bpm:Number($("#bpm").value),masterVolume:Number($("#masterVolume").value),tracks:tracks.map(t=>({...t,steps:[...t.steps],notes:{...t.notes},audioBuffer:undefined,audioSource:undefined}))}}
function download(name,content,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$("#saveProject").addEventListener("click",()=>download((($("#projectName").value||"session").replace(/[^a-z0-9_-]+/gi,"-"))+".json",JSON.stringify(snapshot(),null,2),"application/json"));
$("#loadProject").addEventListener("click",()=>$("#filePicker").click());$("#filePicker").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(d.format!=="studiowave-project"||!Array.isArray(d.tracks))throw Error("Not a StudioWave project");tracks=d.tracks.map(t=>({...t,steps:Array.from({length:16},(_,i)=>!!t.steps?.[i]),notes:t.notes||{},color:t.color||COLORS[0],startStep:Math.max(0,Math.min(63,Number(t.startStep)||0)),lengthSteps:Math.max(1,Math.min(64,Number(t.lengthSteps)||64)),audioBuffer:null,audioSource:null}));nextId=Math.max(0,...tracks.map(t=>t.id))+1;selectedId=tracks[0]?.id||1;$("#projectName").value=d.name||"Imported Session";$("#bpm").value=d.bpm||120;$("#masterVolume").value=d.masterVolume??.75;$("#masterValue").textContent=Math.round(Number($("#masterVolume").value)*100)+"%";if(master)master.gain.value=Number($("#masterVolume").value);renderAll()}catch(err){alert("Could not open project: "+err.message)}e.target.value=""});
$("#newProject").addEventListener("click",()=>{if(!confirm("Start a new session? Unsaved changes will be lost."))return;stop();seed();$("#projectName").value="Untitled Session";$("#bpm").value=120;renderAll()});
$("#exportWav").addEventListener("click",async()=>{const btn=$("#exportWav");btn.disabled=true;btn.textContent="Rendering…";const originalTracks=tracks,oldCtx=audioCtx,oldMaster=master;try{const snap=snapshot(),rate=44100,bpm=snap.bpm,stepDur=60/bpm/4,totalSteps=64,duration=totalSteps*stepDur+1,off=new OfflineAudioContext(2,Math.ceil(duration*rate),rate),out=off.createGain();out.gain.value=snap.masterVolume;out.connect(off.destination);audioCtx=off;master=out;tracks=snap.tracks.map(t=>({...t,audioBuffer:originalTracks.find(x=>x.id===t.id)?.audioBuffer||null,audioSource:null}));tracks.forEach(t=>{if(t.muted)return;const start=Number(t.startStep)||0,end=Math.min(totalSteps,start+(Number(t.lengthSteps)||64));for(let i=start;i<end;i++){const s=i%16;if(t.audioBuffer){if(i===start)playTrack(t,s,i*stepDur,i)}else if(t.steps[s]||t.notes[String(s)])playTrack(t,s,i*stepDur,i)}});const rendered=await off.startRendering();const wav=audioBufferToWav(rendered);download((snap.name||"studiowave").replace(/[^a-z0-9_-]+/gi,"-")+".wav",wav,"audio/wav")}catch(err){console.error(err);alert("WAV export failed in this browser. Try a recent Chrome, Edge, or Safari browser with Web Audio enabled.")}finally{tracks=originalTracks;audioCtx=oldCtx;master=oldMaster;btn.disabled=false;btn.textContent="Export WAV"}});
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
    if (button.dataset.action === "undo") { undoEdit(); return; }
    if (button.dataset.action === "redo") { redoEdit(); return; }
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
playTrack = function(track, s, time, absoluteStep = Math.floor(step)) {
  if (track.audioBuffer) {
    if (absoluteStep === (Number(track.startStep)||0) && !track.muted && !track.audioSource && audioCtx && typeof audioCtx.createBufferSource === "function") {
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
        const regionSteps = Number(track.lengthSteps)||64;
        source.stop(time + regionSteps * (60 / Number($("#bpm").value) / 4));
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


// Microphone recording: permission is requested only after an explicit Record click.
let microphoneRecorder = null;
let microphoneStream = null;
let microphoneChunks = [];
let recordingStartedAt = 0;
const recordButton = $("#recordBtn");
async function toggleMicrophoneRecording() {
  if (microphoneRecorder && microphoneRecorder.state === "recording") {
    microphoneRecorder.stop();
    recordButton.classList.remove("recording");
    recordButton.textContent = "● Record";
    recordButton.setAttribute("aria-pressed", "false");
    $("#statusText").textContent = "Finishing recording…";
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showDialog("Microphone recording unavailable", "<p>This browser does not support microphone recording. Use a current browser over HTTPS or localhost, or import an existing audio file.</p>");
    return;
  }
  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    microphoneChunks = [];
    const preferred = ["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
    microphoneRecorder = preferred ? new MediaRecorder(microphoneStream,{mimeType:preferred}) : new MediaRecorder(microphoneStream);
    microphoneRecorder.addEventListener("dataavailable", event => { if (event.data?.size) microphoneChunks.push(event.data); });
    microphoneRecorder.addEventListener("stop", async () => {
      try {
        const blob = new Blob(microphoneChunks,{type:microphoneRecorder.mimeType||"audio/webm"});
        ensureAudio();
        const decoded = await audioCtx.decodeAudioData(await blob.arrayBuffer());
        const track = makeTrack("Microphone Take", "audio", COLORS[tracks.length % COLORS.length], .85);
        track.audioBuffer = decoded;
        track.audioFileName = "Microphone Take";
        track.steps.fill(false);
        tracks.push(track); selectedId = track.id;
        renderAll(); renderMixer(); renderAudioAssets();
        $("#statusText").textContent = "Recording added to session";
      } catch (error) {
        console.error(error);
        showDialog("Recording could not be decoded", "<p>The browser recorded audio but could not decode the resulting file. Try a current Chrome, Edge, or Safari browser, then record again.</p>");
        $("#statusText").textContent = "Recording decode failed";
      } finally {
        microphoneStream?.getTracks().forEach(track => track.stop());
        microphoneStream = null; microphoneRecorder = null; microphoneChunks = [];
      }
    }, {once:true});
    microphoneRecorder.start(250);
    recordingStartedAt = Date.now();
    recordButton.classList.add("recording");
    recordButton.textContent = "■ Finish take";
    recordButton.setAttribute("aria-pressed", "true");
    $("#statusText").textContent = "Recording microphone…";
  } catch (error) {
    showDialog("Microphone permission required", "<p>Allow microphone access in your browser to record a take. The recording stays in this browser session until you export it.</p>");
    $("#statusText").textContent = "Microphone permission denied";
  }
}
recordButton?.addEventListener("click", toggleMicrophoneRecording);


// Timeline editor: each track has a clip region with start and length in 16th-note steps.
function renderTimeline() {
  const host = $("#timelineEditor");
  if (!host) return;
  host.replaceChildren();
  const ruler = document.createElement("div"); ruler.className = "timeline-ruler";
  ruler.append(Object.assign(document.createElement("span"),{textContent:"TRACK / BAR"}));
  for(let bar=1;bar<=4;bar++){const label=document.createElement("span");label.textContent="BAR "+bar;ruler.append(label)}
  host.append(ruler);
  tracks.forEach(track=>{
    const lane=document.createElement("div");lane.className="timeline-lane";
    const name=document.createElement("div");name.className="timeline-track-name";name.textContent=track.name;name.title=track.name;lane.append(name);
    for(let bar=0;bar<4;bar++){
      const cell=document.createElement("div");cell.className="timeline-bar";
      const barStart=bar*16,barEnd=barStart+16;
      const start=Number(track.startStep)||0,end=start+(Number(track.lengthSteps)||64);
      const overlapStart=Math.max(start,barStart),overlapEnd=Math.min(end,barEnd);
      if(overlapEnd>overlapStart){
        const region=document.createElement("button");region.className="timeline-region"+(track.id===selectedId?" selected":"");region.style.setProperty("--track-color",track.color);
        region.style.width=((overlapEnd-overlapStart)/16*100)+"%";
        region.style.marginLeft=((overlapStart-barStart)/16*100)+"%";
        region.textContent=bar===Math.floor(start/16)?(track.audioBuffer? "AUDIO":"PATTERN"):"";
        region.title=track.name+" · starts bar "+(Math.floor(start/16)+1)+" · "+(track.lengthSteps/16)+" bars";
        region.addEventListener("click",()=>{selectedId=track.id;renderAll();renderMixer()});
        cell.append(region);
      } else cell.append(Object.assign(document.createElement("span"),{className:"timeline-empty",textContent:"—"}));
      lane.append(cell);
    }
    const controls=document.createElement("div");controls.className="timeline-controls";
    const earlier=document.createElement("button");earlier.textContent="←";earlier.title="Move clip one bar earlier";earlier.disabled=(Number(track.startStep)||0)<16;
    earlier.addEventListener("click",()=>{track.startStep=Math.max(0,(Number(track.startStep)||0)-16);renderTimeline()});
    const later=document.createElement("button");later.textContent="→";later.title="Move clip one bar later";later.disabled=(Number(track.startStep)||0)+16+(Number(track.lengthSteps)||64)>64;
    later.addEventListener("click",()=>{track.startStep=Math.min(63,(Number(track.startStep)||0)+16);renderTimeline()});
    const shorter=document.createElement("button");shorter.textContent="−";shorter.title="Trim one bar from clip end";shorter.disabled=(Number(track.lengthSteps)||64)<=16;
    shorter.addEventListener("click",()=>{track.lengthSteps=Math.max(16,(Number(track.lengthSteps)||64)-16);renderTimeline()});
    const longer=document.createElement("button");longer.textContent="+";longer.title="Extend clip one bar";longer.disabled=(Number(track.startStep)||0)+(Number(track.lengthSteps)||64)>=64;
    longer.addEventListener("click",()=>{track.lengthSteps=Math.min(64-(Number(track.startStep)||0),(Number(track.lengthSteps)||64)+16);renderTimeline()});
    controls.append(earlier,later,shorter,longer);lane.append(controls);host.append(lane);
  });
}
const originalRenderAllTimeline = renderAll;
renderAll = function(){originalRenderAllTimeline();renderTimeline()};
renderTimeline();


// Standard MIDI File (SMF) import/export, undo/redo history, waveform previews.
const midiPicker = $("#midiFilePicker");
const undoButton = document.querySelector('[data-action="undo"]');
const redoButton = document.querySelector('[data-action="redo"]');
const HISTORY_LIMIT = 60;
let undoStack = [];
let redoStack = [];
let historyCapturePending = false;
let pendingHistorySnapshot = "";
function modelSnapshot() {
  return JSON.stringify({
    name: $("#projectName").value,
    bpm: Number($("#bpm").value),
    masterVolume: Number($("#masterVolume").value),
    selectedId,
    tracks: tracks.map(t => ({
      id:t.id,name:t.name,instrument:t.instrument,color:t.color,volume:t.volume,
      pan:t.pan,muted:t.muted,steps:t.steps,notes:t.notes,
      startStep:t.startStep||0,lengthSteps:t.lengthSteps||64,
      audioFileName:t.audioFileName||null
    }))
  });
}
function historyUI() {
  if (undoButton) undoButton.disabled = undoStack.length === 0;
  if (redoButton) redoButton.disabled = redoStack.length === 0;
}
function scheduleHistoryCapture() {
  if (historyCapturePending) return;
  historyCapturePending = true;
  pendingHistorySnapshot = modelSnapshot();
  setTimeout(() => {
    historyCapturePending = false;
    const after = modelSnapshot();
    if (after !== pendingHistorySnapshot) {
      undoStack.push(pendingHistorySnapshot);
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      redoStack = [];
      historyUI();
    }
  }, 0);
}
function restoreModel(serialized) {
  const state = JSON.parse(serialized);
  const prior = new Map(tracks.map(t => [t.id,t]));
  tracks = (state.tracks||[]).map(t => {
    const old = prior.get(t.id);
    return {...t,steps:Array.from({length:16},(_,i)=>!!t.steps?.[i]),notes:t.notes||{},
      audioBuffer:old?.audioBuffer||null,audioSource:null,
      audioFileName:t.audioFileName||old?.audioFileName||null};
  });
  if (!tracks.length) tracks=[makeTrack("Track 1","lead",COLORS[0])];
  nextId = Math.max(0,...tracks.map(t=>Number(t.id)||0))+1;
  selectedId = tracks.some(t=>t.id===state.selectedId)?state.selectedId:tracks[0].id;
  $("#projectName").value=state.name||"Untitled Session";
  $("#bpm").value=Math.max(40,Math.min(240,Number(state.bpm)||120));
  $("#masterVolume").value=state.masterVolume??.75;
  $("#masterValue").textContent=Math.round(Number($("#masterVolume").value)*100)+"%";
  if(master) master.gain.value=Number($("#masterVolume").value);
  renderAll(); renderMixer(); renderTimeline(); renderAudioAssets();
}
function undoEdit() {
  if(!undoStack.length)return;
  redoStack.push(modelSnapshot());
  restoreModel(undoStack.pop());
  historyUI(); $("#statusText").textContent="Undo";
}
function redoEdit() {
  if(!redoStack.length)return;
  undoStack.push(modelSnapshot());
  restoreModel(redoStack.pop());
  historyUI(); $("#statusText").textContent="Redo";
}
document.addEventListener("click", event => {
  if(event.target.closest(".seq-cell,.piano-cell,.timeline-controls,.track-mini-actions,.mixer-channel,.preset-card,[data-instrument],#clearPattern,#clearMelody,#duplicatePattern,#addTrack,#newProject,[data-action='duplicate'],[data-action='clear'],[data-action='remove'],[data-action='mute'],[data-action='rename']")) scheduleHistoryCapture();
}, true);
document.addEventListener("change", event => {
  if(event.target.matches("#instrument,#trackMute,#smartInstrument,#smartMute,#smartName,#bpm,#projectName")) scheduleHistoryCapture();
}, true);
document.addEventListener("input", event => {
  if(event.target.matches("#trackVolume,#trackPan,#smartVolume,#smartPan,#masterVolume")) scheduleHistoryCapture();
}, true);
document.addEventListener("keydown", event => {
  if((event.metaKey||event.ctrlKey)&&!event.shiftKey&&event.key.toLowerCase()==="z") {
    event.preventDefault(); undoEdit();
  } else if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="y") {
    event.preventDefault(); redoEdit();
  }
});
const previousMenuAction = menuAction;
menuAction = function(action) {
  if(action==="undo"){undoEdit();return}
  if(action==="redo"){redoEdit();return}
  if(action==="midi-import"){midiPicker?.click();closeMenus();return}
  if(action==="midi-export"){exportStandardMidi();closeMenus();return}
  return previousMenuAction(action);
};
function writeVarLen(value) {
  let buffer=value&0x7f;
  while((value>>=7)){buffer<<=8;buffer|=((value&0x7f)|0x80)}
  const bytes=[];
  while(true){bytes.push(buffer&0xff);if(buffer&0x80)buffer>>=8;else break}
  return bytes;
}
function u16bytes(n){return [(n>>8)&255,n&255]}
function u32bytes(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]}
function asciiBytes(s){return Array.from(s,ch=>ch.charCodeAt(0))}
function exportStandardMidi() {
  const ppq=480,ticksPerStep=ppq/4,tracksBytes=[];
  const tempo=Math.round(60000000/Math.max(40,Math.min(240,Number($("#bpm").value)||120)));
  const meta=[0x00,0xff,0x51,0x03,(tempo>>16)&255,(tempo>>8)&255,tempo&255,0x00,0xff,0x2f,0x00];
  tracksBytes.push([...asciiBytes("MTrk"),...u32bytes(meta.length),...meta]);
  tracks.forEach((track,index)=>{
    const events=[];
    for(let stepIndex=0;stepIndex<64;stepIndex++){
      const local=stepIndex%16;
      const absolute=stepIndex;
      if(absolute<(Number(track.startStep)||0)||absolute>=(Number(track.startStep)||0)+(Number(track.lengthSteps)||64))continue;
      let pitch=track.notes?.[String(local)];
      if(!pitch && track.steps?.[local] && ["kick","snare","hat"].includes(track.instrument)) pitch=track.instrument==="kick"?36:track.instrument==="snare"?38:42;
      if(pitch){
        const velocity=Math.max(1,Math.min(127,Math.round((track.volume??.8)*110)));
        events.push({tick:absolute*ticksPerStep,type:0x90|(index%16),data:[Math.max(0,Math.min(127,pitch)),velocity]});
        events.push({tick:absolute*ticksPerStep+Math.max(1,ticksPerStep-2),type:0x80|(index%16),data:[Math.max(0,Math.min(127,pitch)),0]});
      }
    }
    events.sort((a,b)=>a.tick-b.tick||(a.type&0xf0)-(b.type&0xf0));
    const bytes=[];let last=0;
    events.forEach(e=>{bytes.push(...writeVarLen(Math.max(0,e.tick-last)),e.type,...e.data);last=e.tick});
    bytes.push(0x00,0xff,0x2f,0x00);
    tracksBytes.push([...asciiBytes("MTrk"),...u32bytes(bytes.length),...bytes]);
  });
  const header=[...asciiBytes("MThd"),...u32bytes(6),...u16bytes(1),...u16bytes(tracksBytes.length),...u16bytes(ppq)];
  const all=[...header,...tracksBytes.flat()];
  download((($("#projectName").value||"studiowave").replace(/[^a-z0-9_-]+/gi,"-"))+".mid",new Uint8Array(all),"audio/midi");
  $("#statusText").textContent="MIDI exported";
}
function readMidiVarLen(bytes,state) {
  let value=0,b;
  do {if(state.i>=bytes.length)throw Error("Unexpected end of MIDI data");b=bytes[state.i++];value=(value<<7)|(b&0x7f)} while(b&0x80);
  return value;
}
function parseStandardMidi(buffer) {
  const bytes=new Uint8Array(buffer);
  const readU16=(i)=>(bytes[i]<<8)|bytes[i+1];
  const readU32=(i)=>(bytes[i]*16777216)+(bytes[i+1]<<16)+(bytes[i+2]<<8)+bytes[i+3];
  if(String.fromCharCode(...bytes.slice(0,4))!=="MThd")throw Error("This is not a Standard MIDI File");
  const headerLength=readU32(4),format=readU16(8),trackCount=readU16(10),division=readU16(12);
  if(!division||division&0x8000)throw Error("SMPTE-timed MIDI files are not supported yet");
  let offset=8+headerLength;const noteEvents=[];
  for(let ti=0;ti<trackCount;ti++){
    if(String.fromCharCode(...bytes.slice(offset,offset+4))!=="MTrk")throw Error("Malformed MIDI track chunk");
    const end=offset+8+readU32(offset+4);let pos=offset+8,tick=0,running=0;
    while(pos<end){
      const state={i:pos};tick+=readMidiVarLen(bytes,state);pos=state.i;
      let status=bytes[pos];
      if(status<0x80){if(!running)throw Error("Invalid MIDI running status");status=running}
      else {pos++;if(status<0xf0)running=status}
      if(status===0xff){pos++;const lenState={i:pos},len=readMidiVarLen(bytes,lenState);pos=lenState.i+len;continue}
      if(status===0xf0||status===0xf7){const lenState={i:pos},len=readMidiVarLen(bytes,lenState);pos=lenState.i+len;continue}
      const kind=status&0xf0,channel=status&0x0f;
      const a=bytes[pos++];const b=(kind===0xc0||kind===0xd0)?0:bytes[pos++];
      if((kind===0x90&&b>0)||(kind===0x80)||(kind===0x90&&b===0)){
        noteEvents.push({tick,kind,channel,pitch:a,velocity:b,track:ti});
      }
    }
    offset=end;
  }
  const active=new Map(),notes=[];
  noteEvents.sort((a,b)=>a.tick-b.tick);
  for(const e of noteEvents){
    const key=e.track+":"+e.channel+":"+e.pitch;
    if(e.kind===0x90&&e.velocity>0)active.set(key,e);
    else if(active.has(key)){const start=active.get(key);active.delete(key);notes.push({start:start.tick,duration:Math.max(1,e.tick-start.tick),pitch:e.pitch,velocity:start.velocity,track:start.track})}
  }
  const stepTicks=division/4;
  return {format,division,notes:notes.map(n=>({...n,step:Math.max(0,Math.round(n.start/stepTicks)),length:Math.max(1,Math.round(n.duration/stepTicks))}))};
}
async function importStandardMidi(file) {
  try{
    const midi=parseStandardMidi(await file.arrayBuffer());
    if(!midi.notes.length)throw Error("No note events were found in this MIDI file");
    const byTrack=new Map();
    midi.notes.forEach(note=>{
      const id=note.track;
      if(!byTrack.has(id))byTrack.set(id,[]);
      byTrack.get(id).push(note);
    });
    let created=0;
    for(const [trackIndex,notes] of byTrack){
      const track=makeTrack("MIDI "+(trackIndex+1),"keys",COLORS[tracks.length%COLORS.length],.8);
      track.startStep=0;track.lengthSteps=Math.min(64,Math.max(16,...notes.map(n=>n.step+Math.min(n.length,16))));
      notes.forEach(note=>{
        const local=note.step%16;
        track.notes[String(local)]=note.pitch;
        track.steps[local]=true;
      });
      tracks.push(track);selectedId=track.id;created++;
    }
    if(midi.format===0) $("#statusText").textContent="MIDI imported";
    else $("#statusText").textContent="Imported "+created+" MIDI tracks";
    renderAll();renderMixer();renderTimeline();
  }catch(error){showDialog("MIDI import failed","<p></p>");const p=$("#dialogBody p");if(p)p.textContent=error.message||"Could not parse MIDI file."}
}
midiPicker?.addEventListener("change",async event=>{const file=event.target.files?.[0];if(file)await importStandardMidi(file);event.target.value=""});
function drawWaveform(canvas, buffer) {
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  const width=Math.max(200,Math.floor(rect.width*dpr)),height=Math.max(24,Math.floor(rect.height*dpr));
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  ctx.clearRect(0,0,width,height);ctx.fillStyle="#10151d";ctx.fillRect(0,0,width,height);
  const data=buffer.getChannelData(0),stride=Math.max(1,Math.floor(data.length/width));
  ctx.strokeStyle="#4ad6c8";ctx.lineWidth=1;ctx.beginPath();
  for(let x=0;x<width;x++){
    let min=1,max=-1;const from=x*stride,to=Math.min(data.length,from+stride);
    for(let i=from;i<to;i++){const v=data[i];if(v<min)min=v;if(v>max)max=v}
    ctx.moveTo(x,Math.round((1+min)*height/2));ctx.lineTo(x,Math.round((1+max)*height/2));
  }
  ctx.stroke();
}
const originalRenderAssetsWithWave = renderAudioAssets;
renderAudioAssets = function(){
  originalRenderAssetsWithWave();
  audioAssetList?.querySelectorAll(".audio-asset-card").forEach((card,index)=>{
    const track=tracks.filter(t=>t.audioBuffer)[index];if(!track)return;
    const canvas=document.createElement("canvas");canvas.className="audio-waveform";canvas.setAttribute("aria-label","Waveform preview for "+track.name);
    card.querySelector(".audio-asset-meta")?.append(canvas);
    drawWaveform(canvas,track.audioBuffer);
  });
};
renderAudioAssets();
const initialModelState=modelSnapshot();
historyUI();

/* Master effects controls are live and work with the shared output graph. */
function updateEffectsLabels(){
  $("#reverbValue").textContent=Math.round(Number($("#reverbMix").value)*100)+"%";
  $("#delayValue").textContent=Math.round(Number($("#delayMix").value)*100)+"%";
  $("#delayTimeValue").textContent=Math.round(Number($("#delayTime").value)*1000)+" ms";
  $("#delayFeedbackValue").textContent=Math.round(Number($("#delayFeedback").value)*100)+"%";
}
["reverbMix","delayMix","delayTime","delayFeedback"].forEach(id=>$("#"+id)?.addEventListener("input",()=>{
  updateEffectsLabels();if(audioCtx)applyMasterEffects();
}));
$("#effectsBypass")?.addEventListener("click",()=>{
  effectsBypassed=!effectsBypassed;
  $("#effectsBypass").setAttribute("aria-pressed",String(effectsBypassed));
  $("#effectsBypass").textContent=effectsBypassed?"Effects Bypassed":"Effects On";
  if(audioCtx)applyMasterEffects();
});
updateEffectsLabels();
