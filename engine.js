/* Mustard & Milk — Markov Chain Engine + UI Controller */

// ── Markov Chain Generator ──────────────────────────────────

class MustardMilkGenerator {
  constructor(modelData) {
    this.c1 = modelData.c1;
    this.c2 = modelData.c2;
    this.starters = modelData.s;
    this.starterWeights = modelData.sw;
    this.lengths = modelData.l;
    this.totalWeight = this.starterWeights.reduce((a, b) => a + b, 0);
  }

  _pickStarter() {
    let r = Math.random() * this.totalWeight;
    for (let i = 0; i < this.starterWeights.length; i++) {
      r -= this.starterWeights[i];
      if (r <= 0) return [...this.starters[i]];
    }
    return [...this.starters[this.starters.length - 1]];
  }

  _pickFromOptions(options, temperature = 1.0) {
    let weights;
    if (temperature === 1.0) {
      weights = options.map(o => o[1]);
    } else {
      weights = options.map(o => Math.pow(o[1], 1.0 / temperature));
    }
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return options[i][0];
    }
    return options[options.length - 1][0];
  }

  generateSentence(maxWords = 30, temperature = 1.0) {
    const result = this._pickStarter();
    const targetLen = this.lengths[Math.floor(Math.random() * this.lengths.length)] || 12;
    const endPunc = new Set(['.', '!', '?', '\u2026']);
    const limit = Math.min(maxWords, targetLen);

    for (let i = 0; i < limit; i++) {
      let nextWord = null;

      // Try order-2 context
      const ctx2 = result.slice(-2).join('|');
      if (this.c2[ctx2]) {
        nextWord = this._pickFromOptions(this.c2[ctx2], temperature);
      } else {
        // Backoff to order-1
        const ctx1 = result[result.length - 1];
        if (this.c1[ctx1]) {
          nextWord = this._pickFromOptions(this.c1[ctx1], temperature);
        }
      }

      if (nextWord === null) break;
      result.push(nextWord);
      if (endPunc.has(nextWord)) break;
    }

    // Format
    let text = result.join(' ');
    if (text.length > 0) {
      text = text[0].toUpperCase() + text.slice(1);
    }

    // Fix punctuation spacing
    for (const p of '.!?,;:\u2026') {
      text = text.split(' ' + p).join(p);
    }

    // Reattach contraction fragments
    text = text.replace(/\b(ain|aren|can|couldn|didn|doesn|don|hasn|haven|isn|mustn|shouldn|wasn|weren|won|wouldn) t\b/g, "$1't");
    text = text.replace(/\b(\w+) s\b/g, "$1's");
    text = text.replace(/\b(\w+) ve\b/g, "$1've");
    text = text.replace(/\b(\w+) re\b/g, "$1're");
    text = text.replace(/\b(\w+) ll\b/g, "$1'll");
    text = text.replace(/\b(\w+) d\b/g, "$1'd");
    text = text.replace(/\b[Ii] m\b/g, "I'm");

    // Ensure ending punctuation
    if (text.length > 0 && !'.!?\u2026'.includes(text[text.length - 1])) {
      text += '.';
    }
    return text;
  }

  generateStyled(style = 'mixed', count = 3) {
    const NAMES = [
      'Cheddarowe-Supreme', 'Nevada Joe', 'Foamy David',
      'Uncle Toadhammer', 'Conejo Rob', 'Peach Lester',
      'Magpie', 'Showercats Dupreme', 'Brown Mustard David'
    ];
    const REFRAINS = [
      'until I get home.', 'Showercats Dupreme.',
      'disperse before me.', 'magpie magpie magpie.'
    ];
    const results = [];

    for (let n = 0; n < count; n++) {
      if (style === 'list_rant') {
        const sents = [];
        for (let i = 0; i < 5; i++) sents.push(this.generateSentence(8, 0.8));
        results.push(sents.join(' '));

      } else if (style === 'question_barrage') {
        const sents = [];
        for (let i = 0; i < 3; i++) {
          let s = this.generateSentence(15, 1.2);
          if (!s.endsWith('?')) {
            s = s.replace(/[.!]+$/, '') + '?';
          }
          sents.push(s);
        }
        results.push(sents.join(' '));

      } else if (style === 'character_scene') {
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const sents = [];
        for (let i = 0; i < 3; i++) sents.push(this.generateSentence(20));
        let para = sents.join(' ');
        const firstWord = para.split(' ')[0];
        para = para.replace(firstWord, name);
        results.push(para);

      } else if (style === 'refrain') {
        const lines = [];
        for (let i = 0; i < 3; i++) lines.push(this.generateSentence(12));
        const ref = REFRAINS[Math.floor(Math.random() * REFRAINS.length)];
        lines.push(ref);
        lines.push(this.generateSentence(8));
        lines.push(ref);
        results.push(lines.join(' '));

      } else {
        // mixed
        const numSents = 3 + Math.floor(Math.random() * 5);
        const sents = [];
        for (let i = 0; i < numSents; i++) sents.push(this.generateSentence());
        results.push(sents.join(' '));
      }
    }
    return results;
  }
}


