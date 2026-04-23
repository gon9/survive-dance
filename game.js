// ===== 定数 =====
const W = 390, H = 844;
const ROAD_W = 230;
const ROAD_X = W / 2;
const PLAYER_Y = H * 0.78;
const LANE_L = ROAD_X - ROAD_W * 0.27;
const LANE_R = ROAD_X + ROAD_W * 0.27;
const SCROLL_SPEED = 3.5;
const NUM_GATES = 7;
const GATE_SPACING = 300;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ===== テクスチャ生成 =====
function buildTextures(scene) {
  let g;

  // ---- 兵士 ----
  g = scene.make.graphics({ add: false });
  // 影
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(12, 36, 20, 6);
  // 脚
  g.fillStyle(0x1a3a6e);
  g.fillRoundedRect(4, 24, 7, 12, 2);
  g.fillRoundedRect(13, 24, 7, 12, 2);
  // ブーツ
  g.fillStyle(0x111111);
  g.fillRoundedRect(3, 33, 9, 5, 1);
  g.fillRoundedRect(12, 33, 9, 5, 1);
  // 胴体
  g.fillStyle(0x2255bb);
  g.fillRoundedRect(4, 12, 16, 14, 3);
  // ベルト
  g.fillStyle(0x8b6914);
  g.fillRect(4, 23, 16, 3);
  // 腕
  g.fillStyle(0x2255bb);
  g.fillRoundedRect(0, 13, 5, 10, 2);
  g.fillRoundedRect(19, 13, 5, 10, 2);
  // 銃
  g.fillStyle(0x444444);
  g.fillRoundedRect(20, 14, 10, 4, 1);
  g.fillStyle(0x222222);
  g.fillRect(27, 12, 2, 8);
  // 首
  g.fillStyle(0xffcc88);
  g.fillRect(9, 9, 6, 5);
  // 頭
  g.fillStyle(0xffcc88);
  g.fillCircle(12, 7, 7);
  // ヘルメット
  g.fillStyle(0x334466);
  g.fillEllipse(12, 4, 17, 9);
  g.fillRect(5, 5, 14, 4);
  // 目
  g.fillStyle(0x222244);
  g.fillRect(8, 6, 3, 2);
  g.fillRect(13, 6, 3, 2);
  g.generateTexture('soldier', 32, 40);
  g.destroy();

  // ---- ゾンビ ----
  g = scene.make.graphics({ add: false });
  // 影
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(14, 42, 22, 6);
  // 脚（ゾロゾロ歩き）
  g.fillStyle(0x2d4a1e);
  g.fillRoundedRect(4, 28, 8, 14, 2);
  g.fillRoundedRect(14, 30, 8, 12, 2);
  // ボロ服
  g.fillStyle(0x3a5a28);
  g.fillRoundedRect(3, 14, 20, 16, 3);
  // 傷・汚れ
  g.fillStyle(0x1a2e10);
  g.fillRect(8, 16, 3, 8);
  g.fillRect(15, 19, 2, 5);
  // 腕（前に伸ばす）
  g.fillStyle(0x3a5a28);
  g.fillRoundedRect(-4, 14, 8, 6, 2);
  g.fillRoundedRect(22, 12, 8, 6, 2);
  // 手（腐った）
  g.fillStyle(0x5a7a38);
  g.fillCircle(-3, 19, 4);
  g.fillCircle(29, 17, 4);
  // 首
  g.fillStyle(0x5a7a38);
  g.fillRect(10, 10, 8, 6);
  // 頭
  g.fillStyle(0x5a7a38);
  g.fillCircle(14, 7, 8);
  // 傷口
  g.fillStyle(0x8b0000);
  g.fillRect(10, 5, 3, 4);
  g.fillRect(16, 3, 2, 5);
  // 目（赤く光る）
  g.fillStyle(0xff0000);
  g.fillCircle(10, 7, 3);
  g.fillCircle(18, 7, 3);
  g.fillStyle(0xff6666);
  g.fillCircle(10, 7, 1.5);
  g.fillCircle(18, 7, 1.5);
  // 口（裂けた）
  g.fillStyle(0x330000);
  g.fillRect(8, 11, 12, 3);
  g.fillStyle(0xdddddd);
  g.fillRect(9, 11, 2, 2);
  g.fillRect(12, 11, 2, 2);
  g.fillRect(15, 11, 2, 2);
  g.generateTexture('zombie', 32, 48);
  g.destroy();

  // ---- ビル（遠景）----
  g = scene.make.graphics({ add: false });
  g.fillStyle(0x0a0a18);
  const blds = [
    [0,80,50,120],[55,40,60,160],[120,90,45,110],[170,20,55,180],[230,60,50,140],[285,100,40,100],
    [10,120,30,80],[80,70,40,130],[150,110,35,90],[200,50,45,150],[250,85,50,115],[305,30,40,170],
  ];
  for (const [x,y,w,h] of blds) {
    g.fillRect(x, y, w, h);
    // 窓
    g.fillStyle(0xffffaa, 0.3);
    for (let wy = y+10; wy < y+h-10; wy+=20) {
      for (let wx = x+8; wx < x+w-8; wx+=14) {
        if (Math.random() > 0.4) g.fillRect(wx, wy, 6, 8);
      }
    }
    g.fillStyle(0x0a0a18);
  }
  g.generateTexture('buildings-far', 340, 200);
  g.destroy();

  // ---- ビル（近景）----
  g = scene.make.graphics({ add: false });
  g.fillStyle(0x050510);
  const blds2 = [[0,50,40,150],[45,80,35,120],[85,30,50,170],[140,70,40,130],[185,40,45,160],[235,60,40,140],[280,90,35,110],[320,20,40,180]];
  for (const [x,y,w,h] of blds2) {
    g.fillRect(x, y, w, h);
  }
  g.generateTexture('buildings-near', 360, 200);
  g.destroy();

  // ---- 地面タイル ----
  g = scene.make.graphics({ add: false });
  g.fillStyle(0x1c1c2e);
  g.fillRect(0, 0, ROAD_W, 80);
  // 中央線
  g.fillStyle(0xdddd00, 0.7);
  g.fillRect(ROAD_W/2 - 2, 0, 4, 40);
  // 縁のライン
  g.lineStyle(3, 0xffffff, 0.4);
  g.strokeRect(2, 0, ROAD_W - 4, 80);
  g.generateTexture('road-tile', ROAD_W, 80);
  g.destroy();

  // ---- ゲートフレーム ----
  for (const [key, color, glowColor] of [
    ['gate-add',  0x00ff88, 0x00ffaa],
    ['gate-sub',  0xff2244, 0xff4466],
    ['gate-mul',  0xffdd00, 0xffee44],
    ['gate-wpn',  0x44aaff, 0x88ccff],
  ]) {
    g = scene.make.graphics({ add: false });
    const gw = 88, gh = 130;
    // 外グロー
    g.fillStyle(glowColor, 0.08);
    g.fillRoundedRect(2, 2, gw-4, gh-4, 12);
    g.fillStyle(glowColor, 0.12);
    g.fillRoundedRect(4, 4, gw-8, gh-8, 10);
    // 本体
    g.fillStyle(0x000000, 0.55);
    g.fillRoundedRect(6, 6, gw-12, gh-12, 8);
    // 枠線
    g.lineStyle(3, color, 0.9);
    g.strokeRoundedRect(6, 6, gw-12, gh-12, 8);
    // 上部アクセントライン
    g.lineStyle(2, glowColor, 0.6);
    g.strokeRoundedRect(9, 9, gw-18, 28, 4);
    g.generateTexture(key, gw, gh);
    g.destroy();
  }

  // ---- パーティクルドット ----
  g = scene.make.graphics({ add: false });
  g.fillStyle(0xffffff);
  g.fillCircle(4, 4, 4);
  g.generateTexture('particle', 8, 8);
  g.destroy();

  // ---- 爆発フレーム ----
  g = scene.make.graphics({ add: false });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const len = 16 + Math.random() * 10;
    g.fillStyle(0xff6600, 0.9);
    g.fillCircle(24 + Math.cos(angle)*len, 24 + Math.sin(angle)*len, 4);
  }
  g.fillStyle(0xffdd00);
  g.fillCircle(24, 24, 10);
  g.generateTexture('explosion', 48, 48);
  g.destroy();
}

