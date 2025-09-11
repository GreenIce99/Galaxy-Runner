// ================================
// Galaxy Runner: Universe Edition 3D XL – Cosmic Extreme
// ================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resize); resize();

// ----- Game States -----
const STATE = { TITLE:0, COUNTDOWN:1, PLAYING:2, GAMEOVER:3 };
let state = STATE.TITLE;

// ----- Player -----
const player = {
  x:canvas.width/2, y:canvas.height-150, w:36, h:36, speed:8, shots:[],
  cooldown:0, lives:3, shield:0, rapid:false, spread:false, drones:[], charge:0
};

// ----- Score -----
let score = 0;
let highScore = parseInt(localStorage.getItem('galaxy_high')||'0',10)||0;

// ----- Arrays -----
let enemies=[], enemyBullets=[], powerups=[], particles=[], boss=null, stars3D=[];

// ----- Timers -----
let frame=0, countdown=180, waveTimer=0, shake=0;

// ----- Input -----
const keys={};
document.addEventListener('keydown', e=>keys[e.key]=true);
document.addEventListener('keyup', e=>keys[e.key]=false);

// ----- Audio -----
const SND = {
  shoot:new Audio('https://freesound.org/data/previews/341/341695_3248244-lq.mp3'),
  explode:new Audio('https://freesound.org/data/previews/219/219149_4101046-lq.mp3'),
  power:new Audio('https://freesound.org/data/previews/331/331912_3248244-lq.mp3'),
  boss:new Audio('https://freesound.org/data/previews/178/178385_3248244-lq.mp3'),
  bgm:new Audio('https://freesound.org/data/previews/458/458410_5121236-lq.mp3')
};
for(let k in SND) if(SND[k]) SND[k].volume=0.3;
SND.bgm.loop=true; SND.bgm.volume=0.4;

// ----- Utilities -----
function rand(min,max){ return Math.random()*(max-min)+min; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function playSound(name){ try{ if(SND[name]){ SND[name].currentTime=0; SND[name].play(); } }catch(e){} }
function spawnParticles(x,y,color,count=20){
  for(let i=0;i<count;i++) particles.push({
    x,y,
    vx:rand(-3,3), vy:rand(-3,3), vz:rand(-2,2),
    life:rand(20,50),
    color
  });
}

// ----- Starfield 3D -----
for(let i=0;i<1000;i++){
  stars3D.push({ x:rand(-canvas.width,canvas.width), y:rand(-canvas.height,canvas.height), z:rand(1,1000) });
}
function updateStars3D(){
  ctx.fillStyle='black'; ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let s of stars3D){
    s.z-=8; if(s.z<=0){ s.z=1000; s.x=rand(-canvas.width,canvas.width); s.y=rand(-canvas.height,canvas.height);}
    const sx=(s.x/s.z)*500 + canvas.width/2;
    const sy=(s.y/s.z)*500 + canvas.height/2;
    const size=(1-s.z/1000)*3;
    ctx.fillStyle='white'; ctx.fillRect(sx,sy,size,size);
  }
}

// ----- Player Shoot -----
function playerShoot(){
  if(player.cooldown>0) return;
  player.cooldown = player.rapid?6:14;
  if(player.spread){
    player.shots.push({x:player.x-12,y:player.y-22,vy:-10,w:6,h:10});
    player.shots.push({x:player.x,y:player.y-26,vy:-12,w:6,h:10});
    player.shots.push({x:player.x+12,y:player.y-22,vy:-10,w:6,h:10});
  } else player.shots.push({x:player.x,y:player.y-24,vy:-14,w:6,h:10});
  playSound('shoot');
}
document.addEventListener('keydown', e=>{ if(e.key===' ') playerShoot(); });

// ----- Enemy Spawn -----
function spawnEnemy(type){
  const x=rand(-canvas.width/2,canvas.width/2);
  const y=rand(-canvas.height/2,-50);
  const z=rand(500,1000);
  enemies.push({x,y,z,w:32,h:32,type:type,hp:type==='shooter'?3:1,phase:rand(0,Math.PI*2)});
}

