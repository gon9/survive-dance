// ===== CONSTANTS =====
const W = 390, H = 844;
const ROAD_BOT_W = 340;
const ROAD_TOP_W = 80;
const ROAD_CX    = W / 2;
const VANISH_Y   = H * 0.18;
const PLAYER_Y   = H * 0.82;
const SCROLL_SPEED = 2.5;
const PANEL_SPEED  = 2.4;

// Colour palette — shared across all scenes
const C = {
  // Title screen (dark)
  BG:     0x070A18,
  DIM:    0x10162A,
  // Game world (bright/concrete)
  SKY1:   0x7BB8E8,
  SKY2:   0xC0DFF8,
  ROAD_C: 0xBFBEBA,
  // Wall panels
  PL:     0x1255CC,   // left  (blue)
  PR:     0xFFB800,   // right (gold)
  PW:     0x9A4EFF,   // weapon (purple)
  // UI / FX
  TEAL:   0x38FFAA,
  PINK:   0xFF2E5C,
  GOLD:   0xFFAD1A,
  PURPLE: 0x9A4EFF,
  CYAN:   0x3DD8FF,
  GRAY:   0x3A4560,
  WHITE:  0xFFFFFF,
};
const FH = 'Orbitron, "Arial Black", sans-serif';
const FB = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif';

// ===== GAME DATA =====
const ENEMY_TYPES = {
  normal: { hp:1,   speed:0.90, scale:0.28, tint:0xFFFFFF },
  runner: { hp:1,   speed:2.4,  scale:0.22, tint:0xFFBB77 },
  tank:   { hp:6,   speed:0.42, scale:0.44, tint:0xFF8866 },
  boss:   { hp:300, speed:0.25, scale:1.20, tint:0xFF2222 },
};

// Zone: enemies to KILL to advance, spawn config
const ZONES = [
  { killTarget: 80,  interval:1300, cols:[6,9],   rows:[3,4], types:['normal']                },
  { killTarget:200,  interval:1100, cols:[9,13],  rows:[3,5], types:['normal','runner']        },
  { killTarget:400,  interval: 900, cols:[12,16], rows:[4,6], types:['normal','runner','tank'] },
];
const BOSS_ZONE = 3;
const LIVE_CAP  = 150;  // max live enemies at once

// Wall panel types
const PANEL_CFG = {
  add1:  { type:'add', value:1,   label:'+1',  sub:'兵士',   col:C.PL },
  add5:  { type:'add', value:5,   label:'+5',  sub:'兵士',   col:C.PL },
  add10: { type:'add', value:10,  label:'+10', sub:'兵士',   col:C.PL },
  add30: { type:'add', value:30,  label:'+30', sub:'兵士',   col:C.PL },
  add99: { type:'add', value:99,  label:'+99', sub:'大増援', col:C.PR },
  mul2:  { type:'mul', value:2,   label:'×2',  sub:'倍増',   col:C.PR },
  mul3:  { type:'mul', value:3,   label:'×3',  sub:'3倍',    col:C.PR },
  dmg:   { type:'wpn', stat:'dmg',    label:'攻撃', sub:'+50%', col:C.PW },
  rate:  { type:'wpn', stat:'rate',   label:'連射', sub:'+30%', col:C.PW },
  pierce:{ type:'wpn', stat:'pierce', label:'貫通', sub:'ON',   col:0x3DD8FF },
  spread:{ type:'wpn', stat:'spread', label:'散弾', sub:'ON',   col:0xFFAD1A },
};

// Per-zone: left (frequent small) / right (rare big) / gate at transition
const ZONE_PANELS = [
  { left:['add1','add5'],   lInt:1000, right:['add10','mul2'],  rInt:2200, gate:['dmg','rate']           },
  { left:['add5','add10'],  lInt: 850, right:['add30','mul2'],  rInt:1800, gate:['rate','pierce']        },
  { left:['add10','add30'], lInt: 700, right:['add99','mul3'],  rInt:1400, gate:['pierce','spread','mul3']},
];

const SKILL_CD = 8000;
const SKILL_R  = 110;

// ===== UTILS =====
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
function rand(lo,hi)   { return Math.floor(Math.random()*(hi-lo+1))+lo; }
function choose(arr)   { return arr[Math.floor(Math.random()*arr.length)]; }
function toHex(n)      { return '#'+n.toString(16).padStart(6,'0'); }

// ===== PERSPECTIVE =====
function roadHalf(y){
  const t=Math.max(0,Math.min(1,(y-VANISH_Y)/(H-VANISH_Y)));
  return (ROAD_TOP_W+(ROAD_BOT_W-ROAD_TOP_W)*t)/2;
}
function roadLeft(y)  { return ROAD_CX-roadHalf(y); }
function roadRight(y) { return ROAD_CX+roadHalf(y); }
function roadW(y)     { return roadHalf(y)*2; }
function pScale(y)    { const t=(y-VANISH_Y)/(PLAYER_Y-VANISH_Y); return Math.max(0.10,Math.min(1.0,0.10+t*0.90)); }

// ===== SFX =====
const SFX={
  _ctx:null,
  init(){ if(this._ctx)return; try{ this._ctx=new(window.AudioContext||window.webkitAudioContext)(); }catch(e){} },
  _t(freq,type,vol,dur,fe){
    try{
      const ctx=this._ctx; if(!ctx)return;
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type=type;
      o.frequency.setValueAtTime(freq,ctx.currentTime);
      if(fe)o.frequency.exponentialRampToValueAtTime(fe,ctx.currentTime+dur);
      g.gain.setValueAtTime(vol,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
      o.start(ctx.currentTime); o.stop(ctx.currentTime+dur+0.01);
    }catch(e){}
  },
  tap()     { this._t(520,'sine',0.15,0.08,260); },
  panelAdd(){ this._t(440,'sine',0.22,0.20,880); },
  panelMul(){ this._t(330,'triangle',0.28,0.25,990); },
  panelWpn(){ this._t(280,'sawtooth',0.18,0.28,560); },
  kill()    { this._t(200,'sawtooth',0.18,0.08,60); },
  shoot()   { this._t(800,'square',0.04,0.04,400); },
  skill()   { this._t(150,'sawtooth',0.28,0.38,800); },
  win()     { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this._t(f,'sine',0.28,0.4,f*1.01),i*120)); },
  lose()    { [380,300,220,150].forEach((f,i)=>setTimeout(()=>this._t(f,'sawtooth',0.18,0.45,f*0.88),i*160)); },
};

// ===== SVG SPRITES =====
function svgURI(s){ return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(s))); }

