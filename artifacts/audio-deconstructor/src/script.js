/* =========================================================
   Audio Deconstructor — vanilla JS
   - Web Audio API: AudioContext + AudioBufferSourceNode + AnalyserNode
   - Canvas: waveform overview, scrollable waveform, spectrum,
     spectrogram, stereo lissajous, energy history.
   - All analysis is heuristic and labeled as such.
   ========================================================= */

/* ---------------- State ---------------- */

const CATEGORIES = [
  { id: "intro",     label: "Intro",          color: "var(--cat-intro)",     hex: "#00e0a4" },
  { id: "verse",     label: "Verse",          color: "var(--cat-verse)",     hex: "#6cb1ff" },
  { id: "chorus",    label: "Chorus",         color: "var(--cat-chorus)",    hex: "#ffb13d" },
  { id: "break",     label: "Break",          color: "var(--cat-break)",     hex: "#c84bff" },
  { id: "drop",      label: "Drop",           color: "var(--cat-drop)",      hex: "#ff4f74" },
  { id: "outro",     label: "Outro",          color: "var(--cat-outro)",     hex: "#4dd0e1" },
  { id: "transition",label: "Transition",     color: "var(--cat-trans)",     hex: "#b8b8b8" },
  { id: "texture",   label: "Texture shift",  color: "var(--cat-texture)",   hex: "#ffd166" },
  { id: "motif",     label: "Motif",          color: "var(--cat-motif)",     hex: "#a8ff60" },
  { id: "drum",      label: "Drum change",    color: "var(--cat-drum)",      hex: "#ff8a3d" },
  { id: "harmonic",  label: "Harmonic change",color: "var(--cat-harmonic)",  hex: "#7c8cff" }
];
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const state = {
  audioCtx: null,
  buffer: null,            // AudioBuffer
  fileName: null,
  fileSize: 0,
  source: null,            // AudioBufferSourceNode
  gainNode: null,
  analyserMix: null,       // mono mix analyser
  analyserL: null,
  analyserR: null,
  splitter: null,
  startedAt: 0,            // ctx.currentTime when source started
  startedFrom: 0,          // buffer time at start
  isPlaying: false,
  isLooping: false,
  loopIn: null,
  loopOut: null,
  rate: 1,
  volume: 0.9,
  zoom: 1,                 // waveform zoom multiplier
  scroll: 0,               // waveform scroll in seconds
  selectedMarker: null,
  markers: [],             // {id, time, label, category, color, notes}
  selectedCategory: "verse",
  fftSize: 2048,
  specTheme: "aurora",
  snapToZero: true,
  energyHistory: [],       // recent rms samples (for energy view)
  observations: [],        // recent observation messages
  lastObsTime: -10,
  smoothedRms: 0,
  smoothedWidth: 0,
  smoothedTransients: 0,
  prevBandEnergy: { low: 0, mid: 0, high: 0 },
  rafId: null,
  spectrogramOffset: 0,
  spectrogramCleared: false,
  activeAnalyzerView: "spectrum",
  draggingMarker: null,
  draggingLoopHandle: null,
  draggingOverviewWindow: null,
  decodedRange: null,      // [start,end] fraction of file decoded so far (placeholder)
};

/* ---------------- Element refs ---------------- */
const el = {
  dropzone: q("#dropzone"),
  fileInput: q("#file-input"),
  fileImportJson: q("#file-import-json"),
  metaName: q("#meta-name"),
  metaDuration: q("#meta-duration"),
  metaSamplerate: q("#meta-samplerate"),
  metaChannels: q("#meta-channels"),
  metaSize: q("#meta-size"),
  metaBitrate: q("#meta-bitrate"),

  btnPlay: q("#btn-play"),
  btnStop: q("#btn-stop"),
  btnRewind: q("#btn-rewind"),
  btnLoop: q("#btn-loop"),
  iconPlay: q("#icon-play"),
  iconPause: q("#icon-pause"),
  vol: q("#vol"),
  rate: q("#rate"),
  rateDisplay: q("#rate-display"),
  btnLoopIn: q("#btn-loop-in"),
  btnLoopOut: q("#btn-loop-out"),
  btnLoopClear: q("#btn-loop-clear"),
  loopInReadout: q("#loop-in-readout"),
  loopOutReadout: q("#loop-out-readout"),
  snapZero: q("#snap-zero"),

  timeCurrent: q("#time-current"),
  timeTotal: q("#time-total"),

  catGrid: q("#category-grid"),
  btnAddMarker: q("#btn-add-marker"),

  overviewCanvas: q("#overview-canvas"),
  overviewWindow: q("#overview-window"),
  waveformCanvas: q("#waveform-canvas"),
  waveformWrap: q(".waveform-wrap.big"),
  laneMarkers: q("#lane-markers"),
  laneLoop: q("#lane-loop"),
  playhead: q("#playhead"),
  timeRuler: q("#time-ruler"),
  emptyState: q("#empty-state"),
  zoomReadout: q("#zoom-readout"),
  btnZoomIn: q("#btn-zoom-in"),
  btnZoomOut: q("#btn-zoom-out"),
  btnZoomReset: q("#btn-zoom-reset"),

  tabRow: q("#tab-row"),
  spectrumCanvas: q("#spectrum-canvas"),
  spectrogramCanvas: q("#spectrogram-canvas"),
  stereoCanvas: q("#stereo-canvas"),
  energyCanvas: q("#energy-canvas"),
  fftSelect: q("#fft-size"),
  themeSelect: q("#spec-theme"),

  mRms: q("#m-rms"),
  mRmsVal: q("#m-rms-val"),
  mPeak: q("#m-peak"),
  mPeakVal: q("#m-peak-val"),
  mBalanceNeedle: q("#m-balance-needle"),
  mBalanceVal: q("#m-balance-val"),
  mWidth: q("#m-width"),
  mWidthVal: q("#m-width-val"),
  mTransients: q("#m-transients"),
  mTransientsVal: q("#m-transients-val"),
  bLow: q("#b-low"),
  bMid: q("#b-mid"),
  bHigh: q("#b-high"),

  observations: q("#observations-list"),
  markersList: q("#markers-list"),
  markerCount: q("#marker-count"),
  markerEditor: q("#marker-editor"),
  edTime: q("#ed-time"),
  edLabel: q("#ed-label"),
  edCat: q("#ed-cat"),
  edNotes: q("#ed-notes"),
  edJump: q("#ed-jump"),
  edDelete: q("#ed-delete"),
  edClose: q("#ed-close"),

  btnExportJson: q("#btn-export-json"),
  btnExportCsv: q("#btn-export-csv"),
  btnImportJson: q("#btn-import-json"),
  toast: q("#toast"),
};

function q(sel) { return document.querySelector(sel); }

/* ---------------- Utility ---------------- */

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}
function formatBytes(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }

function showToast(msg, type = "") {
  el.toast.textContent = msg;
  el.toast.className = "toast show " + type;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.toast.classList.remove("show"), 2200);
}

/* ---------------- Audio context ---------------- */

function getCtx() {
  if (!state.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new Ctx();
    state.gainNode = state.audioCtx.createGain();
    state.gainNode.gain.value = state.volume;
    state.gainNode.connect(state.audioCtx.destination);
  }
  return state.audioCtx;
}

/* ---------------- File loading ---------------- */

