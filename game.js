// ===== CONSTANTS =====
const W = 390, H = 844;
const ROAD_W     = 230;   // tile texture width
const ROAD_BOT_W = 340;   // road width at player level
const ROAD_TOP_W = 80;    // road width at vanishing point
const ROAD_CX    = W / 2;
const ROAD_X     = ROAD_CX; // compat alias
const VANISH_Y   = H * 0.18;
const PLAYER_Y   = H * 0.82;
const SCROLL_SPEED = 2.8;
const GATE_SPEED   = 2.4;  // px/frame gates approach player

// ===== DESIGN TOKENS =====
const C = {
  BG:     0x070A18, ROAD:   0x0B0F1E, DIM:    0x10162A,
  GRAY:   0x3A4560, WHITE:  0xFFFFFF, CYAN:   0x3DD8FF,
  TEAL:   0x38FFAA, PINK:   0xFF2E5C, GOLD:   0xFFAD1A, PURPLE: 0x9A4EFF,
};
const FH = 'Orbitron, "Arial Black", sans-serif';
const FB = '"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif';

// ===== GAME DATA =====
const ENEMY_TYPES = {
  normal: { hp:1,   speed:0.85, scale:0.30, tint:0xFFFFFF },
  runner: { hp:1,   speed:2.2,  scale:0.24, tint:0xFF8866 },
  tank:   { hp:6,   speed:0.40, scale:0.46, tint:0xCC4444 },
  boss:   { hp:250, speed:0.28, scale:1.30, tint:0xFF1111 },
};
const ZONES = [
  { duration:16000, interval:1600, cols:[5,8],  rows:[2,3], types:['normal']                },
  { duration:14000, interval:1300, cols:[7,10], rows:[2,4], types:['normal','runner']        },
  { duration:12000, interval:1100, cols:[9,13], rows:[3,5], types:['normal','runner','tank'] },
];
const BOSS_ZONE = 3;

// Gradual gate upgrades — small/medium/large per stat
const GATE_CFG = {
  // Soldiers
  add5:   { type:'add',  value:5,   label:'+5',   sub:'増援',  tex:'gate-add', col:0x38FFAA },
  add10:  { type:'add',  value:10,  label:'+10',  sub:'増援',  tex:'gate-add', col:0x38FFAA },
  add20:  { type:'add',  value:20,  label:'+20',  sub:'増援',  tex:'gate-add', col:0x38FFAA },
  add30:  { type:'add',  value:30,  label:'+30',  sub:'大増援', tex:'gate-add', col:0x38FFAA },
  mul15:  { type:'mul',  value:1.5, label:'×1.5', sub:'増強',  tex:'gate-mul', col:0xFFAD1A },
  mul2:   { type:'mul',  value:2,   label:'×2',   sub:'倍増',  tex:'gate-mul', col:0xFFAD1A },
  mul3:   { type:'mul',  value:3,   label:'×3',   sub:'大倍増', tex:'gate-mul', col:0xFFAD1A },
  // Weapon — damage
  dmgS:   { type:'wpn', stat:'dmgS', label:'攻撃', sub:'+20%', tex:'gate-wpn', col:0x9A4EFF },
  dmgM:   { type:'wpn', stat:'dmgM', label:'攻撃', sub:'+40%', tex:'gate-wpn', col:0x9A4EFF },
  dmgL:   { type:'wpn', stat:'dmgL', label:'攻撃', sub:'+60%', tex:'gate-wpn', col:0x9A4EFF },
  // Weapon — fire rate
  rateS:  { type:'wpn', stat:'rateS', label:'連射', sub:'+15%', tex:'gate-wpn', col:0x9A4EFF },
  rateM:  { type:'wpn', stat:'rateM', label:'連射', sub:'+30%', tex:'gate-wpn', col:0x9A4EFF },
  rateL:  { type:'wpn', stat:'rateL', label:'連射', sub:'+50%', tex:'gate-wpn', col:0x9A4EFF },
  // Special
  pierce: { type:'wpn', stat:'pierce', label:'貫通', sub:'ON',  tex:'gate-wpn', col:0x3DD8FF },
  spread: { type:'wpn', stat:'spread', label:'散弾', sub:'ON',  tex:'gate-wpn', col:0x3DD8FF },
  // Heal
  heal3:  { type:'heal', value:3,   label:'+3',   sub:'回復',  tex:'gate-add', col:0x38FFAA },
  heal8:  { type:'heal', value:8,   label:'+8',   sub:'回復',  tex:'gate-add', col:0x38FFAA },
  heal15: { type:'heal', value:15,  label:'+15',  sub:'大回復', tex:'gate-add', col:0x38FFAA },
};
// Per-gate pool: small bonuses → medium → large/special
const GATE_POOL = [
  ['add5','add10','mul15','dmgS','rateS','heal3'],              // Z1 end — early
  ['add10','add20','mul2','dmgM','rateM','heal8','pierce'],     // Z2 end — mid
  ['add30','mul2','mul3','dmgL','rateL','pierce','spread','heal15'], // Z3 end — late
];
const SKILL_CD = 8000;
const SKILL_R  = 110;

// ===== UTILS =====
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
function rand(lo,hi)   { return Math.floor(Math.random()*(hi-lo+1))+lo; }
function choose(arr)   { return arr[Math.floor(Math.random()*arr.length)]; }
function toHex(n)      { return '#'+n.toString(16).padStart(6,'0'); }

// ===== PERSPECTIVE =====
function roadHalf(y) {
  const t = Math.max(0, Math.min(1, (y - VANISH_Y) / (H - VANISH_Y)));
  return (ROAD_TOP_W + (ROAD_BOT_W - ROAD_TOP_W) * t) / 2;
}
function roadLeft(y)  { return ROAD_CX - roadHalf(y); }
function roadRight(y) { return ROAD_CX + roadHalf(y); }
function roadW(y)     { return roadHalf(y) * 2; }
function pScale(y)    { const t=(y-VANISH_Y)/(PLAYER_Y-VANISH_Y); return Math.max(0.10,Math.min(1.0,0.10+t*0.90)); }

// ===== SFX =====
const SFX = {
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
  tap()    { this._t(520,'sine',0.15,0.08,260); },
  gateAdd(){ this._t(440,'sine',0.22,0.20,880); },
  gateMul(){ this._t(330,'triangle',0.28,0.25,990); },
  gateWpn(){ this._t(280,'sawtooth',0.18,0.28,560); },
  kill()   { this._t(200,'sawtooth',0.18,0.08,60); },
  shoot()  { this._t(800,'square',0.05,0.04,400); },
  skill()  { this._t(150,'sawtooth',0.28,0.38,800); },
  win()    { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this._t(f,'sine',0.28,0.4,f*1.01),i*120)); },
  lose()   { [380,300,220,150].forEach((f,i)=>setTimeout(()=>this._t(f,'sawtooth',0.18,0.45,f*0.88),i*160)); },
};

