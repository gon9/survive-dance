// ===== CONSTANTS =====
const W = 390, H = 844;
const ROAD_W = 230;
const ROAD_X = W / 2;
const PLAYER_Y = H * 0.78;
const LANE_L = ROAD_X - ROAD_W * 0.27;
const LANE_R = ROAD_X + ROAD_W * 0.27;
const SCROLL_SPEED = 3.5;
const NUM_GATES = 7;
const GATE_SPACING = 300;

// ===== DESIGN TOKENS =====
const C = {
  BG:        0x070A18,
  ROAD:      0x0B0F1E,
  DIM:       0x10162A,
  GRAY:      0x3A4560,
  WHITE:     0xFFFFFF,
  CYAN:      0x3DD8FF,
  TEAL:      0x38FFAA,
  PINK:      0xFF2E5C,
  GOLD:      0xFFAD1A,
  PURPLE:    0x9A4EFF,
};

const FH = 'Orbitron, "Arial Black", sans-serif';
const FB = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif';

// ===== RANK SYSTEM =====
const RANKS = [
  { id:1, key:'soldier-1', name:'一等兵', power:1.0, bodyColor:'#1A2C6E', helmetColor:'#1C2848', badge:null },
  { id:2, key:'soldier-2', name:'軍曹',   power:1.5, bodyColor:'#1A4A2A', helmetColor:'#183820', badge:'#FFD700' },
  { id:3, key:'soldier-3', name:'大尉',   power:2.2, bodyColor:'#4A2A1A', helmetColor:'#3C1810', badge:'#FF6B35' },
  { id:4, key:'soldier-4', name:'大佐',   power:3.0, bodyColor:'#2A0A4A', helmetColor:'#20083A', badge:'#AA00FF' },
];
const NUM_WALLS = NUM_GATES - 2;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi)     { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function choose(arr)      { return arr[Math.floor(Math.random() * arr.length)]; }
function toHex(n)         { return '#' + n.toString(16).padStart(6, '0'); }

// ===== WEB AUDIO SFX =====
const SFX = {
  _ctx: null,
  init() {
    if (this._ctx) return;
    try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  },
  _tone(freq, type, vol, dur, freqEnd) {
    try {
      const ctx = this._ctx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur + 0.01);
    } catch(e) {}
  },
  tap()    { this._tone(520, 'sine',      0.15, 0.08, 260); },
  gateAdd(){ this._tone(440, 'sine',      0.22, 0.20, 880); },
  gateMul(){ this._tone(330, 'triangle',  0.28, 0.25, 990); },
  gateWpn(){ this._tone(280, 'sawtooth',  0.18, 0.28, 560); },
  gateSub(){ this._tone(600, 'sawtooth',  0.18, 0.18, 200); },
  kill()   {
    this._tone(200, 'sawtooth', 0.25, 0.10, 60);
    setTimeout(() => this._tone(160, 'square', 0.12, 0.12, 70), 50);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this._tone(f, 'sine', 0.28, 0.4, f * 1.01), i * 120)
    );
  },
  lose() {
    [380, 300, 220, 150].forEach((f, i) =>
      setTimeout(() => this._tone(f, 'sawtooth', 0.18, 0.45, f * 0.88), i * 160)
    );
  },
  rankUp() {
    [220, 440, 660, 880].forEach((f, i) =>
      setTimeout(() => this._tone(f, 'sine', 0.20, 0.18, f * 1.5), i * 80)
    );
  },
  shoot() { this._tone(800, 'square', 0.06, 0.04, 400); },
};

// ===== SVG SPRITES =====
function svgURI(str) {
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(str)));
}

function soldierRankedSVG(rank) {
  let badge = '';
  if (rank.id === 2) {
    badge = `<rect x="10" y="21" width="9" height="3" rx="1" fill="${rank.badge}" opacity="0.92"/>`;
  } else if (rank.id === 3) {
    badge = `<rect x="10" y="19" width="9" height="2.5" rx="1" fill="${rank.badge}" opacity="0.92"/>
  <rect x="10" y="23" width="9" height="2.5" rx="1" fill="${rank.badge}" opacity="0.92"/>`;
  } else if (rank.id === 4) {
    badge = `<polygon points="22,1 23.2,4.2 26.8,4.2 24,6.5 25.1,9.8 22,7.6 18.9,9.8 20,6.5 17.2,4.2 20.8,4.2" fill="${rank.badge}" opacity="0.95"/>`;
  }
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 70" width="112" height="140">
  <ellipse cx="22" cy="67" rx="14" ry="4" fill="rgba(0,0,0,0.45)"/>
  <rect x="11" y="50" width="10" height="9" rx="3" fill="#080912"/>
  <rect x="23" y="50" width="10" height="9" rx="3" fill="#080912"/>
  <rect x="12" y="51" width="8" height="2" rx="1" fill="rgba(70,90,180,0.35)"/>
  <rect x="24" y="51" width="8" height="2" rx="1" fill="rgba(70,90,180,0.35)"/>
  <rect x="12" y="35" width="9" height="17" rx="2" fill="${rank.bodyColor}"/>
  <rect x="23" y="35" width="9" height="17" rx="2" fill="${rank.bodyColor}"/>
  <rect x="13" y="43" width="7" height="4" rx="2" fill="#0C1838"/>
  <rect x="24" y="43" width="7" height="4" rx="2" fill="#0C1838"/>
  <rect x="9" y="17" width="26" height="20" rx="4" fill="${rank.bodyColor}"/>
  <rect x="11" y="18" width="22" height="8" rx="3" fill="rgba(90,130,255,0.15)"/>
  <rect x="13" y="19" width="18" height="12" rx="2" fill="rgba(0,0,0,0.22)"/>
  <rect x="15" y="20" width="14" height="5" rx="1.5" fill="rgba(61,216,255,0.10)"/>
  <rect x="9"  y="35" width="26" height="4" rx="1" fill="#6A5218"/>
  <rect x="19" y="35" width="6"  height="4" fill="#B08828"/>
  <rect x="2"  y="18" width="8"  height="15" rx="4" fill="${rank.bodyColor}"/>
  <rect x="3"  y="18" width="6"  height="5"  rx="3" fill="rgba(80,120,220,0.18)"/>
  <rect x="35" y="18" width="8"  height="15" rx="4" fill="${rank.bodyColor}"/>
  <rect x="41" y="20" width="14" height="4"  rx="1" fill="#181820"/>
  <rect x="42" y="21" width="14" height="2"  rx="1" fill="rgba(50,60,100,0.5)"/>
  <rect x="36" y="19" width="9"  height="8"  rx="2" fill="#1E1E32"/>
  <rect x="38" y="26" width="5"  height="7"  rx="2" fill="#141425"/>
  <rect x="18" y="12" width="8"  height="7"  rx="1" fill="#C88060"/>
  <ellipse cx="22" cy="8"  rx="11" ry="12" fill="${rank.helmetColor}"/>
  <ellipse cx="22" cy="6"  rx="9"  ry="9"  fill="${rank.helmetColor}"/>
  <rect x="11" y="9"  width="22" height="5"  rx="0" fill="rgba(0,0,0,0.28)"/>
  <rect x="13" y="7"  width="18" height="8"  rx="3" fill="${rank.helmetColor}"/>
  <rect x="14" y="9"  width="16" height="2.5" rx="1.2" fill="#3DD8FF" opacity="0.92"/>
  <rect x="14" y="8"  width="8"  height="1"  rx="0.5" fill="rgba(200,240,255,0.45)"/>
  ${badge}
</svg>`);
}

function zombieSVG() {
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 74" width="104" height="148">
  <ellipse cx="26" cy="71" rx="16" ry="5" fill="rgba(0,0,0,0.4)"/>
  <rect x="10" y="44" width="10" height="22" rx="3" fill="#2A4418" transform="rotate(-5,15,44)"/>
  <rect x="30" y="42" width="10" height="22" rx="3" fill="#2A4418" transform="rotate(6,35,42)"/>
  <rect x="11" y="53" width="8" height="2.5" rx="1" fill="rgba(8,16,6,0.5)"/>
  <rect x="31" y="51" width="8" height="2.5" rx="1" fill="rgba(8,16,6,0.5)"/>
  <ellipse cx="16" cy="65" rx="8" ry="5" fill="#1C3410" transform="rotate(-5,16,65)"/>
  <ellipse cx="36" cy="64" rx="8" ry="5" fill="#1C3410" transform="rotate(6,36,64)"/>
  <rect x="8"  y="21" width="34" height="24" rx="5" fill="#2C4A1A"/>
  <rect x="8"  y="32" width="34" height="5"  fill="rgba(8,14,5,0.38)"/>
  <rect x="14" y="23" width="3"  height="12" rx="1" fill="rgba(8,14,5,0.32)"/>
  <rect x="25" y="26" width="2.5" height="9" rx="1" fill="rgba(8,14,5,0.28)"/>
  <ellipse cx="21" cy="27" rx="5" ry="4" fill="rgba(100,0,0,0.38)"/>
  <rect x="2"  y="19" width="12" height="8"  rx="4" fill="#2C4A1A"/>
  <circle cx="4"  cy="23" r="6"  fill="#344E1C"/>
  <rect x="38" y="17" width="12" height="8"  rx="4" fill="#2C4A1A"/>
  <circle cx="48" cy="21" r="6"  fill="#344E1C"/>
  <rect x="44" y="14" width="3.5" height="8"  rx="1.5" fill="#344E1C" transform="rotate(18,46,14)"/>
  <rect x="47" y="12" width="3.5" height="9"  rx="1.5" fill="#344E1C" transform="rotate(8,49,12)"/>
  <rect x="18" y="14" width="14" height="9"  rx="2" fill="#344E1C"/>
  <ellipse cx="26" cy="9"  rx="14" ry="15" fill="#364E1E"/>
  <ellipse cx="24" cy="8"  rx="5"  ry="7"  fill="rgba(18,30,10,0.28)"/>
  <circle cx="18" cy="8"  r="4.5" fill="#280000"/>
  <circle cx="18" cy="8"  r="3.5" fill="#CC0000"/>
  <circle cx="18" cy="8"  r="2.2" fill="#FF1800"/>
  <circle cx="17" cy="7"  r="1"   fill="rgba(255,180,180,0.85)"/>
  <circle cx="34" cy="8"  r="4.5" fill="#280000"/>
  <circle cx="34" cy="8"  r="3.5" fill="#CC0000"/>
  <circle cx="34" cy="8"  r="2.2" fill="#FF1800"/>
  <circle cx="33" cy="7"  r="1"   fill="rgba(255,180,180,0.85)"/>
  <rect x="21" y="2"  width="7"  height="3.5" rx="1" fill="rgba(100,0,0,0.55)"/>
  <rect x="15" y="14" width="20" height="5"  rx="2" fill="#150000"/>
  <rect x="16" y="14" width="3.5" height="3.5" rx="1" fill="rgba(215,205,195,0.8)"/>
  <rect x="21" y="14" width="3.5" height="4.5" rx="1" fill="rgba(215,205,195,0.8)"/>
  <rect x="26" y="14" width="3.5" height="3.5" rx="1" fill="rgba(215,205,195,0.8)"/>
  <rect x="31" y="14" width="2.5" height="2.5" rx="1" fill="rgba(215,205,195,0.6)"/>
</svg>`);
}