// ===== ゲートデータ =====
function gateTexKey(data) {
  if (data.type === 'add') return data.value > 0 ? 'gate-add' : 'gate-sub';
  if (data.type === 'mul') return 'gate-mul';
  return 'gate-wpn';
}
function gateLabel(data) {
  if (data.type === 'add') return (data.value > 0 ? '+' : '') + data.value + '人';
  if (data.type === 'mul') return '×' + data.value;
  return '⚔️+' + data.value;
}
function gateBgColor(data) {
  if (data.type === 'add') return data.value > 0 ? 0x00ff88 : 0xff2244;
  if (data.type === 'mul') return 0xffdd00;
  return 0x44aaff;
}
function makeGateData() {
  return Array.from({ length: NUM_GATES }, () => {
    const types = ['add','add','mul','wpn'];
    const val = t => t==='add' ? choose([-3,-2,3,5,8]) : t==='mul' ? choose([2,2,3]) : choose([1,2]);
    const tL = choose(types), tR = choose(types);
    return { left: { type: tL, value: val(tL) }, right: { type: tR, value: val(tR) } };
  });
}

// ===== タイトルシーン =====
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    buildTextures(this);

    // 背景
    this.add.rectangle(W/2, H/2, W, H, 0x050510);
    this.add.image(W/2, H*0.35, 'buildings-far').setAlpha(0.6).setDisplaySize(W, 200);
    this.add.image(W/2, H*0.5, 'buildings-near').setAlpha(0.5).setDisplaySize(W, 200);

    // 霧グラデ
    const fogGfx = this.add.graphics();
    fogGfx.fillGradientStyle(0x050510, 0x050510, 0x050510, 0x050510, 0, 0, 0.85, 0.85);
    fogGfx.fillRect(0, H*0.55, W, H*0.45);

    // 浮遊するゾンビ
    this.floatingZombies = [];
    for (let i = 0; i < 6; i++) {
      const z = this.add.image(rand(30, W-30), rand(H*0.1, H*0.65), 'zombie')
        .setAlpha(0.15 + Math.random()*0.15).setScale(1.2 + Math.random()*0.6);
      this.floatingZombies.push(z);
      this.tweens.add({
        targets: z, y: z.y - 30 - rand(0,20), alpha: z.alpha * 0.3,
        duration: 2500 + rand(0,2000), yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: rand(0,2000)
      });
    }

    // タイトルグロー
    const titleGlow = this.add.text(W/2, H*0.35, 'SURVIVE\nDANCE', {
      fontSize: '60px', fontFamily: 'Arial Black, Impact, sans-serif',
      color: '#e63946', align: 'center', lineSpacing: 4
    }).setOrigin(0.5).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);

    this.add.text(W/2, H*0.35, 'SURVIVE\nDANCE', {
      fontSize: '60px', fontFamily: 'Arial Black, Impact, sans-serif',
      color: '#ffffff', stroke: '#e63946', strokeThickness: 5, align: 'center', lineSpacing: 4
    }).setOrigin(0.5);

    this.tweens.add({ targets: titleGlow, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });

    this.add.text(W/2, H*0.54, '横にスライドして仲間を集め\nゾンビを全滅させろ！', {
      fontSize: '20px', color: '#aaaacc', align: 'center', lineSpacing: 8
    }).setOrigin(0.5);

    // スタートボタン
    const btnBg  = this.add.rectangle(W/2, H*0.70, 270, 72, 0xe63946).setInteractive();
    const btnGlow = this.add.rectangle(W/2, H*0.70, 278, 80, 0xff6677, 0.3).setBlendMode(Phaser.BlendModes.ADD);
    this.add.text(W/2, H*0.70, 'ゲームスタート', {
      fontSize: '26px', fontFamily: 'Arial Black', color: '#ffffff'
    }).setOrigin(0.5);

    this.tweens.add({ targets: [btnBg, btnGlow], scaleX: 1.04, scaleY: 1.04, duration: 750, yoyo: true, repeat: -1 });

    // 床のパーティクル雰囲気
    for (let i = 0; i < 40; i++) {
      const dot = this.add.rectangle(rand(0,W), rand(0,H), 1.5, 1.5, 0x8888aa, rand(2,6)/10);
      this.tweens.add({ targets: dot, y: dot.y - rand(20,80), alpha: 0, duration: rand(2000,5000), delay: rand(0,3000), repeat: -1, onRepeat: () => { dot.y = rand(H*0.6, H); dot.x = rand(0, W); dot.alpha = rand(2,6)/10; } });
    }

    btnBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(370, () => this.scene.start('Game'));
    });
    btnBg.on('pointerover', () => btnBg.setFillStyle(0xff2244));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0xe63946));

    this.cameras.main.fadeIn(400);
  }
}