async function handleFile(file) {
  if (!file) return;
  if (!/^audio\//i.test(file.type) && !/\.(wav|mp3|aac|m4a|ogg|opus|flac|webm)$/i.test(file.name)) {
    showToast("That doesn't look like an audio file.", "error");
    return;
  }
  showToast(`Decoding ${file.name}…`);
  const ctx = getCtx();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    stopPlayback();
    state.buffer = decoded;
    state.fileName = file.name;
    state.fileSize = file.size;
    state.startedFrom = 0;
    state.scroll = 0;
    state.zoom = 1;
    state.loopIn = null;
    state.loopOut = null;
    state.markers = [];
    state.observations = [];
    state.energyHistory = [];
    state.spectrogramCleared = false;
    state.smoothedRms = 0;
    state.smoothedWidth = 0;
    state.smoothedTransients = 0;
    setSelectedMarker(null);
    updateMeta();
    drawOverview();
    drawWaveform();
    renderMarkerList();
    renderLoopRegion();
    updateLoopReadout();
    el.emptyState.style.display = "none";
    el.playhead.style.display = "block";
    showToast("Track loaded.", "success");
  } catch (e) {
    console.error(e);
    showToast("Could not decode this file. Try WAV / MP3 / AAC / OGG.", "error");
  }
}

function updateMeta() {
  if (!state.buffer) return;
  el.metaName.textContent = state.fileName || "—";
  el.metaDuration.textContent = formatTime(state.buffer.duration);
  el.metaSamplerate.textContent = `${state.buffer.sampleRate.toLocaleString()} Hz`;
  el.metaChannels.textContent = `${state.buffer.numberOfChannels}`;
  el.metaSize.textContent = formatBytes(state.fileSize);
  // Estimate bitrate from compressed file size vs decoded duration.
  const bitrate = state.fileSize && state.buffer.duration
    ? Math.round((state.fileSize * 8) / state.buffer.duration / 1000)
    : 0;
  el.metaBitrate.textContent = bitrate ? `~${bitrate} kbps` : "—";
  el.timeTotal.textContent = formatTime(state.buffer.duration);
}

/* ---------------- Playback ---------------- */

function playFrom(time) {
  if (!state.buffer) return;
  stopPlayback(true); // silent stop
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();

  const src = ctx.createBufferSource();
  src.buffer = state.buffer;
  src.playbackRate.value = state.rate;

  // Build analyser graph
  const analyserMix = ctx.createAnalyser();
  analyserMix.fftSize = state.fftSize;
  analyserMix.smoothingTimeConstant = 0.6;

  const splitter = ctx.createChannelSplitter(2);
  const analyserL = ctx.createAnalyser();
  const analyserR = ctx.createAnalyser();
  analyserL.fftSize = 2048;
  analyserR.fftSize = 2048;
  analyserL.smoothingTimeConstant = 0.4;
  analyserR.smoothingTimeConstant = 0.4;

  src.connect(analyserMix);
  src.connect(splitter);
  splitter.connect(analyserL, 0);
  splitter.connect(analyserR, state.buffer.numberOfChannels > 1 ? 1 : 0);

  analyserMix.connect(state.gainNode);

  state.source = src;
  state.analyserMix = analyserMix;
  state.analyserL = analyserL;
  state.analyserR = analyserR;
  state.splitter = splitter;

  src.onended = () => {
    if (state.source !== src) return;
    state.isPlaying = false;
    updatePlayIcon();
    if (!state.isLooping || state.loopIn == null || state.loopOut == null) {
      // natural end
    }
  };

  const startTime = clamp(time, 0, state.buffer.duration - 0.001);
  state.startedAt = ctx.currentTime;
  state.startedFrom = startTime;
  src.start(0, startTime);
  state.isPlaying = true;
  updatePlayIcon();
  scheduleLoopWatcher();
  if (!state.rafId) state.rafId = requestAnimationFrame(tick);
}

function stopPlayback(silent = false) {
  if (state.source) {
    try { state.source.onended = null; state.source.stop(); } catch (_) {}
    try { state.source.disconnect(); } catch (_) {}
  }
  state.source = null;
  state.analyserMix = null;
  state.analyserL = null;
  state.analyserR = null;
  state.splitter = null;
  state.isPlaying = false;
  if (!silent) updatePlayIcon();
  clearTimeout(state.loopTimer);
}

function pausePlayback() {
  if (!state.isPlaying) return;
  const t = currentTime();
  stopPlayback();
  state.startedFrom = t;
  state.isPlaying = false;
  updatePlayIcon();
}

function togglePlay() {
  if (!state.buffer) { showToast("Load an audio file first."); return; }
  if (state.isPlaying) pausePlayback();
  else playFrom(state.startedFrom);
}

function currentTime() {
  if (!state.buffer) return 0;
  if (state.isPlaying && state.audioCtx) {
    const t = state.startedFrom + (state.audioCtx.currentTime - state.startedAt) * state.rate;
    return clamp(t, 0, state.buffer.duration);
  }
  return clamp(state.startedFrom, 0, state.buffer.duration);
}

function seekTo(t) {
  if (!state.buffer) return;
  const wasPlaying = state.isPlaying;
  state.startedFrom = clamp(t, 0, state.buffer.duration);
  if (wasPlaying) playFrom(state.startedFrom);
  else { updatePlayhead(); updateTimeReadout(); }
}

function scheduleLoopWatcher() {
  clearTimeout(state.loopTimer);
  if (!state.isPlaying) return;
  if (!state.isLooping || state.loopIn == null || state.loopOut == null) return;
  const remaining = (state.loopOut - currentTime()) / state.rate;
  if (remaining <= 0) {
    seekToLoopStart();
    return;
  }
  state.loopTimer = setTimeout(seekToLoopStart, Math.max(10, remaining * 1000));
}
function seekToLoopStart() {
  if (state.isLooping && state.loopIn != null && state.loopOut != null) {
    playFrom(state.loopIn);
  }
}

function updatePlayIcon() {
  if (state.isPlaying) {
    el.iconPlay.style.display = "none";
    el.iconPause.style.display = "inline";
  } else {
    el.iconPlay.style.display = "inline";
    el.iconPause.style.display = "none";
  }
}

/* ---------------- Canvas: utilities ---------------- */

function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { dpr, w, h, cssW: rect.width, cssH: rect.height };
}

/* ---------------- Waveform overview ---------------- */