// ===== ENVIRONMENT TEXTURES =====
function buildTextures(scene) {
  let g;

  // Buildings far — warm/cool window mix, antenna details
  g = scene.make.graphics({ add: false });
  g.fillStyle(0x06081A);
  g.fillRect(0, 0, 340, 200);
  const farBlds = [
    [0,60,44,140],[48,28,54,172],[106,78,40,122],[150,8,58,192],
    [212,48,44,152],[260,68,38,132],[302,22,34,178],
    [14,108,28,92],[84,58,34,142],[148,98,30,102],[208,38,42,162],[258,78,44,122],
  ];
  for (const [x,y,w,h] of farBlds) {
    g.fillStyle(0x06081A);
    g.fillRect(x, y, w, h);
    const warm = Math.random() > 0.45;
    for (let wy = y + 12; wy < y + h - 12; wy += 22) {
      for (let wx = x + 8; wx < x + w - 8; wx += 16) {
        if (Math.random() > 0.36) {
          const wc = warm
            ? (Math.random() > 0.3 ? 0xffeeaa : 0xffd070)
            : (Math.random() > 0.3 ? 0xaaccff : 0x88aaee);
          g.fillStyle(wc, 0.16 + Math.random() * 0.22);
          g.fillRect(wx, wy, 7, 10);
        }
      }
    }
    // antenna
    if (Math.random() > 0.5) {
      g.fillStyle(0x3DD8FF, 0.14);
      g.fillRect(x + w / 2 - 1.5, y - 10, 3, 14);
      g.fillStyle(0xFF2E5C, 0.5);
      g.fillCircle(x + w / 2, y - 10, 2);
    }
  }
  // horizon glow
  g.fillGradientStyle(0x1a3060, 0x1a3060, 0x070A18, 0x070A18, 0.18, 0.18, 0, 0);
  g.fillRect(0, 140, 340, 60);
  g.generateTexture('buildings-far', 340, 200);
  g.destroy();

  // Buildings near — dark silhouette + cyan trim
  g = scene.make.graphics({ add: false });
  g.fillStyle(0x040610);
  g.fillRect(0, 0, 360, 200);
  const nearBlds = [
    [0,38,36,162],[40,72,32,128],[76,22,48,178],[128,62,38,138],
    [170,32,44,168],[218,52,38,148],[260,82,32,118],[296,12,38,188],[336,58,24,142],
  ];
  for (const [x,y,w,h] of nearBlds) {
    g.fillStyle(0x040814);
    g.fillRect(x, y, w, h);
    g.fillStyle(C.CYAN, 0.09);
    g.fillRect(x, y, w, 3);
    for (let wy = y + 16; wy < y + h - 10; wy += 28) {
      for (let wx = x + 8; wx < x + w - 8; wx += 20) {
        if (Math.random() > 0.58) {
          g.fillStyle(0x3DD8FF, 0.09 + Math.random() * 0.12);
          g.fillRect(wx, wy, 6, 9);
        }
      }
    }
  }
  g.generateTexture('buildings-near', 360, 200);
  g.destroy();

  // Road tile — 3 lanes, center neon stripe
  g = scene.make.graphics({ add: false });
  g.fillStyle(C.ROAD);
  g.fillRect(0, 0, ROAD_W, 80);
  g.fillStyle(0xFFFFFF, 0.06);
  g.fillRect(ROAD_W * 0.33 - 1, 0, 2, 36);
  g.fillStyle(0xFFFFFF, 0.06);
  g.fillRect(ROAD_W * 0.66 - 1, 0, 2, 36);
  g.fillStyle(C.CYAN, 0.20);
  g.fillRect(ROAD_W / 2 - 1.5, 0, 3, 36);
  g.generateTexture('road-tile', ROAD_W, 80);
  g.destroy();

  // Gate frames — glass morphism
  const gateTypes = [
    { key: 'gate-add',  border: C.TEAL,   glow: 0x38FFAA },
    { key: 'gate-sub',  border: C.PINK,   glow: 0xFF2E5C },
    { key: 'gate-mul',  border: C.GOLD,   glow: 0xFFAD1A },
    { key: 'gate-wpn',  border: C.PURPLE, glow: 0x9A4EFF },
  ];
  const gw = 88, gh = 130;
  for (const t of gateTypes) {
    g = scene.make.graphics({ add: false });
    // outer glow halo
    g.fillStyle(t.glow, 0.04);
    g.fillRoundedRect(0, 0, gw, gh, 14);
    g.fillStyle(t.glow, 0.07);
    g.fillRoundedRect(3, 3, gw - 6, gh - 6, 12);
    // glass body
    g.fillStyle(0x000000, 0.62);
    g.fillRoundedRect(6, 6, gw - 12, gh - 12, 9);
    // top sheen
    g.fillStyle(0xFFFFFF, 0.04);
    g.fillRoundedRect(8, 8, gw - 16, 30, 7);
    // border
    g.lineStyle(2.5, t.border, 0.86);
    g.strokeRoundedRect(6, 6, gw - 12, gh - 12, 9);
    // type bar
    g.fillStyle(t.border, 0.68);
    g.fillRoundedRect(8, 8, gw - 16, 28, 6);
    g.fillStyle(t.glow, 0.22);
    g.fillRoundedRect(10, 10, gw - 20, 14, 4);
    // bottom rule
    g.lineStyle(1, t.border, 0.25);
    g.lineBetween(14, gh - 22, gw - 14, gh - 22);
    g.generateTexture(t.key, gw, gh);
    g.destroy();
  }

  // Particle dot
  g = scene.make.graphics({ add: false });
  g.fillStyle(0xFFFFFF);
  g.fillCircle(6, 6, 6);
  g.generateTexture('particle', 12, 12);
  g.destroy();
}

