// ================================
// Galaxy Runner: Universe Edition 3D XL – Cosmic Extreme v3
// Controls Overlay Included
// ================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resize); resize();

// ----- Game States -----
const STATE = { TITLE:0, CONTROLS:1, COUNTDOWN:2, PLAYING:3, GAMEOVER:4 };
let state = STATE.TITLE;

// ----- Player -----
const player = { x:canvas.width/2, y:canvas.height-150, w:36, h:36, speed:8, shots:[], cooldown:0, lives:3, drones:[] };

// ----- Score -----
let score = 0, highScore = parseInt(localStorage.getItem('galaxy_high')||'0',10)||0;

// ----- Arrays -----
let enemies=[], powerups=[], particles=[], boss=null, stars3D=[];

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
  boss:new Audio('https://freesound.org/data/previews/178/178385_3248244-lq.mp3')
};
for(let k in SND) if(SND[k]) SND[k].volume=0.3;

// ----- Utilities -----
function rand(min,max){ return Math.random()*(max-min)+min; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function playSound(name){ try{ if(SND[name]){ SND[name].currentTime=0; SND[name].play(); } }catch(e){} }
function spawnParticles(x,y,color,count=20){ for(let i=0;i<count;i++) particles.push({x,y,vx:rand(-3,3),vy:rand(-3,3),vz:rand(-2,2),life:rand(20,50),color}); }

// ----- Starfield 3D -----
for(let i=0;i<800;i++) stars3D.push({ x:rand(-canvas.width,canvas.width), y:rand(-canvas.height,canvas.height), z:rand(1,1000) });
function updateStars3D(){
  ctx.fillStyle='black'; ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let s of stars3D){
    s.z-=8; if(s.z<=0){ s.z=1000; s.x=rand(-canvas.width,canvas.width); s.y=rand(-canvas.height,canvas.height);}
    const sx=(s.x/s.z)*500 + canvas.width/2;
    const sy=(s.y/s.z)*500 + canvas.height/2;
    const size=(1-s.z/1000)*3; ctx.fillStyle='white'; ctx.fillRect(sx,sy,size,size);
  }
}

// ----- Player Shoot -----
function playerShoot(){ if(player.cooldown>0) return; player.cooldown=12; player.shots.push({x:player.x,y:player.y-24,vy:-14,w:6,h:10}); playSound('shoot'); }
document.addEventListener('keydown', e=>{ if(e.key===' ') playerShoot(); });

// ----- Enemy Spawn -----
function spawnEnemy(){ const x=rand(-canvas.width/2,canvas.width/2); const y=rand(-canvas.height/2,-50); const z=rand(500,1000); enemies.push({x,y,z,w:32,h:32,hp:1}); }

// ----- Update Enemies -----
function updateEnemies(){
  for(let i=enemies.length-1;i>=0;i--){ const e=enemies[i]; const scale=500/(500+e.z); e.y+=2*scale; e.z-=5; if(e.z<=0||e.y>canvas.height+100) enemies.splice(i,1); }
}

// ----- Update Shots -----
function updateShots(){
  for(let i=player.shots.length-1;i>=0;i--){ const s=player.shots[i]; s.y+=s.vy;
    for(let j=enemies.length-1;j>=0;j--){ const e=enemies[j]; const scale=500/(500+e.z); const sx=e.x*scale+canvas.width/2, sy=e.y*scale+canvas.height/2; const sw=e.w*scale, sh=e.h*scale;
      if(Math.abs(s.x-sx)<sw/2 && Math.abs(s.y-sy)<sh/2){ e.hp--; spawnParticles(sx,sy,'yellow',10); if(e.hp<=0){ enemies.splice(j,1); score+=10; playSound('explode'); } player.shots.splice(i,1); break; }
    } if(s.y<-20) player.shots.splice(i,1);
  }
}

// ----- Draw Player -----
function drawPlayer(){ const scale=1+(canvas.height/2-player.y)/1000; ctx.save(); ctx.translate(player.x,player.y); ctx.scale(scale,scale); ctx.fillStyle='#6f6'; ctx.fillRect(-player.w/2,-player.h/2,player.w,player.h); ctx.restore(); }

// ----- Controls Overlay -----
function drawControlsOverlay(){
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='white'; ctx.font='24px monospace'; ctx.textAlign='center';
  ctx.fillText('Galaxy Runner: Universe Edition 3D XL',canvas.width/2,100);
  ctx.font='20px monospace';
  ctx.fillText('Controls:',canvas.width/2,180);
  ctx.fillText('Arrow Keys / WASD = Move',canvas.width/2,220);
  ctx.fillText('Space = Shoot',canvas.width/2,260);
  ctx.fillText('D = Deploy Drone',canvas.width/2,300);
  ctx.fillText('S = Activate Shield',canvas.width/2,340);
  ctx.fillText('Tap / Click to Continue',canvas.width/2,400);
}

// ----- Start / Overlay Click -----
canvas.addEventListener('click', ()=>{ if(state===STATE.TITLE||state===STATE.CONTROLS){ state=STATE.COUNTDOWN; countdown=180; } });

// ----- Main Update -----
function updateAll(){
  frame++; updateStars3D();
  if(state===STATE.TITLE){ drawControlsOverlay(); state=STATE.CONTROLS; return; }
  else if(state===STATE.COUNTDOWN){ countdown--; ctx.fillStyle='white'; ctx.font='80px monospace'; ctx.fillText(Math.ceil(countdown/60),canvas.width/2,canvas.height/2); if(countdown<=0) state=STATE.PLAYING; }
  else if(state===STATE.PLAYING){
    waveTimer--; if(waveTimer<=0){ spawnEnemy(); waveTimer=60; }
    updateEnemies(); updateShots();
    drawPlayer();
    for(let e of enemies){ const scale=500/(500+e.z); const sx=e.x*scale+canvas.width/2, sy=e.y*scale+canvas.height/2, sw=e.w*scale, sh=e.h*scale; ctx.fillStyle='#f33'; ctx.fillRect(sx-sw/2,sy-sh/2,sw,sh); }
    for(let s of player.shots){ ctx.fillStyle='#6f6'; ctx.fillRect(s.x-3,s.y-10,6,12); }
  }
  requestAnimationFrame(updateAll);
}

// ----- Start Game -----
updateAll();
console.log('Galaxy Runner 3D XL Cosmic Extreme Loaded — Click / Tap to see controls and start, Space to shoot!');
