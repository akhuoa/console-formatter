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