// ===== GATE HELPERS =====
function gateTexKey(data) {
  if (data.type === 'add') return data.value > 0 ? 'gate-add' : 'gate-sub';
  if (data.type === 'mul') return 'gate-mul';
  return 'gate-wpn';
}
function gateLabel(data) {
  if (data.type === 'add') return (data.value > 0 ? '+' : '') + data.value;
  if (data.type === 'mul') return '×' + data.value;
  return '+' + data.value;
}
function gateSubLabel(data) {
  if (data.type === 'add') return data.value > 0 ? '増援' : '損失';
  if (data.type === 'mul') return '倍増';
  return '強化';
}
function gateBgColor(data) {
  if (data.type === 'add') return data.value > 0 ? C.TEAL : C.PINK;
  if (data.type === 'mul') return C.GOLD;
  return C.PURPLE;
}
function makeGateData() {
  return Array.from({ length: NUM_GATES }, () => {
    const types = ['add', 'add', 'mul', 'wpn'];
    const val = t => t === 'add' ? choose([-3, -2, 3, 5, 8])
                   : t === 'mul' ? choose([2, 2, 3])
                   : choose([1, 2]);
    const tL = choose(types), tR = choose(types);
    return { left: { type: tL, value: val(tL) }, right: { type: tR, value: val(tR) } };
  });
}

// ===== BOOT SCENE =====
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    buildTextures(this);

    let pending = RANKS.length + 1;
    const advance = () => {
      if (--pending === 0) {
        const el = document.getElementById('loading');
        if (el) el.style.display = 'none';
        this.scene.start('Title');
      }
    };

    const loadSVG = (key, uri) => {
      const img = new Image();
      const t = this.time.delayedCall(4000, advance);
      img.onload = () => {
        t.remove(false);
        if (!this.textures.exists(key)) this.textures.addImage(key, img);
        advance();
      };
      img.onerror = () => { t.remove(false); advance(); };
      img.src = uri;
    };

    for (const r of RANKS) loadSVG(r.key, soldierRankedSVG(r));
    loadSVG('zombie', zombieSVG());
  }
}

// ===== TITLE SCENE =====
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.add.rectangle(W / 2, H / 2, W, H, C.BG);

    // Stars
    for (let i = 0; i < 80; i++) {
      const a = rand(1, 6) / 10;
      const s = this.add.rectangle(rand(0, W), rand(0, H * 0.72), rand(1, 2), rand(1, 2), 0xffffff, a);
      this.tweens.add({ targets: s, alpha: a * 0.12, duration: rand(900, 3200), yoyo: true, repeat: -1, delay: rand(0, 2800) });
    }

    // Parallax buildings
    const bFar  = this.add.tileSprite(W / 2, H * 0.28, W, 200, 'buildings-far').setAlpha(0.48);
    const bNear = this.add.tileSprite(W / 2, H * 0.40, W, 200, 'buildings-near').setAlpha(0.52);
    this.tweens.add({ targets: bFar,  tilePositionX: { from: 0, to: 80  }, duration: 40000, repeat: -1 });
    this.tweens.add({ targets: bNear, tilePositionX: { from: 0, to: 130 }, duration: 28000, repeat: -1 });

    // Road preview scroll
    const road = this.add.tileSprite(ROAD_X, H * 0.72, ROAD_W, H * 0.55, 'road-tile').setAlpha(0.45);
    this.tweens.add({ targets: road, tilePositionY: { from: 0, to: 80 }, duration: 1400, repeat: -1 });

    // Bottom fog
    const fog = this.add.graphics();
    fog.fillGradientStyle(C.BG, C.BG, C.BG, C.BG, 0, 0, 1, 1);
    fog.fillRect(0, H * 0.52, W, H * 0.48);

    // Floating zombie silhouettes
    for (let i = 0; i < 5; i++) {
      const z = this.add.image(rand(20, W - 20), rand(H * 0.08, H * 0.58), 'zombie')
        .setAlpha(0.08 + Math.random() * 0.08)
        .setScale(0.38 + Math.random() * 0.22)
        .setTint(0x2A4A18);
      this.tweens.add({
        targets: z, y: z.y - rand(18, 38),
        alpha: z.alpha * 0.25,
        duration: 2800 + rand(0, 2200), yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: rand(0, 2600)
      });
    }

    // Title — glow + main layers
    const tY = H * 0.30;
    this.add.text(W / 2, tY, 'SURVIVE\nDANCE', {
      fontSize: '58px', fontFamily: FH, color: toHex(C.PINK), align: 'center', lineSpacing: 0
    }).setOrigin(0.5).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD);

    const titleTxt = this.add.text(W / 2, tY, 'SURVIVE\nDANCE', {
      fontSize: '58px', fontFamily: FH,
      color: '#FFFFFF', stroke: toHex(C.PINK), strokeThickness: 3,
      align: 'center', lineSpacing: 0
    }).setOrigin(0.5);
    this.tweens.add({ targets: titleTxt, scaleX: 1.012, scaleY: 1.012, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Divider line
    const ln = this.add.graphics();
    ln.lineStyle(1.5, C.CYAN, 0.55);
    ln.lineBetween(W / 2 - 110, tY + 76, W / 2 + 110, tY + 76);
    this.tweens.add({ targets: ln, alpha: 0.18, duration: 1600, yoyo: true, repeat: -1 });

    // Subtitle
    this.add.text(W / 2, H * 0.50, '仲間を集めゾンビを全滅させろ', {
      fontSize: '16px', fontFamily: FB, color: '#7788AA', align: 'center'
    }).setOrigin(0.5);

    // Start button — outline style
    const btnY = H * 0.68;
    const btnBg  = this.add.graphics();
    const btnHit = this.add.rectangle(W / 2, btnY, 260, 66, 0x000000, 0).setInteractive();
    const drawBtn = (hover) => {
      btnBg.clear();
      const bc = hover ? C.CYAN : C.PINK;
      btnBg.fillStyle(0x000000, hover ? 0.35 : 0.20);
      btnBg.fillRoundedRect(W / 2 - 130, btnY - 33, 260, 66, 10);
      btnBg.lineStyle(2, bc, 0.88);
      btnBg.strokeRoundedRect(W / 2 - 130, btnY - 33, 260, 66, 10);
      if (hover) {
        btnBg.fillStyle(bc, 0.08);
        btnBg.fillRoundedRect(W / 2 - 130, btnY - 33, 260, 66, 10);
      }
    };
    drawBtn(false);

    this.add.text(W / 2, btnY - 9, 'GAME START', {
      fontSize: '20px', fontFamily: FH, color: '#FFFFFF', letterSpacing: 3
    }).setOrigin(0.5);
    this.add.text(W / 2, btnY + 13, 'ゲームスタート', {
      fontSize: '13px', fontFamily: FB, color: toHex(C.GRAY)
    }).setOrigin(0.5);

    // Button pulse
    this.tweens.add({ targets: btnHit, scaleX: 1.03, scaleY: 1.03, duration: 950, yoyo: true, repeat: -1 });
    btnHit.on('pointerover',  () => drawBtn(true));
    btnHit.on('pointerout',   () => drawBtn(false));
    btnHit.on('pointerdown',  () => {
      SFX.tap();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.start('Game'));
    });

    // Ambient particles
    for (let i = 0; i < 28; i++) {
      const p = this.add.rectangle(rand(0, W), rand(0, H), 1.5, 1.5, C.CYAN, rand(1, 4) / 10);
      this.tweens.add({
        targets: p, y: p.y - rand(30, 110), alpha: 0,
        duration: rand(2500, 6500), delay: rand(0, 4500), repeat: -1,
        onRepeat: () => { p.y = rand(H * 0.5, H); p.x = rand(0, W); p.alpha = rand(1, 4) / 10; }
      });
    }

    this.add.text(W - 8, H - 8, 'v0.2', { fontSize: '10px', color: '#223355' }).setOrigin(1, 1);
    this.cameras.main.fadeIn(450);
  }
}

