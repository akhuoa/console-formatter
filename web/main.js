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
  const btnPermalink = document.getElementById('permalinkBtn');
  const linkStatus = document.getElementById('linkStatus');
  const out = document.getElementById('output');
  const preserve = document.getElementById('preserveWhitespace');
  const backToTop = document.getElementById('backToTop');

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
    // Smoothly scroll to the output and focus it for accessibility
    requestAnimationFrame(() => {
      try { out.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
      try { out.focus({ preventScroll: true }); } catch {}
    });
  });

  btnClear.addEventListener('click', () => {
    elText.value = '';
    out.textContent = '';
  });

  // Permalink generation: compress text and encode in hash
  function toBase64Url(bytes){
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function fromBase64Url(str){
    str = str.replace(/-/g,'+').replace(/_/g,'/');
    while (str.length % 4) str += '=';
    const bin = atob(str);
    const arr = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    return arr;
  }
  // Simple compression (LZ-based using built-in TextEncoder + pako-like fallback not available -> implement tiny LZ77-ish)
  // for brevity we'll use a naive approach if size small
  function compress(str){
    // Use built-in CompressionStream if available (modern browsers)
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(new TextEncoder().encode(str));
      writer.close();
      return new Response(cs.readable).arrayBuffer().then(buf => new Uint8Array(buf));
    }
    // Fallback: no compression, just utf-8 bytes
    return Promise.resolve(new TextEncoder().encode(str));
  }
  function decompress(bytes){
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const w = ds.writable.getWriter();
      w.write(bytes); w.close();
      return new Response(ds.readable).text();
    }
    return Promise.resolve(new TextDecoder().decode(bytes));
  }

  async function generatePermalink(){
    const raw = elText.value || '';
    if (!raw.trim()) { linkStatus.textContent = 'No content'; return; }
    linkStatus.textContent = 'Encoding...';
    try {
      const bytes = await compress(raw);
      const b64 = toBase64Url(bytes);
      const url = `${location.origin}${location.pathname}#log=${b64}`;
      await navigator.clipboard.writeText(url).catch(()=>{});
      history.replaceState(null,'',`#log=${b64}`);
      linkStatus.textContent = 'Link copied';
      setTimeout(()=>{ if (linkStatus.textContent==='Link copied') linkStatus.textContent=''; }, 3000);
    } catch(e){
      linkStatus.textContent = 'Error';
      console.error(e);
    }
  }
  btnPermalink.addEventListener('click', () => { generatePermalink(); });

  async function loadFromHash(){
    const m = location.hash.match(/#log=([A-Za-z0-9_-]+)/);
    if (!m) return;
    try {
      const bytes = fromBase64Url(m[1]);
      const text = await decompress(bytes);
      elText.value = text;
      // Auto format after load
      const html = format(text);
      out.innerHTML = html;
      out.style.whiteSpace = preserve.checked ? 'pre-wrap' : 'pre';
    } catch(e){
      console.warn('Failed to decode permalink', e);
    }
  }
  loadFromHash();

  // Back to top behavior
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y > 240) backToTop.hidden = false; else backToTop.hidden = true;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

setup();