function soldierSVG(){
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 50" width="72" height="100">
  <ellipse cx="18" cy="48" rx="10" ry="2.5" fill="rgba(0,0,0,0.30)"/>
  <rect x="10" y="34" width="6" height="14" rx="2" fill="#0A3A8A"/>
  <rect x="19" y="34" width="6" height="14" rx="2" fill="#0A3A8A"/>
  <rect x="10" y="44" width="6" height="4" rx="1" fill="#06244F"/>
  <rect x="19" y="44" width="6" height="4" rx="1" fill="#06244F"/>
  <rect x="7" y="18" width="22" height="18" rx="4" fill="#1A5CC8"/>
  <rect x="9" y="19" width="9" height="7" rx="2" fill="#3A7EE8" opacity="0.45"/>
  <line x1="7" y1="28" x2="29" y2="28" stroke="#082A60" stroke-width="1.5" opacity="0.5"/>
  <rect x="7" y="34" width="22" height="3" rx="1" fill="#05204A"/>
  <rect x="1" y="19" width="7" height="13" rx="3" fill="#1A5CC8"/>
  <rect x="28" y="19" width="7" height="13" rx="3" fill="#1A5CC8"/>
  <rect x="33" y="17" width="3" height="12" rx="1" fill="#111820"/>
  <rect x="33" y="16" width="4" height="3" rx="1" fill="#1A2030"/>
  <rect x="15" y="13" width="7" height="7" rx="2" fill="#C08070"/>
  <ellipse cx="18" cy="8" rx="11" ry="10" fill="#1A5CC8"/>
  <ellipse cx="15" cy="5" rx="5" ry="4" fill="#3A7EE8" opacity="0.45"/>
  <rect x="9" y="9" width="18" height="7" rx="3" fill="#020810"/>
  <rect x="10" y="10" width="16" height="5" rx="2" fill="#3DD8FF" opacity="0.82"/>
  <rect x="11" y="10" width="5" height="2" rx="1" fill="#AAEEFF" opacity="0.6"/>
</svg>`);
}

function zombieSVG(){
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 50" width="72" height="100">
  <ellipse cx="18" cy="48" rx="11" ry="3" fill="rgba(0,0,0,0.28)"/>
  <path d="M13 36 Q11 46 10 49" stroke="#4B3D1E" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M22 37 Q24 47 25 49" stroke="#4B3D1E" stroke-width="6" stroke-linecap="round" fill="none"/>
  <rect x="9" y="19" width="18" height="19" rx="4" fill="#6B5530"/>
  <rect x="9" y="30" width="18" height="8" rx="0 0 4 4" fill="rgba(0,0,0,0.22)"/>
  <path d="M9 22 Q2 20 0 24" stroke="#6B5530" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M27 22 Q34 20 36 24" stroke="#6B5530" stroke-width="7" stroke-linecap="round" fill="none"/>
  <rect x="15" y="14" width="6" height="7" rx="2" fill="#7A6440"/>
  <circle cx="18" cy="10" r="9.5" fill="#7A6440"/>
  <ellipse cx="15" cy="7" rx="4" ry="3.5" fill="#8A7450" opacity="0.5"/>
  <circle cx="13.5" cy="9" r="2.8" fill="#AA0000"/>
  <circle cx="22.5" cy="9" r="2.8" fill="#AA0000"/>
  <circle cx="13.5" cy="9" r="1.5" fill="#FF2200"/>
  <circle cx="22.5" cy="9" r="1.5" fill="#FF2200"/>
  <path d="M13 14.5 Q18 16.5 23 14.5" stroke="#2A1000" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <rect x="15" y="13.5" width="2" height="3" rx="0.5" fill="#CCBB99" opacity="0.75"/>
  <rect x="19" y="13" width="2" height="4" rx="0.5" fill="#CCBB99" opacity="0.75"/>
</svg>`);
}

// ===== TEXTURES =====
function buildTextures(scene){
  let g;

  // Far buildings — bright daytime city
  g=scene.make.graphics({add:false});
  g.fillStyle(0xB0C8E0); g.fillRect(0,0,340,200);
  const fb=[[0,60,44,140],[48,28,54,172],[106,78,40,122],[150,8,58,192],[212,48,44,152],[260,68,38,132],[302,22,34,178]];
  for(const [x,y,w,h] of fb){
    g.fillStyle(0x9AA8B8); g.fillRect(x,y,w,h);
    g.fillStyle(0x8898A8,0.6); g.fillRect(x,y,w,5);
    for(let wy=y+14;wy<y+h-10;wy+=18){
      for(let wx=x+6;wx<x+w-6;wx+=13){
        if(Math.random()>0.35){
          const wc=Math.random()>0.5?0xFFEE99:0xCCDDFF;
          g.fillStyle(wc,0.55+Math.random()*0.25); g.fillRect(wx,wy,8,10);
        }
      }
    }
  }
  g.generateTexture('buildings-far',340,200); g.destroy();

  // Near buildings — brighter
  g=scene.make.graphics({add:false});
  g.fillStyle(0xC8D8E8); g.fillRect(0,0,360,200);
  const nb=[[0,38,36,162],[40,72,32,128],[76,22,48,178],[128,62,38,138],[170,32,44,168],[218,52,38,148],[260,82,32,118],[296,12,38,188]];
  for(const [x,y,w,h] of nb){
    g.fillStyle(0xA8B8C8); g.fillRect(x,y,w,h);
    g.fillStyle(0x889098,0.5); g.fillRect(x,y,w,4);
  }
  g.generateTexture('buildings-near',360,200); g.destroy();

  // Road tile (concrete gray)
  g=scene.make.graphics({add:false});
  g.fillStyle(0xC0BFBC); g.fillRect(0,0,340,80);
  g.fillStyle(0xFFFFFF,0.55); g.fillRect(168,0,4,34);
  g.fillStyle(0xA8A8A4,0.30); g.fillRect(0,0,340,2);
  g.generateTexture('road-tile',340,80); g.destroy();

  // Gate texture (weapon upgrade — center gate still used at zone transition)
  for(const t of [{key:'gate-wpn',b:C.PW,gw:0xCC88FF}]){
    g=scene.make.graphics({add:false});
    g.fillStyle(t.gw,0.08); g.fillRoundedRect(0,0,88,130,14);
    g.fillStyle(0x000000,0.68); g.fillRoundedRect(6,6,76,118,9);
    g.fillStyle(t.b,0.72); g.fillRoundedRect(8,8,72,28,6);
    g.lineStyle(2.5,t.b,0.88); g.strokeRoundedRect(6,6,76,118,9);
    g.lineStyle(1,t.b,0.28); g.lineBetween(14,108,74,108);
    g.generateTexture(t.key,88,130); g.destroy();
  }
}

// ===== BOOT SCENE =====
class BootScene extends Phaser.Scene{
  constructor(){ super('Boot'); }
  create(){
    buildTextures(this);
    let pending=2;
    const advance=()=>{ if(--pending===0){ const el=document.getElementById('loading'); if(el)el.style.display='none'; this.scene.start('Title'); } };
    const loadSVG=(key,uri)=>{
      const img=new Image();
      const t=this.time.delayedCall(4000,advance);
      img.onload=()=>{ t.remove(false); if(!this.textures.exists(key))this.textures.addImage(key,img); advance(); };
      img.onerror=()=>{ t.remove(false); advance(); };
      img.src=uri;
    };
    loadSVG('soldier',soldierSVG());
    loadSVG('zombie', zombieSVG());
  }
}

// ===== TITLE SCENE =====
class TitleScene extends Phaser.Scene{
  constructor(){ super('Title'); }
  create(){
    this.add.rectangle(W/2,H/2,W,H,C.BG);
    for(let i=0;i<70;i++){
      const a=rand(1,5)/10;
      const s=this.add.rectangle(rand(0,W),rand(0,H*0.72),rand(1,2),rand(1,2),0xffffff,a);
      this.tweens.add({targets:s,alpha:a*0.12,duration:rand(900,3000),yoyo:true,repeat:-1,delay:rand(0,2600)});
    }
    const bFar =this.add.tileSprite(W/2,H*0.28,W,200,'buildings-far').setAlpha(0.42).setTint(0x8899BB);
    const bNear=this.add.tileSprite(W/2,H*0.40,W,200,'buildings-near').setAlpha(0.50).setTint(0xAABBCC);
    this.tweens.add({targets:bFar, tilePositionX:{from:0,to:340},duration:28000,repeat:-1});
    this.tweens.add({targets:bNear,tilePositionX:{from:0,to:360},duration:18000,repeat:-1});

    const g=this.add.graphics();
    g.fillGradientStyle(C.BG,C.BG,0x0D1830,0x0D1830,0.92,0.92,1,1);
    g.fillRect(0,H*0.34,W,H*0.66);

    this.add.text(W/2,H*0.50,'SURVIVOR',{fontSize:'42px',fontFamily:FH,color:'#FFFFFF',stroke:toHex(C.CYAN),strokeThickness:3}).setOrigin(0.5);
    this.add.text(W/2,H*0.60,'RAMPART', {fontSize:'42px',fontFamily:FH,color:toHex(C.GOLD),stroke:'#000',strokeThickness:3}).setOrigin(0.5);
    this.add.text(W/2,H*0.70,'SWIPE TO SURVIVE',{fontSize:'11px',fontFamily:FH,color:toHex(C.GRAY),letterSpacing:4}).setOrigin(0.5);

    const btnY=H*0.80;
    const btnBg=this.add.graphics();
    const btnHit=this.add.rectangle(W/2,btnY,240,60,0,0).setInteractive();
    const drawBtn=(h)=>{
      btnBg.clear();
      btnBg.fillStyle(h?C.GOLD:0,h?0.22:0.12); btnBg.fillRoundedRect(W/2-120,btnY-30,240,60,10);
      btnBg.lineStyle(2,C.GOLD,h?1:0.72); btnBg.strokeRoundedRect(W/2-120,btnY-30,240,60,10);
    };
    drawBtn(false);
    this.add.text(W/2,btnY-8,'START',{fontSize:'20px',fontFamily:FH,color:'#FFFFFF',letterSpacing:5}).setOrigin(0.5);
    this.add.text(W/2,btnY+12,'タップしてはじめる',{fontSize:'12px',fontFamily:FB,color:toHex(C.GRAY)}).setOrigin(0.5);
    this.tweens.add({targets:btnHit,scaleX:1.04,scaleY:1.04,duration:900,yoyo:true,repeat:-1});
    btnHit.on('pointerover',()=>drawBtn(true));
    btnHit.on('pointerout', ()=>drawBtn(false));
    btnHit.on('pointerdown',()=>{ SFX.tap(); this.cameras.main.fadeOut(300,0,0,0); this.time.delayedCall(320,()=>this.scene.start('Game')); });
    for(let i=0;i<24;i++){
      const p=this.add.rectangle(rand(0,W),rand(0,H),1.5,1.5,C.CYAN,rand(1,4)/10);
      this.tweens.add({targets:p,y:p.y-rand(30,100),alpha:0,duration:rand(2500,6000),delay:rand(0,4000),repeat:-1,onRepeat:()=>{p.y=rand(H*0.5,H);p.x=rand(0,W);p.alpha=rand(1,4)/10;}});
    }
    this.cameras.main.fadeIn(450);
  }
}