// ===== SVG SPRITES =====
function svgURI(s){ return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(s))); }

function soldierSVG(){
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 70" width="112" height="140">
  <ellipse cx="22" cy="67" rx="14" ry="4" fill="rgba(0,0,0,0.45)"/>
  <rect x="11" y="50" width="10" height="9" rx="3" fill="#080912"/>
  <rect x="23" y="50" width="10" height="9" rx="3" fill="#080912"/>
  <rect x="12" y="35" width="9" height="17" rx="2" fill="#162868"/>
  <rect x="23" y="35" width="9" height="17" rx="2" fill="#162868"/>
  <rect x="9" y="17" width="26" height="20" rx="4" fill="#1A2C6E"/>
  <rect x="11" y="18" width="22" height="8" rx="3" fill="rgba(90,130,255,0.15)"/>
  <rect x="13" y="19" width="18" height="12" rx="2" fill="rgba(0,0,0,0.22)"/>
  <rect x="9" y="35" width="26" height="4" rx="1" fill="#6A5218"/>
  <rect x="19" y="35" width="6" height="4" fill="#B08828"/>
  <rect x="2" y="18" width="8" height="15" rx="4" fill="#1A2C6E"/>
  <rect x="35" y="18" width="8" height="15" rx="4" fill="#1A2C6E"/>
  <rect x="41" y="20" width="14" height="4" rx="1" fill="#181820"/>
  <rect x="18" y="12" width="8" height="7" rx="1" fill="#C88060"/>
  <ellipse cx="22" cy="8" rx="11" ry="12" fill="#1C2848"/>
  <ellipse cx="22" cy="6" rx="9" ry="9" fill="#202E58"/>
  <rect x="13" y="7" width="18" height="8" rx="3" fill="#080E22"/>
  <rect x="14" y="9" width="16" height="2.5" rx="1.2" fill="#3DD8FF" opacity="0.92"/>
</svg>`);
}

function zombieSVG(){
  return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 74" width="104" height="148">
  <ellipse cx="26" cy="71" rx="16" ry="5" fill="rgba(0,0,0,0.4)"/>
  <rect x="10" y="44" width="10" height="22" rx="3" fill="#2A4418" transform="rotate(-5,15,44)"/>
  <rect x="30" y="42" width="10" height="22" rx="3" fill="#2A4418" transform="rotate(6,35,42)"/>
  <rect x="8" y="21" width="34" height="24" rx="5" fill="#2C4A1A"/>
  <rect x="8" y="32" width="34" height="5" fill="rgba(8,14,5,0.38)"/>
  <ellipse cx="21" cy="27" rx="5" ry="4" fill="rgba(100,0,0,0.38)"/>
  <rect x="2" y="19" width="12" height="8" rx="4" fill="#2C4A1A"/>
  <circle cx="4" cy="23" r="6" fill="#344E1C"/>
  <rect x="38" y="17" width="12" height="8" rx="4" fill="#2C4A1A"/>
  <circle cx="48" cy="21" r="6" fill="#344E1C"/>
  <rect x="18" y="14" width="14" height="9" rx="2" fill="#344E1C"/>
  <ellipse cx="26" cy="9" rx="14" ry="15" fill="#364E1E"/>
  <circle cx="18" cy="8" r="4.5" fill="#280000"/>
  <circle cx="18" cy="8" r="3.5" fill="#CC0000"/>
  <circle cx="18" cy="8" r="2.2" fill="#FF1800"/>
  <circle cx="34" cy="8" r="4.5" fill="#280000"/>
  <circle cx="34" cy="8" r="3.5" fill="#CC0000"/>
  <circle cx="34" cy="8" r="2.2" fill="#FF1800"/>
  <rect x="15" y="14" width="20" height="5" rx="2" fill="#150000"/>
  <rect x="16" y="14" width="3.5" height="3.5" rx="1" fill="rgba(215,205,195,0.8)"/>
  <rect x="21" y="14" width="3.5" height="4.5" rx="1" fill="rgba(215,205,195,0.8)"/>
  <rect x="26" y="14" width="3.5" height="3.5" rx="1" fill="rgba(215,205,195,0.8)"/>
</svg>`);
}

// ===== TEXTURES =====
function buildTextures(scene){
  let g;
  g=scene.make.graphics({add:false});
  g.fillStyle(0x06081A); g.fillRect(0,0,340,200);
  const fb=[[0,60,44,140],[48,28,54,172],[106,78,40,122],[150,8,58,192],[212,48,44,152],[260,68,38,132],[302,22,34,178]];
  for(const [x,y,w,h] of fb){
    g.fillStyle(0x06081A); g.fillRect(x,y,w,h);
    const warm=Math.random()>0.45;
    for(let wy=y+12;wy<y+h-12;wy+=22){
      for(let wx=x+8;wx<x+w-8;wx+=16){
        if(Math.random()>0.36){
          const wc=warm?(Math.random()>0.3?0xffeeaa:0xffd070):(Math.random()>0.3?0xaaccff:0x88aaee);
          g.fillStyle(wc,0.16+Math.random()*0.22);
          g.fillRect(wx,wy,7,10);
        }
      }
    }
    if(Math.random()>0.5){ g.fillStyle(0x3DD8FF,0.14); g.fillRect(x+w/2-1.5,y-10,3,14); g.fillStyle(0xFF2E5C,0.5); g.fillCircle(x+w/2,y-10,2); }
  }
  g.fillGradientStyle(0x1a3060,0x1a3060,0x070A18,0x070A18,0.18,0.18,0,0);
  g.fillRect(0,140,340,60);
  g.generateTexture('buildings-far',340,200); g.destroy();

  g=scene.make.graphics({add:false});
  g.fillStyle(0x040610); g.fillRect(0,0,360,200);
  const nb=[[0,38,36,162],[40,72,32,128],[76,22,48,178],[128,62,38,138],[170,32,44,168],[218,52,38,148],[260,82,32,118],[296,12,38,188]];
  for(const [x,y,w,h] of nb){
    g.fillStyle(0x040814); g.fillRect(x,y,w,h);
    g.fillStyle(C.CYAN,0.09); g.fillRect(x,y,w,3);
  }
  g.generateTexture('buildings-near',360,200); g.destroy();

  g=scene.make.graphics({add:false});
  g.fillStyle(C.ROAD); g.fillRect(0,0,ROAD_W,80);
  g.fillStyle(C.CYAN,0.20); g.fillRect(ROAD_W/2-1.5,0,3,36);
  g.fillStyle(0xFFFFFF,0.06); g.fillRect(ROAD_W*0.33-1,0,2,36);
  g.fillStyle(0xFFFFFF,0.06); g.fillRect(ROAD_W*0.66-1,0,2,36);
  g.generateTexture('road-tile',ROAD_W,80); g.destroy();

  for(const t of [{key:'gate-add',b:C.TEAL,gw:0x38FFAA},{key:'gate-sub',b:C.PINK,gw:0xFF2E5C},{key:'gate-mul',b:C.GOLD,gw:0xFFAD1A},{key:'gate-wpn',b:C.PURPLE,gw:0x9A4EFF}]){
    g=scene.make.graphics({add:false});
    g.fillStyle(t.gw,0.06); g.fillRoundedRect(0,0,88,130,14);
    g.fillStyle(0x000000,0.62); g.fillRoundedRect(6,6,76,118,9);
    g.fillStyle(t.b,0.68); g.fillRoundedRect(8,8,72,28,6);
    g.lineStyle(2.5,t.b,0.86); g.strokeRoundedRect(6,6,76,118,9);
    g.lineStyle(1,t.b,0.25); g.lineBetween(14,108,74,108);
    g.generateTexture(t.key,88,130); g.destroy();
  }
}