function computePeaks(buffer, bins) {
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const samplesPerBin = Math.max(1, Math.floor(ch0.length / bins));
  const peaks = new Float32Array(bins * 2); // [min,max,...]
  for (let i = 0; i < bins; i++) {
    const start = i * samplesPerBin;
    const end = Math.min(ch0.length, start + samplesPerBin);
    let min = 1, max = -1;
    for (let j = start; j < end; j++) {
      const v = ch1 ? (ch0[j] + ch1[j]) * 0.5 : ch0[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }
  return peaks;
}

function drawOverview() {
  const c = el.overviewCanvas;
  const ctx = c.getContext("2d");
  const { dpr, w, h } = fitCanvas(c);
  ctx.clearRect(0, 0, w, h);
  if (!state.buffer) return;

  // background grid
  ctx.fillStyle = "#0a1117";
  ctx.fillRect(0, 0, w, h);

  const peaks = state._overviewPeaks && state._overviewPeaks.length === Math.floor(c.clientWidth) * 2
    ? state._overviewPeaks
    : (state._overviewPeaks = computePeaks(state.buffer, Math.floor(c.clientWidth)));

  const mid = h / 2;
  ctx.strokeStyle = "rgba(0, 224, 164, .9)";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  for (let i = 0; i < peaks.length / 2; i++) {
    const x = i * dpr;
    const min = peaks[i * 2];
    const max = peaks[i * 2 + 1];
    ctx.moveTo(x, mid + min * mid * 0.95);
    ctx.lineTo(x, mid + max * mid * 0.95);
  }
  ctx.stroke();

  // baseline
  ctx.strokeStyle = "rgba(255,255,255,.06)";
  ctx.beginPath();
  ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

  // markers on overview
  for (const m of state.markers) {
    const x = (m.time / state.buffer.duration) * w;
    ctx.strokeStyle = m.color || "#ffffff";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }

  // loop region on overview
  if (state.loopIn != null && state.loopOut != null) {
    const x1 = (state.loopIn / state.buffer.duration) * w;
    const x2 = (state.loopOut / state.buffer.duration) * w;
    ctx.fillStyle = "rgba(0,179,255,.18)";
    ctx.fillRect(x1, 0, x2 - x1, h);
  }

  drawOverviewWindow();
}

function drawOverviewWindow() {
  if (!state.buffer) return;
  const wrapW = el.overviewCanvas.clientWidth;
  const visibleSec = visibleDuration();
  const total = state.buffer.duration;
  if (state.zoom <= 1.001) {
    el.overviewWindow.style.display = "none";
    return;
  }
  el.overviewWindow.style.display = "block";
  const left = (state.scroll / total) * wrapW;
  const width = (visibleSec / total) * wrapW;
  el.overviewWindow.style.left = `${left}px`;
  el.overviewWindow.style.width = `${Math.max(8, width)}px`;
}

function visibleDuration() {
  if (!state.buffer) return 0;
  return state.buffer.duration / state.zoom;
}

/* ---------------- Waveform main ---------------- */

function drawWaveform() {
  const c = el.waveformCanvas;
  const ctx = c.getContext("2d");
  const { dpr, w, h } = fitCanvas(c);
  ctx.clearRect(0, 0, w, h);
  if (!state.buffer) return;

  // background
  ctx.fillStyle = "#0a1117";
  ctx.fillRect(0, 0, w, h);

  // grid (vertical time lines)
  drawTimeGrid(ctx, w, h, dpr);

  const startSec = state.scroll;
  const endSec = startSec + visibleDuration();
  const sampleRate = state.buffer.sampleRate;
  const ch0 = state.buffer.getChannelData(0);
  const ch1 = state.buffer.numberOfChannels > 1 ? state.buffer.getChannelData(1) : null;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(ch0.length, Math.floor(endSec * sampleRate));
  const total = endSample - startSample;
  const bins = Math.floor(c.clientWidth);
  const samplesPerBin = Math.max(1, Math.floor(total / bins));

  const mid = h / 2;
  ctx.lineWidth = 1 * dpr;

  // Dual channel preview if stereo
  if (ch1) {
    drawChannelStrip(ctx, ch0, startSample, samplesPerBin, bins, 0, h * 0.5, dpr, "rgba(0,224,164,.85)");
    drawChannelStrip(ctx, ch1, startSample, samplesPerBin, bins, h * 0.5, h * 0.5, dpr, "rgba(0,179,255,.75)");
    // separator
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5); ctx.stroke();
  } else {
    drawChannelStrip(ctx, ch0, startSample, samplesPerBin, bins, 0, h, dpr, "rgba(0,224,164,.9)");
  }

  // baseline
  ctx.strokeStyle = "rgba(255,255,255,.06)";
  ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

  drawTimeRuler();
  renderMarkerLane();
  renderLoopRegion();
  updatePlayhead();
}

function drawChannelStrip(ctx, data, startSample, samplesPerBin, bins, top, height, dpr, color) {
  const mid = top + height / 2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (let i = 0; i < bins; i++) {
    const s = startSample + i * samplesPerBin;
    const e = Math.min(data.length, s + samplesPerBin);
    let min = 1, max = -1;
    for (let j = s; j < e; j++) {
      const v = data[j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const x = i * dpr;
    ctx.moveTo(x, mid + min * (height / 2) * 0.92);
    ctx.lineTo(x, mid + max * (height / 2) * 0.92);
  }
  ctx.stroke();
}

function drawTimeGrid(ctx, w, h, dpr) {
  if (!state.buffer) return;
  const startSec = state.scroll;
  const visible = visibleDuration();
  // pick a tick every ~80px
  const targetTicks = Math.max(4, Math.floor(w / dpr / 100));
  const rawStep = visible / targetTicks;
  const niceSteps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  let step = niceSteps[niceSteps.length - 1];
  for (const s of niceSteps) { if (s >= rawStep) { step = s; break; } }
  const first = Math.ceil(startSec / step) * step;
  ctx.strokeStyle = "rgba(255,255,255,.04)";
  ctx.lineWidth = 1 * dpr;
  for (let t = first; t <= startSec + visible; t += step) {
    const x = ((t - startSec) / visible) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, h);
    ctx.stroke();
  }
}

function drawTimeRuler() {
  if (!state.buffer) return;
  const ruler = el.timeRuler;
  ruler.innerHTML = "";
  const wrapW = el.waveformCanvas.clientWidth;
  const startSec = state.scroll;
  const visible = visibleDuration();
  const targetTicks = Math.max(4, Math.floor(wrapW / 100));
  const rawStep = visible / targetTicks;
  const niceSteps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  let step = niceSteps[niceSteps.length - 1];
  for (const s of niceSteps) { if (s >= rawStep) { step = s; break; } }
  const first = Math.ceil(startSec / step) * step;
  for (let t = first; t <= startSec + visible; t += step) {
    const x = ((t - startSec) / visible) * wrapW;
    const span = document.createElement("span");
    span.style.position = "absolute";
    span.style.left = `${x}px`;
    span.style.bottom = "1px";
    span.style.padding = "0 4px";
    span.textContent = formatTime(t);
    ruler.appendChild(span);
  }
}

/* ---------------- Markers / Loop overlay ---------------- */

function timeToX(t) {
  if (!state.buffer) return 0;
  const visible = visibleDuration();
  if (t < state.scroll) return -9999;
  if (t > state.scroll + visible) return 99999;
  const w = el.waveformCanvas.clientWidth;
  return ((t - state.scroll) / visible) * w;
}
function xToTime(x) {
  if (!state.buffer) return 0;
  const visible = visibleDuration();
  const w = el.waveformCanvas.clientWidth;
  return state.scroll + (x / w) * visible;
}

function renderMarkerLane() {
  el.laneMarkers.innerHTML = "";
  if (!state.buffer) return;
  for (const m of state.markers) {
    const x = timeToX(m.time);
    if (x < -10 || x > el.waveformCanvas.clientWidth + 10) continue;
    const node = document.createElement("div");
    node.className = "marker" + (state.selectedMarker === m.id ? " selected" : "");
    node.style.left = `${x}px`;
    node.style.borderColor = m.color || "#fff";
    node.dataset.id = m.id;
    const flag = document.createElement("div");
    flag.className = "flag";
    flag.style.color = m.color || "#fff";
    flag.textContent = m.label || CAT_BY_ID[m.category]?.label || "Marker";
    node.appendChild(flag);
    node.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      state.draggingMarker = { id: m.id, startX: e.clientX, originalTime: m.time };
      window.addEventListener("mousemove", onDragMarker);
      window.addEventListener("mouseup", endDragMarker, { once: true });
    });
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      setSelectedMarker(m.id);
      seekTo(m.time);
    });
    el.laneMarkers.appendChild(node);
  }
}

function onDragMarker(e) {
  const drag = state.draggingMarker;
  if (!drag || !state.buffer) return;
  const wrapRect = el.waveformWrap.getBoundingClientRect();
  const x = clamp(e.clientX - wrapRect.left, 0, wrapRect.width);
  const t = clamp(xToTime(x), 0, state.buffer.duration);
  const m = state.markers.find(mm => mm.id === drag.id);
  if (m) { m.time = t; renderMarkerLane(); drawOverview(); renderMarkerList(); }
}
function endDragMarker() {
  const drag = state.draggingMarker;
  if (drag) {
    const m = state.markers.find(mm => mm.id === drag.id);
    if (m) {
      m.time = snapToZeroCrossing(m.time);
      state.markers.sort((a, b) => a.time - b.time);
      renderMarkerLane();
      drawOverview();
      renderMarkerList();
    }
  }
  state.draggingMarker = null;
  window.removeEventListener("mousemove", onDragMarker);
}

