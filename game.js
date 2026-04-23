// ===== 定数 =====
const W = 390, H = 844;
const LANE_LEFT = W * 0.25, LANE_RIGHT = W * 0.75, LANE_MID = W * 0.5;
const PLAYER_Y = H * 0.78;
const SCROLL_SPEED = 3;
const GATE_SPACING = 280;
const NUM_GATES = 7;

// ===== ユーティリティ =====
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function gateLabel(g) {
  if (g.type === 'add')  return (g.value > 0 ? '+' : '') + g.value + '人';
  if (g.type === 'mul')  return '×' + g.value;
  if (g.type === 'wpn')  return '武器+' + g.value;
  return '';
}
function gateColor(g) {
  if (g.type === 'add') return g.value > 0 ? 0x22cc55 : 0xcc2244;
  if (g.type === 'mul') return 0xf0c030;
  return 0x3399ff;
}

// ゲートデータ生成
function makeGateData() {
  const gates = [];
  for (let i = 0; i < NUM_GATES; i++) {
    const types = ['add', 'add', 'mul', 'wpn'];
    const tL = choose(types), tR = choose(types);
    const makeVal = (t) => {
      if (t === 'add') return choose([-3, -2, 3, 5, 8]);
      if (t === 'mul') return choose([2, 2, 3]);
      return choose([1, 2]);
    };
    gates.push({ left: { type: tL, value: makeVal(tL) }, right: { type: tR, value: makeVal(tR) } });
  }
  return gates;
}

// ===== シーン: タイトル =====
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.add.rectangle(W/2, H/2, W, H, 0x1a1a2e);

    // 背景装飾
    for (let i = 0; i < 20; i++) {
      const x = rand(0, W), y = rand(0, H);
      this.add.circle(x, y, rand(1, 3), 0xffffff, 0.3);
    }

    this.add.text(W/2, H*0.28, '🧟', { fontSize: '72px' }).setOrigin(0.5);
    this.add.text(W/2, H*0.42, 'SURVIVE\nDANCE', {
      fontSize: '52px', fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff', stroke: '#e63946', strokeThickness: 6,
      align: 'center', lineSpacing: 8
    }).setOrigin(0.5);

    this.add.text(W/2, H*0.58, '横にスライドして仲間を集め\nゾンビを倒せ！', {
      fontSize: '20px', color: '#aaaacc', align: 'center', lineSpacing: 6
    }).setOrigin(0.5);

    const btn = this.add.rectangle(W/2, H*0.72, 260, 68, 0xe63946, 1).setInteractive();
    this.add.text(W/2, H*0.72, 'ゲームスタート', {
      fontSize: '26px', fontFamily: 'Arial Black', color: '#ffffff'
    }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.start('Game'));
    });

    this.tweens.add({ targets: btn, scaleX: 1.04, scaleY: 1.04, duration: 700, yoyo: true, repeat: -1 });
  }
}