// ===== GAME SCENE =====
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    SFX.init();
    this.soldierCount = 5;
    this.weaponLevel  = 1;
    this.soldierRank  = 0;
    this.scrollY      = 0;
    this.gateData     = makeGateData();
    this.gatesPassed  = 0;
    this.phase        = 'run';
    this.playerX      = W / 2;
    this.targetX      = W / 2;
    this.lastPointerX = W / 2;
    this.dragging     = false;
    this.bullets      = [];
    this.enemies      = [];

    this._createBackground();
    this._createRoad();
    this._createGates();
    this._createWalls();
    this._createPlayerGroup();
    this._createHUD();
    this._setupInput();
    this._startShootTimer();
    this._startEnemySpawner();
    this.cameras.main.fadeIn(350);
  }

  _createBackground() {
    this.add.rectangle(W / 2, H / 2, W, H, C.BG);
    for (let i = 0; i < 55; i++) {
      const a = rand(1, 5) / 10;
      const s = this.add.rectangle(rand(0, W), rand(0, H * 0.55), rand(1, 2), rand(1, 2), 0xffffff, a);
      this.tweens.add({ targets: s, alpha: 0.04, duration: rand(800, 2600), yoyo: true, repeat: -1, delay: rand(0, 2200) });
    }
    this.bgFar  = this.add.tileSprite(W / 2, H * 0.24, W, 200, 'buildings-far').setAlpha(0.40);
    this.bgNear = this.add.tileSprite(W / 2, H * 0.35, W, 200, 'buildings-near').setAlpha(0.48);
    const haze = this.add.graphics();
    haze.fillGradientStyle(C.BG, C.BG, C.BG, C.BG, 0, 0, 1, 1);
    haze.fillRect(0, H * 0.40, W, H * 0.12);
    haze.setDepth(2);
  }

  _createRoad() {
    const roadL = ROAD_X - ROAD_W / 2;
    this.roadTile = this.add.tileSprite(ROAD_X, H / 2, ROAD_W, H, 'road-tile');
    const eL = this.add.rectangle(roadL,          H / 2, 2, H, C.CYAN, 0.50).setBlendMode(Phaser.BlendModes.ADD);
    const eR = this.add.rectangle(roadL + ROAD_W, H / 2, 2, H, C.CYAN, 0.50).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: [eL, eR], alpha: 0.16, duration: 1400, yoyo: true, repeat: -1 });
  }

  _createGates() {
    this.gateObjs = [];
    for (let i = 0; i < NUM_GATES; i++) {
      const worldY = H * 0.55 - i * GATE_SPACING;
      const d = this.gateData[i];
      this.gateObjs.push({
        left:   this._buildGate(LANE_L, worldY, d.left),
        right:  this._buildGate(LANE_R, worldY, d.right),
        worldY, passed: false
      });
    }
  }

  _buildGate(x, worldY, data) {
    const img = this.add.image(x, worldY, gateTexKey(data)).setScale(1.02);
    this.tweens.add({ targets: img, scaleX: 0.97, scaleY: 0.97, duration: 1000 + rand(0, 400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const glow = this.add.ellipse(x, worldY, 100, 138, gateBgColor(data), 0.09).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.03, duration: 900, yoyo: true, repeat: -1 });

    const label = this.add.text(x, worldY - 24, gateLabel(data), {
      fontSize: '26px', fontFamily: FH, color: '#FFFFFF', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);

    const sub = this.add.text(x, worldY + 21, gateSubLabel(data), {
      fontSize: '14px', fontFamily: FB, color: toHex(gateBgColor(data)), stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    return { img, glow, label, sub, data, x, worldY };
  }

  _createPlayerGroup() {
    this.playerGroup   = this.add.container(this.playerX, PLAYER_Y);
    this.soldierImages = [];
    this._rebuildSoldiers();
  }

  _rebuildSoldiers() {
    this.playerGroup.removeAll(true);
    this.soldierImages = [];

    const count = clamp(this.soldierCount, 1, 50);
    const cols   = Math.min(count, 6);
    const arcR   = 20 + cols * 4;

    for (let i = 0; i < count; i++) {
      let ox, oy;
      if (i < cols) {
        const a = ((i / (cols - 1 || 1)) - 0.5) * Math.PI * 0.7;
        ox = Math.sin(a) * arcR;
        oy = -Math.cos(a) * arcR * 0.38;
      } else {
        const row = Math.floor((i - cols) / cols) + 1;
        const col = (i - cols) % cols;
        const a   = ((col / (cols - 1 || 1)) - 0.5) * Math.PI * 0.55;
        ox = Math.sin(a) * arcR * 0.82;
        oy = row * 28;
      }
      const img = this.make.image({ x: ox, y: oy, key: RANKS[this.soldierRank].key, add: false });
      img.setScale(0.50);
      this.playerGroup.add(img);
      this.soldierImages.push({ img, baseY: oy, phase: i * 0.44 });
    }

    // Weapon dots
    const dotY = (Math.ceil(count / cols)) * 28 + 18;
    const wl   = Math.min(this.weaponLevel, 8);
    for (let i = 0; i < wl; i++) {
      const dot = this.make.graphics({ add: false });
      dot.fillStyle(C.GOLD, 1);
      dot.fillCircle(0, 0, 4);
      dot.x = (i - wl / 2 + 0.5) * 11;
      dot.y = dotY;
      this.playerGroup.add(dot);
    }

    // Count badge
    const badge = this.make.text({
      x: 0, y: -arcR - 24,
      text: count.toString(),
      style: { fontSize: '22px', fontFamily: FH, color: '#FFFFFF', stroke: '#000', strokeThickness: 3 },
      add: false
    });
    badge.setOrigin(0.5);
    this.playerGroup.add(badge);
  }

  _createHUD() {
    const hudH = 72;
    const hud = this.add.graphics().setDepth(20);
    hud.fillStyle(0x000000, 0.80);
    hud.fillRect(0, 0, W, hudH);
    hud.lineStyle(1, C.CYAN, 0.20);
    hud.lineBetween(0, hudH, W, hudH);

    this.add.text(16, 13, 'TROOPS', {
      fontSize: '9px', fontFamily: FH, color: toHex(C.TEAL), letterSpacing: 2
    }).setDepth(21);
    this.hudSoldier = this.add.text(16, 26, '5', {
      fontSize: '28px', fontFamily: FH, color: toHex(C.TEAL), stroke: '#000', strokeThickness: 2
    }).setDepth(21);

    this.add.text(W - 16, 13, 'POWER', {
      fontSize: '9px', fontFamily: FH, color: toHex(C.GOLD), letterSpacing: 2
    }).setOrigin(1, 0).setDepth(21);
    this.hudWeapon = this.add.text(W - 16, 26, 'LV.1', {
      fontSize: '28px', fontFamily: FH, color: toHex(C.GOLD), stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0).setDepth(21);

    this.add.text(W / 2, 13, 'RANK', {
      fontSize: '9px', fontFamily: FH, color: toHex(C.PURPLE), letterSpacing: 2
    }).setOrigin(0.5).setDepth(21);
    this.hudRank = this.add.text(W / 2, 26, '一等兵', {
      fontSize: '16px', fontFamily: FB, color: toHex(C.PURPLE), stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(21);

    this.add.rectangle(W / 2, 58, W - 100, 6, C.DIM).setDepth(21);
    this.progFill = this.add.rectangle(52, 55, 0, 4, C.CYAN).setOrigin(0, 0).setDepth(22);
    this.add.text(W / 2, 58, 'MISSION', {
      fontSize: '8px', fontFamily: FH, color: '#2A3850', letterSpacing: 3
    }).setOrigin(0.5).setDepth(23);

    this._updateHUD();
  }

  _updateHUD() {
    this.hudSoldier.setText(this.soldierCount.toString());
    this.hudWeapon.setText('LV.' + this.weaponLevel);
    this.hudRank.setText(RANKS[this.soldierRank].name);
    const maxW = W - 106;
    const prog = this.gatesPassed / NUM_GATES;
    this.tweens.add({ targets: this.progFill, width: prog * maxW, duration: 300, ease: 'Power2' });
  }

  _setupInput() {
    this.input.on('pointerdown', p => { this.dragging = true; this.lastPointerX = p.x; });
    this.input.on('pointermove', p => {
      if (!this.dragging) return;
      const dx = p.x - this.lastPointerX;
      this.targetX = clamp(this.targetX + dx * 1.3, ROAD_X - ROAD_W / 2 + 50, ROAD_X + ROAD_W / 2 - 50);
      this.lastPointerX = p.x;
    });
    this.input.on('pointerup', () => { this.dragging = false; });
  }

  update(time) {
    if (this.phase !== 'run') return;

    this.scrollY += SCROLL_SPEED;
    this.bgFar.tilePositionY   -= SCROLL_SPEED * 0.12;
    this.bgNear.tilePositionY  -= SCROLL_SPEED * 0.28;
    this.roadTile.tilePositionY -= SCROLL_SPEED;

    this.playerX += (this.targetX - this.playerX) * 0.14;
    this.playerGroup.x = this.playerX;

    for (const s of this.soldierImages) {
      s.img.y = s.baseY + Math.sin(time * 0.006 + s.phase) * 2.5;
    }

    // ── Bullets move upward ──
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.circle.y -= b.speed;
      b.trail.y   = b.circle.y + 8;
      if (b.circle.y < -20) { b.circle.destroy(); b.trail.destroy(); this.bullets.splice(i, 1); }
    }

    // ── Enemies walk down; bullet collision; reach-player damage ──
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.img.y += e.speed;

      // bullet hit enemy
      let hitX = 0, hitY = 0, killed = false;
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (Math.abs(b.circle.x - e.img.x) < 22 && Math.abs(b.circle.y - e.img.y) < 28) {
          hitX = e.img.x; hitY = e.img.y;
          b.circle.destroy(); b.trail.destroy(); this.bullets.splice(j, 1);
          killed = true; break;
        }
      }
      if (killed) {
        this._enemyKillFX(hitX, hitY);
        e.img.destroy(); this.enemies.splice(i, 1);
        // ── AoE chain: wipe nearby enemies in radius ──
        const aoeR = 28 + this.weaponLevel * 4;
        let chainCount = 0;
        for (let k = this.enemies.length - 1; k >= 0; k--) {
          const ne = this.enemies[k];
          if (Math.abs(ne.img.x - hitX) < aoeR && Math.abs(ne.img.y - hitY) < aoeR) {
            this._enemyKillFX(ne.img.x, ne.img.y);
            ne.img.destroy(); this.enemies.splice(k, 1);
            chainCount++;
          }
        }
        if (chainCount >= 3) this._sweepFX(hitX, hitY, chainCount);
        continue;
      }

      // enemy reaches player → lose 1 soldier
      if (e.img.y > PLAYER_Y + 15) {
        e.img.destroy(); this.enemies.splice(i, 1);
        this.soldierCount = Math.max(1, this.soldierCount - 1);
        this._rebuildSoldiers(); this._updateHUD();
        this.cameras.main.shake(120, 0.014);
      }
    }

    // ── Walls scroll down; bullet shatters wall; contact = fallback ──
    for (const wall of this.wallObjs) {
      if (wall.passed) continue;
      const sy = wall.worldY + this.scrollY;
      wall.container.y = sy;

      // bullet hits wall
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (Math.abs(b.circle.y - sy) < 20 && Math.abs(b.circle.x - ROAD_X) < ROAD_W / 2 - 4) {
          b.circle.destroy(); b.trail.destroy(); this.bullets.splice(j, 1);
          wall.hp--;
          this._wallHitFX(b.circle.x, sy);
          if (wall.hp <= 0) { wall.passed = true; this._applyWallRankUp(wall); }
          break;
        }
      }

      // fallback: player body contact still triggers bonus
      if (!wall.passed && sy > PLAYER_Y - 10 && sy < PLAYER_Y + 30) {
        wall.passed = true; this._applyWallRankUp(wall);
      }
    }

    // ── Gates scroll down; player steers into one ──
    for (const go of this.gateObjs) {
      const sy  = go.worldY + this.scrollY;
      const vis = sy > -100 && sy < H + 100;
      for (const side of [go.left, go.right]) {
        side.img.setVisible(vis).setY(sy);
        side.glow.setVisible(vis).setY(sy);
        side.label.setVisible(vis).setY(sy - 24);
        side.sub.setVisible(vis).setY(sy + 21);
      }
      if (!go.passed && Math.abs(sy - PLAYER_Y) < 34) {
        go.passed = true; this.gatesPassed++;
        const chosen = Math.abs(this.playerX - go.left.x) <= Math.abs(this.playerX - go.right.x)
          ? go.left : go.right;
        this._applyGate(chosen.data); this._gatePassFX(chosen, sy); this._updateHUD();
      }
    }

    if (this.gatesPassed >= NUM_GATES && !this.battleStarted) {
      this.battleStarted = true;
      this.phase = 'done';
      this._cleanupBullets(); this._cleanupEnemies();
      this.time.delayedCall(600, () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(420, () =>
          this.scene.start('Battle', { soldiers: this.soldierCount, weaponLevel: this.weaponLevel, soldierRank: this.soldierRank })
        );
      });
    }
  }

  _applyGate(data) {
    if      (data.type === 'add') this.soldierCount = clamp(this.soldierCount + data.value, 1, 60);
    else if (data.type === 'mul') this.soldierCount = clamp(this.soldierCount * data.value, 1, 60);
    else                          this.weaponLevel  = clamp(this.weaponLevel  + data.value, 1, 10);
    this._rebuildSoldiers();
    if      (data.type === 'add' && data.value > 0) SFX.gateAdd();
    else if (data.type === 'add' && data.value < 0) SFX.gateSub();
    else if (data.type === 'mul') {
      SFX.gateMul();
      this.tweens.add({ targets: this.playerGroup, scaleX: 1.35, scaleY: 1.35, duration: 120, yoyo: true, ease: 'Back.easeOut' });
    } else SFX.gateWpn();
    if (data.type === 'wpn' && this.shootTimer) {
      this.shootTimer.remove(false); this._startShootTimer();
    }
  }

  _gatePassFX(gate, sy) {
    this.tweens.add({
      targets: gate.img, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 300, ease: 'Power3',
      onComplete: () => { gate.img.alpha = 1; gate.img.scaleX = gate.img.scaleY = 1.02; }
    });

    const pop = this.add.text(gate.img.x, sy - 12, gateLabel(gate.data), {
      fontSize: '36px', fontFamily: FH, color: '#FFFFFF', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: sy - 95, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => pop.destroy() });

    const color = gateBgColor(gate.data);
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * Math.PI * 2;
      const spd = 65 + rand(0, 90);
      const p = this.add.circle(gate.img.x, sy, 4 + rand(0, 3), color).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: p,
        x: gate.img.x + Math.cos(ang) * spd,
        y: sy          + Math.sin(ang) * spd,
        alpha: 0, scale: 0.12, duration: 520 + rand(0, 300),
        onComplete: () => p.destroy()
      });
    }

    const ring = this.add.graphics();
    ring.lineStyle(3, color, 0.88);
    ring.strokeCircle(gate.img.x, sy, 10);
    this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 380, onComplete: () => ring.destroy() });

    const flash = this.add.rectangle(W / 2, H / 2, W, H, color, 0.24).setDepth(30);
    this.tweens.add({ targets: flash, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
  }

  // ===== WALL SYSTEM =====
  _createWalls() {
    this.wallObjs = [];
    for (let j = 0; j < NUM_WALLS; j++) {
      const worldY = H * 0.55 - (j + 1) * GATE_SPACING + GATE_SPACING * 0.5;
      this.wallObjs.push(this._buildWall(worldY));
    }
  }

  _buildWall(worldY) {
    const ww = ROAD_W - 10;
    const wh = 26;
    const container = this.add.container(ROAD_X, worldY);

    const bg = this.add.graphics();
    bg.fillStyle(0x3A3A3A, 1);
    bg.fillRect(-ww / 2 - 2, -wh / 2 - 2, ww + 4, wh + 4);
    bg.fillStyle(0x5A4A3A, 1);
    bg.fillRect(-ww / 2, -wh / 2, ww, wh);
    // brick pattern
    for (let row = 0; row < 2; row++) {
      const offset = row % 2 === 0 ? 0 : 22;
      for (let bx = -ww / 2 + offset; bx < ww / 2; bx += 44) {
        bg.lineStyle(1, 0x3A2A1A, 0.6);
        bg.strokeRect(bx, -wh / 2 + row * (wh / 2), 40, wh / 2);
      }
    }
    container.add(bg);

    const label = this.add.text(0, -wh / 2 - 18, '▲ RANK UP!', {
      fontSize: '13px', fontFamily: FH, color: toHex(C.CYAN), stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);
    container.add(label);
    this.tweens.add({ targets: label, y: label.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    return { container, worldY, passed: false, hp: 5 };
  }

  _applyWallRankUp(wall) {
    this.soldierRank = Math.min(this.soldierRank + 1, RANKS.length - 1);
    this._rebuildSoldiers();
    SFX.rankUp();
    this._wallBreakFX(wall);
    this._showRankUpBanner();
    this._updateHUD();
  }

  _wallBreakFX(wall) {
    wall.container.setVisible(false);
    const cx = ROAD_X, cy = PLAYER_Y - 30;
    for (let i = 0; i < 24; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 70;
      const p = this.add.rectangle(
        cx + rand(-50, 50), cy,
        rand(4, 12), rand(4, 10),
        choose([0x5A4A3A, 0x3A3A3A, 0x7A6A5A])
      );
      this.tweens.add({
        targets: p,
        x: p.x + Math.cos(ang) * spd,
        y: p.y + Math.sin(ang) * spd - 20,
        angle: rand(-180, 180),
        alpha: 0, duration: 500 + rand(0, 300),
        onComplete: () => p.destroy()
      });
    }
    const flash = this.add.rectangle(W / 2, H / 2, W, H, C.GOLD, 0.20).setDepth(30);
    this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
  }

  _showRankUpBanner() {
    const rank = RANKS[this.soldierRank];
    const colors = [toHex(C.CYAN), '#FFD700', '#FF6B35', '#AA00FF'];
    const col = colors[this.soldierRank] || toHex(C.CYAN);
    const txt = this.add.text(W / 2, H * 0.52, `▲ ${rank.name} 昇格！`, {
      fontSize: '30px', fontFamily: FH, color: col,
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(0.6);
    this.tweens.add({
      targets: txt, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: txt, y: H * 0.38, alpha: 0, duration: 900, ease: 'Power2', onComplete: () => txt.destroy() });
      }
    });
  }

  // ===== SHOOT SYSTEM =====
  _startShootTimer() {
    const delay = Math.max(120, 380 - this.weaponLevel * 28);
    this.shootTimer = this.time.addEvent({
      delay, callback: () => this._autoShoot(), loop: true
    });
  }

  _autoShoot() {
    if (this.phase !== 'run' || this.soldierImages.length === 0) return;
    SFX.shoot();
    // Shots scale with army size: 1 shot per 4 soldiers, min 1, max 12
    const shots = Math.min(this.soldierImages.length, Math.max(1, Math.floor(this.soldierCount / 4)));
    for (let i = 0; i < shots; i++) {
      const si = this.soldierImages[i % this.soldierImages.length];
      this._spawnBullet(
        this.playerGroup.x + si.img.x + rand(-5, 5),
        PLAYER_Y + si.img.y - 20
      );
    }
  }

  _spawnBullet(x, y) {
    const rank  = RANKS[this.soldierRank];
    const colors = [C.CYAN, C.TEAL, C.GOLD, C.PURPLE];
    const col    = colors[rank.id - 1];
    // Solid rectangle bullet (no blend mode — reliable on all renderers)
    const circle = this.add.rectangle(x, y, 5, 16, col).setDepth(15);
    const trail  = this.add.rectangle(x, y + 14, 3, 8, col, 0.5).setDepth(15);
    this.bullets.push({ circle, trail, speed: 10 + (rank.id - 1) * 2 });
  }

  _cleanupBullets() {
    for (const b of this.bullets) { b.circle.destroy(); b.trail.destroy(); }
    this.bullets = [];
  }

  // ===== ENEMY SYSTEM =====
  _startEnemySpawner() {
    this.waveCount = 0;
    this.enemySpawnTimer = this.time.addEvent({
      delay: 2400, callback: () => this._spawnEnemyWave(), loop: true
    });
  }

  _spawnEnemyWave() {
    if (this.phase !== 'run') return;
    this.waveCount++;

    // Dense grid formation: cols × rows
    const cols     = Math.min(5 + Math.floor(this.gatesPassed / 2), 9);
    const rows     = Math.min(2 + Math.floor(this.gatesPassed / 3), 5);
    const roadHalf = ROAD_W / 2 - 12;
    const gapX     = (roadHalf * 2) / Math.max(cols - 1, 1);
    const gapY     = 34;
    const scale    = 0.24;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ROAD_X - roadHalf + c * gapX;
        const y = -16 - r * gapY;
        const img = this.add.image(x, y, 'zombie').setScale(scale).setDepth(5);
        // subtle sway instead of full flip (keeps dense look)
        this.tweens.add({ targets: img, angle: rand(-8, 8), duration: 260 + rand(0, 80), yoyo: true, repeat: -1 });
        this.enemies.push({ img, speed: 0.85 + Math.random() * 0.45 });
      }
    }

    // Wave banner
    const wTxt = this.add.text(W / 2, H * 0.44, `WAVE  ${this.waveCount}`, {
      fontSize: '20px', fontFamily: FH, color: toHex(C.PINK), stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({
      targets: wTxt, alpha: 1, y: H * 0.40, duration: 250, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: wTxt, alpha: 0, delay: 500, duration: 300, onComplete: () => wTxt.destroy() })
    });
  }

  _enemyKillFX(x, y) {
    // Small debris (fast, low cost)
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2;
      const p = this.add.rectangle(x + rand(-4,4), y + rand(-4,4), rand(3,6), rand(3,6), choose([0x44FF88, 0x22DD66, 0x88FFAA])).setDepth(12);
      this.tweens.add({ targets: p, x: p.x + Math.cos(ang)*rand(15,35), y: p.y + Math.sin(ang)*rand(15,35), alpha: 0, duration: 220 + rand(0,100), onComplete: () => p.destroy() });
    }
  }

  _sweepFX(x, y, count) {
    // Big shockwave ring when many enemies die at once
    const ring = this.add.graphics().setDepth(13);
    ring.lineStyle(3, C.TEAL, 0.9);
    ring.strokeCircle(x, y, 10);
    this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 350, onComplete: () => ring.destroy() });

    if (count >= 5) {
      const txt = this.add.text(x, y - 10, `×${count + 1} SWEEP!`, {
        fontSize: '18px', fontFamily: FH, color: toHex(C.GOLD), stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(50);
      this.tweens.add({ targets: txt, y: y - 60, alpha: 0, duration: 700, ease: 'Power2', onComplete: () => txt.destroy() });
    }
  }

  _wallHitFX(x, y) {
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const spd = 25 + Math.random() * 35;
      const p = this.add.rectangle(x + rand(-8, 8), y, rand(4, 9), rand(4, 8), choose([0x5A4A3A, 0xC8A870, 0x888888]));
      this.tweens.add({ targets: p, x: p.x + Math.cos(ang) * spd, y: p.y + Math.sin(ang) * spd - 10, angle: rand(-120, 120), alpha: 0, duration: 280 + rand(0, 140), onComplete: () => p.destroy() });
    }
    const spark = this.add.circle(x, y, 8, C.GOLD, 0.8).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: spark, alpha: 0, scale: 2, duration: 150, onComplete: () => spark.destroy() });
  }

  _cleanupEnemies() {
    for (const e of this.enemies) e.img.destroy();
    this.enemies = [];
    if (this.enemySpawnTimer) this.enemySpawnTimer.remove();
  }
}

