// Browser-side formatter mirroring formatter.js regex (adapted for DOM)
const Patterns = {
  passing: /✓|✅|\bPASS\b|\bpassed\b/gi,
  failing: /✗|❌|\bFAIL(?:ED)?\b/gi,
  pending: /⚠|\bpending\b|\bskipped\b/gi,
  cypressCommand: /\bcy\.(visit|get|click|type|should|contains|wait|intercept)\b/g,
  assertion: /\b(should|expect|assert)\b/gi,
  duration: /\(\d+ms\)|\b\d+ms\b/g,
  timestamp: /\b\d{4}-\d{2}-\d{2}.*\d{2}:\d{2}:\d{2}\b/g,
  url: /https?:\/\/[^\s]+/g,
  path: /\/[\w\-\.@\/]+\.[a-z]+/gi,
  info: /\[info\]|\bINFO\b/gi,
  warn: /\[warn\]|\bWARNING\b/gi,
  error: /\[error\]|\bERROR\b/gi,
  debug: /\[debug\]|\bDEBUG\b/gi,
  errorWords: /\bfailed\b/gi,
  arrow: /→|->|=>/g,
  bullet: /•|·/g,
  summary: /(All specs passed!|Some tests failed|Tests completed)/gi,
  specs: /\b\d+ passing\b|\b\d+ failing\b|\b\d+ pending\b/gi
};

function escapeHtml(s){
  return s
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

// Basic ANSI SGR to HTML converter for common Chalk/Cypress outputs
// Supports: reset (0), bold (1/22), underline(4/24), colors (30-37,90-97), reset color (39)
function ansiToHtml(input){
  const ESC = /\x1b\[((?:\d{1,3}(?:;\d{1,3})*)?)m/g;
  let result = '';
  let lastIndex = 0;
  const state = { color: null, bold: false, underline: false };

  const openSpan = () => {
    const classes = [];
    if (state.color) classes.push(state.color);
    if (state.bold) classes.push('bold');
    if (state.underline) classes.push('underline');
    return classes.length ? `<span class="${classes.join(' ')}">` : '';
  };

  let openTag = '';
  const reopen = () => { if (openTag) result += '</span>'; openTag = openSpan(); if (openTag) result += openTag; };
  const closeAll = () => { if (openTag) { result += '</span>'; openTag = ''; } };

  const mapColor = (code) => {
    const base = {
      30: 'ansi-gray', // black → gray on dark bg
      31: 'ansi-red',
      32: 'ansi-green',
      33: 'ansi-yellow',
      34: 'ansi-blue',
      35: 'ansi-magenta',
      36: 'ansi-cyan',
      37: 'ansi-white'
    };
    const bright = {
      90: 'ansi-gray', // bright black → gray
      91: 'ansi-red',
      92: 'ansi-green',
      93: 'ansi-yellow',
      94: 'ansi-blue',
      95: 'ansi-magenta',
      96: 'ansi-cyan',
      97: 'ansi-white'
    };
    return base[code] || bright[code] || null;
  };

  let m;
  while ((m = ESC.exec(input)) !== null) {
    const chunk = input.slice(lastIndex, m.index);
    result += escapeHtml(chunk);
    lastIndex = ESC.lastIndex;

    const params = (m[1] || '').length ? m[1].split(';').map(n => parseInt(n, 10)) : [0];
    for (const code of params) {
      if (Number.isNaN(code)) continue;
      if (code === 0) { // reset
        state.color = null; state.bold = false; state.underline = false; closeAll();
      } else if (code === 1) { state.bold = true; reopen(); }
      else if (code === 22) { state.bold = false; reopen(); }
      else if (code === 4) { state.underline = true; reopen(); }
      else if (code === 24) { state.underline = false; reopen(); }
      else if (code === 39) { state.color = null; reopen(); }
      else {
        const cls = mapColor(code);
        if (cls) { state.color = cls; reopen(); }
      }
    }
  }

  // tail
  result += escapeHtml(input.slice(lastIndex));
  if (openTag) result += '</span>';
  return result;
}

function colorize(line){
  let html = escapeHtml(line);

  // order similar to Node version
  html = html.replace(Patterns.passing, '<span class="ansi-green">$&</span>');
  html = html.replace(Patterns.failing, '<span class="ansi-red bold">$&</span>');
  html = html.replace(Patterns.pending, '<span class="ansi-yellow">$&</span>');

  html = html.replace(Patterns.cypressCommand, '<span class="ansi-cyan">$&</span>');
  html = html.replace(Patterns.assertion, '<span class="ansi-magenta">$&</span>');
  html = html.replace(Patterns.duration, '<span class="ansi-gray">$&</span>');
  html = html.replace(Patterns.timestamp, '<span class="ansi-blue">$&</span>');
  html = html.replace(Patterns.url, '<span class="ansi-blue underline">$&</span>');
  html = html.replace(Patterns.path, '<span class="ansi-yellow">$&</span>');
  html = html.replace(Patterns.info, '<span class="ansi-blue">$&</span>');
  html = html.replace(Patterns.warn, '<span class="ansi-yellow">$&</span>');
  html = html.replace(Patterns.error, '<span class="ansi-red">$&</span>');
  html = html.replace(Patterns.debug, '<span class="ansi-gray">$&</span>');
  html = html.replace(Patterns.errorWords, '<span class="ansi-red">$&</span>');
  html = html.replace(Patterns.arrow, '<span class="ansi-cyan">$&</span>');
  html = html.replace(Patterns.bullet, '<span class="ansi-gray">$&</span>');
  html = html.replace(Patterns.summary, '<span class="ansi-green bold">$&</span>');
  html = html.replace(Patterns.specs, '<span class="bold">$&</span>');

  // simple structure emphasis
  if (/^\s*(describe|context)\s*\(/.test(line)) html = `<span class="bold">${html}</span>`;
  return html;
}

function format(text){
  // If ANSI sequences present, convert to HTML spans
  if (/\x1b\[/.test(text)) {
    return ansiToHtml(text);
  }
  // Otherwise, use semantic colorizer
  return text.split('\n').map(colorize).join('\n');
}

async function fetchText(url){
  const r = await fetch(url, { mode: 'cors' });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  return await r.text();
}

function setup(){
  const elText = document.getElementById('textInput');
  const elUrl = document.getElementById('urlInput');
  const btnFetch = document.getElementById('fetchBtn');
  const btnFormat = document.getElementById('formatBtn');
  const btnClear = document.getElementById('clearBtn');
  const out = document.getElementById('output');
  const preserve = document.getElementById('preserveWhitespace');

  btnFetch.addEventListener('click', async () => {
    const url = elUrl.value.trim();
    if (!url) return alert('Enter a URL');
    btnFetch.disabled = true;
    try {
      const txt = await fetchText(url);
      elText.value = txt;
    } catch (e) {
      alert(e.message);
    } finally {
      btnFetch.disabled = false;
    }
  });

  btnFormat.addEventListener('click', () => {
    const raw = elText.value || '';
    const html = format(raw);
    out.innerHTML = html;
    out.style.whiteSpace = preserve.checked ? 'pre-wrap' : 'pre';
  });

  btnClear.addEventListener('click', () => {
    elText.value = '';
    out.textContent = '';
  });
}

setup();