function renderLoopRegion() {
  el.laneLoop.innerHTML = "";
  if (!state.buffer || state.loopIn == null || state.loopOut == null) return;
  const a = Math.min(state.loopIn, state.loopOut);
  const b = Math.max(state.loopIn, state.loopOut);
  const xa = timeToX(a);
  const xb = timeToX(b);
  if (xb < 0 || xa > el.waveformCanvas.clientWidth) return;
  const region = document.createElement("div");
  region.className = "loop-region";
  region.style.left = `${Math.max(0, xa)}px`;
  region.style.width = `${Math.min(el.waveformCanvas.clientWidth, xb) - Math.max(0, xa)}px`;
  el.laneLoop.appendChild(region);

  // handles
  for (const side of ["in", "out"]) {
    const handle = document.createElement("div");
    handle.className = "loop-handle";
    const x = side === "in" ? xa : xb;
    handle.style.left = `${x - 4}px`;
    handle.dataset.side = side;
    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      state.draggingLoopHandle = side;
      window.addEventListener("mousemove", onDragLoopHandle);
      window.addEventListener("mouseup", endDragLoopHandle, { once: true });
    });
    el.laneLoop.appendChild(handle);
  }
}
function onDragLoopHandle(e) {
  if (!state.buffer) return;
  const wrapRect = el.waveformWrap.getBoundingClientRect();
  const x = clamp(e.clientX - wrapRect.left, 0, wrapRect.width);
  const t = clamp(xToTime(x), 0, state.buffer.duration);
  if (state.draggingLoopHandle === "in") state.loopIn = t;
  else state.loopOut = t;
  renderLoopRegion();
  drawOverview();
  updateLoopReadout();
  scheduleLoopWatcher();
}
function endDragLoopHandle() {
  if (state.draggingLoopHandle === "in" && state.loopIn != null) {
    state.loopIn = snapToZeroCrossing(state.loopIn);
  } else if (state.draggingLoopHandle === "out" && state.loopOut != null) {
    state.loopOut = snapToZeroCrossing(state.loopOut);
  }
  state.draggingLoopHandle = null;
  window.removeEventListener("mousemove", onDragLoopHandle);
  renderLoopRegion();
  drawOverview();
  updateLoopReadout();
  scheduleLoopWatcher();
}

function updateLoopReadout() {
  el.loopInReadout.textContent = state.loopIn != null ? formatTime(Math.min(state.loopIn, state.loopOut ?? state.loopIn)) : "—";
  el.loopOutReadout.textContent = state.loopOut != null ? formatTime(Math.max(state.loopOut, state.loopIn ?? state.loopOut)) : "—";
}

function updatePlayhead() {
  if (!state.buffer) return;
  const t = currentTime();
  const x = timeToX(t);
  const w = el.waveformCanvas.clientWidth;
  if (x < 0 || x > w) {
    // Auto-scroll if playing past visible region
    if (state.isPlaying) {
      const visible = visibleDuration();
      state.scroll = clamp(t - visible * 0.1, 0, Math.max(0, state.buffer.duration - visible));
      drawWaveform();
      drawOverviewWindow();
      return;
    }
    el.playhead.style.left = `-9999px`;
    return;
  }
  el.playhead.style.left = `${x}px`;
}

function updateTimeReadout() {
  el.timeCurrent.textContent = formatTime(currentTime());
}

/* ---------------- Markers list / editor ---------------- */

/**
 * Snap a time (seconds) to the nearest zero-crossing in the buffer within ±10 ms.
 * Uses the mono mix of available channels. Returns the original time if snapping
 * is disabled, no buffer is loaded, or no crossing is found in the search window.
 * Heuristic: prefers exact sign-change samples over just-near-zero samples.
 */
function snapToZeroCrossing(time) {
  if (!state.snapToZero || !state.buffer) return time;
  const buf = state.buffer;
  const sr = buf.sampleRate;
  const dur = buf.duration;
  const t = clamp(time, 0, dur);
  const center = Math.round(t * sr);
  const window = Math.round(0.010 * sr); // ±10 ms
  const lo = Math.max(0, center - window);
  const hi = Math.min(buf.length - 2, center + window);
  if (hi <= lo) return t;

  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  const sampleAt = (i) => ch1 ? (ch0[i] + ch1[i]) * 0.5 : ch0[i];

  let bestCrossingIdx = -1;
  let bestCrossingDist = Infinity;
  let bestNearZeroIdx = -1;
  let bestNearZeroAbs = Infinity;

  let prev = sampleAt(lo);
  for (let i = lo + 1; i <= hi; i++) {
    const cur = sampleAt(i);
    // Sign change between i-1 and i is a true zero crossing.
    if ((prev <= 0 && cur > 0) || (prev >= 0 && cur < 0) || cur === 0) {
      // Pick the side closer to zero.
      const idx = Math.abs(cur) < Math.abs(prev) ? i : i - 1;
      const dist = Math.abs(idx - center);
      if (dist < bestCrossingDist) {
        bestCrossingDist = dist;
        bestCrossingIdx = idx;
      }
    }
    const a = Math.abs(cur);
    if (a < bestNearZeroAbs) {
      bestNearZeroAbs = a;
      bestNearZeroIdx = i;
    }
    prev = cur;
  }

  const chosen = bestCrossingIdx >= 0 ? bestCrossingIdx : bestNearZeroIdx;
  if (chosen < 0) return t;
  return clamp(chosen / sr, 0, dur);
}

function addMarkerAt(time, category) {
  const cat = CAT_BY_ID[category] || CAT_BY_ID["verse"];
  const snapped = snapToZeroCrossing(time);
  const m = {
    id: uid(),
    time: clamp(snapped, 0, state.buffer ? state.buffer.duration : 0),
    label: cat.label,
    category: cat.id,
    color: cat.hex,
    notes: ""
  };
  state.markers.push(m);
  state.markers.sort((a, b) => a.time - b.time);
  renderMarkerLane();
  drawOverview();
  renderMarkerList();
  setSelectedMarker(m.id);
  showToast(`Marker dropped at ${formatTime(m.time)}`, "success");
}

function renderMarkerList() {
  el.markerCount.textContent = String(state.markers.length);
  if (!state.markers.length) {
    el.markersList.innerHTML = `<div class="markers-empty">No markers yet. Drop one with the button on the left or press <kbd>M</kbd> while playing.</div>`;
    return;
  }
  el.markersList.innerHTML = "";
  for (const m of state.markers) {
    const row = document.createElement("div");
    row.className = "marker-row" + (state.selectedMarker === m.id ? " active" : "");
    row.innerHTML = `
      <span class="swatch" style="background:${m.color}"></span>
      <span class="row-time mono">${formatTime(m.time)}</span>
      <span class="row-label">${escapeHtml(m.label || (CAT_BY_ID[m.category]?.label ?? "Marker"))}</span>
      <span class="row-cat">${(CAT_BY_ID[m.category]?.label ?? m.category)}</span>`;
    row.addEventListener("click", () => {
      setSelectedMarker(m.id);
      seekTo(m.time);
    });
    el.markersList.appendChild(row);
  }
}

