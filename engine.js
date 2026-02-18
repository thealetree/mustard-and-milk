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

  // Generate a sentence seeded from a specific word (used by chat mode)
  generateSeeded(seedWord, maxWords = 30, temperature = 1.0) {
    const word = seedWord.toLowerCase();

    // Try to find a starter containing the seed word
    for (let i = 0; i < this.starters.length; i++) {
      if (this.starters[i][0] === word || this.starters[i][1] === word) {
        const result = [...this.starters[i]];
        const targetLen = this.lengths[Math.floor(Math.random() * this.lengths.length)] || 12;
        const endPunc = new Set(['.', '!', '?', '\u2026']);
        const limit = Math.min(maxWords, targetLen);
        for (let j = 0; j < limit; j++) {
          let nextWord = null;
          const ctx2 = result.slice(-2).join('|');
          if (this.c2[ctx2]) {
            nextWord = this._pickFromOptions(this.c2[ctx2], temperature);
          } else {
            const ctx1 = result[result.length - 1];
            if (this.c1[ctx1]) nextWord = this._pickFromOptions(this.c1[ctx1], temperature);
          }
          if (nextWord === null) break;
          result.push(nextWord);
          if (endPunc.has(nextWord)) break;
        }
        return this._formatSentence(result);
      }
    }

    // Try order-1 chain: find a context where the word leads somewhere
    if (this.c1[word]) {
      const nextWord = this._pickFromOptions(this.c1[word], temperature);
      const result = [word, nextWord];
      const targetLen = this.lengths[Math.floor(Math.random() * this.lengths.length)] || 12;
      const endPunc = new Set(['.', '!', '?', '\u2026']);
      const limit = Math.min(maxWords, targetLen);
      for (let j = 0; j < limit; j++) {
        let nw = null;
        const ctx2 = result.slice(-2).join('|');
        if (this.c2[ctx2]) {
          nw = this._pickFromOptions(this.c2[ctx2], temperature);
        } else {
          const ctx1 = result[result.length - 1];
          if (this.c1[ctx1]) nw = this._pickFromOptions(this.c1[ctx1], temperature);
        }
        if (nw === null) break;
        result.push(nw);
        if (endPunc.has(nw)) break;
      }
      return this._formatSentence(result);
    }

    // No match — fall back to normal generation
    return this.generateSentence(maxWords, temperature);
  }

  _formatSentence(result) {
    let text = result.join(' ');
    if (text.length > 0) text = text[0].toUpperCase() + text.slice(1);
    for (const p of '.!?,;:\u2026') text = text.split(' ' + p).join(p);
    text = text.replace(/\b(ain|aren|can|couldn|didn|doesn|don|hasn|haven|isn|mustn|shouldn|wasn|weren|won|wouldn) t\b/g, "$1't");
    text = text.replace(/\b(\w+) s\b/g, "$1's");
    text = text.replace(/\b(\w+) ve\b/g, "$1've");
    text = text.replace(/\b(\w+) re\b/g, "$1're");
    text = text.replace(/\b(\w+) ll\b/g, "$1'll");
    text = text.replace(/\b(\w+) d\b/g, "$1'd");
    text = text.replace(/\b[Ii] m\b/g, "I'm");
    if (text.length > 0 && !'.!?\u2026'.includes(text[text.length - 1])) text += '.';
    return text;
  }

  // Chat response: extract user words, seed generation, match prompt style
  generateChatResponse(userMessage) {
    const STOP_WORDS = new Set([
      'i', 'me', 'my', 'you', 'your', 'we', 'our', 'they', 'them', 'their',
      'he', 'she', 'it', 'his', 'her', 'its', 'a', 'an', 'the', 'is', 'are',
      'was', 'were', 'be', 'been', 'am', 'do', 'does', 'did', 'have', 'has',
      'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might',
      'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'about', 'that', 'this', 'what', 'which', 'who', 'whom',
      'how', 'when', 'where', 'why', 'if', 'then', 'than', 'so', 'but',
      'and', 'or', 'not', 'no', 'yes', 'just', 'also', 'very', 'too',
      'really', 'much', 'more', 'most', 'some', 'any', 'all', 'each',
      'every', 'both', 'few', 'many', 'up', 'out', 'there', 'here',
      'tell', 'think', 'know', 'like', 'want', 'need', 'get', 'got',
      'make', 'going', 'go', 'come', 'say', 'said', 'thing', 'things',
      'don', 'doesn', 'didn', 'won', 'wouldn', 'couldn', 'shouldn'
    ]);

    const NAMES = [
      'Cheddarowe-Supreme', 'Nevada Joe', 'Foamy David',
      'Uncle Toadhammer', 'Conejo Rob', 'Peach Lester',
      'Magpie', 'Showercats Dupreme', 'Brown Mustard David'
    ];

    // Extract content words from the user's message
    const words = userMessage.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter(w => w.length > 2);
    const contentWords = words.filter(w => !STOP_WORDS.has(w));

    // Detect prompt type
    const trimmed = userMessage.trim();
    const isQuestion = trimmed.endsWith('?');
    const isExclamation = trimmed.endsWith('!');
    const isCommand = /^(tell|show|give|make|describe|explain|help|do|say)\b/i.test(trimmed);
    const isGreeting = /^(hi|hello|hey|yo|sup|greetings|howdy)\b/i.test(trimmed);

    // Find which content words exist in the chain
    const seedable = [];
    for (const w of contentWords) {
      if (this.c1[w]) seedable.push(w);
    }
    // Shuffle so we don't always seed from the same word
    for (let i = seedable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seedable[i], seedable[j]] = [seedable[j], seedable[i]];
    }

    const sents = [];

    if (isGreeting) {
      // Greetings get a character introduction
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const s1 = seedable.length > 0
        ? this.generateSeeded(seedable[0], 15)
        : this.generateSentence(15);
      const s2 = this.generateSentence(12);
      sents.push(name + ' says: ' + s1 + ' ' + s2);
    } else if (isQuestion) {
      // Questions get confident declarations
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const seed = seedable[i % Math.max(seedable.length, 1)];
        const s = seed ? this.generateSeeded(seed, 20, 0.9) : this.generateSentence(20, 0.9);
        sents.push(s);
      }
    } else if (isCommand || isExclamation) {
      // Commands/exclamations get a list rant seeded from their words
      const count = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const seed = seedable[i % Math.max(seedable.length, 1)];
        const s = seed ? this.generateSeeded(seed, 8, 0.8) : this.generateSentence(8, 0.8);
        sents.push(s);
      }
    } else {
      // Statements get a mixed response with seeded + free sentences
      const count = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        if (i < seedable.length) {
          sents.push(this.generateSeeded(seedable[i], 25));
        } else {
          sents.push(this.generateSentence(25));
        }
      }
    }

    return sents.join(' ');
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
  { id: 'chat', name: 'Chat', desc: 'Talk to the nonsense machine' },
];