// ===== BOOT SCENE =====
class BootScene extends Phaser.Scene {
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
class TitleScene extends Phaser.Scene {
  constructor(){ super('Title'); }
  create(){
    this.add.rectangle(W/2,H/2,W,H,C.BG);
    for(let i=0;i<70;i++){
      const a=rand(1,5)/10;
      const s=this.add.rectangle(rand(0,W),rand(0,H*0.72),rand(1,2),rand(1,2),0xffffff,a);
      this.tweens.add({targets:s,alpha:a*0.12,duration:rand(900,3000),yoyo:true,repeat:-1,delay:rand(0,2600)});
    }
    const bFar =this.add.tileSprite(W/2,H*0.28,W,200,'buildings-far').setAlpha(0.48);
    const bNear=this.add.tileSprite(W/2,H*0.40,W,200,'buildings-near').setAlpha(0.52);
    this.tweens.add({targets:bFar, tilePositionX:{from:0,to:80}, duration:40000,repeat:-1});
    this.tweens.add({targets:bNear,tilePositionX:{from:0,to:130},duration:28000,repeat:-1});
    const road=this.add.tileSprite(W/2,H*0.72,220,H*0.55,'road-tile').setAlpha(0.45);
    this.tweens.add({targets:road,tilePositionY:{from:0,to:80},duration:1400,repeat:-1});
    const fog=this.add.graphics();
    fog.fillGradientStyle(C.BG,C.BG,C.BG,C.BG,0,0,1,1);
    fog.fillRect(0,H*0.52,W,H*0.48);
    for(let i=0;i<5;i++){
      const z=this.add.image(rand(20,W-20),rand(H*0.08,H*0.58),'zombie').setAlpha(0.07+Math.random()*0.07).setScale(0.35+Math.random()*0.2).setTint(0x2A4A18);
      this.tweens.add({targets:z,y:z.y-rand(18,35),alpha:z.alpha*0.25,duration:2800+rand(0,2000),yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:rand(0,2400)});
    }
    const tY=H*0.30;
    this.add.text(W/2,tY,'SURVIVOR\nRAMPART',{fontSize:'52px',fontFamily:FH,color:toHex(C.PINK),align:'center'}).setOrigin(0.5).setAlpha(0.20).setBlendMode(Phaser.BlendModes.ADD);
    const ttl=this.add.text(W/2,tY,'SURVIVOR\nRAMPART',{fontSize:'52px',fontFamily:FH,color:'#FFFFFF',stroke:toHex(C.PINK),strokeThickness:3,align:'center'}).setOrigin(0.5);
    this.tweens.add({targets:ttl,scaleX:1.012,scaleY:1.012,duration:1900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    const ln=this.add.graphics(); ln.lineStyle(1.5,C.CYAN,0.55); ln.lineBetween(W/2-110,tY+72,W/2+110,tY+72);
    this.tweens.add({targets:ln,alpha:0.18,duration:1600,yoyo:true,repeat:-1});
    this.add.text(W/2,H*0.50,'仲間を集めゾンビを全滅させろ',{fontSize:'15px',fontFamily:FB,color:'#7788AA'}).setOrigin(0.5);
    const btnY=H*0.68;
    const btnBg=this.add.graphics();
    const btnHit=this.add.rectangle(W/2,btnY,260,66,0,0).setInteractive();
    const drawBtn=(h)=>{
      btnBg.clear();
      const bc=h?C.CYAN:C.PINK;
      btnBg.fillStyle(0,h?0.35:0.20); btnBg.fillRoundedRect(W/2-130,btnY-33,260,66,10);
      btnBg.lineStyle(2,bc,0.88); btnBg.strokeRoundedRect(W/2-130,btnY-33,260,66,10);
    };
    drawBtn(false);
    this.add.text(W/2,btnY-9,'GAME START',{fontSize:'20px',fontFamily:FH,color:'#FFFFFF',letterSpacing:3}).setOrigin(0.5);
    this.add.text(W/2,btnY+13,'ゲームスタート',{fontSize:'13px',fontFamily:FB,color:toHex(C.GRAY)}).setOrigin(0.5);
    this.tweens.add({targets:btnHit,scaleX:1.03,scaleY:1.03,duration:950,yoyo:true,repeat:-1});
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
class GameScene extends Phaser.Scene {
  constructor(){ super('Game'); }

  create(){
    SFX.init();
    // Player
    this.soldierCount =10; this.playerX=W/2; this.targetX=W/2;
    this.lastPX=W/2; this.dragging=false;
    // Weapon
    this.bulletDmg   =1; this.fireDelay=350;
    this.pierce=false; this.spread=false;
    // State
    this.phase='run'; this.zoneIdx=0; this.scrollY=0; this.eid=0; this.waveNum=0;
    // Pools
    this.bullets=[]; this.enemies=[]; this.bossBullets=[]; this.gatePairs=[];
    // Boss
    this.boss=null; this.bossMaxHp=ENEMY_TYPES.boss.hp; this.bossBTimer=0;
    // Skill
    this.skillReady=true;
    // Timers
    this.shootTimer=null; this.spawnTimer=null; this.zoneTimer=null;
    // Soldiers
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

  _createBg(){
    this.add.rectangle(W/2,H/2,W,H,C.BG);
    // Sky gradient (red-orange glow near horizon = post-apocalyptic)
    const sky=this.add.graphics();
    sky.fillGradientStyle(0x1A0A00,0x1A0A00,C.BG,C.BG,0.55,0.55,0,0);
    sky.fillRect(0,0,W,H*0.45);
    // Stars
    for(let i=0;i<55;i++){
      const a=rand(1,6)/10;
      const s=this.add.rectangle(rand(0,W),rand(0,H*0.50),rand(1,2),rand(1,2),0xffffff,a);
      this.tweens.add({targets:s,alpha:0.04,duration:rand(700,2200),yoyo:true,repeat:-1,delay:rand(0,2000)});
    }
    // Floating debris / smoke particles
    for(let i=0;i<12;i++){
      const p=this.add.rectangle(rand(0,W),rand(H*0.05,H*0.40),rand(2,5),rand(2,5),0x553322,rand(1,3)/10);
      this.tweens.add({targets:p,x:p.x+rand(-60,60),y:p.y-rand(40,120),alpha:0,duration:rand(4000,8000),delay:rand(0,5000),repeat:-1,onRepeat:()=>{p.x=rand(0,W);p.y=rand(H*0.1,H*0.45);p.alpha=rand(1,3)/10;}});
    }
    this.bgFar =this.add.tileSprite(W/2,H*0.12,W,200,'buildings-far').setAlpha(0.38).setTint(0xFF8855);
    this.bgNear=this.add.tileSprite(W/2,H*0.20,W,200,'buildings-near').setAlpha(0.45);
    // Horizon glow
    const hg=this.add.graphics();
    hg.fillGradientStyle(0xFF4400,0xFF4400,0x070A18,0x070A18,0.16,0.16,0,0);
    hg.fillRect(0,H*0.28,W,H*0.12);
  }

  _createRoad(){
    const g=this.add.graphics().setDepth(1);
    // Road surface
    g.fillStyle(0x090D1C,1);
    g.beginPath();
    g.moveTo(roadLeft(VANISH_Y),VANISH_Y); g.lineTo(roadRight(VANISH_Y),VANISH_Y);
    g.lineTo(roadRight(H),H);             g.lineTo(roadLeft(H),H);
    g.closePath(); g.fillPath();
    // Darker center strip
    g.fillStyle(0x060910,0.7);
    g.beginPath();
    g.moveTo(ROAD_CX-roadHalf(VANISH_Y)*0.18,VANISH_Y); g.lineTo(ROAD_CX+roadHalf(VANISH_Y)*0.18,VANISH_Y);
    g.lineTo(ROAD_CX+roadHalf(H)*0.18,H); g.lineTo(ROAD_CX-roadHalf(H)*0.18,H);
    g.closePath(); g.fillPath();
    // Perspective grid lines
    for(let y=VANISH_Y+45;y<H;y+=52){
      const sc=pScale(y), a=sc*0.13;
      g.lineStyle(1,C.CYAN,a); g.lineBetween(roadLeft(y),y,roadRight(y),y);
    }
    // Dashed center lane markers
    for(let y=VANISH_Y+60;y<H;y+=80){
      const dashH=Math.max(4,pScale(y)*20);
      g.fillStyle(0xFFFFFF,pScale(y)*0.12);
      g.fillRect(ROAD_CX-1,y,2,dashH);
    }
    // Edge glows
    const eL=this.add.graphics().setDepth(2), eR=this.add.graphics().setDepth(2);
    eL.lineStyle(3,C.CYAN,0.65); eL.beginPath(); eL.moveTo(roadLeft(VANISH_Y),VANISH_Y); eL.lineTo(roadLeft(H),H); eL.strokePath();
    eR.lineStyle(3,C.CYAN,0.65); eR.beginPath(); eR.moveTo(roadRight(VANISH_Y),VANISH_Y); eR.lineTo(roadRight(H),H); eR.strokePath();
    // Second softer edge
    const eL2=this.add.graphics().setDepth(2), eR2=this.add.graphics().setDepth(2);
    eL2.lineStyle(8,C.CYAN,0.08); eL2.beginPath(); eL2.moveTo(roadLeft(VANISH_Y),VANISH_Y); eL2.lineTo(roadLeft(H),H); eL2.strokePath();
    eR2.lineStyle(8,C.CYAN,0.08); eR2.beginPath(); eR2.moveTo(roadRight(VANISH_Y),VANISH_Y); eR2.lineTo(roadRight(H),H); eR2.strokePath();
    this.tweens.add({targets:[eL,eR],alpha:0.22,duration:1200,yoyo:true,repeat:-1});
    // Vanishing point intense glow
    const vg=this.add.graphics().setDepth(2);
    vg.fillStyle(0xFF6600,0.12); vg.fillCircle(ROAD_CX,VANISH_Y,55);
    vg.fillStyle(C.CYAN,0.08);  vg.fillCircle(ROAD_CX,VANISH_Y,30);
  }

  _createPlayer(){
    // Glow aura behind squad
    this.playerGlow=this.add.ellipse(this.playerX,PLAYER_Y,220,70,C.CYAN,0.10).setDepth(13);
    this.tweens.add({targets:this.playerGlow,alpha:0.04,scaleX:1.15,scaleY:1.15,duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.playerGroup=this.add.container(this.playerX,PLAYER_Y).setDepth(15);
    this.soldierImgs=[];
    this._rebuildSoldiers();
  }

  _rebuildSoldiers(){
    this.playerGroup.removeAll(true);
    this.soldierImgs=[];
    const n=clamp(this.soldierCount,1,60);
    const cols=Math.min(n,8), rows=Math.ceil(n/cols);
    const sx=24, sy=24; let placed=0;
    for(let r=0;r<rows&&placed<n;r++){
      for(let c=0;c<cols&&placed<n;c++){
        const ox=(c-(cols-1)/2)*sx, oy=(r-(rows-1)/2)*sy;
        const img=this.make.image({x:ox,y:oy,key:'soldier',add:false});
        img.setScale(0.40);
        this.playerGroup.add(img);
        this.soldierImgs.push({img,baseY:oy,ph:placed*0.4});
        placed++;
      }
    }
    const badge=this.make.text({x:0,y:-(Math.ceil(n/cols)*sy/2+18),text:n.toString(),style:{fontSize:'18px',fontFamily:FH,color:'#FFFFFF',stroke:'#000',strokeThickness:3},add:false});
    badge.setOrigin(0.5); this.playerGroup.add(badge);
  }

  _createHUD(){
    const hud=this.add.graphics().setDepth(20);
    hud.fillStyle(0x000000,0.82); hud.fillRect(0,0,W,72);
    hud.lineStyle(1,C.CYAN,0.20); hud.lineBetween(0,72,W,72);
    this.add.text(16,12,'TROOPS',{fontSize:'9px',fontFamily:FH,color:toHex(C.TEAL),letterSpacing:2}).setDepth(21);
    this.hudTroops=this.add.text(16,26,'10',{fontSize:'26px',fontFamily:FH,color:toHex(C.TEAL),stroke:'#000',strokeThickness:2}).setDepth(21);
    this.add.text(W/2,12,'ZONE',{fontSize:'9px',fontFamily:FH,color:toHex(C.GRAY),letterSpacing:2}).setOrigin(0.5).setDepth(21);
    this.hudZone=this.add.text(W/2,26,'Z1',{fontSize:'22px',fontFamily:FH,color:'#FFFFFF',stroke:'#000',strokeThickness:2}).setOrigin(0.5).setDepth(21);
    this.add.text(W-16,12,'WEAPON',{fontSize:'9px',fontFamily:FH,color:toHex(C.GOLD),letterSpacing:2}).setOrigin(1,0).setDepth(21);
    this.hudWpn   =this.add.text(W-16,26,'LV.1',{fontSize:'17px',fontFamily:FH,color:toHex(C.GOLD)}).setOrigin(1,0).setDepth(21);
    this.hudPierce=this.add.text(W-16,46,'',{fontSize:'11px',fontFamily:FH,color:toHex(C.CYAN)}).setOrigin(1,0).setDepth(21);
    this.hudSpread=this.add.text(W-16,58,'',{fontSize:'11px',fontFamily:FH,color:toHex(C.GOLD)}).setOrigin(1,0).setDepth(21);
    // Boss HP bar (hidden)
    this.bossHpBg  =this.add.rectangle(W/2,85,W-40,10,0x330000).setDepth(22).setVisible(false);
    this.bossHpFill=this.add.rectangle(20, 85,W-40,10,0xFF2222).setOrigin(0,0.5).setDepth(23).setVisible(false);
    this.bossHpLbl =this.add.text(W/2,73,'BOSS HP',{fontSize:'8px',fontFamily:FH,color:'#FF4444',letterSpacing:3}).setOrigin(0.5).setDepth(24).setVisible(false);
    // Skill button
    this._createSkillBtn();
  }

  _createSkillBtn(){
    const bx=W-60, by=H-72;
    const glow=this.add.graphics().setDepth(25);
    glow.fillStyle(C.GOLD,0.18); glow.fillCircle(bx,by,42);
    this.skillBtnGfx=this.add.graphics().setDepth(26);
    this.skillBtnGfx.fillStyle(C.GOLD,0.88); this.skillBtnGfx.fillCircle(bx,by,34);
    this.add.text(bx,by-8,'💥',{fontSize:'20px'}).setOrigin(0.5).setDepth(27);
    this.add.text(bx,by+12,'BOMB',{fontSize:'8px',fontFamily:FH,color:'#000'}).setOrigin(0.5).setDepth(27);
    this.skillCoolTxt=this.add.text(bx,by,'',{fontSize:'22px',fontFamily:FH,color:'#FFF',stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(28);
    const hit=this.add.rectangle(bx,by,68,68,0,0).setInteractive().setDepth(29);
    hit.on('pointerdown',()=>this._activateSkill());
  }

  _updateHUD(){
    this.hudTroops.setText(this.soldierCount.toString());
    if(this.phase==='boss') this.hudZone.setText('BOSS').setColor(toHex(C.PINK));
    else this.hudZone.setText('Z'+(this.zoneIdx+1)).setColor('#FFFFFF');
    this.hudWpn.setText(this.bulletDmg>1?'ATK×'+this.bulletDmg:'LV.1');
    this.hudPierce.setText(this.pierce?'▶ PIERCE':'');
    this.hudSpread.setText(this.spread?'▶ SPREAD':'');
  }

  _setupInput(){
    this.input.on('pointerdown',p=>{ this.dragging=true; this.lastPX=p.x; SFX.init(); });
    this.input.on('pointermove',p=>{
      if(!this.dragging)return;
      const dx=p.x-this.lastPX;
      const half=roadW(PLAYER_Y)/2-45;
      this.targetX=clamp(this.targetX+dx*1.3,ROAD_CX-half,ROAD_CX+half);
      this.lastPX=p.x;
    });
    this.input.on('pointerup',()=>{ this.dragging=false; });
  }

  // ===== ZONE SYSTEM =====
  _startZone(idx){
    this.zoneIdx=idx;
    this.waveNum=0; // reset intra-zone wave counter
    if(this.spawnTimer){ this.spawnTimer.remove(); this.spawnTimer=null; }
    if(this.zoneTimer) { this.zoneTimer.remove();  this.zoneTimer=null; }
    this._showZoneBanner(idx);
    const z=ZONES[idx];
    this.spawnTimer=this.time.addEvent({ delay:z.interval, callback:()=>this._spawnWave(idx), loop:true });
    if(idx<BOSS_ZONE){
      this.zoneTimer=this.time.delayedCall(z.duration,()=>{
        if(this.spawnTimer){ this.spawnTimer.remove(); this.spawnTimer=null; }
        this._spawnGatePair(idx);
      });
    }
    this._updateHUD();
  }

  _spawnWave(zoneIdx){
    if(this.phase!=='run')return;
    const alive=this.enemies.filter(e=>!e.dead&&!e.dying).length;
    if(alive>=90)return;
    const z=ZONES[zoneIdx];
    this.waveNum++;
    const cols=rand(z.cols[0],z.cols[1]);
    const rows=rand(z.rows[0],z.rows[1]);
    const spawnY=VANISH_Y+10;
    const rw=roadW(spawnY);
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const typeId=choose(z.types);
        const x=clamp(roadLeft(spawnY)+(c/(cols-1||1))*rw+rand(-5,5),roadLeft(spawnY)+6,roadRight(spawnY)-6);
        const y=spawnY-r*22;
        this._spawnEnemy(typeId,x,y);
      }
    }
  }

  _spawnEnemy(typeId,x,y){
    const def=ENEMY_TYPES[typeId];
    const sc=pScale(y)*def.scale;
    const img=this.add.image(x,y,'zombie').setScale(sc).setTint(def.tint).setDepth(8+Math.random()*2);
    this.tweens.add({targets:img,angle:rand(-7,7),duration:240+rand(0,80),yoyo:true,repeat:-1});
    img.setAlpha(0);
    this.tweens.add({targets:img,alpha:1,duration:200});
    const e={id:this.eid++,img,speed:def.speed,hp:def.hp,hpMax:def.hp,baseScale:def.scale,dead:false,dying:false,type:typeId,hpBar:null,hpBg:null};
    if(typeId==='tank'){
      e.hpBg =this.add.rectangle(x,y-22,32,5,0x440000).setDepth(11);
      e.hpBar=this.add.rectangle(x-16,y-22,32,5,0xFF2222).setOrigin(0,0.5).setDepth(12);
    }
    this.enemies.push(e);
  }

  // ===== GATE SYSTEM =====
  _spawnGatePair(poolIdx){
    const pool=GATE_POOL[poolIdx];
    const shuffled=[...pool].sort(()=>Math.random()-0.5);
    const lCfg=GATE_CFG[shuffled[0]];
    const rCfg=GATE_CFG[shuffled[1]||shuffled[0]];
    const y=VANISH_Y+55;
    const lx=roadLeft(y)+roadW(y)*0.25;
    const rx=roadLeft(y)+roadW(y)*0.75;
    this.gatePairs.push({
      worldY:y, passed:false, poolIdx,
      left: this._buildGateObj(lx,y,lCfg),
      right:this._buildGateObj(rx,y,rCfg),
      lCfg, rCfg,
    });
  }

  _buildGateObj(x,y,cfg){
    const sc=pScale(y);
    const img=this.add.image(x,y,cfg.tex).setScale(sc*0.82).setDepth(9);
    this.tweens.add({targets:img,alpha:0.75,duration:800,yoyo:true,repeat:-1});
    const label=this.add.text(x,y-20*sc,cfg.label,{fontSize:Math.round(22*sc)+'px',fontFamily:FH,color:'#FFFFFF',stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(10);
    const sub  =this.add.text(x,y+16*sc,cfg.sub,  {fontSize:Math.round(13*sc)+'px',fontFamily:FB,color:toHex(cfg.col)}).setOrigin(0.5).setDepth(10);
    return {img,label,sub,cfg};
  }

  _destroyGatePair(pair){
    for(const s of [pair.left,pair.right]){ s.img.destroy(); s.label.destroy(); s.sub.destroy(); }
  }

  _updateGates(){
    for(let gi=this.gatePairs.length-1;gi>=0;gi--){
      const pair=this.gatePairs[gi];
      if(pair.passed){ this._destroyGatePair(pair); this.gatePairs.splice(gi,1); continue; }
      pair.worldY+=GATE_SPEED;
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
        const chosenX=ldist<=rdist?lx:rx;
        this._applyGate(chosen);
        this._gatePassFX(chosenX,pair.worldY,chosen.col);
        const next=this.zoneIdx+1;
        if(next<BOSS_ZONE) this._startZone(next);
        else this._startBoss();
      }
    }
  }

  _applyGate(cfg){
    if(cfg.type==='add'){ this.soldierCount=clamp(this.soldierCount+cfg.value,1,80); SFX.gateAdd(); }
    else if(cfg.type==='mul'){
      this.soldierCount=clamp(Math.round(this.soldierCount*cfg.value),1,80); SFX.gateMul();
      this.tweens.add({targets:this.playerGroup,scaleX:1.4,scaleY:1.4,duration:130,yoyo:true,ease:'Back.easeOut'});
    }
    else if(cfg.type==='wpn'){
      if(cfg.stat==='dmgS')  this.bulletDmg  =Math.ceil(this.bulletDmg*1.20);
      if(cfg.stat==='dmgM')  this.bulletDmg  =Math.ceil(this.bulletDmg*1.40);
      if(cfg.stat==='dmgL')  this.bulletDmg  =Math.ceil(this.bulletDmg*1.60);
      if(cfg.stat==='rateS') this.fireDelay  =Math.max(100,Math.floor(this.fireDelay*0.85));
      if(cfg.stat==='rateM') this.fireDelay  =Math.max(100,Math.floor(this.fireDelay*0.70));
      if(cfg.stat==='rateL') this.fireDelay  =Math.max(100,Math.floor(this.fireDelay*0.55));
      if(cfg.stat==='pierce')this.pierce=true;
      if(cfg.stat==='spread')this.spread=true;
      SFX.gateWpn();
      const isRate=cfg.stat==='rateS'||cfg.stat==='rateM'||cfg.stat==='rateL';
      if(isRate&&this.shootTimer){ this.shootTimer.remove(false); this._startShootTimer(); }
    }
    else if(cfg.type==='heal'){ this.soldierCount=Math.min(80,this.soldierCount+cfg.value); SFX.gateAdd(); }
    this._rebuildSoldiers();
    this._updateHUD();
  }

  // ===== BOSS =====
  _startBoss(){
    this.phase='boss';
    if(this.spawnTimer){ this.spawnTimer.remove(); this.spawnTimer=null; }
    if(this.zoneTimer) { this.zoneTimer.remove();  this.zoneTimer=null; }
    const bossHp=ENEMY_TYPES.boss.hp;
    const y0=VANISH_Y+60;
    const sc0=pScale(y0)*ENEMY_TYPES.boss.scale*0.5;
    const img=this.add.image(W/2,y0,'zombie').setScale(sc0).setTint(ENEMY_TYPES.boss.tint).setDepth(10);
    this.tweens.add({targets:img,x:{from:W/2-55,to:W/2+55},duration:2600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.boss={ img, hp:bossHp, maxHp:bossHp, y:y0, dead:false };
    this.bossBTimer=0;
    // Show HP bar
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
    // Advance toward player (stop at H*0.38)
    if(b.y<H*0.38){
      b.y+=ENEMY_TYPES.boss.speed;
      b.img.y=b.y;
      const sc=pScale(b.y)*ENEMY_TYPES.boss.scale*0.5;
      b.img.setScale(sc);
    }
    // Fire
    this.bossBTimer+=delta;
    if(this.bossBTimer>2200){
      this.bossBTimer=0;
      this._bossFire();
    }
  }

  _bossFire(){
    if(!this.boss||this.boss.dead)return;
    const bx=this.boss.img.x, by=this.boss.y+40;
    for(const ox of [-28,0,28]){
      const tx=this.playerX+rand(-20,20), ty=PLAYER_Y;
      const ang=Math.atan2(ty-by,tx-(bx+ox));
      const bi=this.add.rectangle(bx+ox,by,8,14,0xFF5500).setDepth(14);
      this.bossBullets.push({img:bi,speedX:Math.cos(ang)*4,speedY:Math.sin(ang)*4});
    }
  }

  _updateBossBullets(){
    for(let i=this.bossBullets.length-1;i>=0;i--){
      const b=this.bossBullets[i];
      b.img.x+=b.speedX; b.img.y+=b.speedY;
      if(b.img.y>H+20||b.img.x<-20||b.img.x>W+20){ b.img.destroy(); this.bossBullets.splice(i,1); continue; }
      if(Math.abs(b.img.x-this.playerX)<44&&Math.abs(b.img.y-PLAYER_Y)<44){
        b.img.destroy(); this.bossBullets.splice(i,1);
        this._onSoldierHit();
      }
    }
  }

  // ===== SHOOT =====
  _startShootTimer(){
    if(this.shootTimer)this.shootTimer.remove();
    this.shootTimer=this.time.addEvent({ delay:this.fireDelay, callback:()=>this._autoShoot(), loop:true });
  }

  _autoShoot(){
    if(this.phase==='done'||this.phase==='fail')return;
    if(this.soldierImgs.length===0)return;
    SFX.shoot();
    if(this.spread){
      for(const ao of [-0.28,0,0.28]) this._spawnBullet(this.playerX+Math.sin(ao)*20,PLAYER_Y-28,ao);
    } else {
      const shots=Math.min(this.soldierImgs.length,Math.max(1,Math.floor(this.soldierCount/4)));
      for(let i=0;i<shots;i++){
        const si=this.soldierImgs[i%this.soldierImgs.length];
        this._spawnBullet(this.playerGroup.x+si.img.x+rand(-3,3),PLAYER_Y+si.img.y-24,0);
      }
    }
  }

  _spawnBullet(x,y,ao){
    const col=this.pierce?C.PURPLE:this.spread?C.GOLD:C.CYAN;
    // Glow halo
    const glow =this.add.rectangle(x,y,10,28,col,0.22).setDepth(15);
    // Core bullet
    const img  =this.add.rectangle(x,y,5,20,col).setDepth(16);
    // Trail
    const trail=this.add.rectangle(x,y+14,3,10,col,0.45).setDepth(15);
    this.bullets.push({img,trail,glow,sx:Math.sin(ao)*11,sy:-Math.cos(ao)*12,dmg:this.bulletDmg,pierce:this.pierce,hits:new Set(),hitBoss:false});
  }

  // ===== SKILL =====
  _activateSkill(){
    if(!this.skillReady||this.phase==='done'||this.phase==='fail')return;
    this.skillReady=false; SFX.skill();
    const tx=roadLeft(H*0.45)+Math.random()*roadW(H*0.45), ty=H*0.42+rand(0,80);
    // Visual
    for(let r=0;r<3;r++){
      const ring=this.add.graphics().setDepth(40);
      ring.lineStyle(4-r,0xFFCC00,0.9-r*0.2); ring.strokeCircle(tx,ty,6);
      this.tweens.add({targets:ring,scaleX:8+r*3,scaleY:8+r*3,alpha:0,duration:280+r*70,delay:r*55,onComplete:()=>ring.destroy()});
    }
    const fl=this.add.rectangle(W/2,H/2,W,H,C.GOLD,0.22).setDepth(39);
    this.tweens.add({targets:fl,alpha:0,duration:200,onComplete:()=>fl.destroy()});
    // Kill enemies in radius (with death animation)
    for(const e of this.enemies){
      if(!e.dead&&!e.dying&&Math.hypot(e.img.x-tx,e.img.y-ty)<SKILL_R) this._killEnemy(e);
    }
    // Boss damage
    if(this.boss&&!this.boss.dead){
      if(Math.hypot(this.boss.img.x-tx,this.boss.y-ty)<SKILL_R+70){
        this.boss.hp=Math.max(0,this.boss.hp-35);
        this._updateBossHpBar();
        this._bossDmgFX(this.boss.img.x,this.boss.y);
        if(this.boss.hp<=0){ this.boss.dead=true; this._endGame(true); return; }
      }
    }
    // Cooldown
    this.skillBtnGfx.setAlpha(0.4);
    let elapsed=0;
    this.time.addEvent({ delay:100, repeat:SKILL_CD/100-1, callback:()=>{
      elapsed+=100;
      const rem=SKILL_CD-elapsed;
      this.skillCoolTxt.setText(rem>0?Math.ceil(rem/1000).toString():'');
      if(rem<=0){ this.skillReady=true; this.skillBtnGfx.setAlpha(1); }
    }});
  }

  // ===== UPDATE =====
  update(time,delta){
    if(this.phase==='done'||this.phase==='fail')return;
    this.scrollY+=SCROLL_SPEED;
    this.bgFar.tilePositionY -=SCROLL_SPEED*0.12;
    this.bgNear.tilePositionY-=SCROLL_SPEED*0.25;
    this.playerX+=(this.targetX-this.playerX)*0.14;
    this.playerGroup.x=this.playerX;
    this.playerGlow.x=this.playerX;
    for(const s of this.soldierImgs) s.img.y=s.baseY+Math.sin(time*0.006+s.ph)*2.5;
    this._updateBullets();
    this._updateEnemies();
    // Remove fully dead enemies (dying ones clean themselves up via tween onComplete)
    for(let i=this.enemies.length-1;i>=0;i--){
      const e=this.enemies[i];
      if(e.dead&&!e.dying){ if(e.hpBar){e.hpBar.destroy();e.hpBg.destroy();} this.enemies.splice(i,1); }
    }
    this._updateGates();
    if(this.phase==='boss'){ this._updateBoss(delta); this._updateBossBullets(); }
  }

  _updateBullets(){
    for(let j=this.bullets.length-1;j>=0;j--){
      const b=this.bullets[j];
      b.img.x+=b.sx; b.img.y+=b.sy;
      b.trail.x=b.img.x; b.trail.y=b.img.y+14;
      b.glow.x =b.img.x; b.glow.y =b.img.y;
      if(b.img.y<-20){ b.img.destroy();b.trail.destroy();b.glow.destroy();this.bullets.splice(j,1);continue; }
      let dead=false;
      // Enemy collision
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
            // Hit flash
            e.img.setTint(0xFFFFFF);
            this.time.delayedCall(90,()=>{ if(!e.dead&&!e.dying) e.img.setTint(ENEMY_TYPES[e.type].tint); });
          }
          if(!b.pierce){ b.img.destroy();b.trail.destroy();b.glow.destroy();this.bullets.splice(j,1);dead=true;break; }
        }
      }
      if(dead)continue;
      // Boss collision
      if(this.boss&&!this.boss.dead&&!b.hitBoss){
        if(Math.abs(b.img.x-this.boss.img.x)<55&&Math.abs(b.img.y-this.boss.y)<65){
          b.hitBoss=true;
          this.boss.hp-=b.dmg;
          this._updateBossHpBar();
          this._bossDmgFX(this.boss.img.x,this.boss.y);
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
    // Hide HP bar immediately
    if(e.hpBar){ e.hpBar.destroy(); e.hpBg.destroy(); e.hpBar=null; e.hpBg=null; }
    // Color-coded death particles
    const cols=e.type==='tank'?[0xFF5533,0xFF9944,0xFFCC55]:e.type==='runner'?[0xFF8866,0xFF6644,0xFF4422]:[0x66FF99,0x33EE77,0xAAFFCC];
    for(let i=0;i<14;i++){
      const ang=Math.random()*Math.PI*2, spd=18+Math.random()*50;
      const p=this.add.rectangle(e.img.x+rand(-6,6),e.img.y+rand(-6,6),rand(5,11),rand(4,9),choose(cols)).setDepth(12);
      this.tweens.add({targets:p,x:p.x+Math.cos(ang)*spd,y:p.y+Math.sin(ang)*spd-8,alpha:0,angle:rand(-180,180),duration:380+rand(0,200),onComplete:()=>p.destroy()});
    }
    // Sprite death animation: scale-down + fade + slight upward drift
    this.tweens.add({
      targets:e.img,
      scaleX:0, scaleY:0, alpha:0, y:e.img.y-22,
      duration:320, ease:'Back.easeIn',
      onComplete:()=>{ e.dead=true; e.dying=false; e.img.destroy(); }
    });
    // AoE chain kill (radius grows with weapon damage upgrades)
    const r=36+Math.min(this.bulletDmg-1,6)*4; let chain=0;
    for(const ne of this.enemies){
      if(ne.dead||ne.dying||ne===e)continue;
      if(Math.abs(ne.img.x-e.img.x)<r&&Math.abs(ne.img.y-e.img.y)<r){ this._killEnemy(ne); chain++; }
    }
    if(chain>=3) this._sweepFX(e.img.x,e.img.y,chain);
  }

  _sweepFX(x,y,count){
    for(let r=0;r<2;r++){
      const ring=this.add.graphics().setDepth(12);
      ring.lineStyle(3-r*0.5,r===0?C.TEAL:C.GOLD,0.9-r*0.3);
      ring.strokeCircle(x,y,10+r*5);
      this.tweens.add({targets:ring,scaleX:5+r*2,scaleY:5+r*2,alpha:0,duration:320+r*80,delay:r*50,onComplete:()=>ring.destroy()});
    }
    const txt=this.add.text(x,y-10,count>=6?'💥 SWEEP! ×'+(count+1):'SWEEP! ×'+(count+1),{fontSize:count>=6?'18px':'15px',fontFamily:FH,color:toHex(C.GOLD),stroke:'#000',strokeThickness:3}).setOrigin(0.5).setDepth(50);
    this.tweens.add({targets:txt,y:y-60,alpha:0,duration:700,ease:'Power2',onComplete:()=>txt.destroy()});
  }

  _bossDmgFX(x,y){
    const f=this.add.rectangle(x,y,55,75,0xFF4400,0.42).setDepth(18);
    this.tweens.add({targets:f,alpha:0,scaleX:2,scaleY:2,duration:140,onComplete:()=>f.destroy()});
  }

  _gatePassFX(x,y,col){
    for(let i=0;i<22;i++){
      const ang=(i/22)*Math.PI*2, spd=50+rand(0,65);
      const p=this.add.rectangle(x,y,4,10,col).setDepth(18);
      this.tweens.add({targets:p,x:x+Math.cos(ang)*spd,y:y+Math.sin(ang)*spd,alpha:0,scale:0.1,angle:rand(-180,180),duration:460+rand(0,240),onComplete:()=>p.destroy()});
    }
    const ring=this.add.graphics().setDepth(19);
    ring.lineStyle(3,col,0.9); ring.strokeCircle(x,y,10);
    this.tweens.add({targets:ring,scaleX:6,scaleY:6,alpha:0,duration:360,onComplete:()=>ring.destroy()});
    const fl=this.add.rectangle(W/2,H/2,W,H,col,0.20).setDepth(30);
    this.tweens.add({targets:fl,alpha:0,duration:180,onComplete:()=>fl.destroy()});
  }

  _showZoneBanner(idx){
    if(idx===0)return;
    const txt=this.add.text(W/2,H*0.44,'ZONE '+(idx+1),{fontSize:'28px',fontFamily:FH,color:'#FFF',stroke:toHex(C.CYAN),strokeThickness:3}).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(0.7);
    this.tweens.add({targets:txt,alpha:1,scaleX:1,scaleY:1,duration:270,ease:'Back.easeOut',
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
    if(this.spawnTimer)this.spawnTimer.remove();
    if(this.zoneTimer) this.zoneTimer.remove();
    if(this.shootTimer)this.shootTimer.remove();
    for(const b of this.bullets){ b.img.destroy(); b.trail.destroy(); b.glow.destroy(); }
    for(const e of this.enemies){ this.tweens.killTweensOf(e.img); if(e.img&&e.img.scene)e.img.destroy(); if(e.hpBar){e.hpBar.destroy();e.hpBg.destroy();} }
    for(const b of this.bossBullets) b.img.destroy();
    for(const p of this.gatePairs) this._destroyGatePair(p);
    this.bullets=[]; this.enemies=[]; this.bossBullets=[]; this.gatePairs=[];
    if(this.boss&&this.boss.img) this.boss.img.destroy();
  }
}

// ===== RESULT SCENE =====
class ResultScene extends Phaser.Scene {
  constructor(){ super('Result'); }
  init(data){ this.won=data.won; this.survivors=data.survivors||0; }

  create(){
    this.cameras.main.fadeIn(500);
    this.won?SFX.win():SFX.lose();
    this.add.rectangle(W/2,H/2,W,H,this.won?0x050D08:0x0D0505);
    this.add.tileSprite(W/2,H*0.26,W,200,'buildings-far').setAlpha(0.20).setTint(this.won?0x44FF88:0xFF4444);
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
        if(i<stars){ const gl=this.add.graphics().setBlendMode(Phaser.BlendModes.ADD); gl.fillStyle(C.GOLD,0.22); this._drawStar(gl,sx,H*0.68,24,10); this.tweens.add({targets:sg,scaleX:1.12,scaleY:1.12,duration:600+i*200,yoyo:true,repeat:-1}); }
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
    for(let i=0;i<pts*2;i++){ const r=i%2===0?r1:r2, a=(i*Math.PI/pts)-Math.PI/2; i===0?gfx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):gfx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); }
    gfx.closePath(); gfx.fillPath();
  }

  _fireworks(){
    const cols=[C.PINK,C.GOLD,C.TEAL,C.CYAN,C.PURPLE,C.WHITE];
    const burst=()=>{
      const x=rand(60,W-60),y=rand(H*0.08,H*0.52),color=choose(cols);
      for(let i=0;i<24;i++){ const a=(i/24)*Math.PI*2,spd=45+rand(0,80),p=this.add.circle(x,y,3+rand(0,3),color).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({targets:p,x:x+Math.cos(a)*spd,y:y+Math.sin(a)*spd,alpha:0,duration:560+rand(0,480),onComplete:()=>p.destroy()}); }
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
  backgroundColor: '#070A18',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, GameScene, ResultScene],
});