// ── Style Definitions ───────────────────────────────────────

const STYLES = [
  { id: 'mixed', name: 'Mixed Nonsense', desc: 'General Mustard & Milk style' },
  { id: 'list_rant', name: 'List Rant', desc: '"I piss bacon. I eat steel."' },
  { id: 'question_barrage', name: 'Question Barrage', desc: 'Rhetorical nonsense questions' },
  { id: 'character_scene', name: 'Character Scene', desc: 'Named character micro-narratives' },
  { id: 'refrain', name: 'Refrain', desc: 'Build-up with repeated anchors' },
];


// ── UI Controller ───────────────────────────────────────────

let generator = null;
let currentStyle = 'mixed';
let outputs = []; // [{style, styleName, text}, ...]
let showingAbout = false;

function init() {
  // Show loading
  const outputEl = document.getElementById('output');
  outputEl.innerHTML = '<div class="loading">Loading model\u2026</div>';

  // Disable generate
  document.getElementById('btn-generate').disabled = true;

  // Load model
  fetch('model.json')
    .then(r => r.json())
    .then(data => {
      generator = new MustardMilkGenerator(data);
      document.getElementById('btn-generate').disabled = false;
      showEmpty();
    })
    .catch(err => {
      outputEl.innerHTML = '<div class="loading">Error loading model: ' + err.message + '</div>';
    });

  // Wire up style buttons
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStyle = btn.dataset.style;
      document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Wire up slider
  const slider = document.getElementById('countSlider');
  const countDisplay = document.getElementById('countDisplay');
  slider.addEventListener('input', () => {
    countDisplay.textContent = slider.value;
  });

  // Wire up buttons
  document.getElementById('btn-generate').addEventListener('click', generate);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-about').addEventListener('click', toggleAbout);

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.target.matches('input, textarea, button')) {
      e.preventDefault();
      generate();
    }
  });
}

function showEmpty() {
  showingAbout = false;
  const outputEl = document.getElementById('output');
  if (!generator) return;
  const teaser = generator.generateSentence(12, 1.1);
  outputEl.innerHTML =
    '<div class="empty-state">' +
      '<div class="empty-title">SELECT A STYLE AND GENERATE</div>' +
      '<div class="empty-teaser">' + escapeHTML(teaser) + '</div>' +
    '</div>';
}

function generate() {
  if (!generator) return;
  showingAbout = false;
  const count = parseInt(document.getElementById('countSlider').value);
  const styleName = STYLES.find(s => s.id === currentStyle).name;
  const results = generator.generateStyled(currentStyle, count);

  // Prepend new items
  const newItems = results.map(text => ({ style: currentStyle, styleName, text }));
  outputs = newItems.concat(outputs);

  renderOutputs();

  // Show clear button
  const clearBtn = document.getElementById('btn-clear');
  clearBtn.style.display = 'block';
  clearBtn.textContent = 'CLEAR ALL (' + outputs.length + ')';
}

function renderOutputs() {
  const outputEl = document.getElementById('output');
  outputEl.innerHTML = '';

  outputs.forEach((item, i) => {
    if (i > 0) {
      const sep = document.createElement('div');
      sep.className = 'output-separator';
      sep.textContent = '\u2500'.repeat(60);
      outputEl.appendChild(sep);
    }

    const div = document.createElement('div');
    div.className = 'output-item';

    const label = document.createElement('div');
    label.className = 'output-style-label';
    label.textContent = '  ' + item.styleName;

    const text = document.createElement('div');
    text.className = 'output-text';
    text.textContent = item.text;
    text.title = 'Click to copy';
    text.addEventListener('click', () => copyText(text, item.text));

    div.appendChild(label);
    div.appendChild(text);
    outputEl.appendChild(div);
  });

  outputEl.scrollTop = 0;
}

function copyText(el, text) {
  navigator.clipboard.writeText(text).then(() => {
    el.classList.add('copied');
    const genBtn = document.getElementById('btn-generate');
    const orig = genBtn.textContent;
    genBtn.textContent = 'COPIED';
    setTimeout(() => {
      el.classList.remove('copied');
      genBtn.textContent = orig;
    }, 1000);
  });
}

function clearAll() {
  outputs = [];
  showEmpty();
  document.getElementById('btn-clear').style.display = 'none';
}

function toggleAbout() {
  if (showingAbout) {
    if (outputs.length > 0) {
      renderOutputs();
    } else {
      showEmpty();
    }
    showingAbout = false;
    return;
  }

  showingAbout = true;
  const outputEl = document.getElementById('output');
  const aboutContent = document.getElementById('about-content');
  outputEl.innerHTML = aboutContent.innerHTML;
  outputEl.scrollTop = 0;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Initialize on DOM ready ─────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