// ===== BATTLE SCENE =====
class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  init(data) { this.soldiers = data.soldiers; this.weaponLevel = data.weaponLevel; this.soldierRank = data.soldierRank ?? 0; }

  create() {
    this.cameras.main.fadeIn(400);

    this.add.rectangle(W / 2, H / 2, W, H, 0x0E0608);
    this.add.tileSprite(W / 2, H * 0.22, W, 200, 'buildings-far').setAlpha(0.25).setTint(0xFF3333);
    this.add.tileSprite(W / 2, H * 0.36, W, 200, 'buildings-near').setAlpha(0.25).setTint(0xCC1818);

    const roadL = ROAD_X - ROAD_W / 2;
    this.add.rectangle(ROAD_X, H / 2, ROAD_W, H, 0x160808);
    this.add.rectangle(roadL,          H / 2, 2, H, C.PINK, 0.48).setBlendMode(Phaser.BlendModes.ADD);
    this.add.rectangle(roadL + ROAD_W, H / 2, 2, H, C.PINK, 0.48).setBlendMode(Phaser.BlendModes.ADD);

    // Header
    const hdr = this.add.graphics().setDepth(20);
    hdr.fillStyle(0x000000, 0.75);
    hdr.fillRect(0, 0, W, 68);
    hdr.lineStyle(1, C.PINK, 0.30);
    hdr.lineBetween(0, 68, W, 68);
    this.add.text(W / 2, 34, 'BATTLE', {
      fontSize: '26px', fontFamily: FH, color: toHex(C.PINK), letterSpacing: 10
    }).setOrigin(0.5).setDepth(21);

    const zombieCount = clamp(Math.floor(this.soldiers * 0.7 + rand(3, 10)), 3, 60);
    this._createZombies(zombieCount);
    this._createSoldiers();
    this._runBattle();
  }

  _createZombies(count) {
    this.zombieSprites = [];
    const cols = Math.min(count, 6), rows = Math.ceil(count / cols);
    let placed = 0;
    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        const x = ROAD_X + (c - (cols - 1) / 2) * 34;
        const y = H * 0.20 + r * 38 + 70;
        const img = this.add.image(x, y, 'zombie').setScale(0.50);
        const eg  = this.add.ellipse(x, y - 14, 26, 10, 0xFF0000, 0.20).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: eg, alpha: 0.04, duration: 400 + rand(0, 300), yoyo: true, repeat: -1 });
        this.zombieSprites.push({ img, eg, alive: true });
        placed++;
      }
    }
    this.initZombieCount = count;
    this.zombieCtr = this.add.text(W / 2, H * 0.11, count.toString(), {
      fontSize: '34px', fontFamily: FH, color: '#EE3344', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.11 + 30, 'ZOMBIES', {
      fontSize: '9px', fontFamily: FH, color: '#882233', letterSpacing: 4
    }).setOrigin(0.5);
  }

  _createSoldiers() {
    this.soldierSprites = [];
    const count = this.soldiers;
    const cols  = Math.min(count, 6), rows = Math.ceil(count / cols);
    let placed = 0;
    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        const x = ROAD_X + (c - (cols - 1) / 2) * 30;
        const y = H * 0.82 - r * 30;
        this.soldierSprites.push({ img: this.add.image(x, y, RANKS[this.soldierRank].key).setScale(0.50), alive: true });
        placed++;
      }
    }
    this.soldierCtr = this.add.text(W / 2, H * 0.92, count.toString(), {
      fontSize: '34px', fontFamily: FH, color: toHex(C.CYAN), stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.92 + 30, 'TROOPS', {
      fontSize: '9px', fontFamily: FH, color: '#1A5070', letterSpacing: 4
    }).setOrigin(0.5);

    const vs = this.add.text(W / 2, H * 0.52, 'VS', {
      fontSize: '52px', fontFamily: FH, color: toHex(C.GOLD), stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: vs, alpha: 1, scaleX: 1.22, scaleY: 1.22, duration: 320, yoyo: true });
  }

  _runBattle() {
    const rankPower = RANKS[this.soldierRank].power;
    let sHP = this.soldiers * (1 + this.weaponLevel * 0.6) * rankPower;
    let zHP = this.initZombieCount * 3;
    const sMax = sHP, zMax = zHP;

    const tick = () => {
      if (sHP <= 0 || zHP <= 0) { this._endBattle(sHP > 0); return; }

      zHP = Math.max(0, zHP - (1 + this.weaponLevel * 0.9) * (0.75 + Math.random() * 0.5));
      sHP = Math.max(0, sHP - 2.5 * (0.75 + Math.random() * 0.5));

      const aliveZ  = this.zombieSprites.filter(z => z.alive);
      const expectZ = Math.ceil((zHP / zMax) * this.initZombieCount);
      while (aliveZ.length > expectZ) {
        const z = aliveZ.splice(rand(0, aliveZ.length - 1), 1)[0];
        z.alive = false;
        SFX.kill();
        this._killFX(z.img.x, z.img.y, C.TEAL);
        this.tweens.add({ targets: [z.img, z.eg], alpha: 0, scaleY: 0.1, duration: 200 });
        this.zombieCtr.setText(this.zombieSprites.filter(z => z.alive).length.toString());
      }

      const aliveS  = this.soldierSprites.filter(s => s.alive);
      const expectS = Math.ceil((sHP / sMax) * this.soldiers);
      while (aliveS.length > expectS) {
        const s = aliveS.splice(rand(0, aliveS.length - 1), 1)[0];
        s.alive = false;
        this._killFX(s.img.x, s.img.y, C.CYAN);
        this.tweens.add({ targets: s.img, alpha: 0, scaleY: 0.1, duration: 200 });
        this.soldierCtr.setText(this.soldierSprites.filter(s => s.alive).length.toString());
      }

      this.cameras.main.shake(90, 0.006);
      this.time.delayedCall(200, tick);
    };
    this.time.delayedCall(900, tick);
  }

  _killFX(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 28 + Math.random() * 55;
      const p = this.add.circle(x, y, 3 + Math.random() * 4, color).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * spd, y: y + Math.sin(ang) * spd,
        alpha: 0, scale: 0.2, duration: 350 + rand(0, 200),
        onComplete: () => p.destroy()
      });
    }
    const fl = this.add.circle(x, y, 22, color, 0.52).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: fl, alpha: 0, scale: 2.2, duration: 170, onComplete: () => fl.destroy() });
  }

  _endBattle(won) {
    const survivors = this.soldierSprites.filter(s => s.alive).length;
    this.time.delayedCall(800, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () => this.scene.start('Result', { won, survivors }));
    });
  }
}