// ===== GAME SCENE =====
class GameScene extends Phaser.Scene{
  constructor(){ super('Game'); }

  create(){
    SFX.init();
    // Player state
    this.soldierCount=10; this.playerX=W/2; this.targetX=W/2;
    this.lastPX=W/2; this.dragging=false;
    // Weapon state
    this.bulletDmg=1; this.fireDelay=360;
    this.pierce=false; this.spread=false;
    // Game state
    this.phase='run'; this.zoneIdx=0; this.scrollY=0; this.eid=0;
    // Kill tracking
    this.zoneKilled=0; this.zoneSpawned=0;
    // Pools
    this.bullets=[]; this.enemies=[]; this.bossBullets=[];
    this.wallPanels=[];
    // Boss
    this.boss=null; this.bossBTimer=0;
    // Skill
    this.skillReady=true;
    // Timers
    this.shootTimer=null; this.spawnTimer=null;
    this.lPanelTimer=null; this.rPanelTimer=null;
    // Visuals
    this.playerGroup=null; this.soldierImgs=[];

    this._createBg();
    this._createRoad();
    this._createPlayer();
    this._createHUD();
    this._setupInput();
    this._startShootTimer();
    this._startZone(0);
    this.cameras.main.fadeIn(400);
  }

  // ===== BACKGROUND =====
  _createBg(){
    // Sky gradient
    const sky=this.add.graphics().setDepth(0);
    sky.fillGradientStyle(0x7BB8E8,0x7BB8E8,0xC8E4F8,0xC8E4F8,1,1,1,1);
    sky.fillRect(0,0,W,H*0.55);
    // Ground below road (dark asphalt - sides of bridge)
    sky.fillStyle(0x444444,1); sky.fillRect(0,H*0.50,W,H*0.50);

    // Clouds (simple)
    for(let i=0;i<5;i++){
      const cx=rand(30,360), cy=rand(20,90), cw=rand(60,130), ch=rand(18,34);
      sky.fillStyle(0xEEF4FF,0.70); sky.fillEllipse(cx,cy,cw,ch);
      sky.fillStyle(0xFFFFFF,0.40); sky.fillEllipse(cx-cw*0.2,cy-ch*0.15,cw*0.7,ch*0.7);
    }

    // Horizon haze
    const haze=this.add.graphics().setDepth(0);
    haze.fillGradientStyle(0xC8E4F8,0xC8E4F8,0xBFBEBA,0xBFBEBA,0.0,0.0,1.0,1.0);
    haze.fillRect(0,H*0.26,W,H*0.10);

    this.bgFar =this.add.tileSprite(W/2,H*0.12,W,200,'buildings-far').setAlpha(0.65);
    this.bgNear=this.add.tileSprite(W/2,H*0.21,W,200,'buildings-near').setAlpha(0.55);
  }

  // ===== ROAD / BRIDGE =====
  _createRoad(){
    const g=this.add.graphics().setDepth(1);

    // Concrete road surface
    g.fillStyle(0xBFBEBA,1);
    g.beginPath();
    g.moveTo(roadLeft(VANISH_Y),VANISH_Y); g.lineTo(roadRight(VANISH_Y),VANISH_Y);
    g.lineTo(roadRight(H),H);             g.lineTo(roadLeft(H),H);
    g.closePath(); g.fillPath();

    // Slightly darker center strip
    g.fillStyle(0xAEADA9,0.55);
    g.beginPath();
    g.moveTo(ROAD_CX-roadHalf(VANISH_Y)*0.12,VANISH_Y); g.lineTo(ROAD_CX+roadHalf(VANISH_Y)*0.12,VANISH_Y);
    g.lineTo(ROAD_CX+roadHalf(H)*0.12,H);               g.lineTo(ROAD_CX-roadHalf(H)*0.12,H);
    g.closePath(); g.fillPath();

    // Perspective grid lines
    for(let y=VANISH_Y+50;y<H;y+=55){
      const a=pScale(y)*0.18;
      g.lineStyle(Math.max(0.5,pScale(y)*1.5),0xFFFFFF,a);
      g.lineBetween(roadLeft(y),y,roadRight(y),y);
    }

    // Dashed center lane
    for(let y=VANISH_Y+65;y<H;y+=80){
      const dw=Math.max(2,pScale(y)*5), dh=Math.max(4,pScale(y)*24);
      g.fillStyle(0xFFFFFF,0.60); g.fillRect(ROAD_CX-dw/2,y,dw,dh);
    }

    // Road edges — yellow line
    const eL=this.add.graphics().setDepth(2), eR=this.add.graphics().setDepth(2);
    eL.lineStyle(3,0xFFCC00,0.90);
    eL.beginPath(); eL.moveTo(roadLeft(VANISH_Y),VANISH_Y); eL.lineTo(roadLeft(H),H); eL.strokePath();
    eR.lineStyle(3,0xFFCC00,0.90);
    eR.beginPath(); eR.moveTo(roadRight(VANISH_Y),VANISH_Y); eR.lineTo(roadRight(H),H); eR.strokePath();

    // Guardrail pillars on sides
    for(let y=VANISH_Y+40;y<H;y+=60){
      const sc=pScale(y), pw=Math.max(2,5*sc), ph=Math.max(4,18*sc);
      g.fillStyle(0xDDDDD8,1);
      g.fillRect(roadLeft(y)-pw*0.5, y-ph*0.5, pw, ph);
      g.fillRect(roadRight(y)-pw*0.5,y-ph*0.5, pw, ph);
    }

    // Vanishing point glow
    const vg=this.add.graphics().setDepth(2);
    vg.fillStyle(0xFFFFFF,0.06); vg.fillCircle(ROAD_CX,VANISH_Y,40);
  }