// ===== ゲームシーン =====
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.soldierCount = 5;
    this.weaponLevel  = 1;
    this.scrollY      = 0;
    this.gateData     = makeGateData();
    this.gatesPassed  = 0;
    this.phase        = 'run';
    this.playerX      = W / 2;
    this.targetX      = W / 2;
    this.lastPointerX = W / 2;
    this.dragging     = false;

    this.createBackground();
    this.createRoad();
    this.createGates();
    this.createPlayerGroup();
    this.createHUD();
    this.setupInput();

    this.cameras.main.fadeIn(350);
  }

  createBackground() {
    this.add.rectangle(W/2, H/2, W, H, 0x060612);

    // 星
    for (let i = 0; i < 60; i++) {
      const s = this.add.rectangle(rand(0,W), rand(0,H*0.6), rand(1,2), rand(1,2), 0xffffff, rand(2,7)/10);
      this.tweens.add({ targets: s, alpha: 0.05, duration: rand(800,2500), yoyo: true, repeat: -1, delay: rand(0,2000) });
    }

    // 遠景ビル（左右にはみ出して配置）
    this.bgFar = this.add.tileSprite(W/2, H*0.28, W, 200, 'buildings-far').setAlpha(0.45);
    this.bgNear = this.add.tileSprite(W/2, H*0.38, W, 200, 'buildings-near').setAlpha(0.55);

    // 霞（底部）
    const haze = this.add.graphics();
    haze.fillGradientStyle(0x060612,0x060612, 0x060612,0x060612, 0,0,1,1);
    haze.fillRect(0, H*0.42, W, H*0.1);
    haze.setDepth(2);
  }

  createRoad() {
    const roadL = ROAD_X - ROAD_W/2;
    this.roadTile = this.add.tileSprite(ROAD_X, H/2, ROAD_W, H, 'road-tile');

    // 縁グロー
    const edgeL = this.add.rectangle(roadL,     H/2, 3, H, 0x6688ff, 0.7).setBlendMode(Phaser.BlendModes.ADD);
    const edgeR = this.add.rectangle(roadL+ROAD_W, H/2, 3, H, 0x6688ff, 0.7).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: [edgeL, edgeR], alpha: 0.2, duration: 1200, yoyo: true, repeat: -1 });
  }

  createGates() {
    this.gateObjs = [];
    const startWorldY = H * 0.55;

    for (let i = 0; i < NUM_GATES; i++) {
      const worldY = startWorldY - i * GATE_SPACING;
      const d = this.gateData[i];
      const left  = this.buildGate(LANE_L, worldY, d.left);
      const right = this.buildGate(LANE_R, worldY, d.right);
      this.gateObjs.push({ left, right, worldY, passed: false });
    }
  }

  buildGate(x, worldY, data) {
    const texKey = gateTexKey(data);
    const color  = gateBgColor(data);

    const img = this.add.image(x, worldY, texKey).setScale(1.05);

    // パルスアニメ
    this.tweens.add({ targets: img, scaleX: 1.0, scaleY: 1.0, duration: 900 + rand(0,400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // グロー（ADD合成の半透明円）
    const glow = this.add.ellipse(x, worldY, 100, 140, color, 0.12).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.05, duration: 700, yoyo: true, repeat: -1 });

    const label = this.add.text(x, worldY - 28, gateLabel(data), {
      fontSize: '22px', fontFamily: 'Arial Black, Impact',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    const subLabel = this.add.text(x, worldY + 18, data.type === 'add' ? '人数' : data.type === 'mul' ? '倍率' : '武器',
      { fontSize: '13px', color: '#cccccc', stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5);

    return { img, glow, label, subLabel, data, x, worldY };
  }

  createPlayerGroup() {
    this.playerGroup = this.add.container(this.playerX, PLAYER_Y);
    this.soldierImages = [];
    this.rebuildSoldiers();
  }

  rebuildSoldiers() {
    this.playerGroup.removeAll(true);
    this.soldierImages = [];

    const count = clamp(this.soldierCount, 1, 50);
    const cols = Math.min(count, 5);
    const rows = Math.ceil(count / cols);
    const sx = 26, sy = 28;
    let placed = 0;

    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        const ox = (c - (cols-1)/2) * sx;
        const oy = (r - (rows-1)/2) * sy;
        const img = this.make.image({ x: ox, y: oy, key: 'soldier', add: false });
        img.setScale(0.85);
        this.playerGroup.add(img);
        this.soldierImages.push({ img, baseY: oy, phase: placed * 0.4 });
        placed++;
      }
    }

    // 武器レベル表示
    const wpnTxt = this.make.text({
      x: 0, y: rows * sy / 2 + 16,
      text: '⚔️'.repeat(Math.min(this.weaponLevel, 5)),
      style: { fontSize: '14px' }, add: false
    });
    wpnTxt.setOrigin(0.5);
    this.playerGroup.add(wpnTxt);

    // 人数バッジ
    const badge = this.make.text({
      x: 0, y: -rows * sy / 2 - 22,
      text: '×' + count,
      style: { fontSize: '20px', fontFamily:'Arial Black', color:'#ffffff', stroke:'#000', strokeThickness:3 },
      add: false
    });
    badge.setOrigin(0.5);
    this.playerGroup.add(badge);
    this.soldierBadge = badge;
  }

  createHUD() {
    // 上部パネル
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.7);
    hudBg.fillRect(0, 0, W, 72);
    hudBg.lineStyle(1, 0x334466, 0.8);
    hudBg.strokeRect(0, 71, W, 1);
    hudBg.setDepth(10);

    this.hudSoldier = this.add.text(W/2 - 70, 20, '', {
      fontSize: '20px', color: '#44ffaa', fontFamily: 'Arial Black', stroke:'#002211', strokeThickness:3
    }).setOrigin(0.5).setDepth(11);

    this.hudWeapon = this.add.text(W/2 + 70, 20, '', {
      fontSize: '20px', color: '#ffdd44', fontFamily: 'Arial Black', stroke:'#221100', strokeThickness:3
    }).setOrigin(0.5).setDepth(11);

    // プログレスバー
    this.add.rectangle(W/2, 54, W-40, 9, 0x112233).setDepth(11);
    this.progFill = this.add.rectangle(20, 54, 1, 7, 0x22ccff).setOrigin(0, 0.5).setDepth(12);
    this.add.text(W/2, 54, 'ゴールまで', { fontSize: '10px', color: '#8899bb' }).setOrigin(0.5).setDepth(13);

    this.updateHUD();
  }

  updateHUD() {
    this.hudSoldier.setText('👥 ' + this.soldierCount + '人');
    this.hudWeapon.setText('⚔️ Lv.' + this.weaponLevel);
    const maxW = W - 42;
    const progress = this.gatesPassed / NUM_GATES;
    this.tweens.add({ targets: this.progFill, width: progress * maxW, duration: 300, ease: 'Power2' });
  }

  setupInput() {
    this.input.on('pointerdown', p => { this.dragging = true; this.lastPointerX = p.x; });
    this.input.on('pointermove', p => {
      if (!this.dragging) return;
      const dx = p.x - this.lastPointerX;
      this.targetX = clamp(this.targetX + dx * 1.3, ROAD_X - ROAD_W/2 + 50, ROAD_X + ROAD_W/2 - 50);
      this.lastPointerX = p.x;
    });
    this.input.on('pointerup', () => { this.dragging = false; });
  }

  update(time) {
    if (this.phase !== 'run') return;

    this.scrollY += SCROLL_SPEED;

    // パララックス
    this.bgFar.tilePositionY  -= SCROLL_SPEED * 0.15;
    this.bgNear.tilePositionY -= SCROLL_SPEED * 0.3;
    this.roadTile.tilePositionY -= SCROLL_SPEED;

    // プレイヤー移動
    this.playerX += (this.targetX - this.playerX) * 0.14;
    this.playerGroup.x = this.playerX;

    // 兵士の歩きアニメ
    for (const s of this.soldierImages) {
      s.img.y = s.baseY + Math.sin(time * 0.006 + s.phase) * 3;
    }

    // ゲートスクロール＆判定
    for (const go of this.gateObjs) {
      const sy = go.worldY + this.scrollY;
      const vis = sy > -80 && sy < H + 80;

      for (const side of [go.left, go.right]) {
        side.img.setVisible(vis).setY(sy);
        side.glow.setVisible(vis).setY(sy);
        side.label.setVisible(vis).setY(sy - 28);
        side.subLabel.setVisible(vis).setY(sy + 18);
      }

      if (!go.passed && Math.abs(sy - PLAYER_Y) < 32) {
        go.passed = true;
        this.gatesPassed++;
        const dL = Math.abs(this.playerX - go.left.x);
        const dR = Math.abs(this.playerX - go.right.x);
        const chosen = dL <= dR ? go.left : go.right;
        this.applyGate(chosen.data);
        this.gatePassEffect(chosen, sy);
        this.updateHUD();
      }
    }

    if (this.gatesPassed >= NUM_GATES && !this.battleStarted) {
      this.battleStarted = true;
      this.time.delayedCall(600, () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(420, () =>
          this.scene.start('Battle', { soldiers: this.soldierCount, weaponLevel: this.weaponLevel })
        );
      });
    }
  }

  applyGate(data) {
    if      (data.type === 'add') this.soldierCount = clamp(this.soldierCount + data.value, 1, 60);
    else if (data.type === 'mul') this.soldierCount = clamp(this.soldierCount * data.value, 1, 60);
    else                          this.weaponLevel  = clamp(this.weaponLevel + data.value, 1, 10);
    this.rebuildSoldiers();
  }

  gatePassEffect(gate, screenY) {
    // スケールバースト
    this.tweens.add({
      targets: gate.img, scaleX: 1.6, scaleY: 1.6, alpha: 0,
      duration: 350, ease: 'Power3',
      onComplete: () => { gate.img.alpha = 1; gate.img.scaleX = 1.05; gate.img.scaleY = 1.05; }
    });

    // フローティングテキスト
    const pop = this.add.text(gate.img.x, screenY - 10, gateLabel(gate.data), {
      fontSize: '32px', fontFamily: 'Arial Black', color:'#ffffff', stroke:'#000', strokeThickness:5
    }).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: screenY - 80, alpha: 0, duration: 800, ease: 'Power2', onComplete: () => pop.destroy() });

    // パーティクルバースト
    const color = gateBgColor(gate.data);
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const speed = 60 + rand(0, 80);
      const p = this.add.circle(gate.img.x, screenY, 4, color).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: p,
        x: gate.img.x + Math.cos(angle) * speed,
        y: screenY   + Math.sin(angle) * speed,
        alpha: 0, scale: 0.2, duration: 500 + rand(0,300),
        onComplete: () => p.destroy()
      });
    }

    // 画面フラッシュ
    const flash = this.add.rectangle(W/2, H/2, W, H, color, 0.18);
    this.tweens.add({ targets: flash, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
  }
}