// ===== RESULT SCENE =====
class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(data) { this.won = data.won; this.survivors = data.survivors; }

  create() {
    this.cameras.main.fadeIn(500);
    this.won ? SFX.win() : SFX.lose();

    this.add.rectangle(W / 2, H / 2, W, H, this.won ? 0x050D08 : 0x0D0505);
    this.add.tileSprite(W / 2, H * 0.26, W, 200, 'buildings-far')
      .setAlpha(0.20).setTint(this.won ? 0x44FF88 : 0xFF4444);

    this.won ? this._fireworks() : this._darkAmbience();

    const col  = toHex(this.won ? C.TEAL : C.PINK);
    const word = this.won ? 'COMPLETE' : 'OVER';
    const tag  = this.won ? 'MISSION' : 'GAME';

    this.add.text(W / 2, H * 0.22, tag, {
      fontSize: '14px', fontFamily: FH, color: col, letterSpacing: 10
    }).setOrigin(0.5);

    // Glow
    this.add.text(W / 2, H * 0.32, word, {
      fontSize: '68px', fontFamily: FH, color: col
    }).setOrigin(0.5).setAlpha(0.16).setBlendMode(Phaser.BlendModes.ADD);

    const mainTxt = this.add.text(W / 2, H * 0.34, word, {
      fontSize: '68px', fontFamily: FH, color: '#FFFFFF', stroke: col, strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: mainTxt, alpha: 1, y: H * 0.32, duration: 550, ease: 'Back.easeOut' });

    // Divider
    const ln = this.add.graphics();
    ln.lineStyle(1.5, this.won ? C.TEAL : C.PINK, 0.45);
    ln.lineBetween(W / 2 - 120, H * 0.43, W / 2 + 120, H * 0.43);

    if (this.won) {
      this.add.text(W / 2, H * 0.50, 'SURVIVORS', {
        fontSize: '10px', fontFamily: FH, color: toHex(C.GRAY), letterSpacing: 4
      }).setOrigin(0.5);
      this.add.text(W / 2, H * 0.57, this.survivors.toString(), {
        fontSize: '54px', fontFamily: FH, color: toHex(C.TEAL), stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5);
      // Star rating
      const stars = this.survivors > 15 ? 3 : this.survivors > 5 ? 2 : 1;
      for (let i = 0; i < 3; i++) {
        const sx = W / 2 + (i - 1) * 52;
        const sg = this.add.graphics();
        sg.fillStyle(i < stars ? C.GOLD : C.GRAY, i < stars ? 1 : 0.25);
        this._drawStar(sg, sx, H * 0.68, 18, 8);
        if (i < stars) {
          const gl = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
          gl.fillStyle(C.GOLD, 0.22);
          this._drawStar(gl, sx, H * 0.68, 24, 10);
          this.tweens.add({ targets: sg, scaleX: 1.12, scaleY: 1.12, duration: 600 + i * 200, yoyo: true, repeat: -1 });
        }
      }
    } else {
      this.add.text(W / 2, H * 0.52, '全員が倒れた', {
        fontSize: '22px', fontFamily: FB, color: '#CC8888'
      }).setOrigin(0.5);
      this.add.text(W / 2, H * 0.60, 'もう一度挑め', {
        fontSize: '16px', fontFamily: FB, color: '#884444'
      }).setOrigin(0.5);
    }

    // Retry button
    const btnY   = H * 0.80;
    const btnCol = this.won ? C.TEAL : C.PINK;
    const btnBg  = this.add.graphics();
    const btnHit = this.add.rectangle(W / 2, btnY, 250, 64, 0x000000, 0).setInteractive();
    const drawBtn = (hover) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? btnCol : 0x000000, hover ? 0.18 : 0.10);
      btnBg.fillRoundedRect(W / 2 - 125, btnY - 32, 250, 64, 9);
      btnBg.lineStyle(2, btnCol, hover ? 1 : 0.72);
      btnBg.strokeRoundedRect(W / 2 - 125, btnY - 32, 250, 64, 9);
    };
    drawBtn(false);
    this.add.text(W / 2, btnY - 9, 'RETRY', {
      fontSize: '20px', fontFamily: FH, color: '#FFFFFF', letterSpacing: 5
    }).setOrigin(0.5);
    this.add.text(W / 2, btnY + 13, 'もう一度', {
      fontSize: '13px', fontFamily: FB, color: toHex(C.GRAY)
    }).setOrigin(0.5);

    this.tweens.add({ targets: btnHit, scaleX: 1.03, scaleY: 1.03, duration: 950, yoyo: true, repeat: -1 });
    btnHit.on('pointerover',  () => drawBtn(true));
    btnHit.on('pointerout',   () => drawBtn(false));
    btnHit.on('pointerdown',  () => {
      SFX.tap();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.start('Title'));
    });
  }

  _drawStar(gfx, cx, cy, r1, r2) {
    const pts = 5;
    gfx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 === 0 ? r1 : r2;
      const a = (i * Math.PI / pts) - Math.PI / 2;
      i === 0 ? gfx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
              : gfx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    gfx.closePath();
    gfx.fillPath();
  }

  _fireworks() {
    const colors = [C.PINK, C.GOLD, C.TEAL, C.CYAN, C.PURPLE, C.WHITE];
    const burst = () => {
      const x = rand(60, W - 60), y = rand(H * 0.08, H * 0.52);
      const color = choose(colors);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const spd = 50 + rand(0, 90);
        const p = this.add.circle(x, y, 3 + rand(0, 3), color).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: p, x: x + Math.cos(a) * spd, y: y + Math.sin(a) * spd,
          alpha: 0, duration: 580 + rand(0, 500), onComplete: () => p.destroy()
        });
      }
      const rg = this.add.graphics();
      rg.lineStyle(2, color, 0.75);
      rg.strokeCircle(x, y, 5);
      this.tweens.add({ targets: rg, scaleX: 4, scaleY: 4, alpha: 0, duration: 280, onComplete: () => rg.destroy() });
    };
    this.time.addEvent({ delay: 240, callback: burst, repeat: 38 });
  }

  _darkAmbience() {
    for (let i = 0; i < 16; i++) {
      const p = this.add.rectangle(rand(0, W), rand(0, H * 0.7), 2, 2, C.PINK, 0.07);
      this.tweens.add({
        targets: p, y: p.y + 55, alpha: 0, duration: 3500 + rand(0, 2500),
        delay: rand(0, 2200), repeat: -1,
        onRepeat: () => { p.y = rand(0, H * 0.4); p.x = rand(0, W); p.alpha = 0.07; }
      });
    }
  }
}

// ===== PHASER CONFIG =====
new Phaser.Game({
  type: Phaser.AUTO,
  width: W, height: H,
  backgroundColor: '#070A18',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, GameScene, BattleScene, ResultScene],
});