function setSelectedMarker(id) {
  state.selectedMarker = id;
  renderMarkerList();
  renderMarkerLane();
  if (id == null) {
    el.markerEditor.hidden = true;
    return;
  }
  const m = state.markers.find(mm => mm.id === id);
  if (!m) { el.markerEditor.hidden = true; return; }
  el.markerEditor.hidden = false;
  el.edTime.value = formatTime(m.time);
  el.edLabel.value = m.label || "";
  el.edCat.value = m.category;
  el.edNotes.value = m.notes || "";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- Analyzers ---------------- */

function tick() {
  state.rafId = requestAnimationFrame(tick);
  updateTimeReadout();
  updatePlayhead();
  if (state.isPlaying && state.analyserMix) {
    runAnalysisFrame();
  }
  // Always draw the active analyzer view to keep size in sync
  drawActiveAnalyzer();
}

function runAnalysisFrame() {
  const N = state.analyserMix.frequencyBinCount;
  if (!state._freqArr || state._freqArr.length !== N) state._freqArr = new Uint8Array(N);
  if (!state._timeArr || state._timeArr.length !== state.analyserMix.fftSize) state._timeArr = new Uint8Array(state.analyserMix.fftSize);
  state.analyserMix.getByteFrequencyData(state._freqArr);
  state.analyserMix.getByteTimeDomainData(state._timeArr);

  // L/R time domain for stereo
  const NL = state.analyserL.fftSize;
  if (!state._lArr || state._lArr.length !== NL) state._lArr = new Float32Array(NL);
  if (!state._rArr || state._rArr.length !== NL) state._rArr = new Float32Array(NL);
  state.analyserL.getFloatTimeDomainData(state._lArr);
  state.analyserR.getFloatTimeDomainData(state._rArr);

  // RMS / peak
  let sumSq = 0, peak = 0;
  for (let i = 0; i < state._timeArr.length; i++) {
    const v = (state._timeArr[i] - 128) / 128;
    sumSq += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  const rms = Math.sqrt(sumSq / state._timeArr.length);
  state.smoothedRms = state.smoothedRms * 0.8 + rms * 0.2;

  // band energy from frequency domain
  const sr = state.audioCtx.sampleRate;
  const nyquist = sr / 2;
  const binHz = nyquist / N;
  const idxLow = Math.floor(250 / binHz);
  const idxMid = Math.floor(2000 / binHz);
  let lowSum = 0, midSum = 0, highSum = 0, lowN = 0, midN = 0, highN = 0;
  for (let i = 1; i < N; i++) {
    const v = state._freqArr[i] / 255;
    if (i <= idxLow) { lowSum += v; lowN++; }
    else if (i <= idxMid) { midSum += v; midN++; }
    else { highSum += v; highN++; }
  }
  const low = lowSum / Math.max(1, lowN);
  const mid = midSum / Math.max(1, midN);
  const high = highSum / Math.max(1, highN);

  // L/R energy and stereo width via mid/side
  let lE = 0, rE = 0, midSq = 0, sideSq = 0;
  for (let i = 0; i < NL; i++) {
    const l = state._lArr[i];
    const r = state._rArr[i];
    lE += l * l; rE += r * r;
    const m = (l + r) * 0.5;
    const s = (l - r) * 0.5;
    midSq += m * m; sideSq += s * s;
  }
  lE = Math.sqrt(lE / NL);
  rE = Math.sqrt(rE / NL);
  const total = lE + rE;
  const balance = total > 1e-6 ? (rE - lE) / total : 0; // -1 .. +1
  const widthRaw = (midSq + sideSq) > 1e-9 ? sideSq / (midSq + sideSq) : 0;
  state.smoothedWidth = state.smoothedWidth * 0.85 + widthRaw * 0.15;

  // transient density: positive spikes in low/mid energy vs previous frame
  const dLow = Math.max(0, low - state.prevBandEnergy.low);
  const dMid = Math.max(0, mid - state.prevBandEnergy.mid);
  const transientNow = (dLow * 1.4 + dMid * 0.8);
  state.smoothedTransients = state.smoothedTransients * 0.92 + transientNow * 0.08;
  state.prevBandEnergy = { low, mid, high };

  // Update meters
  el.mRms.style.width = `${Math.min(100, state.smoothedRms * 220)}%`;
  el.mRmsVal.textContent = `${(state.smoothedRms).toFixed(3)}`;
  el.mPeak.style.width = `${Math.min(100, peak * 100)}%`;
  el.mPeakVal.textContent = `${(20 * Math.log10(Math.max(1e-6, peak))).toFixed(1)} dB`;

  const bal = balance; // -1 .. +1
  el.mBalanceNeedle.style.left = `${50 + bal * 50}%`;
  el.mBalanceVal.textContent = bal === 0 ? "0" : (bal > 0 ? `R ${(bal * 100).toFixed(0)}%` : `L ${(-bal * 100).toFixed(0)}%`);

  el.mWidth.style.width = `${Math.min(100, state.smoothedWidth * 220)}%`;
  el.mWidthVal.textContent = `${(state.smoothedWidth * 100).toFixed(0)}%`;

  el.mTransients.style.width = `${Math.min(100, state.smoothedTransients * 600)}%`;
  el.mTransientsVal.textContent = `${(state.smoothedTransients * 100).toFixed(1)}`;

  el.bLow.style.height = `${Math.min(100, low * 130)}%`;
  el.bMid.style.height = `${Math.min(100, mid * 130)}%`;
  el.bHigh.style.height = `${Math.min(100, high * 130)}%`;

  // History buffer
  state.energyHistory.push({
    t: currentTime(),
    rms: state.smoothedRms,
    low, mid, high,
    width: state.smoothedWidth,
    balance: bal
  });
  if (state.energyHistory.length > 1024) state.energyHistory.shift();

  maybeAddObservation({ low, mid, high, width: state.smoothedWidth, transients: state.smoothedTransients });
}

function maybeAddObservation(values) {
  const t = currentTime();
  if (t - state.lastObsTime < 4.5) return; // throttle

  const recent = state.energyHistory.slice(-180); // ~3s
  const earlier = state.energyHistory.slice(-360, -180); // ~3-6s ago
  if (recent.length < 30 || earlier.length < 30) return;
  const avg = (arr, key) => arr.reduce((s, x) => s + x[key], 0) / arr.length;

  const items = [
    { key: "high",  label: "High-frequency energy",  threshold: 0.06, dirUp: "increases", dirDown: "decreases" },
    { key: "low",   label: "Low-frequency content",  threshold: 0.06, dirUp: "becomes more dominant", dirDown: "thins out" },
    { key: "mid",   label: "Mid-range presence",     threshold: 0.06, dirUp: "fills out", dirDown: "drops back" },
    { key: "width", label: "Stereo image",           threshold: 0.04, dirUp: "appears wider", dirDown: "narrows" },
  ];
  let pushed = false;
  for (const it of items) {
    const a = avg(recent, it.key);
    const b = avg(earlier, it.key);
    const d = a - b;
    if (Math.abs(d) > it.threshold) {
      pushObservation(`${it.label} ${d > 0 ? it.dirUp : it.dirDown} around this section.`);
      pushed = true;
      break;
    }
  }
  if (!pushed && values.transients > 0.18) {
    pushObservation("Transient activity rises in this region.");
    pushed = true;
  }
  if (pushed) state.lastObsTime = t;
}

function pushObservation(text) {
  const t = currentTime();
  state.observations.unshift({ t, text });
  state.observations = state.observations.slice(0, 30);
  renderObservations();
}

function renderObservations() {
  if (!state.observations.length) {
    el.observations.innerHTML = `<li class="obs-empty">Play the track to see heuristic observations about energy, stereo image, and transient activity.</li>`;
    return;
  }
  el.observations.innerHTML = "";
  for (const o of state.observations) {
    const li = document.createElement("li");
    li.innerHTML = `<time>${formatTime(o.t)}</time>${escapeHtml(o.text)}`;
    el.observations.appendChild(li);
  }
}

/* ---------------- Analyzer rendering ---------------- */

function drawActiveAnalyzer() {
  switch (state.activeAnalyzerView) {
    case "spectrum": drawSpectrum(); break;
    case "spectrogram": drawSpectrogram(); break;
    case "stereo": drawStereo(); break;
    case "energy": drawEnergyHistory(); break;
  }
}

function drawSpectrum() {
  const c = el.spectrumCanvas;
  const ctx = c.getContext("2d");
  const { dpr, w, h } = fitCanvas(c);
  ctx.fillStyle = "#0a1117";
  ctx.fillRect(0, 0, w, h);
  // grid
  ctx.strokeStyle = "rgba(255,255,255,.05)";
  ctx.lineWidth = 1 * dpr;
  for (let i = 1; i < 5; i++) {
    const y = (i / 5) * h;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  if (!state._freqArr) {
    ctx.fillStyle = "#3c4856"; ctx.font = `${12 * dpr}px Inter, sans-serif`;
    ctx.fillText("Spectrum will appear during playback.", 16 * dpr, h / 2);
    return;
  }
  const N = state._freqArr.length;
  const sr = state.audioCtx ? state.audioCtx.sampleRate : 48000;
  const nyquist = sr / 2;

  // Bars distributed log frequency
  const minHz = 30;
  const maxHz = nyquist;
  const bars = Math.floor(c.clientWidth / 4);
  const barW = (w / bars) - 1 * dpr;
  ctx.fillStyle = "rgba(0,224,164,.85)";
  for (let i = 0; i < bars; i++) {
    const f0 = minHz * Math.pow(maxHz / minHz, i / bars);
    const f1 = minHz * Math.pow(maxHz / minHz, (i + 1) / bars);
    const i0 = Math.max(1, Math.floor(f0 / nyquist * N));
    const i1 = Math.min(N - 1, Math.floor(f1 / nyquist * N));
    let m = 0;
    for (let k = i0; k <= i1; k++) if (state._freqArr[k] > m) m = state._freqArr[k];
    const v = m / 255;
    const bh = v * h * 0.9;
    const grd = ctx.createLinearGradient(0, h - bh, 0, h);
    grd.addColorStop(0, "rgba(0,179,255,.95)");
    grd.addColorStop(1, "rgba(0,224,164,.6)");
    ctx.fillStyle = grd;
    ctx.fillRect(i * (barW + 1 * dpr), h - bh, barW, bh);
  }

  // Frequency labels
  ctx.fillStyle = "rgba(154,167,180,.7)";
  ctx.font = `${10 * dpr}px JetBrains Mono, monospace`;
  const labels = [60, 200, 500, 1000, 3000, 8000, 16000];
  for (const hz of labels) {
    if (hz > nyquist) continue;
    const x = Math.log(hz / minHz) / Math.log(maxHz / minHz) * w;
    ctx.fillText(`${hz >= 1000 ? (hz / 1000) + "k" : hz}`, x + 2 * dpr, h - 4 * dpr);
  }
}

function colorForSpectrogram(v, theme) {
  // v in 0..1
  const t = clamp(v, 0, 1);
  switch (theme) {
    case "magma": {
      const r = Math.round(255 * Math.min(1, t * 1.8));
      const g = Math.round(80 * t * t);
      const b = Math.round(160 * (1 - t));
      return `rgb(${r},${g},${b})`;
    }
    case "ice": {
      const r = Math.round(40 * t);
      const g = Math.round(140 * Math.pow(t, 0.7));
      const b = Math.round(255 * Math.min(1, 0.4 + t));
      return `rgb(${r},${g},${b})`;
    }
    case "mono": {
      const x = Math.round(255 * Math.pow(t, 0.7));
      return `rgb(${x},${x},${x})`;
    }
    case "aurora":
    default: {
      // green -> teal -> magenta
      const r = Math.round(255 * Math.pow(t, 2.2));
      const g = Math.round(220 * Math.pow(t, 0.5));
      const b = Math.round(180 * t);
      return `rgb(${r},${g},${b})`;
    }
  }
}

function drawSpectrogram() {
  const c = el.spectrogramCanvas;
  const ctx = c.getContext("2d");
  const { dpr, w, h } = fitCanvas(c);
  if (!state.spectrogramCleared || c._lastW !== w || c._lastH !== h) {
    ctx.fillStyle = "#0a1117"; ctx.fillRect(0, 0, w, h);
    state.spectrogramCleared = true;
    c._lastW = w; c._lastH = h;
  }
  if (!state._freqArr || !state.isPlaying) return;

  // Scroll image left by 1px
  const colW = Math.max(1, Math.floor(2 * dpr));
  const img = ctx.getImageData(colW, 0, w - colW, h);
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = "#0a1117";
  ctx.fillRect(w - colW, 0, colW, h);

  const N = state._freqArr.length;
  for (let y = 0; y < h; y++) {
    // log mapping freq bin
    const frac = 1 - y / h;
    const idx = Math.max(1, Math.min(N - 1, Math.floor(Math.pow(frac, 2.4) * N)));
    const v = state._freqArr[idx] / 255;
    ctx.fillStyle = colorForSpectrogram(v, state.specTheme);
    ctx.fillRect(w - colW, y, colW, 1);
  }
}

function drawStereo() {
  const c = el.stereoCanvas;
  const ctx = c.getContext("2d");
  const { dpr, w, h } = fitCanvas(c);
  ctx.fillStyle = "#0a1117"; ctx.fillRect(0, 0, w, h);

  // diamond grid
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0); ctx.lineTo(w, h / 2); ctx.lineTo(w / 2, h); ctx.lineTo(0, h / 2); ctx.closePath();
  ctx.stroke();

  // labels
  ctx.fillStyle = "rgba(154,167,180,.6)";
  ctx.font = `${10 * dpr}px JetBrains Mono, monospace`;
  ctx.fillText("L", 6 * dpr, h / 2 + 4 * dpr);
  ctx.fillText("R", w - 12 * dpr, h / 2 + 4 * dpr);
  ctx.fillText("M", w / 2 - 4 * dpr, 12 * dpr);
  ctx.fillText("S", w / 2 - 4 * dpr, h - 4 * dpr);

  if (!state._lArr) {
    ctx.fillStyle = "#3c4856";
    ctx.font = `${12 * dpr}px Inter, sans-serif`;
    ctx.fillText("Stereo image will appear during playback.", 16 * dpr, h - 12 * dpr);
    return;
  }

  const cx = w / 2, cy = h / 2;
  const scale = Math.min(w, h) * 0.45;
  ctx.fillStyle = "rgba(0,224,164,.7)";
  const N = Math.min(state._lArr.length, 1024);
  for (let i = 0; i < N; i++) {
    const l = state._lArr[i];
    const r = state._rArr[i];
    const m = (l + r) * 0.5; // y
    const s = (l - r) * 0.5; // x
    const x = cx + s * scale * 1.2;
    const y = cy - m * scale * 1.2;
    ctx.fillRect(x, y, 1.2 * dpr, 1.2 * dpr);
  }
}

function drawEnergyHistory() {
  const c = el.energyCanvas;
  const ctx = c.getContext("2d");
  const { dpr, w, h } = fitCanvas(c);
  ctx.fillStyle = "#0a1117"; ctx.fillRect(0, 0, w, h);
  if (!state.energyHistory.length) {
    ctx.fillStyle = "#3c4856";
    ctx.font = `${12 * dpr}px Inter, sans-serif`;
    ctx.fillText("Energy history will appear during playback.", 16 * dpr, h / 2);
    return;
  }
  const data = state.energyHistory;
  const cols = data.length;
  const stepX = w / Math.max(1, cols - 1);

  function plot(key, color, mult = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4 * dpr;
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
      const v = clamp((data[i][key] || 0) * mult, 0, 1);
      const x = i * stepX;
      const y = h - v * h * 0.9 - 8;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  plot("low", "rgba(0,179,255,.85)", 1.6);
  plot("mid", "rgba(0,224,164,.85)", 1.6);
  plot("high", "rgba(255,138,61,.85)", 1.6);
  plot("rms", "rgba(255,255,255,.55)", 2);

  // legend
  ctx.fillStyle = "rgba(154,167,180,.85)";
  ctx.font = `${10 * dpr}px JetBrains Mono, monospace`;
  const legend = [
    ["Low",  "rgba(0,179,255,.85)"],
    ["Mid",  "rgba(0,224,164,.85)"],
    ["High", "rgba(255,138,61,.85)"],
    ["RMS",  "rgba(255,255,255,.85)"],
  ];
  let lx = 12 * dpr;
  for (const [name, col] of legend) {
    ctx.fillStyle = col;
    ctx.fillRect(lx, 10 * dpr, 8 * dpr, 8 * dpr);
    ctx.fillStyle = "rgba(154,167,180,.85)";
    ctx.fillText(name, lx + 12 * dpr, 18 * dpr);
    lx += 60 * dpr;
  }
}

/* ---------------- Export / Import ---------------- */

function exportJson() {
  const session = {
    app: "Audio Deconstructor",
    version: 1,
    file: state.fileName || null,
    duration: state.buffer ? state.buffer.duration : null,
    sampleRate: state.buffer ? state.buffer.sampleRate : null,
    channels: state.buffer ? state.buffer.numberOfChannels : null,
    loop: state.loopIn != null && state.loopOut != null ? { in: state.loopIn, out: state.loopOut } : null,
    markers: state.markers.map(m => ({
      time: m.time, label: m.label, category: m.category, color: m.color, notes: m.notes
    })),
    exportedAt: new Date().toISOString()
  };
  downloadBlob(JSON.stringify(session, null, 2), `${(state.fileName || "session").replace(/\.[^.]+$/, "")}.deconstructor.json`, "application/json");
  showToast("Exported session JSON.", "success");
}
function exportCsv() {
  if (!state.markers.length) { showToast("No markers to export.", "error"); return; }
  const header = "time_seconds,time_formatted,category,label,notes\n";
  const rows = state.markers.map(m => [
    m.time.toFixed(3),
    formatTime(m.time),
    m.category,
    csvCell(m.label),
    csvCell(m.notes || "")
  ].join(",")).join("\n");
  downloadBlob(header + rows + "\n", `${(state.fileName || "markers").replace(/\.[^.]+$/, "")}.markers.csv`, "text/csv");
  showToast("Exported markers CSV.", "success");
}
function csvCell(s) {
  s = String(s ?? "");
  if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 250);
}

async function importJson(file) {
  try {
    const txt = await file.text();
    const parsed = JSON.parse(txt);
    if (!parsed || !Array.isArray(parsed.markers)) throw new Error("Bad session file");
    state.markers = parsed.markers.map(m => ({
      id: uid(),
      time: Number(m.time) || 0,
      label: String(m.label || "Marker"),
      category: m.category && CAT_BY_ID[m.category] ? m.category : "verse",
      color: m.color || (CAT_BY_ID[m.category]?.hex ?? "#6cb1ff"),
      notes: String(m.notes || "")
    })).sort((a, b) => a.time - b.time);
    if (parsed.loop && typeof parsed.loop.in === "number" && typeof parsed.loop.out === "number") {
      state.loopIn = parsed.loop.in;
      state.loopOut = parsed.loop.out;
    }
    renderMarkerList();
    renderMarkerLane();
    renderLoopRegion();
    drawOverview();
    updateLoopReadout();
    showToast(`Imported ${state.markers.length} markers.`, "success");
  } catch (e) {
    showToast("Could not import that JSON file.", "error");
  }
}

/* ---------------- Wire up UI ---------------- */

function buildCategoryChips() {
  el.catGrid.innerHTML = "";
  for (const cat of CATEGORIES) {
    const chip = document.createElement("button");
    chip.className = "cat-chip" + (cat.id === state.selectedCategory ? " active" : "");
    chip.dataset.cat = cat.id;
    chip.title = `Drop a "${cat.label}" marker on the next press of the marker button or M`;
    chip.innerHTML = `<span class="dot" style="background:${cat.hex}"></span><span>${cat.label}</span>`;
    chip.addEventListener("click", () => {
      state.selectedCategory = cat.id;
      buildCategoryChips();
    });
    el.catGrid.appendChild(chip);
  }
  // editor select
  el.edCat.innerHTML = "";
  for (const cat of CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = cat.id; opt.textContent = cat.label;
    el.edCat.appendChild(opt);
  }
}

function bindEvents() {
  // Drag and drop
  ["dragenter", "dragover"].forEach(ev =>
    el.dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); el.dropzone.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(ev =>
    el.dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); el.dropzone.classList.remove("drag"); }));
  el.dropzone.addEventListener("drop", (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  });
  el.dropzone.addEventListener("click", () => el.fileInput.click());
  el.dropzone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.fileInput.click(); } });
  el.fileInput.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  });

  // Transport
  el.btnPlay.addEventListener("click", togglePlay);
  el.btnStop.addEventListener("click", () => { stopPlayback(); state.startedFrom = 0; updatePlayhead(); updateTimeReadout(); });
  el.btnRewind.addEventListener("click", () => seekTo(0));
  el.btnLoop.addEventListener("click", () => {
    state.isLooping = !state.isLooping;
    el.btnLoop.classList.toggle("on", state.isLooping);
    if (state.isLooping && (state.loopIn == null || state.loopOut == null)) {
      showToast("Set loop in / out first.");
    } else {
      scheduleLoopWatcher();
    }
  });
  el.vol.addEventListener("input", (e) => {
    state.volume = Number(e.target.value);
    if (state.gainNode) state.gainNode.gain.value = state.volume;
  });
  el.rate.addEventListener("input", (e) => {
    state.rate = Number(e.target.value);
    el.rateDisplay.textContent = `${state.rate.toFixed(2)}×`;
    if (state.source) {
      const t = currentTime();
      state.source.playbackRate.value = state.rate;
      // Re-anchor timing to keep currentTime continuous
      state.startedFrom = t;
      state.startedAt = state.audioCtx.currentTime;
      scheduleLoopWatcher();
    }
  });
  el.btnLoopIn.addEventListener("click", () => { state.loopIn = snapToZeroCrossing(currentTime()); if (state.loopOut == null || state.loopOut <= state.loopIn) state.loopOut = snapToZeroCrossing(clamp(state.loopIn + 4, 0, state.buffer?.duration || 0)); renderLoopRegion(); drawOverview(); updateLoopReadout(); scheduleLoopWatcher(); });
  el.btnLoopOut.addEventListener("click", () => { state.loopOut = snapToZeroCrossing(currentTime()); if (state.loopIn == null || state.loopIn >= state.loopOut) state.loopIn = snapToZeroCrossing(Math.max(0, state.loopOut - 4)); renderLoopRegion(); drawOverview(); updateLoopReadout(); scheduleLoopWatcher(); });
  el.btnLoopClear.addEventListener("click", () => { state.loopIn = state.loopOut = null; renderLoopRegion(); drawOverview(); updateLoopReadout(); });
  el.snapZero.addEventListener("change", (e) => {
    state.snapToZero = e.target.checked;
    showToast(state.snapToZero ? "Snap to zero-crossing on" : "Snap to zero-crossing off");
  });

  // Markers
  el.btnAddMarker.addEventListener("click", () => {
    if (!state.buffer) { showToast("Load an audio file first."); return; }
    addMarkerAt(currentTime(), state.selectedCategory);
  });

  // Marker editor
  el.edLabel.addEventListener("input", (e) => {
    const m = state.markers.find(mm => mm.id === state.selectedMarker);
    if (!m) return; m.label = e.target.value; renderMarkerList(); renderMarkerLane();
  });
  el.edCat.addEventListener("change", (e) => {
    const m = state.markers.find(mm => mm.id === state.selectedMarker);
    if (!m) return; m.category = e.target.value; m.color = CAT_BY_ID[m.category].hex;
    if (!m.label || CATEGORIES.some(c => c.label === m.label)) m.label = CAT_BY_ID[m.category].label;
    el.edLabel.value = m.label;
    renderMarkerList(); renderMarkerLane(); drawOverview();
  });
  el.edNotes.addEventListener("input", (e) => {
    const m = state.markers.find(mm => mm.id === state.selectedMarker);
    if (!m) return; m.notes = e.target.value;
  });
  el.edJump.addEventListener("click", () => {
    const m = state.markers.find(mm => mm.id === state.selectedMarker);
    if (m) seekTo(m.time);
  });
  el.edDelete.addEventListener("click", () => {
    const id = state.selectedMarker;
    state.markers = state.markers.filter(m => m.id !== id);
    setSelectedMarker(null);
    renderMarkerLane(); renderMarkerList(); drawOverview();
  });
  el.edClose.addEventListener("click", () => setSelectedMarker(null));

  // Waveform interactions
  el.waveformWrap.addEventListener("click", (e) => {
    if (!state.buffer) return;
    if (e.target.closest(".marker") || e.target.closest(".loop-handle")) return;
    const rect = el.waveformWrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = xToTime(x);
    if (e.shiftKey) {
      // shift+click sets loop in/out closest
      const ts = snapToZeroCrossing(t);
      if (state.loopIn == null) state.loopIn = ts;
      else if (state.loopOut == null) state.loopOut = ts;
      else {
        const dIn = Math.abs(state.loopIn - ts);
        const dOut = Math.abs(state.loopOut - ts);
        if (dIn < dOut) state.loopIn = ts; else state.loopOut = ts;
      }
      if (state.loopIn != null && state.loopOut != null && state.loopIn > state.loopOut) {
        const tmp = state.loopIn; state.loopIn = state.loopOut; state.loopOut = tmp;
      }
      renderLoopRegion(); drawOverview(); updateLoopReadout(); scheduleLoopWatcher();
    } else {
      seekTo(t);
    }
  });

  // Wheel zoom on waveform
  el.waveformWrap.addEventListener("wheel", (e) => {
    if (!state.buffer) return;
    e.preventDefault();
    const rect = el.waveformWrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const tAtMouse = xToTime(x);
    const oldZoom = state.zoom;
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    state.zoom = clamp(state.zoom * factor, 1, 100);
    const newVisible = visibleDuration();
    state.scroll = clamp(tAtMouse - (x / el.waveformCanvas.clientWidth) * newVisible, 0, Math.max(0, state.buffer.duration - newVisible));
    drawWaveform();
    drawOverviewWindow();
    el.zoomReadout.textContent = `${state.zoom.toFixed(2)}×`;
  }, { passive: false });

  el.btnZoomIn.addEventListener("click", () => { state.zoom = clamp(state.zoom * 1.5, 1, 100); afterZoomChange(); });
  el.btnZoomOut.addEventListener("click", () => { state.zoom = clamp(state.zoom / 1.5, 1, 100); afterZoomChange(); });
  el.btnZoomReset.addEventListener("click", () => { state.zoom = 1; state.scroll = 0; afterZoomChange(); });

  function afterZoomChange() {
    if (!state.buffer) return;
    const visible = visibleDuration();
    state.scroll = clamp(state.scroll, 0, Math.max(0, state.buffer.duration - visible));
    el.zoomReadout.textContent = `${state.zoom.toFixed(2)}×`;
    drawWaveform();
    drawOverviewWindow();
  }

  // Overview click + drag
  el.overviewCanvas.addEventListener("click", (e) => {
    if (!state.buffer) return;
    const rect = el.overviewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = (x / rect.width) * state.buffer.duration;
    const visible = visibleDuration();
    state.scroll = clamp(t - visible / 2, 0, Math.max(0, state.buffer.duration - visible));
    drawWaveform();
    drawOverviewWindow();
  });
  el.overviewWindow.addEventListener("mousedown", (e) => {
    if (!state.buffer) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startScroll = state.scroll;
    const total = state.buffer.duration;
    const pxPerSec = el.overviewCanvas.clientWidth / total;
    el.overviewWindow.classList.add("dragging");
    function onMove(ev) {
      const dx = ev.clientX - startX;
      const visible = visibleDuration();
      state.scroll = clamp(startScroll + dx / pxPerSec, 0, Math.max(0, total - visible));
      drawWaveform();
      drawOverviewWindow();
    }
    function onUp() {
      el.overviewWindow.classList.remove("dragging");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  // Tabs
  el.tabRow.addEventListener("click", (e) => {
    const t = e.target.closest(".tab");
    if (!t) return;
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    state.activeAnalyzerView = t.dataset.tab;
    document.querySelectorAll(".analyzer-canvas").forEach(c => c.classList.remove("active"));
    document.querySelector(`.analyzer-canvas[data-view="${state.activeAnalyzerView}"]`).classList.add("active");
    if (state.activeAnalyzerView === "spectrogram") state.spectrogramCleared = false;
  });

  el.fftSelect.addEventListener("change", (e) => {
    state.fftSize = Number(e.target.value);
    if (state.analyserMix) state.analyserMix.fftSize = state.fftSize;
  });
  el.themeSelect.addEventListener("change", (e) => { state.specTheme = e.target.value; });

  // Export / import
  el.btnExportJson.addEventListener("click", exportJson);
  el.btnExportCsv.addEventListener("click", exportCsv);
  el.btnImportJson.addEventListener("click", () => el.fileImportJson.click());
  el.fileImportJson.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importJson(f);
    e.target.value = "";
  });

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    const tag = (e.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    else if (e.key === "m" || e.key === "M") { if (state.buffer) addMarkerAt(currentTime(), state.selectedCategory); }
    else if (e.key === "l" || e.key === "L") { el.btnLoop.click(); }
    else if (e.key === "[") { el.btnLoopIn.click(); }
    else if (e.key === "]") { el.btnLoopOut.click(); }
    else if (e.key === "ArrowLeft") { seekTo(currentTime() - (e.shiftKey ? 10 : 2)); }
    else if (e.key === "ArrowRight") { seekTo(currentTime() + (e.shiftKey ? 10 : 2)); }
    else if (e.key === "Home") { seekTo(0); }
  });

  // Resize
  let resizeRaf = null;
  window.addEventListener("resize", () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      state._overviewPeaks = null;
      drawOverview();
      drawWaveform();
      state.spectrogramCleared = false;
    });
  });
}

/* ---------------- Init ---------------- */

function init() {
  buildCategoryChips();
  bindEvents();
  // Always run an animation tick so resize / zoom always update analyzer
  if (!state.rafId) state.rafId = requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", init);