// ── UI Controller ───────────────────────────────────────────

let generator = null;
let currentStyle = 'mixed';
let outputs = []; // [{style, styleName, text}, ...]
let chatMessages = []; // [{role: 'user'|'machine', text}]
let showingAbout = false;
let chatMode = false;

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
      setChatMode(currentStyle === 'chat');
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

  // Keyboard shortcut (not in chat mode)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !chatMode && !e.target.matches('input, textarea, button')) {
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

// ── Chat Mode ────────────────────────────────────────────────

function isMobile() {
  return window.innerWidth <= 768;
}

function setChatMode(enabled) {
  chatMode = enabled;
  const countRow = document.querySelector('.count-row');
  const genBtn = document.getElementById('btn-generate');
  const clearBtn = document.getElementById('btn-clear');
  const mobileChat = document.getElementById('mobile-chat');

  // Find the SAMPLES label (second .section-label in left-panel)
  const labels = document.querySelectorAll('.left-panel .section-label');
  const samplesEl = labels.length > 1 ? labels[1] : null;

  if (enabled) {
    // Hide generate controls
    if (samplesEl) samplesEl.style.display = 'none';
    countRow.style.display = 'none';
    genBtn.style.display = 'none';
    clearBtn.style.display = 'none';
    showingAbout = false;
    showChatUI();
  } else {
    // Restore generate controls
    if (samplesEl) samplesEl.style.display = '';
    countRow.style.display = '';
    genBtn.style.display = '';
    clearBtn.style.display = outputs.length > 0 ? 'block' : 'none';
    // Clear mobile chat container
    mobileChat.innerHTML = '';
    mobileChat.style.display = 'none';
    // Restore output panel
    if (outputs.length > 0) {
      renderOutputs();
    } else {
      showEmpty();
    }
  }
}

function buildChatElements(container) {
  container.innerHTML = '';

  // Chat history area
  const history = document.createElement('div');
  history.id = 'chat-history';
  history.className = 'chat-history';

  if (chatMessages.length === 0) {
    const welcome = document.createElement('div');
    welcome.className = 'chat-welcome';
    welcome.textContent = 'Say something. The machine will respond with nonsense seeded from your words.';
    history.appendChild(welcome);
  } else {
    chatMessages.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble chat-' + msg.role;
      bubble.textContent = msg.text;
      if (msg.role === 'machine') {
        bubble.title = 'Click to copy';
        bubble.addEventListener('click', () => copyText(bubble, msg.text));
      }
      history.appendChild(bubble);
    });
  }

  // Input row
  const inputRow = document.createElement('div');
  inputRow.className = 'chat-input-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'chat-input';
  input.className = 'chat-input';
  input.placeholder = 'Type something...';
  input.autocomplete = 'off';

  const sendBtn = document.createElement('button');
  sendBtn.className = 'chat-send';
  sendBtn.textContent = 'SEND';
  sendBtn.addEventListener('click', sendChat);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendChat();
    }
  });

  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);

  container.appendChild(history);
  container.appendChild(inputRow);

  // Scroll to bottom and focus input
  history.scrollTop = history.scrollHeight;
  setTimeout(() => input.focus(), 50);
}

function showChatUI() {
  if (isMobile()) {
    // On mobile: render chat inline in the left panel
    const mobileChat = document.getElementById('mobile-chat');
    mobileChat.style.display = 'block';
    buildChatElements(mobileChat);
    // Clear right panel
    const outputEl = document.getElementById('output');
    outputEl.innerHTML = '';
  } else {
    // On desktop: render chat in the right panel
    const mobileChat = document.getElementById('mobile-chat');
    mobileChat.innerHTML = '';
    mobileChat.style.display = 'none';
    const outputEl = document.getElementById('output');
    buildChatElements(outputEl);
  }
}

function sendChat() {
  if (!generator || !chatMode) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Add user message
  chatMessages.push({ role: 'user', text: text });

  // Generate response
  const response = generator.generateChatResponse(text);
  chatMessages.push({ role: 'machine', text: response });

  // Re-render
  showChatUI();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Initialize on DOM ready ─────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