// ===== バトルシーン =====
class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) { this.soldiers = data.soldiers; this.weaponLevel = data.weaponLevel; }

  create() {
    this.cameras.main.fadeIn(400);

    // 背景
    this.add.rectangle(W/2, H/2, W, H, 0x100a0a);
    this.add.image(W/2, H*0.25, 'buildings-far').setAlpha(0.3).setTint(0xff3333).setDisplaySize(W, 200);
    this.add.image(W/2, H*0.38, 'buildings-near').setAlpha(0.3).setTint(0xaa2222).setDisplaySize(W, 200);

    const roadL = ROAD_X - ROAD_W/2;
    this.add.rectangle(ROAD_X, H/2, ROAD_W, H, 0x1c0a0a);
    this.add.rectangle(roadL,       H/2, 3, H, 0xff4444, 0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.add.rectangle(roadL+ROAD_W, H/2, 3, H, 0xff4444, 0.5).setBlendMode(Phaser.BlendModes.ADD);

    this.add.text(W/2, 44, '⚔️  BATTLE  ⚔️', {
      fontSize: '30px', fontFamily: 'Arial Black', color:'#ff4444', stroke:'#000', strokeThickness:5
    }).setOrigin(0.5);

    const zombieCount = clamp(Math.floor(this.soldiers * 0.7 + rand(3, 10)), 3, 60);
    this.createZombieGroup(zombieCount);
    this.createSoldierGroup();
    this.runBattle();
  }

  createZombieGroup(count) {
    this.zombieSprites = [];
    const cols = Math.min(count, 6), rows = Math.ceil(count / cols);
    const sx = 34, sy = 36;
    let placed = 0;

    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        const x = ROAD_X + (c - (cols-1)/2) * sx;
        const y = H * 0.22 + r * sy;
        const img = this.add.image(x, y, 'zombie').setScale(0.9);
        // 目のグロー
        const eyeGlow = this.add.ellipse(x, y - 12, 22, 8, 0xff0000, 0.25).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: eyeGlow, alpha: 0.05, duration: 400 + rand(0,300), yoyo:true, repeat:-1 });
        this.zombieSprites.push({ img, eyeGlow, alive: true });
        placed++;
      }
    }
    this.initZombieCount = count;

    this.zombieCounter = this.add.text(W/2, H*0.13, '🧟 × ' + count, {
      fontSize: '26px', fontFamily:'Arial Black', color:'#88ff88', stroke:'#000', strokeThickness:4
    }).setOrigin(0.5);
  }

  createSoldierGroup() {
    this.soldierSprites = [];
    const count = this.soldiers;
    const cols = Math.min(count, 6), rows = Math.ceil(count / cols);
    const sx = 30, sy = 30;
    let placed = 0;

    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        const x = ROAD_X + (c - (cols-1)/2) * sx;
        const y = H * 0.80 - r * sy;
        const img = this.add.image(x, y, 'soldier').setScale(0.9);
        this.soldierSprites.push({ img, alive: true });
        placed++;
      }
    }

    this.soldierCounter = this.add.text(W/2, H*0.90, '👥 × ' + count, {
      fontSize: '26px', fontFamily:'Arial Black', color:'#44aaff', stroke:'#000', strokeThickness:4
    }).setOrigin(0.5);

    this.vsText = this.add.text(W/2, H*0.52, 'VS', {
      fontSize: '48px', fontFamily:'Arial Black', color:'#ffdd00', stroke:'#000', strokeThickness:6, alpha:0
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.vsText, alpha: 1, scaleX:1.3, scaleY:1.3, duration:400, yoyo:true, repeat:0 });
  }

  runBattle() {
    let soldierHP = this.soldiers * (1 + this.weaponLevel * 0.6);
    let zombieHP  = this.initZombieCount * 3;
    const soldierMaxHP = soldierHP;
    const zombieMaxHP  = zombieHP;

    const tick = () => {
      if (soldierHP <= 0 || zombieHP <= 0) { this.endBattle(soldierHP > 0); return; }

      const atkP = (1 + this.weaponLevel * 0.9) * (0.75 + Math.random() * 0.5);
      const atkZ = 2.5 * (0.75 + Math.random() * 0.5);
      zombieHP  -= atkP;
      soldierHP -= atkZ;
      soldierHP  = Math.max(0, soldierHP);
      zombieHP   = Math.max(0, zombieHP);

      // ゾンビ消す
      const aliveZ = this.zombieSprites.filter(z => z.alive);
      const expectZ = Math.ceil((zombieHP / zombieMaxHP) * this.initZombieCount);
      while (aliveZ.length > expectZ && aliveZ.length > 0) {
        const idx = rand(0, aliveZ.length - 1);
        const z = aliveZ.splice(idx, 1)[0];
        z.alive = false;
        this.killEffect(z.img.x, z.img.y, 0x44aa44);
        this.tweens.add({ targets: [z.img, z.eyeGlow], alpha: 0, scaleY: 0, duration: 250 });
        this.zombieCounter.setText('🧟 × ' + this.zombieSprites.filter(z=>z.alive).length);
      }

      // 兵士消す
      const aliveS = this.soldierSprites.filter(s => s.alive);
      const expectS = Math.ceil((soldierHP / soldierMaxHP) * this.soldiers);
      while (aliveS.length > expectS && aliveS.length > 0) {
        const idx = rand(0, aliveS.length - 1);
        const s = aliveS.splice(idx, 1)[0];
        s.alive = false;
        this.killEffect(s.img.x, s.img.y, 0x4488ff);
        this.tweens.add({ targets: s.img, alpha: 0, scaleY: 0, duration: 250 });
        this.soldierCounter.setText('👥 × ' + this.soldierSprites.filter(s=>s.alive).length);
      }

      // 画面揺らし
      this.cameras.main.shake(80, 0.006);

      this.time.delayedCall(200, tick);
    };

    this.time.delayedCall(900, tick);
  }

  killEffect(x, y, color) {
    // 爆発パーティクル
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      const p = this.add.circle(x, y, 3 + Math.random()*4, color).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle)*speed, y: y + Math.sin(angle)*speed,
        alpha: 0, scale: 0.3, duration: 400 + rand(0,200),
        onComplete: () => p.destroy()
      });
    }
    // フラッシュ
    const flash = this.add.circle(x, y, 20, color, 0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, alpha: 0, scale: 2, duration: 200, onComplete: () => flash.destroy() });
  }

  endBattle(won) {
    const survivors = this.soldierSprites.filter(s => s.alive).length;
    this.time.delayedCall(800, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () =>
        this.scene.start('Result', { won, survivors })
      );
    });
  }
}

