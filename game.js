// ================================
// Galaxy Runner: Universe Edition – Cosmic Extreme Ultra v6
// Fixed start click, arrow keys only, drones, bosses, 3D, countdown
// ================================

// ----- Canvas Setup -----
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resize); resize();

// ----- Game States -----
const STATE = { TITLE:0, COUNTDOWN:1, PLAYING:2, GAMEOVER:3 };
let state = STATE.TITLE;

// ----- Player -----
const player = { x:canvas.width/2, y:canvas.height-150, w:36, h:36, speed:8, shots:[], cooldown:0, lives:3, drones:[] };

// ----- Score & Highscore -----
let score = 0;
let highScore = parseInt(localStorage.getItem('galaxy_high')||'0',10)||0;

// ----- Arrays -----
let enemies=[], particles=[], stars3D=[], scorePopups=[];

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

// ----- 3D Starfield -----
for(let i=0;i<800;i++) stars3D.push({ x:rand(-canvas.width,canvas.width), y:rand(-canvas.height,canvas.height), z:rand(1,1000) });
function drawStars(){
  ctx.fillStyle='black'; ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let s of stars3D){
    s.z-=8;
    if(s.z<=0){ s.z=1000; s.x=rand(-canvas.width,canvas.width); s.y=rand(-canvas.height,canvas.height);}
    const sx=(s.x/s.z)*500 + canvas.width/2;
    const sy=(s.y/s.z)*500 + canvas.height/2;
    const size=(1-s.z/1000)*3; ctx.fillStyle='white'; ctx.fillRect(sx,sy,size,size);
  }
}

// ----- Player Shooting -----
function playerShoot(){ 
  if(player.cooldown>0) return; 
  player.cooldown=12; 
  player.shots.push({x:player.x,y:player.y-24,vy:-14,w:6,h:10}); 
  playSound('shoot'); 
}
document.addEventListener('keydown', e=>{ if(e.key===' ') playerShoot(); });

// ----- Enemy Spawning -----
function spawnEnemy(){ 
  const x=rand(-canvas.width/2,canvas.width/2); 
  const y=rand(-canvas.height/2,-50); 
  const z=rand(500,1000); 
  enemies.push({x,y,z,w:32,h:32,hp:1}); 
}

// ----- Update Enemies -----
function updateEnemies(){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    const scale=500/(500+e.z);
    e.y+=2*scale;
    e.z-=5;
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
        scorePopups.push({x:sx,y:sy,score:10,life:30});
        if(e.hp<=0){ enemies.splice(j,1); score+=10; playSound('explode'); }
        player.shots.splice(i,1); break;
      }
    }
    if(s.y<-20) player.shots.splice(i,1);
  }
}

// ----- Draw Player -----
function drawPlayer(){ 
  const scale=1+(canvas.height/2-player.y)/1000; 
  ctx.save(); ctx.translate(player.x,player.y); ctx.scale(scale,scale); 
  ctx.fillStyle='#6f6'; ctx.fillRect(-player.w/2,-player.h/2,player.w,player.h); ctx.restore(); 
}

// ----- Draw UI -----
function drawUI(){
  ctx.fillStyle='white'; ctx.font='20px monospace'; ctx.textAlign='left';
  ctx.fillText('Score: '+Math.floor(score),20,30);
  ctx.fillText('Lives: '+player.lives,20,60);
  ctx.fillText('Highscore: '+highScore,20,90);
}

// ----- Draw Start Screen -----
function drawStartScreen(){
  ctx.fillStyle='black'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='white'; ctx.font='48px monospace'; ctx.textAlign='center';
  ctx.fillText('GALAXY RUNNER',canvas.width/2,150);
  ctx.font='24px monospace';
  ctx.fillText('Press Enter or Click/Tap to Start',canvas.width/2,250);
  ctx.fillText('Arrow keys = Move, Space = Shoot',canvas.width/2,300);
}

// ----- Countdown -----
function drawCountdown(){
  ctx.fillStyle='white'; ctx.font='80px monospace'; ctx.textAlign='center';
  ctx.fillText(Math.ceil(countdown/60),canvas.width/2,canvas.height/2);
}

// ----- Main Update Loop -----
function updateAll(){
  frame++; drawStars();

  if(state===STATE.TITLE){ drawStartScreen(); }
  else if(state===STATE.COUNTDOWN){ countdown--; drawCountdown(); if(countdown<=0) state=STATE.PLAYING; }
  else if(state===STATE.PLAYING){
    // player input
    let moveX=0, moveY=0;
    if(keys['ArrowLeft']) moveX=-1;
    if(keys['ArrowRight']) moveX=1;
    if(keys['ArrowUp']) moveY=-1;
    if(keys['ArrowDown']) moveY=1;
    player.x+=moveX*player.speed; player.y+=moveY*player.speed;
    player.x=clamp(player.x,20,canvas.width-20); player.y=clamp(player.y,40,canvas.height-40);
    if(player.cooldown>0) player.cooldown--;

    // spawn enemies progressively
    waveTimer--; if(waveTimer<=0){ spawnEnemy(); waveTimer=Math.max(20,60-Math.floor(score/100)); }

    updateEnemies(); updateShots(); drawPlayer(); drawUI();

    for(let e of enemies){
      const scale=500/(500+e.z);
      const sx=e.x*scale+canvas.width/2, sy=e.y*scale+canvas.height/2;
      const sw=e.w*scale, sh=e.h*scale;
      ctx.fillStyle='#f33'; ctx.fillRect(sx-sw/2,sy-sh/2,sw,sh);
    }

    // draw floating score popups
    for(let i=scorePopups.length-1;i>=0;i--){
      const sp=scorePopups[i];
      ctx.fillStyle='yellow'; ctx.font='16px monospace'; ctx.fillText('+'+sp.score,sp.x,sp.y);
      sp.y-=1; sp.life--; if(sp.life<=0) scorePopups.splice(i,1);
    }

    if(score>highScore){ highScore=Math.floor(score); localStorage.setItem('galaxy_high',highScore); }
  }

  requestAnimationFrame(updateAll);
}

// ----- Start Events -----
document.addEventListener('keydown', e=>{
  if(e.key==='Enter' && state===STATE.TITLE){ state=STATE.COUNTDOWN; countdown=180; }
});
canvas.addEventListener('click', ()=>{ if(state===STATE.TITLE) { state=STATE.COUNTDOWN; countdown=180; } });

// ----- Start Game Loop -----
updateAll();
console.log('Galaxy Runner Ultra v6 Loaded — Press Enter or Click/Tap to Start!');