  // ===== PLAYER =====
  _createPlayer(){
    this.playerGlow=this.add.ellipse(this.playerX,PLAYER_Y,200,65,0x3DD8FF,0.12).setDepth(13);
    this.tweens.add({targets:this.playerGlow,alpha:0.05,scaleX:1.12,duration:800,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.playerGroup=this.add.container(this.playerX,PLAYER_Y).setDepth(15);
    this.soldierImgs=[];
    this._rebuildSoldiers();
  }

  _rebuildSoldiers(){
    this.playerGroup.removeAll(true);
    this.soldierImgs=[];
    const n=clamp(this.soldierCount,1,60);
    const cols=Math.min(n,8), rows=Math.ceil(n/cols);
    const sx=22, sy=22; let placed=0;
    for(let r=0;r<rows&&placed<n;r++){
      for(let c=0;c<cols&&placed<n;c++){
        const ox=(c-(cols-1)/2)*sx, oy=(r-(rows-1)/2)*sy;
        const img=this.make.image({x:ox,y:oy,key:'soldier',add:false}).setScale(0.38);
        this.playerGroup.add(img);
        this.soldierImgs.push({img,baseY:oy,ph:placed*0.42});
        placed++;
      }
    }
    // Count badge above squad
    const badge=this.make.text({x:0,y:-(Math.ceil(n/cols)*sy/2+18),text:n.toString(),style:{fontSize:'18px',fontFamily:FH,color:'#FFFFFF',stroke:'#000',strokeThickness:3},add:false});
    badge.setOrigin(0.5); this.playerGroup.add(badge);
  }

  // ===== HUD =====
  _createHUD(){
    // Top bar
    const hud=this.add.graphics().setDepth(20);
    hud.fillStyle(0x000000,0.75); hud.fillRect(0,0,W,68);
    hud.lineStyle(1,0xFFFFFF,0.12); hud.lineBetween(0,68,W,68);

    this.add.text(14,10,'TROOPS',{fontSize:'9px',fontFamily:FH,color:toHex(C.TEAL),letterSpacing:2}).setDepth(21);
    this.hudTroops=this.add.text(14,24,'10',{fontSize:'26px',fontFamily:FH,color:toHex(C.TEAL),stroke:'#000',strokeThickness:2}).setDepth(21);

    this.add.text(W/2,10,'ZONE',{fontSize:'9px',fontFamily:FH,color:'#AAAAAA',letterSpacing:2}).setOrigin(0.5).setDepth(21);
    this.hudZone=this.add.text(W/2,24,'Z1',{fontSize:'22px',fontFamily:FH,color:'#FFFFFF',stroke:'#000',strokeThickness:2}).setOrigin(0.5).setDepth(21);

    this.add.text(W-14,10,'WEAPON',{fontSize:'9px',fontFamily:FH,color:toHex(C.GOLD),letterSpacing:2}).setOrigin(1,0).setDepth(21);
    this.hudWpn   =this.add.text(W-14,24,'LV.1',{fontSize:'17px',fontFamily:FH,color:toHex(C.GOLD)}).setOrigin(1,0).setDepth(21);
    this.hudPierce=this.add.text(W-14,44,'',   {fontSize:'11px',fontFamily:FH,color:toHex(C.CYAN)}).setOrigin(1,0).setDepth(21);
    this.hudSpread=this.add.text(W-14,56,'',   {fontSize:'11px',fontFamily:FH,color:toHex(C.GOLD)}).setOrigin(1,0).setDepth(21);

    // Boss HP bar (hidden initially)
    this.bossHpBg  =this.add.rectangle(W/2,82,W-40,10,0x330000).setDepth(22).setVisible(false);
    this.bossHpFill=this.add.rectangle(20, 82,W-40,10,0xFF2222).setOrigin(0,0.5).setDepth(23).setVisible(false);
    this.bossHpLbl =this.add.text(W/2,70,'BOSS HP',{fontSize:'8px',fontFamily:FH,color:'#FF4444',letterSpacing:3}).setOrigin(0.5).setDepth(24).setVisible(false);

    // Enemy kill counter — large, right side
    this.killCounter=this.add.text(W-18,H*0.46,'',{
      fontSize:'72px',fontFamily:FH,color:'#FFFFFF',
      stroke:'#000000',strokeThickness:7,
    }).setOrigin(1,0.5).setDepth(20).setAlpha(0.90);

    // Skill button
    this._createSkillBtn();
  }

  _createSkillBtn(){
    const bx=W-56, by=H-68;
    const glow=this.add.graphics().setDepth(25);
    glow.fillStyle(C.GOLD,0.18); glow.fillCircle(bx,by,40);
    this.skillBtnGfx=this.add.graphics().setDepth(26);
    this.skillBtnGfx.fillStyle(C.GOLD,0.88); this.skillBtnGfx.fillCircle(bx,by,32);
    this.add.text(bx,by-7,'💥',{fontSize:'18px'}).setOrigin(0.5).setDepth(27);
    this.add.text(bx,by+11,'BOMB',{fontSize:'8px',fontFamily:FH,color:'#000'}).setOrigin(0.5).setDepth(27);
    this.skillCoolTxt=this.add.text(bx,by,'',{fontSize:'22px',fontFamily:FH,color:'#FFF',stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(28);
    this.add.rectangle(bx,by,64,64,0,0).setInteractive().setDepth(29).on('pointerdown',()=>this._activateSkill());
  }

  _updateHUD(){
    this.hudTroops.setText(this.soldierCount.toString());
    if(this.phase==='boss') this.hudZone.setText('BOSS').setColor(toHex(C.PINK));
    else this.hudZone.setText('Z'+(this.zoneIdx+1)).setColor('#FFFFFF');
    this.hudWpn.setText(this.bulletDmg>1?'ATK×'+this.bulletDmg:'LV.1');
    this.hudPierce.setText(this.pierce?'▶ PIERCE':'');
    this.hudSpread.setText(this.spread?'▶ SPREAD':'');
  }

  _updateKillCounter(){
    if(this.phase==='boss'||this.phase==='done'||this.phase==='fail'){
      this.killCounter.setVisible(false); return;
    }
    const remaining=Math.max(0,ZONES[this.zoneIdx].killTarget-this.zoneKilled);
    this.killCounter.setVisible(true).setText(remaining.toString());
  }

  // ===== INPUT =====
  _setupInput(){
    this.input.on('pointerdown',p=>{ this.dragging=true; this.lastPX=p.x; SFX.init(); });
    this.input.on('pointermove',p=>{
      if(!this.dragging)return;
      const dx=p.x-this.lastPX;
      const half=roadW(PLAYER_Y)/2-44;
      this.targetX=clamp(this.targetX+dx*1.3,ROAD_CX-half,ROAD_CX+half);
      this.lastPX=p.x;
    });
    this.input.on('pointerup',()=>{ this.dragging=false; });
  }

  // ===== ZONE SYSTEM =====
  _startZone(idx){
    this.zoneIdx=idx;
    this.zoneKilled=0;
    this.zoneSpawned=0;
    this._clearTimers();
    this._showZoneBanner(idx);
    this._startWallPanels(idx);
    this._updateHUD();
    this._updateKillCounter();

    const z=ZONES[idx];
    this.spawnTimer=this.time.addEvent({delay:z.interval,callback:()=>this._spawnWave(idx),loop:true});
  }

  _onZoneKill(){
    this.zoneKilled++;
    this._updateKillCounter();
    const z=ZONES[this.zoneIdx];
    if(this.zoneKilled>=z.killTarget && this.phase==='run'){
      this._onZoneClear();
    }
  }

  _onZoneClear(){
    this._clearTimers();
    // Short pause then spawn weapon gate
    this.time.delayedCall(900,()=>{
      const next=this.zoneIdx+1;
      if(next<BOSS_ZONE) this._spawnWeaponGate(this.zoneIdx, next);
      else               this._startBoss();
    });
  }

  _clearTimers(){
    if(this.spawnTimer)  { this.spawnTimer.remove();  this.spawnTimer=null;  }
    if(this.lPanelTimer) { this.lPanelTimer.remove(); this.lPanelTimer=null; }
    if(this.rPanelTimer) { this.rPanelTimer.remove(); this.rPanelTimer=null; }
  }

  // ===== WALL PANEL SYSTEM =====
  _startWallPanels(idx){
    const zp=ZONE_PANELS[idx];
    this.lPanelTimer=this.time.addEvent({
      delay:zp.lInt, loop:true,
      callback:()=>{ const cfg=PANEL_CFG[choose(zp.left)]; this._spawnWallPanel('left',cfg); },
    });
    this.rPanelTimer=this.time.addEvent({
      delay:zp.rInt, loop:true,
      callback:()=>{ const cfg=PANEL_CFG[choose(zp.right)]; this._spawnWallPanel('right',cfg); },
    });
  }

  _spawnWallPanel(side,cfg){
    const startY=VANISH_Y+18;
    const gfx=this.add.graphics().setDepth(9);
    const lbl=this.add.text(0,0,cfg.label,{
      fontSize:'20px',fontFamily:FH,color:'#FFFFFF',stroke:'#000',strokeThickness:3,
    }).setOrigin(0.5).setDepth(10);
    const sub=this.add.text(0,0,cfg.sub,{
      fontSize:'11px',fontFamily:FB,color:'#FFFFFF',
    }).setOrigin(0.5).setDepth(10);
    const panel={side,cfg,worldY:startY,gfx,lbl,sub,collected:false,dead:false};
    this.wallPanels.push(panel);
    this._drawWallPanel(panel);
  }

  _drawWallPanel(p){
    const sc=pScale(p.worldY);
    const rw=roadW(p.worldY);
    const pw=Math.max(20, rw*0.24);
    const ph=Math.max(16, 90*sc);
    const color=p.cfg.col;

    let px; // panel left edge
    if(p.side==='left'){
      px=roadLeft(p.worldY);
    } else {
      px=roadRight(p.worldY)-pw;
    }
    const cx=px+pw/2;

    p.gfx.clear();
    // Shadow
    p.gfx.fillStyle(0x000000,0.28);
    p.gfx.fillRoundedRect(px+pw*0.06,p.worldY-ph/2+ph*0.06,pw,ph,3*sc);
    // Main face
    p.gfx.fillStyle(color,0.95);
    p.gfx.fillRoundedRect(px,p.worldY-ph/2,pw,ph,3*sc);
    // Top highlight
    p.gfx.fillStyle(0xFFFFFF,0.22);
    p.gfx.fillRoundedRect(px,p.worldY-ph/2,pw,ph*0.32,{tl:3*sc,tr:3*sc,bl:0,br:0});
    // Border
    p.gfx.lineStyle(Math.max(1,2*sc),0x000000,0.45);
    p.gfx.strokeRoundedRect(px,p.worldY-ph/2,pw,ph,3*sc);

    // Hazard stripes at bottom (like in reference images)
    const stripeH=Math.max(3,8*sc);
    const stripeY=p.worldY+ph/2-stripeH;
    const stripes=4;
    for(let i=0;i<stripes;i++){
      const col=i%2===0?0x000000:0xFFCC00;
      const sw=pw/stripes;
      p.gfx.fillStyle(col,0.60);
      p.gfx.fillRect(px+i*sw, stripeY, sw, stripeH);
    }

    // Text
    const fade=sc<0.28?sc/0.28:1;
    p.lbl.setPosition(cx,p.worldY-5*sc).setFontSize(Math.round(Math.max(7,20*sc))+'px').setAlpha(fade);
    p.sub.setPosition(cx,p.worldY+13*sc).setFontSize(Math.round(Math.max(5,11*sc))+'px').setAlpha(fade*0.85);
  }

  _updateWallPanels(){
    const playerOnLeft=this.playerX<ROAD_CX;
    for(let i=this.wallPanels.length-1;i>=0;i--){
      const p=this.wallPanels[i];
      if(p.dead){
        p.gfx.destroy(); p.lbl.destroy(); p.sub.destroy();
        this.wallPanels.splice(i,1); continue;
      }
      p.worldY+=PANEL_SPEED;
      this._drawWallPanel(p);

      // Collection
      if(!p.collected && p.worldY>=PLAYER_Y-25 && p.worldY<=PLAYER_Y+50){
        const hit=(p.side==='left'&&playerOnLeft)||(p.side==='right'&&!playerOnLeft);
        if(hit){
          p.collected=true;
          this._applyBonus(p.cfg);
          this._panelFX(p);
        }
      }
      if(p.worldY>PLAYER_Y+90) p.dead=true;
    }
  }

  _panelFX(panel){
    const cx=panel.side==='left'?roadLeft(PLAYER_Y)+30:roadRight(PLAYER_Y)-30;
    // Screen flash
    const fl=this.add.rectangle(W/2,H/2,W,H,panel.cfg.col,0.14).setDepth(39);
    this.tweens.add({targets:fl,alpha:0,duration:150,onComplete:()=>fl.destroy()});
    // Popup number
    const pop=this.add.text(cx,PLAYER_Y-30,panel.cfg.label,{
      fontSize:'36px',fontFamily:FH,color:'#FFFFFF',stroke:'#000',strokeThickness:4,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({targets:pop,y:PLAYER_Y-85,alpha:0,duration:650,ease:'Power2',onComplete:()=>pop.destroy()});
    // Particles
    for(let i=0;i<10;i++){
      const ang=Math.random()*Math.PI*2, spd=25+Math.random()*45;
      const pt=this.add.rectangle(cx,PLAYER_Y,5,11,panel.cfg.col).setDepth(40);
      this.tweens.add({targets:pt,x:cx+Math.cos(ang)*spd,y:PLAYER_Y+Math.sin(ang)*spd-18,alpha:0,angle:rand(-180,180),duration:300+rand(0,150),onComplete:()=>pt.destroy()});
    }
  }

  // ===== WEAPON GATE (zone transition) =====
  _spawnWeaponGate(fromZone, toZone){
    const pool=ZONE_PANELS[fromZone].gate;
    const s=[...pool].sort(()=>Math.random()-0.5);
    const lCfg=PANEL_CFG[s[0]];
    const rCfg=PANEL_CFG[s[1]||s[0]];
    const y=VANISH_Y+55;
    const lx=roadLeft(y)+roadW(y)*0.25;
    const rx=roadLeft(y)+roadW(y)*0.75;
    this.gatePairs=[{
      worldY:y, passed:false, toZone,
      left: this._buildGateObj(lx,y,lCfg),
      right:this._buildGateObj(rx,y,rCfg),
      lCfg, rCfg,
    }];
  }

  _buildGateObj(x,y,cfg){
    const sc=pScale(y);
    const img=this.add.image(x,y,'gate-wpn').setScale(sc*0.82).setDepth(9);
    this.tweens.add({targets:img,alpha:0.72,duration:700,yoyo:true,repeat:-1});
    const label=this.add.text(x,y-20*sc,cfg.label,{fontSize:Math.round(22*sc)+'px',fontFamily:FH,color:'#FFFFFF',stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(10);
    const sub  =this.add.text(x,y+16*sc,cfg.sub,  {fontSize:Math.round(13*sc)+'px',fontFamily:FB,color:toHex(cfg.col)}).setOrigin(0.5).setDepth(10);
    return {img,label,sub};
  }

  _destroyGate(pair){
    for(const s of [pair.left,pair.right]){ s.img.destroy(); s.label.destroy(); s.sub.destroy(); }
  }

  _updateGates(){
    if(!this.gatePairs||!this.gatePairs.length)return;
    for(let gi=this.gatePairs.length-1;gi>=0;gi--){
      const pair=this.gatePairs[gi];
      if(pair.passed){ this._destroyGate(pair); this.gatePairs.splice(gi,1); continue; }
      pair.worldY+=2.4;
      const sc=pScale(pair.worldY);
      const lx=roadLeft(pair.worldY)+roadW(pair.worldY)*0.25;
      const rx=roadLeft(pair.worldY)+roadW(pair.worldY)*0.75;
      pair.left.img.setPosition(lx,pair.worldY).setScale(sc*0.82);
      pair.left.label.setPosition(lx,pair.worldY-20*sc).setFontSize(Math.round(22*sc));
      pair.left.sub.setPosition(lx,pair.worldY+16*sc).setFontSize(Math.round(13*sc));
      pair.right.img.setPosition(rx,pair.worldY).setScale(sc*0.82);
      pair.right.label.setPosition(rx,pair.worldY-20*sc).setFontSize(Math.round(22*sc));
      pair.right.sub.setPosition(rx,pair.worldY+16*sc).setFontSize(Math.round(13*sc));
      if(pair.worldY>=PLAYER_Y-30){
        pair.passed=true;
        const ldist=Math.abs(this.playerX-lx), rdist=Math.abs(this.playerX-rx);
        const chosen=ldist<=rdist?pair.lCfg:pair.rCfg;
        this._applyBonus(chosen);
        this._gatePassFX(ldist<=rdist?lx:rx,pair.worldY,chosen.col);
        this._startZone(pair.toZone);
      }
    }
  }

  // ===== BONUS APPLICATION =====
  _applyBonus(cfg){
    if(cfg.type==='add'){
      this.soldierCount=clamp(this.soldierCount+cfg.value,1,80); SFX.panelAdd();
    } else if(cfg.type==='mul'){
      this.soldierCount=clamp(Math.round(this.soldierCount*cfg.value),1,80); SFX.panelMul();
      this.tweens.add({targets:this.playerGroup,scaleX:1.4,scaleY:1.4,duration:120,yoyo:true,ease:'Back.easeOut'});
    } else if(cfg.type==='wpn'){
      if(cfg.stat==='dmg')   this.bulletDmg =Math.ceil(this.bulletDmg*1.50);
      if(cfg.stat==='rate')  this.fireDelay =Math.max(90,Math.floor(this.fireDelay*0.70));
      if(cfg.stat==='pierce')this.pierce=true;
      if(cfg.stat==='spread')this.spread=true;
      SFX.panelWpn();
      if(cfg.stat==='rate'&&this.shootTimer){ this.shootTimer.remove(false); this._startShootTimer(); }
    }
    this._rebuildSoldiers();
    this._updateHUD();
  }

  // ===== BOSS =====
  _startBoss(){
    this.phase='boss';
    this._clearTimers();
    this.killCounter.setVisible(false);
    const bossHp=ENEMY_TYPES.boss.hp;
    const y0=VANISH_Y+60;
    const sc0=pScale(y0)*ENEMY_TYPES.boss.scale*0.5;
    const img=this.add.image(W/2,y0,'zombie').setScale(sc0).setTint(ENEMY_TYPES.boss.tint).setDepth(10);
    this.tweens.add({targets:img,x:{from:W/2-60,to:W/2+60},duration:2800,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.boss={img,hp:bossHp,maxHp:bossHp,y:y0,dead:false};
    this.bossBTimer=0;
    this.bossHpBg.setVisible(true); this.bossHpFill.setVisible(true); this.bossHpLbl.setVisible(true);
    this._updateBossHpBar();
    this._showBossBanner();
    // Guards
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2;
      this._spawnEnemy('normal',clamp(W/2+Math.cos(a)*55,roadLeft(y0+80)+10,roadRight(y0+80)-10),y0+70+Math.sin(a)*25);
    }
    this._updateHUD();
  }

  _updateBossHpBar(){
    if(!this.boss)return;
    const ratio=Math.max(0,this.boss.hp/this.boss.maxHp);
    this.bossHpFill.width=(W-40)*ratio;
  }

  _updateBoss(delta){
    if(!this.boss||this.boss.dead)return;
    const b=this.boss;
    if(b.y<H*0.38){ b.y+=ENEMY_TYPES.boss.speed; b.img.y=b.y; b.img.setScale(pScale(b.y)*ENEMY_TYPES.boss.scale*0.5); }
    this.bossBTimer+=delta;
    const fireInterval=b.hp<b.maxHp*0.5?1400:2200;
    if(this.bossBTimer>fireInterval){ this.bossBTimer=0; this._bossFire(); }
  }

  _bossFire(){
    if(!this.boss||this.boss.dead)return;
    const bx=this.boss.img.x, by=this.boss.y+40;
    for(const ox of [-30,0,30]){
      const tx=this.playerX+rand(-20,20), ty=PLAYER_Y;
      const ang=Math.atan2(ty-by,tx-(bx+ox));
      const bi=this.add.rectangle(bx+ox,by,8,14,0xFF5500).setDepth(14);
      this.bossBullets.push({img:bi,sx:Math.cos(ang)*4,sy:Math.sin(ang)*4});
    }
  }

  _updateBossBullets(){
    for(let i=this.bossBullets.length-1;i>=0;i--){
      const b=this.bossBullets[i];
      b.img.x+=b.sx; b.img.y+=b.sy;
      if(b.img.y>H+20||b.img.x<-20||b.img.x>W+20){ b.img.destroy(); this.bossBullets.splice(i,1); continue; }
      if(Math.abs(b.img.x-this.playerX)<44&&Math.abs(b.img.y-PLAYER_Y)<44){
        b.img.destroy(); this.bossBullets.splice(i,1); this._onSoldierHit();
      }
    }
  }

  // ===== SHOOTING =====
  _startShootTimer(){
    if(this.shootTimer)this.shootTimer.remove();
    this.shootTimer=this.time.addEvent({delay:this.fireDelay,callback:()=>this._autoShoot(),loop:true});
  }

  _autoShoot(){
    if(this.phase==='done'||this.phase==='fail')return;
    if(this.soldierImgs.length===0)return;
    SFX.shoot();
    if(this.spread){
      for(const ao of [-0.28,0,0.28]) this._spawnBullet(this.playerX+Math.sin(ao)*18,PLAYER_Y-26,ao);
    } else {
      const shots=Math.min(this.soldierImgs.length,Math.max(1,Math.floor(this.soldierCount/4)));
      for(let i=0;i<shots;i++){
        const si=this.soldierImgs[i%this.soldierImgs.length];
        this._spawnBullet(this.playerGroup.x+si.img.x+rand(-3,3),PLAYER_Y+si.img.y-22,0);
      }
    }
  }

  _spawnBullet(x,y,ao){
    const col=this.pierce?C.PURPLE:this.spread?C.GOLD:C.CYAN;
    const glow =this.add.rectangle(x,y,10,26,col,0.22).setDepth(15);
    const img  =this.add.rectangle(x,y,5,20,col).setDepth(16);
    const trail=this.add.rectangle(x,y+13,3,10,col,0.40).setDepth(15);
    this.bullets.push({img,trail,glow,sx:Math.sin(ao)*11,sy:-Math.cos(ao)*12,dmg:this.bulletDmg,pierce:this.pierce,hits:new Set(),hitBoss:false});
  }

  // ===== SKILL =====
  _activateSkill(){
    if(!this.skillReady||this.phase==='done'||this.phase==='fail')return;
    this.skillReady=false; SFX.skill();
    const tx=roadLeft(H*0.45)+Math.random()*roadW(H*0.45), ty=H*0.42+rand(0,80);
    for(let r=0;r<3;r++){
      const ring=this.add.graphics().setDepth(40);
      ring.lineStyle(4-r,0xFFCC00,0.9-r*0.2); ring.strokeCircle(tx,ty,6);
      this.tweens.add({targets:ring,scaleX:9+r*3,scaleY:9+r*3,alpha:0,duration:290+r*70,delay:r*55,onComplete:()=>ring.destroy()});
    }
    const fl=this.add.rectangle(W/2,H/2,W,H,C.GOLD,0.20).setDepth(39);
    this.tweens.add({targets:fl,alpha:0,duration:200,onComplete:()=>fl.destroy()});
    for(const e of this.enemies){
      if(!e.dead&&!e.dying&&Math.hypot(e.img.x-tx,e.img.y-ty)<SKILL_R) this._killEnemy(e);
    }
    if(this.boss&&!this.boss.dead&&Math.hypot(this.boss.img.x-tx,this.boss.y-ty)<SKILL_R+70){
      this.boss.hp=Math.max(0,this.boss.hp-35);
      this._updateBossHpBar(); this._bossDmgFX(this.boss.img.x,this.boss.y);
      if(this.boss.hp<=0){ this.boss.dead=true; this._endGame(true); return; }
    }
    this.skillBtnGfx.setAlpha(0.4);
    let elapsed=0;
    this.time.addEvent({delay:100,repeat:SKILL_CD/100-1,callback:()=>{
      elapsed+=100;
      const rem=SKILL_CD-elapsed;
      this.skillCoolTxt.setText(rem>0?Math.ceil(rem/1000).toString():'');
      if(rem<=0){ this.skillReady=true; this.skillBtnGfx.setAlpha(1); }
    }});
  }

  // ===== ENEMY SPAWNING =====
  _spawnWave(zoneIdx){
    if(this.phase!=='run')return;
    const alive=this.enemies.filter(e=>!e.dead&&!e.dying).length;
    if(alive>=LIVE_CAP)return;

    const z=ZONES[zoneIdx];
    if(this.zoneSpawned>=z.killTarget)return;

    const cols=rand(z.cols[0],z.cols[1]);
    const rows=rand(z.rows[0],z.rows[1]);
    const count=cols*rows;
    const spawnY=VANISH_Y+10;
    const rw=roadW(spawnY);

    let spawned=0;
    for(let r=0;r<rows&&(this.zoneSpawned+spawned)<z.killTarget;r++){
      for(let c=0;c<cols&&(this.zoneSpawned+spawned)<z.killTarget;c++){
        const typeId=choose(z.types);
        const x=clamp(roadLeft(spawnY)+(c/(cols-1||1))*rw+rand(-5,5),roadLeft(spawnY)+5,roadRight(spawnY)-5);
        const y=spawnY-r*20;
        this._spawnEnemy(typeId,x,y);
        spawned++;
      }
    }
    this.zoneSpawned+=spawned;
  }

  _spawnEnemy(typeId,x,y){
    const def=ENEMY_TYPES[typeId];
    const sc=pScale(y)*def.scale;
    const img=this.add.image(x,y,'zombie').setScale(sc).setTint(def.tint).setDepth(8+Math.random()*2);
    // Only add bobbing tween for visible size enemies
    if(sc>0.08){
      this.tweens.add({targets:img,angle:rand(-8,8),duration:220+rand(0,80),yoyo:true,repeat:-1});
    }
    img.setAlpha(0);
    this.tweens.add({targets:img,alpha:1,duration:180});
    const e={id:this.eid++,img,speed:def.speed,hp:def.hp,hpMax:def.hp,baseScale:def.scale,dead:false,dying:false,type:typeId,hpBar:null,hpBg:null};
    if(typeId==='tank'){
      e.hpBg =this.add.rectangle(x,y-22,32,5,0x440000).setDepth(11);
      e.hpBar=this.add.rectangle(x-16,y-22,32,5,0xFF2222).setOrigin(0,0.5).setDepth(12);
    }
    this.enemies.push(e);
  }

  // ===== UPDATE LOOP =====
  update(time,delta){
    if(this.phase==='done'||this.phase==='fail')return;
    this.scrollY+=SCROLL_SPEED;
    this.bgFar.tilePositionY -=SCROLL_SPEED*0.10;
    this.bgNear.tilePositionY-=SCROLL_SPEED*0.22;
    this.playerX+=(this.targetX-this.playerX)*0.14;
    this.playerGroup.x=this.playerX;
    this.playerGlow.x=this.playerX;
    for(const s of this.soldierImgs) s.img.y=s.baseY+Math.sin(time*0.006+s.ph)*2.2;
    this._updateBullets();
    this._updateEnemies();
    // Cleanup dead enemies
    for(let i=this.enemies.length-1;i>=0;i--){
      const e=this.enemies[i];
      if(e.dead&&!e.dying){ if(e.hpBar){e.hpBar.destroy();e.hpBg.destroy();} this.enemies.splice(i,1); }
    }
    this._updateWallPanels();
    this._updateGates();
    if(this.phase==='boss'){ this._updateBoss(delta); this._updateBossBullets(); }
  }

  _updateBullets(){
    for(let j=this.bullets.length-1;j>=0;j--){
      const b=this.bullets[j];
      b.img.x+=b.sx; b.img.y+=b.sy;
      b.trail.x=b.img.x; b.trail.y=b.img.y+13;
      b.glow.x =b.img.x; b.glow.y =b.img.y;
      if(b.img.y<-20){ b.img.destroy();b.trail.destroy();b.glow.destroy();this.bullets.splice(j,1);continue; }
      let dead=false;
      for(let i=this.enemies.length-1;i>=0;i--){
        const e=this.enemies[i];
        if(e.dead||e.dying||b.hits.has(e.id))continue;
        if(Math.abs(b.img.x-e.img.x)<18&&Math.abs(b.img.y-e.img.y)<22){
          b.hits.add(e.id);
          e.hp-=b.dmg;
          if(e.hpBar) e.hpBar.width=32*Math.max(0,e.hp/e.hpMax);
          if(e.hp<=0){
            this._killEnemy(e);
          } else {
            e.img.setTint(0xFFFFFF);
            this.time.delayedCall(80,()=>{ if(!e.dead&&!e.dying) e.img.setTint(ENEMY_TYPES[e.type].tint); });
          }
          if(!b.pierce){ b.img.destroy();b.trail.destroy();b.glow.destroy();this.bullets.splice(j,1);dead=true;break; }
        }
      }
      if(dead)continue;
      if(this.boss&&!this.boss.dead&&!b.hitBoss){
        if(Math.abs(b.img.x-this.boss.img.x)<55&&Math.abs(b.img.y-this.boss.y)<65){
          b.hitBoss=true;
          this.boss.hp-=b.dmg; this._updateBossHpBar(); this._bossDmgFX(this.boss.img.x,this.boss.y);
          if(this.boss.hp<=0){ this.boss.dead=true; this._endGame(true); return; }
          if(!b.pierce){ b.img.destroy();b.trail.destroy();b.glow.destroy();this.bullets.splice(j,1); }
        }
      }
    }
  }

  _updateEnemies(){
    for(const e of this.enemies){
      if(e.dead||e.dying)continue;
      e.img.y+=e.speed;
      const sc=pScale(e.img.y)*e.baseScale;
      e.img.setScale(sc);
      if(e.hpBar){ e.hpBg.x=e.img.x; e.hpBg.y=e.img.y-22; e.hpBar.x=e.img.x-16; e.hpBar.y=e.img.y-22; }
      if(e.img.y>PLAYER_Y+20){ this._killEnemy(e); this._onSoldierHit(); }
    }
  }

  // ===== COMBAT HELPERS =====
  _killEnemy(e){
    if(e.dead||e.dying)return;
    e.dying=true; SFX.kill();
    if(e.hpBar){ e.hpBar.destroy(); e.hpBg.destroy(); e.hpBar=null; e.hpBg=null; }
    // Death particles
    const cols=e.type==='tank'?[0xFF5533,0xFF9944,0xFFCC55]:e.type==='runner'?[0xFF9966,0xFF6644]:[0x99DDFF,0x66CCFF,0x33BBEE];
    for(let i=0;i<12;i++){
      const ang=Math.random()*Math.PI*2, spd=16+Math.random()*48;
      const p=this.add.rectangle(e.img.x+rand(-5,5),e.img.y+rand(-5,5),rand(5,10),rand(4,8),choose(cols)).setDepth(12);
      this.tweens.add({targets:p,x:p.x+Math.cos(ang)*spd,y:p.y+Math.sin(ang)*spd-7,alpha:0,angle:rand(-180,180),duration:360+rand(0,180),onComplete:()=>p.destroy()});
    }
    // Shrink & fade
    this.tweens.add({
      targets:e.img, scaleX:0, scaleY:0, alpha:0, y:e.img.y-20,
      duration:300, ease:'Back.easeIn',
      onComplete:()=>{ e.dead=true; e.dying=false; e.img.destroy(); },
    });
    // AoE chain
    const r=32+Math.min(this.bulletDmg-1,6)*4;
    let chain=0;
    for(const ne of this.enemies){
      if(ne.dead||ne.dying||ne===e)continue;
      if(Math.abs(ne.img.x-e.img.x)<r&&Math.abs(ne.img.y-e.img.y)<r){ this._killEnemy(ne); chain++; }
    }
    if(chain>=3) this._sweepFX(e.img.x,e.img.y,chain);

    // Zone kill tracking (only during 'run' phase)
    if(this.phase==='run') this._onZoneKill();
  }

  _sweepFX(x,y,count){
    for(let r=0;r<2;r++){
      const ring=this.add.graphics().setDepth(12);
      ring.lineStyle(3-r*0.5,r===0?0x38FFAA:C.GOLD,0.9-r*0.3);
      ring.strokeCircle(x,y,10+r*5);
      this.tweens.add({targets:ring,scaleX:5+r*2,scaleY:5+r*2,alpha:0,duration:300+r*80,delay:r*50,onComplete:()=>ring.destroy()});
    }
    const txt=this.add.text(x,y-8,'SWEEP! ×'+(count+1),{fontSize:'15px',fontFamily:FH,color:toHex(C.GOLD),stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(50);
    this.tweens.add({targets:txt,y:y-55,alpha:0,duration:680,ease:'Power2',onComplete:()=>txt.destroy()});
  }

  _bossDmgFX(x,y){
    const f=this.add.rectangle(x,y,55,75,0xFF4400,0.42).setDepth(18);
    this.tweens.add({targets:f,alpha:0,scaleX:2,scaleY:2,duration:130,onComplete:()=>f.destroy()});
  }

  _gatePassFX(x,y,col){
    for(let i=0;i<20;i++){
      const ang=(i/20)*Math.PI*2, spd=50+rand(0,65);
      const p=this.add.rectangle(x,y,4,10,col).setDepth(18);
      this.tweens.add({targets:p,x:x+Math.cos(ang)*spd,y:y+Math.sin(ang)*spd,alpha:0,scale:0.1,angle:rand(-180,180),duration:440+rand(0,220),onComplete:()=>p.destroy()});
    }
    const fl=this.add.rectangle(W/2,H/2,W,H,col,0.18).setDepth(30);
    this.tweens.add({targets:fl,alpha:0,duration:180,onComplete:()=>fl.destroy()});
  }

  _showZoneBanner(idx){
    if(idx===0)return;
    const txt=this.add.text(W/2,H*0.44,'ZONE '+(idx+1),{fontSize:'30px',fontFamily:FH,color:'#FFF',stroke:toHex(C.CYAN),strokeThickness:3}).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(0.7);
    this.tweens.add({targets:txt,alpha:1,scaleX:1,scaleY:1,duration:260,ease:'Back.easeOut',
      onComplete:()=>this.tweens.add({targets:txt,alpha:0,y:H*0.38,duration:500,delay:400,onComplete:()=>txt.destroy()})});
  }

  _showBossBanner(){
    const ov=this.add.rectangle(W/2,H/2,W,H,0xFF0000,0.08).setDepth(45);
    this.tweens.add({targets:ov,alpha:0,duration:600,onComplete:()=>ov.destroy()});
    const txt=this.add.text(W/2,H*0.44,'⚠  BOSS  ⚠',{fontSize:'32px',fontFamily:FH,color:toHex(C.PINK),stroke:'#000',strokeThickness:4}).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(0.5);
    this.tweens.add({targets:txt,alpha:1,scaleX:1.1,scaleY:1.1,duration:340,ease:'Back.easeOut',
      onComplete:()=>this.tweens.add({targets:txt,alpha:0,y:H*0.36,duration:600,delay:800,onComplete:()=>txt.destroy()})});
  }

  _onSoldierHit(){
    this.soldierCount=Math.max(0,this.soldierCount-1);
    this._rebuildSoldiers(); this._updateHUD();
    this.cameras.main.shake(100,0.012);
    if(this.soldierCount<=0) this._endGame(false);
  }

  _endGame(won){
    if(this.phase==='done'||this.phase==='fail')return;
    this.phase=won?'done':'fail';
    this._cleanupAll();
    this.cameras.main.fadeOut(400,0,0,0);
    this.time.delayedCall(420,()=>this.scene.start('Result',{won,survivors:this.soldierCount}));
  }

  _cleanupAll(){
    this._clearTimers();
    if(this.shootTimer)this.shootTimer.remove();
    for(const b of this.bullets){ b.img.destroy(); b.trail.destroy(); b.glow.destroy(); }
    for(const e of this.enemies){ this.tweens.killTweensOf(e.img); if(e.img&&e.img.scene)e.img.destroy(); if(e.hpBar){e.hpBar.destroy();e.hpBg.destroy();} }
    for(const b of this.bossBullets) b.img.destroy();
    for(const p of this.wallPanels){ p.gfx.destroy(); p.lbl.destroy(); p.sub.destroy(); }
    if(this.gatePairs) for(const gp of this.gatePairs) this._destroyGate(gp);
    this.bullets=[]; this.enemies=[]; this.bossBullets=[]; this.wallPanels=[]; this.gatePairs=[];
    if(this.boss&&this.boss.img) this.boss.img.destroy();
  }
}

// ===== RESULT SCENE =====
class ResultScene extends Phaser.Scene{
  constructor(){ super('Result'); }
  init(data){ this.won=data.won; this.survivors=data.survivors||0; }

  create(){
    this.cameras.main.fadeIn(500);
    this.won?SFX.win():SFX.lose();
    this.add.rectangle(W/2,H/2,W,H,this.won?0x050D08:0x0D0505);
    this.add.tileSprite(W/2,H*0.26,W,200,'buildings-far').setAlpha(0.22).setTint(this.won?0x44FF88:0xFF4444);
    this.won?this._fireworks():this._darkAmbience();
    const col=toHex(this.won?C.TEAL:C.PINK);
    const word=this.won?'COMPLETE':'OVER';
    const tag =this.won?'MISSION':'GAME';
    this.add.text(W/2,H*0.22,tag,{fontSize:'14px',fontFamily:FH,color:col,letterSpacing:10}).setOrigin(0.5);
    this.add.text(W/2,H*0.32,word,{fontSize:'68px',fontFamily:FH,color:col}).setOrigin(0.5).setAlpha(0.16).setBlendMode(Phaser.BlendModes.ADD);
    const main=this.add.text(W/2,H*0.34,word,{fontSize:'68px',fontFamily:FH,color:'#FFFFFF',stroke:col,strokeThickness:4}).setOrigin(0.5).setAlpha(0);
    this.tweens.add({targets:main,alpha:1,y:H*0.32,duration:550,ease:'Back.easeOut'});
    const ln=this.add.graphics(); ln.lineStyle(1.5,this.won?C.TEAL:C.PINK,0.45); ln.lineBetween(W/2-120,H*0.43,W/2+120,H*0.43);
    if(this.won){
      this.add.text(W/2,H*0.50,'SURVIVORS',{fontSize:'10px',fontFamily:FH,color:toHex(C.GRAY),letterSpacing:4}).setOrigin(0.5);
      this.add.text(W/2,H*0.57,this.survivors.toString(),{fontSize:'54px',fontFamily:FH,color:toHex(C.TEAL),stroke:'#000',strokeThickness:3}).setOrigin(0.5);
      const stars=this.survivors>20?3:this.survivors>8?2:1;
      for(let i=0;i<3;i++){
        const sx=W/2+(i-1)*52, sg=this.add.graphics();
        sg.fillStyle(i<stars?C.GOLD:C.GRAY,i<stars?1:0.25); this._drawStar(sg,sx,H*0.68,18,8);
        if(i<stars){
          const gl=this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
          gl.fillStyle(C.GOLD,0.22); this._drawStar(gl,sx,H*0.68,24,10);
          this.tweens.add({targets:sg,scaleX:1.12,scaleY:1.12,duration:600+i*200,yoyo:true,repeat:-1});
        }
      }
    } else {
      this.add.text(W/2,H*0.52,'全員が倒れた',{fontSize:'22px',fontFamily:FB,color:'#CC8888'}).setOrigin(0.5);
      this.add.text(W/2,H*0.60,'もう一度挑め',{fontSize:'16px',fontFamily:FB,color:'#884444'}).setOrigin(0.5);
    }
    const btnY=H*0.80, btnCol=this.won?C.TEAL:C.PINK;
    const btnBg=this.add.graphics();
    const btnHit=this.add.rectangle(W/2,btnY,250,64,0,0).setInteractive();
    const drawBtn=(h)=>{btnBg.clear();btnBg.fillStyle(h?btnCol:0,h?0.18:0.10);btnBg.fillRoundedRect(W/2-125,btnY-32,250,64,9);btnBg.lineStyle(2,btnCol,h?1:0.72);btnBg.strokeRoundedRect(W/2-125,btnY-32,250,64,9);};
    drawBtn(false);
    this.add.text(W/2,btnY-9,'RETRY',{fontSize:'20px',fontFamily:FH,color:'#FFFFFF',letterSpacing:5}).setOrigin(0.5);
    this.add.text(W/2,btnY+13,'もう一度',{fontSize:'13px',fontFamily:FB,color:toHex(C.GRAY)}).setOrigin(0.5);
    this.tweens.add({targets:btnHit,scaleX:1.03,scaleY:1.03,duration:950,yoyo:true,repeat:-1});
    btnHit.on('pointerover',()=>drawBtn(true)); btnHit.on('pointerout',()=>drawBtn(false));
    btnHit.on('pointerdown',()=>{ SFX.tap(); this.cameras.main.fadeOut(300,0,0,0); this.time.delayedCall(320,()=>this.scene.start('Title')); });
  }

  _drawStar(gfx,cx,cy,r1,r2){
    const pts=5; gfx.beginPath();
    for(let i=0;i<pts*2;i++){
      const r=i%2===0?r1:r2, a=(i*Math.PI/pts)-Math.PI/2;
      i===0?gfx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):gfx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
    }
    gfx.closePath(); gfx.fillPath();
  }

  _fireworks(){
    const cols=[C.PINK,C.GOLD,C.TEAL,C.CYAN,C.PURPLE,C.WHITE];
    const burst=()=>{
      const x=rand(60,W-60),y=rand(H*0.08,H*0.52),color=choose(cols);
      for(let i=0;i<24;i++){
        const a=(i/24)*Math.PI*2, spd=45+rand(0,80);
        const p=this.add.circle(x,y,3+rand(0,3),color).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({targets:p,x:x+Math.cos(a)*spd,y:y+Math.sin(a)*spd,alpha:0,duration:560+rand(0,480),onComplete:()=>p.destroy()});
      }
    };
    this.time.addEvent({delay:240,callback:burst,repeat:35});
  }

  _darkAmbience(){
    for(let i=0;i<14;i++){
      const p=this.add.rectangle(rand(0,W),rand(0,H*0.7),2,2,C.PINK,0.07);
      this.tweens.add({targets:p,y:p.y+50,alpha:0,duration:3500+rand(0,2000),delay:rand(0,2000),repeat:-1,onRepeat:()=>{p.y=rand(0,H*0.4);p.x=rand(0,W);p.alpha=0.07;}});
    }
  }
}

// ===== PHASER CONFIG =====
new Phaser.Game({
  type: Phaser.AUTO,
  width: W, height: H,
  backgroundColor: '#87B8E8',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, GameScene, ResultScene],
});