// ===== リザルトシーン =====
class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(data) { this.won = data.won; this.survivors = data.survivors; }

  create() {
    this.cameras.main.fadeIn(450);

    this.add.rectangle(W/2, H/2, W, H, this.won ? 0x040d04 : 0x0d0404);
    this.add.image(W/2, H*0.3, 'buildings-far')
      .setAlpha(0.25).setDisplaySize(W, 200)
      .setTint(this.won ? 0x44ff88 : 0xff4444);

    if (this.won) this.fireworks();
    else          this.darkParticles();

    const emoji = this.won ? '🎉' : '💀';
    const title = this.won ? 'CLEAR!' : 'GAME OVER';
    const col   = this.won ? '#aaff66' : '#ff4444';
    const glow  = this.won ? 0x44ff44  : 0xff0000;

    // タイトルグロー
    this.add.text(W/2, H*0.32, title, {
      fontSize: '64px', fontFamily:'Arial Black', color: col, alpha:0.25
    }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);

    this.add.text(W/2, H*0.24, emoji, { fontSize: '80px' }).setOrigin(0.5);
    this.add.text(W/2, H*0.36, title, {
      fontSize: '60px', fontFamily:'Arial Black', color: col, stroke:'#000', strokeThickness:6
    }).setOrigin(0.5);

    if (this.won) {
      this.add.text(W/2, H*0.50, '生存者  ' + this.survivors + '  人', {
        fontSize: '30px', fontFamily:'Arial Black', color:'#aaffcc', stroke:'#000', strokeThickness:4
      }).setOrigin(0.5);
    } else {
      this.add.text(W/2, H*0.50, '全員やられた…\nもう一度挑戦しろ！', {
        fontSize: '22px', color:'#ffaaaa', align:'center', lineSpacing:8
      }).setOrigin(0.5);
    }

    const btnColor = this.won ? 0x22aa55 : 0xcc2233;
    const btn = this.add.rectangle(W/2, H*0.70, 270, 72, btnColor).setInteractive();
    const btnGlow = this.add.rectangle(W/2, H*0.70, 280, 82, btnColor, 0.25).setBlendMode(Phaser.BlendModes.ADD);
    this.add.text(W/2, H*0.70, 'もう一度', {
      fontSize: '28px', fontFamily:'Arial Black', color:'#ffffff'
    }).setOrigin(0.5);

    this.tweens.add({ targets:[btn,btnGlow], scaleX:1.04, scaleY:1.04, duration:700, yoyo:true, repeat:-1 });
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300,0,0,0);
      this.time.delayedCall(320, () => this.scene.start('Title'));
    });
    btn.on('pointerover', () => btn.setFillStyle(this.won ? 0x33dd77 : 0xff3344));
    btn.on('pointerout',  () => btn.setFillStyle(btnColor));
  }

  fireworks() {
    const colors = [0xff4444, 0xffdd44, 0x44ff88, 0x44aaff, 0xff88ff, 0xffffff];
    const burst = () => {
      const x = rand(60, W-60), y = rand(H*0.1, H*0.55);
      const color = choose(colors);
      for (let i = 0; i < 24; i++) {
        const angle = (i/24)*Math.PI*2;
        const spd = 60 + rand(0,80);
        const p = this.add.circle(x, y, 4, color).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: p, x: x+Math.cos(angle)*spd, y: y+Math.sin(angle)*spd,
          alpha: 0, duration: 600+rand(0,400), onComplete: ()=>p.destroy()
        });
      }
    };
    this.time.addEvent({ delay: 280, callback: burst, repeat: 30 });
  }

  darkParticles() {
    for (let i = 0; i < 20; i++) {
      const x = rand(0,W);
      const p = this.add.text(x, rand(0,H*0.8), '💀', { fontSize: rand(16,32)+'px' }).setAlpha(0.2);
      this.tweens.add({ targets:p, y: p.y+40, alpha:0, duration:3000+rand(0,2000), delay:rand(0,2000), repeat:-1, onRepeat:()=>{ p.y=rand(0,H*0.5); p.x=rand(0,W); p.alpha=0.2; } });
    }
  }
}

// ===== Phaser設定 =====
new Phaser.Game({
  type: Phaser.AUTO,
  width: W, height: H,
  backgroundColor: '#060612',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, GameScene, BattleScene, ResultScene],
});