// ===== シーン: ゲームプレイ =====
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.cameras.main.fadeIn(300);

    // 状態
    this.soldierCount = 5;
    this.weaponLevel = 1;
    this.scrollY = 0;
    this.gateData = makeGateData();
    this.gatesPassed = 0;
    this.phase = 'run'; // 'run' | 'done'
    this.dragging = false;
    this.dragStartX = 0;
    this.playerX = LANE_MID;
    this.targetX = LANE_MID;

    this.createBackground();
    this.createRoad();
    this.createGateObjects();
    this.createPlayer();
    this.createHUD();
    this.setupInput();

    this.cameras.main.fadeIn(200);
  }

  createBackground() {
    this.bg = this.add.rectangle(W/2, H/2, W, H, 0x1a1a2e);

    // 流れる背景粒子
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      const g = this.add.circle(rand(0, W), rand(0, H), rand(1, 2), 0x334466, 0.6);
      this.particles.push(g);
    }
  }

  createRoad() {
    // 道の描画（グラフィクスオブジェクトで毎フレーム再描画する代わりにテクスチャ）
    const roadW = 220;
    this.roadLeft = (W - roadW) / 2;
    this.roadRight = (W + roadW) / 2;

    // 道の背景
    this.roadBg = this.add.rectangle(W/2, H/2, roadW, H, 0x2d2d3e);

    // 道の線（スクロール用）
    this.dashGfx = this.add.graphics();
    this.roadLines = [];
    for (let i = 0; i < 12; i++) {
      this.roadLines.push({ y: i * 80 });
    }

    // 道の縁
    this.add.rectangle(this.roadLeft, H/2, 4, H, 0x555577);
    this.add.rectangle(this.roadRight, H/2, 4, H, 0x555577);
  }

  drawRoadLines() {
    this.dashGfx.clear();
    this.dashGfx.fillStyle(0x888899, 0.5);
    for (const line of this.roadLines) {
      const y = ((line.y + this.scrollY) % (H + 80)) - 40;
      this.dashGfx.fillRect(W/2 - 3, y, 6, 40);
    }
  }

  createGateObjects() {
    this.gateObjs = [];
    const startY = H * 0.55;

    for (let i = 0; i < NUM_GATES; i++) {
      const worldY = startY - i * GATE_SPACING;
      const d = this.gateData[i];
      const gLeft  = this.createGate(LANE_LEFT,  worldY, d.left,  'L');
      const gRight = this.createGate(LANE_RIGHT, worldY, d.right, 'R');
      this.gateObjs.push({ left: gLeft, right: gRight, worldY, passed: false });
    }
  }

  createGate(x, y, data, side) {
    const color = gateColor(data);
    const rect = this.add.rectangle(x, y, 90, 50, color, 0.9);
    rect.setStrokeStyle(2, 0xffffff, 0.7);
    const label = this.add.text(x, y, gateLabel(data), {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    return { rect, label, data, x, worldY: y };
  }

  createPlayer() {
    // 主人公グループ (兵士たち)
    this.soldierSprites = [];
    this.playerContainer = this.add.container(this.playerX, PLAYER_Y);
    this.updateSoldierDisplay();
  }

  updateSoldierDisplay() {
    // 既存スプライトを削除
    this.playerContainer.removeAll(true);

    const count = Math.max(1, this.soldierCount);
    const cols = Math.min(count, 5);
    const rows = Math.ceil(count / cols);
    const spacing = 28;
    const offsetX = -(cols - 1) * spacing / 2;
    const offsetY = -(rows - 1) * spacing / 2;

    let placed = 0;
    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        const x = offsetX + c * spacing;
        const y = offsetY + r * spacing;
        const body = this.add.circle(x, y + 4, 10, 0x44aaff);
        const head = this.add.circle(x, y - 8, 6, 0xffcc88);
        this.playerContainer.add([body, head]);
        placed++;
      }
    }

    // 武器レベル表示
    const wpnTxt = this.add.text(0, 28, '⚔'.repeat(Math.min(this.weaponLevel, 5)), {
      fontSize: '14px'
    }).setOrigin(0.5);
    this.playerContainer.add(wpnTxt);
  }

  createHUD() {
    // 上部HUD背景
    this.add.rectangle(W/2, 40, W, 70, 0x000000, 0.5);

    this.hudSoldier = this.add.text(W/2 - 60, 28, '', {
      fontSize: '18px', color: '#44ffaa', fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    this.hudWeapon = this.add.text(W/2 + 60, 28, '', {
      fontSize: '18px', color: '#ffdd44', fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    this.progressBar = this.add.rectangle(W/2, 58, W - 40, 8, 0x333355);
    this.progressFill = this.add.rectangle(20 + 1, 58, 0, 8, 0x22cc66).setOrigin(0, 0.5);

    this.updateHUD();
  }

  updateHUD() {
    this.hudSoldier.setText('👥 ' + this.soldierCount + '人');
    this.hudWeapon.setText('⚔️ Lv.' + this.weaponLevel);

    const progress = this.gatesPassed / NUM_GATES;
    const maxW = W - 42;
    this.progressFill.width = progress * maxW;
  }

  setupInput() {
    this.input.on('pointerdown', (p) => {
      this.dragging = true;
      this.dragStartX = p.x;
      this.lastPointerX = p.x;
    });
    this.input.on('pointermove', (p) => {
      if (!this.dragging) return;
      const dx = p.x - this.lastPointerX;
      this.targetX = clamp(this.targetX + dx * 1.2, this.roadLeft + 45, this.roadRight - 45);
      this.lastPointerX = p.x;
    });
    this.input.on('pointerup', () => { this.dragging = false; });
  }

  update(time, delta) {
    if (this.phase !== 'run') return;

    // スクロール
    this.scrollY += SCROLL_SPEED;

    // パーティクル背景スクロール
    for (const p of this.particles) {
      p.y += SCROLL_SPEED * 0.4;
      if (p.y > H + 10) { p.y = -10; p.x = rand(0, W); }
    }

    this.drawRoadLines();

    // プレイヤー追従
    this.playerX += (this.targetX - this.playerX) * 0.15;
    this.playerContainer.x = this.playerX;

    // ゲートスクロール
    for (const go of this.gateObjs) {
      const screenY = go.worldY + this.scrollY;
      go.left.rect.y  = screenY; go.left.label.y  = screenY;
      go.right.rect.y = screenY; go.right.label.y = screenY;

      // 判定: プレイヤーYに近づいたら
      if (!go.passed && Math.abs(screenY - PLAYER_Y) < 28) {
        go.passed = true;
        this.gatesPassed++;

        const px = this.playerContainer.x;
        const dL = Math.abs(px - go.left.x);
        const dR = Math.abs(px - go.right.x);
        const chosen = dL < dR ? go.left.data : go.right.data;
        this.applyGate(chosen);

        // 通過エフェクト
        const hitGate = dL < dR ? go.left : go.right;
        this.flashGate(hitGate);
        this.updateHUD();
      }

      // 画面外に出たゲートを非表示
      if (screenY > H + 60 || screenY < -60) {
        go.left.rect.setVisible(false);  go.left.label.setVisible(false);
        go.right.rect.setVisible(false); go.right.label.setVisible(false);
      } else {
        go.left.rect.setVisible(true);  go.left.label.setVisible(true);
        go.right.rect.setVisible(true); go.right.label.setVisible(true);
      }
    }

    // 全ゲート通過 → バトルへ
    if (this.gatesPassed >= NUM_GATES && !this.battleStarted) {
      this.battleStarted = true;
      this.time.delayedCall(500, () => this.goToBattle());
    }
  }

  applyGate(data) {
    if (data.type === 'add') {
      this.soldierCount = Math.max(1, this.soldierCount + data.value);
    } else if (data.type === 'mul') {
      this.soldierCount = Math.min(50, this.soldierCount * data.value);
    } else if (data.type === 'wpn') {
      this.weaponLevel = Math.min(10, this.weaponLevel + data.value);
    }
    this.updateSoldierDisplay();
  }

  flashGate(gate) {
    this.tweens.add({
      targets: [gate.rect],
      alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 300, ease: 'Power2',
      onComplete: () => { gate.rect.alpha = 0.9; gate.rect.scaleX = 1; gate.rect.scaleY = 1; }
    });
    // ポップアップテキスト
    const popup = this.add.text(gate.rect.x, gate.rect.y, gateLabel(gate.data), {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffffff',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);
    this.tweens.add({
      targets: popup, y: gate.rect.y - 60, alpha: 0, duration: 700,
      onComplete: () => popup.destroy()
    });
  }

  goToBattle() {
    this.phase = 'done';
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(420, () => {
      this.scene.start('Battle', { soldiers: this.soldierCount, weaponLevel: this.weaponLevel });
    });
  }
}

// ===== シーン: バトル =====
class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.soldiers = data.soldiers;
    this.weaponLevel = data.weaponLevel;
  }

  create() {
    this.cameras.main.fadeIn(400);
    this.add.rectangle(W/2, H/2, W, H, 0x1a0a0a);

    // 道
    this.add.rectangle(W/2, H/2, 220, H, 0x2d1a1a);
    this.add.rectangle(W/2 - 110, H/2, 4, H, 0x553333);
    this.add.rectangle(W/2 + 110, H/2, 4, H, 0x553333);

    this.add.text(W/2, 44, '⚔️ バトル！', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ff4444',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    // ゾンビ数の計算
    const zombieCount = Math.max(3, Math.floor(this.soldiers * 0.6 + rand(2, 8)));
    this.createZombies(zombieCount);
    this.createSoldiers();
    this.startBattle();
  }

  createZombies(count) {
    this.zombies = [];
    const cols = Math.min(count, 6);
    const rows = Math.ceil(count / cols);
    const spacing = 36;
    const startX = W/2 - (cols - 1) * spacing / 2;
    const startY = H * 0.2;

    let placed = 0;
    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        const x = startX + c * spacing;
        const y = startY + r * spacing;
        const body = this.add.circle(x, y + 4, 11, 0x44aa44);
        const head = this.add.circle(x, y - 9, 7, 0x88cc66);
        // 目
        const eye1 = this.add.circle(x - 2, y - 10, 2, 0xff0000);
        const eye2 = this.add.circle(x + 2, y - 10, 2, 0xff0000);
        this.zombies.push({ body, head, eye1, eye2, x, y, alive: true });
        placed++;
      }
    }
    this.zombieCount = count;

    this.zombieLabel = this.add.text(W/2, H*0.12, '🧟 × ' + count, {
      fontSize: '24px', color: '#88ff88', fontFamily: 'Arial Black',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
  }

  createSoldiers() {
    this.soldierSprites = [];
    const count = this.soldiers;
    const cols = Math.min(count, 6);
    const rows = Math.ceil(count / cols);
    const spacing = 30;
    const startX = W/2 - (cols - 1) * spacing / 2;
    const startY = H * 0.78;

    let placed = 0;
    for (let r = 0; r < rows && placed < count; r++) {
      for (let c = 0; c < cols && placed < count; c++) {
        const x = startX + c * spacing;
        const y = startY - r * spacing;
        const body = this.add.circle(x, y + 4, 10, 0x44aaff);
        const head = this.add.circle(x, y - 8, 6, 0xffcc88);
        this.soldierSprites.push({ body, head, x, y, alive: true });
        placed++;
      }
    }

    this.soldierLabel = this.add.text(W/2, H*0.88, '👥 × ' + count, {
      fontSize: '24px', color: '#44aaff', fontFamily: 'Arial Black',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
  }

  startBattle() {
    let soldierHP = this.soldiers * (1 + this.weaponLevel * 0.5);
    let zombieHP  = this.zombieCount * 3;

    const tick = () => {
      if (soldierHP <= 0 || zombieHP <= 0) {
        this.endBattle(soldierHP > 0);
        return;
      }

      // ダメージ交換
      const playerDmg = (1 + this.weaponLevel * 0.8) * (0.8 + Math.random() * 0.4);
      const zombieDmg  = 2 * (0.8 + Math.random() * 0.4);
      zombieHP  -= playerDmg;
      soldierHP -= zombieDmg;

      // ゾンビを1体消す演出
      const aliveZ = this.zombies.filter(z => z.alive);
      if (aliveZ.length > 0 && zombieHP / (this.zombieCount * 3) < 1 - aliveZ.length / this.zombies.length) {
        const z = aliveZ[Math.floor(Math.random() * aliveZ.length)];
        z.alive = false;
        this.tweens.add({ targets: [z.body, z.head, z.eye1, z.eye2], alpha: 0, y: '-=20', duration: 300 });
        this.zombieLabel.setText('🧟 × ' + this.zombies.filter(z => z.alive).length);
      }

      // 兵士を1体消す演出
      const aliveS = this.soldierSprites.filter(s => s.alive);
      const sFrac = soldierHP / (this.soldiers * (1 + this.weaponLevel * 0.5));
      if (aliveS.length > 0 && sFrac < 1 - aliveS.length / this.soldierSprites.length) {
        const s = aliveS[Math.floor(Math.random() * aliveS.length)];
        s.alive = false;
        this.tweens.add({ targets: [s.body, s.head], alpha: 0, y: '+=20', duration: 300 });
        const remaining = this.soldierSprites.filter(s => s.alive).length;
        this.soldierLabel.setText('👥 × ' + remaining);
      }

      this.time.delayedCall(180, tick);
    };

    this.time.delayedCall(600, tick);
  }

  endBattle(won) {
    this.time.delayedCall(600, () => {
      const survivorCount = this.soldierSprites.filter(s => s.alive).length;
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(420, () => {
        this.scene.start('Result', { won, survivors: survivorCount });
      });
    });
  }
}

// ===== シーン: リザルト =====
class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) {
    this.won = data.won;
    this.survivors = data.survivors;
  }

  create() {
    this.cameras.main.fadeIn(400);
    this.add.rectangle(W/2, H/2, W, H, this.won ? 0x0a1a0a : 0x1a0a0a);

    // 星の演出（勝利時）
    if (this.won) {
      for (let i = 0; i < 30; i++) {
        const x = rand(0, W), y = rand(0, H);
        const star = this.add.text(x, y, '⭐', { fontSize: rand(12, 28) + 'px' }).setAlpha(0);
        this.tweens.add({ targets: star, alpha: 1, y: '-=30', duration: 800, delay: rand(0, 1000), yoyo: true, repeat: -1 });
      }
    }

    const emoji = this.won ? '🎉' : '💀';
    const title = this.won ? 'CLEAR!' : 'GAME OVER';
    const titleColor = this.won ? '#ffdd44' : '#ff4444';

    this.add.text(W/2, H*0.28, emoji, { fontSize: '80px' }).setOrigin(0.5);
    this.add.text(W/2, H*0.44, title, {
      fontSize: '56px', fontFamily: 'Arial Black',
      color: titleColor, stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);

    if (this.won) {
      this.add.text(W/2, H*0.56, '生存者: ' + this.survivors + '人', {
        fontSize: '28px', color: '#aaffaa', fontFamily: 'Arial Black'
      }).setOrigin(0.5);
    } else {
      this.add.text(W/2, H*0.56, 'もう一度挑戦しよう！', {
        fontSize: '22px', color: '#ffaaaa', align: 'center'
      }).setOrigin(0.5);
    }

    const btn = this.add.rectangle(W/2, H*0.72, 260, 68, this.won ? 0x22aa55 : 0xe63946).setInteractive();
    this.add.text(W/2, H*0.72, 'もう一度', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffffff'
    }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.start('Title'));
    });

    this.tweens.add({ targets: btn, scaleX: 1.04, scaleY: 1.04, duration: 700, yoyo: true, repeat: -1 });
  }
}

// ===== Phaser設定 =====
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, GameScene, BattleScene, ResultScene],
};

new Phaser.Game(config);