// ----- Powerup Spawn -----
function spawnPowerUp(x,y){
  const types=['shield','rapid','spread','bomb','drone','health','freeze','mult'];
  powerups.push({x,y,vy:2,type:types[Math.floor(rand(0,types.length))]});
}

// ----- Update Enemies -----
function updateEnemies(){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    const scale=500/(500+e.z);
    e.y+=2*scale; e.z-=5;
    if(e.z<=0||e.y>canvas.height+100) enemies.splice(i,1);
  }
}

// ----- Update Shots -----
function updateShots(){
  for(let i=player.shots.length-1;i>=0;i--){
    const s=player.shots[i]; s.y+=s.vy;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];
      const scale=500/(500+e.z);
      const sx=e.x*scale+canvas.width/2, sy=e.y*scale+canvas.height/2;
      const sw=e.w*scale, sh=e.h*scale;
      if(Math.abs(s.x-sx)<sw/2 && Math.abs(s.y-sy)<sh/2){
        e.hp--; spawnParticles(sx,sy,'yellow',10);
        if(e.hp<=0){ enemies.splice(j,1); score+=10; playSound('explode'); }
        player.shots.splice(i,1); break;
      }
    }
    if(s.y<-20) player.shots.splice(i,1);
  }
}

// ----- Drones in 3D -----
function updateDrones(){
  for(let d of player.drones){
    d.angle+=0.05;
    const dx=player.x+Math.cos(d.angle)*50;
    const dy=player.y+Math.sin(d.angle)*50;
    ctx.fillStyle='cyan'; ctx.fillRect(dx-5,dy-5,10,10);
  }
}

// ----- Draw Player -----
function drawPlayer(){
  const scale=1+(canvas.height/2-player.y)/1000;
  ctx.save(); ctx.translate(player.x,player.y); ctx.scale(scale,scale);
  ctx.fillStyle='#6f6'; ctx.fillRect(-player.w/2,-player.h/2,player.w,player.h);
  ctx.restore();
}

// ----- Spawn Boss -----
function spawnBoss(){
  boss = { x:0, y:-200, z:1000, w:320, h:140, hp:350, phase:1, timer:0, vx:2 };
  playSound('boss'); console.log('BOSS Incoming!');
}

// ----- Update Boss -----
function updateBoss(){
  if(!boss) return;
  boss.timer++;
  boss.z -= 4;
  if(boss.z<=100){
    boss.x = canvas.width/2 - boss.w/2 + Math.sin(boss.timer*0.02)*100;
    boss.y = 50;
  }
  // Boss shooting logic can be added here
}

// ----- Main Update -----
function updateAll(){
  frame++; updateStars3D();
  if(state===STATE.PLAYING){
    waveTimer--; if(waveTimer<=0){ spawnEnemy(Math.random()<0.5?'small':'shooter'); waveTimer=80; }
    updateEnemies(); updateShots(); updateDrones(); updateBoss();
    drawPlayer();
    for(let e of enemies){
      const scale=500/(500+e.z);
      const sx=e.x*scale+canvas.width/2, sy=e.y*scale+canvas.height/2;
      const sw=e.w*scale, sh=e.h*scale;
      ctx.fillStyle=e.type==='shooter'?'#ff9':'#f33';
      ctx.fillRect(sx-sw/2,sy-sh/2,sw,sh);
    }
    if(boss){
      const scale=500/(500+boss.z);
      const sx=boss.x*scale+canvas.width/2, sy=boss.y*scale+canvas.height/2;
      const sw=boss.w*scale, sh=boss.h*scale;
      ctx.fillStyle='#b0f'; ctx.fillRect(sx,sy,sw,sh);
    }
  }
  requestAnimationFrame(updateAll);
}

// ----- Start Game -----
updateAll();
console.log('Galaxy Runner Universe 3D XL Cosmic Extreme Loaded — Press Space to shoot!');
