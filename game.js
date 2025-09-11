// Galaxy Runner: Ultimate Chaos - game.js
/* Features: player, bullets, enemies (chasers/shooters/zigzag/splitter),
   powerups, drones, boss, particles, mobile controls, settings, highscore,
   sounds (uses freesound preview URLs), service worker friendly.
*/

// ----- Canvas setup -----
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resize);
resize();

// ----- Game state -----
const STATE = { TITLE:0, COUNTDOWN:1, PLAYING:2, GAMEOVER:3 };
let state = STATE.TITLE;

// UI elements
const uiScore = document.getElementById('score');
const uiLives = document.getElementById('lives');
const uiHigh = document.getElementById('highscore');
const toastEl = document.getElementById('toast');
const overlay = document.getElementById('overlay');
const titleScreen = document.getElementById('titleScreen');
const countdownScreen = document.getElementById('countdownScreen');
const countdownBig = document.getElementById('countdownBig');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgain');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');

const mobileControls = document.getElementById('mobileControls');
const controlModeSelect = document.getElementById('controlMode');

// controls
let keys = {};
document.addEventListener('keydown', e=> keys[e.key] = true);
document.addEventListener('keyup', e=> keys[e.key] = false);

// mobile buttons
['up','down','left','right','btnFire','btnSpecial'].forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('touchstart', ev=>{ ev.preventDefault(); if(id==='btnFire') mobile.fire=true; else mobile[id]=true; }, {passive:false});
  el.addEventListener('touchend', ev=>{ ev.preventDefault(); if(id==='btnFire') mobile.fire=false; else mobile[id]=false; }, {passive:false});
});

// settings
const musicToggle = document.getElementById('musicToggle');
const sfxToggle = document.getElementById('sfxToggle');
const volumeControl = document.getElementById('volume');
const difficultyEl = document.getElementById('difficulty');
const controlModeEl = document.getElementById('controlMode');

settingsBtn.onclick = ()=> settingsPanel.classList.toggle('hidden');
closeSettings.onclick = ()=> settingsPanel.classList.add('hidden');

// mobile state
let mobile = { up:false,down:false,left:false,right:false,fire:false,special:false };

// ----- Audio (simple) -----
const SND = {
  shoot: new Audio('https://freesound.org/data/previews/341/341695_3248244-lq.mp3'),
  explode: new Audio('https://freesound.org/data/previews/219/219149_4101046-lq.mp3'),
  power: new Audio('https://freesound.org/data/previews/331/331912_3248244-lq.mp3'),
  boss: new Audio('https://freesound.org/data/previews/178/178385_3248244-lq.mp3'),
  bgm: new Audio('https://freesound.org/data/previews/458/458410_5121236-lq.mp3')
};
SND.bgm.loop = true;
SND.bgm.volume = 0.3;

// apply volume control
volumeControl.addEventListener('input', ()=> {
  const v = parseFloat(volumeControl.value);
  for(let k in SND) SND[k].volume = v;
  // keep bgm slightly lower
  SND.bgm.volume = Math.max(0, v*0.6);
});

// ----- Utilities -----
function showToast(msg, t=1500){
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(()=> toastEl.classList.add('hidden'), t);
}

function rand(min,max){ return Math.random()*(max-min)+min; }
function dist(a,b){ let dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// ----- Player -----
let player = {
  x: canvas.width/2,
  y: canvas.height - 100,
  w: 36, h:36,
  speed: 6,
  cooldown: 0,
  shots: [],
  lives: 3,
  shield: 0,
  rapid: false,
  spread: false,
  drones: [],
  charge: 0
};

// ----- Score / highscore -----
let score = 0;
let highScore = parseInt(localStorage.getItem('galaxy_high')) || 0;
uiHigh.textContent = 'High: ' + highScore;

// ----- Particles -----
let particles = [];
function spawnParticles(x,y,color,count=12){
  for(let i=0;i<count;i++){
    particles.push({
      x, y,
      vx: rand(-3,3), vy: rand(-3,3),
      life: rand(30,70),
      color
    });
  }
}

// ----- Enemies -----
let enemies = [];
let enemyTimer = 0;

function spawnEnemy(type='small'){
  const x = rand(40, canvas.width-40);
  const y = -30;
  if(type==='small') enemies.push({x,y,w:28,h:28,vy:2,type:'small',hp:1});
  if(type==='fast') enemies.push({x,y,w:18,h:18,vy:4,type:'fast',hp:1});
  if(type==='tank') enemies.push({x,y,w:48,h:48,vy:1,type:'tank',hp:4});
  if(type==='zig') enemies.push({x,y,w:30,h:30,vy:2,type:'zig',hp:2,phase:rand(0,Math.PI*2)});
  if(type==='chaser') enemies.push({x,y,w:30,h:30,vy:1.6,type:'chaser',hp:2});
  if(type==='split') enemies.push({x,y,w:34,h:34,vy:2,type:'split',hp:2});
}

// enemy behavior update
function updateEnemies(){
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    if(e.type==='small' || e.type==='fast' || e.type==='tank'){
      e.y += e.vy;
    } else if(e.type==='zig'){
      e.phase += 0.08;
      e.x += Math.sin(e.phase)*2;
      e.y += e.vy;
    } else if(e.type==='chaser'){
      // move toward player
      const dx = player.x - e.x, dy = player.y - e.y;
      const ang = Math.atan2(dy,dx);
      e.x += Math.cos(ang)*1.8;
      e.y += Math.sin(ang)*1.8;
    } else if(e.type==='split'){
      e.y += e.vy;
    }

    // off-screen remove
    if(e.y > canvas.height + 60 || e.x < -80 || e.x > canvas.width+80){
      enemies.splice(i,1);
    }
  }
}

// ----- Power-ups -----
let powerups = [];
function spawnPowerup(x,y){
  const types = ['shield','rapid','spread','bomb','mega','inv','freeze','health','mult'];
  const t = types[Math.floor(Math.random()*types.length)];
  powerups.push({x,y,vy:2,type:t});
}
function updatePowerups(){
  for(let i=powerups.length-1;i>=0;i--){
    let p = powerups[i]; p.y += p.vy;
    // pickup check
    if(Math.abs(p.x-player.x) < 30 && Math.abs(p.y-player.y) < 30){
      applyPowerup(p.type); powerups.splice(i,1);
      if(sfxToggle.checked) { SND.power.currentTime = 0; SND.power.play(); }
    } else if(p.y > canvas.height+40) powerups.splice(i,1);
  }
}
function applyPowerup(type){
  if(type==='shield'){ player.shield = 300; showToast('Shield'); }
  if(type==='rapid'){ player.rapid = true; setTimeout(()=>player.rapid=false,10000); showToast('Rapid Fire'); }
  if(type==='spread'){ player.spread = true; setTimeout(()=>player.spread=false,10000); showToast('Spread'); }
  if(type==='bomb'){ enemies.forEach(e=>spawnParticles(e.x,e.y,'orange',20)); enemies=[]; showToast('Bomb'); }
  if(type==='mega'){ enemies.forEach(e=>spawnParticles(e.x,e.y,'red',30)); enemies=[]; score+=50; showToast('Mega Bomb'); }
  if(type==='inv'){ player.shield = 600; showToast('Invincible'); }
  if(type==='freeze'){ enemies.forEach(e=>{ e.vy = (e.vy||2)*0.2 }); setTimeout(()=>{ enemies.forEach(e=>{ if(e.type==='fast') e.vy=4; else e.vy=2 }) },5000); showToast('Freeze!'); }
  if(type==='health'){ player.lives++; showToast('Extra Life'); }
  if(type==='mult'){ score += 100; showToast('Score Bonus'); }
}

// ----- Player shots -----
function playerShoot(){
  if(player.cooldown > 0) return;
  player.cooldown = player.rapid ? 6 : 12;
  // spawn shots
  if(player.spread){
    player.shots.push({x:player.x-10,y:player.y-20,vy:-9});
    player.shots.push({x:player.x,y:player.y-20,vy:-9});
    player.shots.push({x:player.x+10,y:player.y-20,vy:-9});
  } else {
    player.shots.push({x:player.x,y:player.y-20,vy:-10});
  }
  if(sfxToggle.checked){ SND.shoot.currentTime = 0; SND.shoot.play(); }
}

// ----- Drones (helpers) -----
function spawnDrone(){
  const angle = rand(0,Math.PI*2);
  player.drones.push({angle:angle,dist:50,fireTimer:0});
}
function updateDrones(){
  player.drones.forEach(d=>{
    d.angle += 0.03;
    // auto-fire at closest enemy
    d.fireTimer--;
    if(d.fireTimer <= 0){
      d.fireTimer = 30;
      // find nearest enemy
      let nearest = null, nd = 9999;
      for(let e of enemies){
        const dx=e.x - (player.x + Math.cos(d.angle)*d.dist);
        const dy=e.y - (player.y + Math.sin(d.angle)*d.dist);
        const D = Math.hypot(dx,dy);
        if(D < nd){ nd = D; nearest = e; }
      }
      if(nearest && nd < 400){
        // create a small bullet from drone
        particles.push({x:player.x + Math.cos(d.angle)*d.dist, y:player.y + Math.sin(d.angle)*d.dist, vx:(nearest.x-player.x)*0.02, vy:(nearest.y-player.y)*0.02, life:40, color:'cyan'});
      }
    }
  });
}

// ----- Boss (simple multi-phase) -----
let bossObj = null;
function spawnBoss(){
  bossObj = {x:canvas.width/2 - 160, y:60, w:320, h:120, hp:200, phase:1, timer:0};
  showToast('BOSS INCOMING',2000);
  if(sfxToggle.checked){ SND.boss.currentTime = 0; SND.boss.play(); }
}
function updateBoss(){
  if(!bossObj) return;
  bossObj.timer++;
  // simple lateral movement
  bossObj.x += Math.cos(bossObj.timer*0.02)*2;
  // fire bullets each so often
  if(bossObj.timer % 60 === 0){
    // spawn some minions under boss
    for(let i=0;i<3;i++){
      enemies.push({x:bossObj.x + 40 + i*60, y: bossObj.y + bossObj.h + 10, w:24, h:24, vy:2, type:'small', hp:1});
    }
  }
  // check death
  if(bossObj.hp <= 0){
    spawnParticles(bossObj.x + bossObj.w/2, bossObj.y + bossObj.h/2, 'magenta', 80);
    showToast('BOSS DOWN!', 2000);
    bossObj = null;
    score += 500;
    // reward
    spawnPowerup(canvas.width/2, canvas.height/2);
  }
}

// ----- Collisions & updates -----
function updateShots(){
  for(let i=player.shots.length-1;i>=0;i--){
    const s = player.shots[i];
    s.y += s.vy;
    // check hit enemies
    for(let j=enemies.length-1;j>=0;j--){
      const e = enemies[j];
      if(Math.abs(s.x - e.x) < (e.w/2 + 4) && Math.abs(s.y - e.y) < (e.h/2 + 6)){
        // hit
        e.hp--;
        player.shots.splice(i,1);
        spawnParticles(e.x,e.y,'yellow',12);
        if(e.hp <= 0){
          // death behavior
          if(e.type === 'split'){
            // spawn 2 smalls
            spawnEnemy('small'); spawnEnemy('small');
          }
          // pop and maybe drop powerup
          if(Math.random() < 0.2) spawnPowerup(e.x, e.y);
          score += (e.type==='tank')?40:10;
          enemies.splice(j,1);
          if(sfxToggle.checked){ SND.explode.currentTime = 0; SND.explode.play(); }
        }
        break;
      }
    }
    // boss hit
    if(bossObj && Math.abs(s.x - (bossObj.x + bossObj.w/2)) < bossObj.w/2 && Math.abs(s.y - (bossObj.y + bossObj.h/2)) < bossObj.h/2){
      bossObj.hp -= 1;
      player.shots.splice(i,1);
      spawnParticles(s.x,s.y,'orange',8);
    }
    if(s && s.y < -10) player.shots.splice(i,1);
  }

  // decrease cooldown
  if(player.cooldown > 0) player.cooldown--;
}

function spawnEnemyWave(){
  const pattern = Math.floor(rand(0,4));
  if(pattern === 0){
    for(let i=0;i<6;i++) spawnEnemy('small');
  } else if(pattern === 1){
    for(let i=0;i<8;i++) spawnEnemy('fast');
  } else if(pattern === 2){
    for(let i=0;i<5;i++){ spawnEnemy('zig'); }
  } else {
    for(let i=0;i<4;i++){ spawnEnemy('chaser'); }
  }
}

// ----- Update loop -----
let frame = 0;
let waveTimer = 0;
let countdown = 180;

function update(){
  frame++;

  // background screen shake transform
  if(shake > 0){ ctx.setTransform(1,0,0,1,rand(-shake,shake),rand(-shake,shake)); shake--; }
  else ctx.setTransform(1,0,0,1,0,0);

  // clear
  ctx.fillStyle = 'black'; ctx.fillRect(0,0,canvas.width,canvas.height);

  // starfield (cheap)
  for(let i=0;i<40;i++){
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect((i*37 + frame)%canvas.width, (i*83)%canvas.height, 2,2);
  }

  // state machine
  if(state === STATE.TITLE){
    overlay.classList.remove('hidden'); titleScreen.classList.remove('hidden');
    countdownScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden');
  } else if(state === STATE.COUNTDOWN){
    overlay.classList.remove('hidden'); titleScreen.classList.add('hidden');
    countdownScreen.classList.remove('hidden'); gameOverScreen.classList.add('hidden');
    countdownBig.textContent = Math.ceil(countdown/60);
    countdown--;
    if(countdown <= 0){ state = STATE.PLAYING; overlay.classList.add('hidden'); }
  } else if(state === STATE.PLAYING){
    // gameplay updates
    // spawn waves
    waveTimer--;
    enemyTimer--;
    if(enemyTimer <= 0){
      spawnEnemyWave();
      enemyTimer = Math.max(40, 220 - (difficultyEl.value === 'easy' ? 0 : difficultyEl.value === 'hard' ? 40 : difficultyEl.value==='insane'?120: 60));
    }

    updateEnemies();
    updatePowerups();
    updateShots();
    updateDrones();
    updateBoss(); // bossObj logic

    // draw enemies
    for(let e of enemies){
      ctx.fillStyle = (e.type==='tank')?'#a00':(e.type==='fast')?'#fb7':'#f55';
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
    }

    // draw powerups
    for(let p of powerups){
      ctx.beginPath(); ctx.fillStyle = '#0ff'; ctx.arc(p.x,p.y,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.font='10px monospace'; ctx.fillText(p.type[0].toUpperCase(), p.x-4, p.y+3);
    }

    // draw boss if exists
    if(bossObj){
      ctx.fillStyle = '#b0f';
      ctx.fillRect(bossObj.x, bossObj.y, bossObj.w, bossObj.h);
      // hp bar
      ctx.fillStyle = '#600';
      ctx.fillRect(10,10,canvas.width-20,8);
      ctx.fillStyle = '#f88';
      ctx.fillRect(10,10,(canvas.width-20)*Math.max(0,bossObj.hp/200),8);
    }

    // draw player shots
    ctx.fillStyle = '#6f6';
    for(let s of player.shots) ctx.fillRect(s.x-3,s.y-10,6,12);

    // draw drones
    for(let d of player.drones){
      const dx = player.x + Math.cos(d.angle) * d.dist;
      const dy = player.y + Math.sin(d.angle) * d.dist;
      ctx.fillStyle = '#0ff'; ctx.fillRect(dx-4,dy-4,8,8);
    }

    // draw player
    ctx.save(); ctx.translate(player.x, player.y);
    ctx.fillStyle = '#0ff';
    ctx.beginPath(); ctx.moveTo(0,-player.h/2); ctx.lineTo(-player.w/2,player.h/2); ctx.lineTo(player.w/2,player.h/2); ctx.closePath(); ctx.fill();
    if(player.shield>0){
      ctx.strokeStyle = 'rgba(0,255,255,0.6)'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(0,0,player.w,0,Math.PI*2); ctx.stroke();
      player.shield--;
    }
    ctx.restore();

    // particles
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      ctx.fillStyle = p.color; ctx.fillRect(p.x,p.y,2,2);
      p.x += p.vx; p.y += p.vy; p.life--;
      if(p.life <= 0) particles.splice(i,1);
    }

    // collisions: enemy hits player
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      if(Math.abs(e.x - player.x) < (e.w/2 + player.w/2) && Math.abs(e.y - player.y) < (e.h/2 + player.h/2)){
        // hit
        spawnParticles(player.x,player.y,'red',22);
        enemies.splice(i,1);
        player.lives--;
        shake = 8;
        if(sfxToggle.checked){ SND.explode.currentTime = 0; SND.explode.play(); }
        if(player.lives <= 0){ state = STATE.GAMEOVER; saveHighScore(); finalScore.textContent = 'Score: ' + score; overlay.classList.remove('hidden'); gameOverScreen.classList.remove('hidden'); }
      }
    }

    // update UI & score growth
    score += 0.02;
    uiScore.textContent = 'Score: ' + Math.floor(score);
    uiLives.textContent = 'Lives: ' + player.lives;
    uiHigh.textContent = 'High: ' + highScore;

  } else if(state === STATE.GAMEOVER){
    overlay.classList.remove('hidden'); titleScreen.classList.add('hidden'); countdownScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
  }

  // draw fps-ish / frame increment done below
}

// ----- helper updates -----
function updateDrones(){
  for(let d of player.drones){
    d.angle += 0.05;
    // position update done when drawing
  }
}

function updateBoss(){
  if(!bossObj) return;
  bossObj.timer = (bossObj.timer || 0) + 1;
  // attacks spawn minions occasionally
  if(bossObj.timer % 120 === 0){
    for(let i=0;i<3;i++){
      spawnEnemy('small');
    }
  }
}

// ----- Spawning timers / waves -----
setInterval(()=>{
  if(state !== STATE.PLAYING) return;
  // every N seconds spawn some enemies randomly
  const r = Math.random();
  if(r < 0.5) spawnEnemy('small');
  if(r >= 0.5 && r < 0.75) spawnEnemy('zig');
  if(r >= 0.75 && r < 0.9) spawnEnemy('fast');
  if(r >= 0.9) spawnEnemy('chaser');

  // occasionally spawn a powerup
  if(Math.random() < 0.06) spawnPowerup(rand(60, canvas.width-60), -20);

  // occasionally spawn boss based on score
  if(score > 500 && !bossObj && Math.random() < 0.01) spawnBoss();
}, 700);

// ----- Input handling (shoot) -----
document.addEventListener('keydown', e=>{
  // shoot = space
  if(e.key === ' ' && state === STATE.PLAYING){
    playerShoot();
  }
  // start
  if(e.key === 'Enter'){
    if(state === STATE.TITLE) { overlay.classList.add('hidden'); countdown = 180; state = STATE.COUNTDOWN; }
    if(state === STATE.GAMEOVER){ score = 0; player.lives = 3; player.x = canvas.width/2; player.y = canvas.height-120; state = STATE.COUNTDOWN; overlay.classList.add('hidden'); countdown = 120; }
  }
});

// mobile start: tap overlay to start
overlay.addEventListener('touchstart', e=>{
  if(state === STATE.TITLE){ overlay.classList.add('hidden'); state = STATE.COUNTDOWN; countdown = 120; }
});

// play again button
playAgainBtn && (playAgainBtn.onclick = ()=>{
  score = 0; player.lives = 3; player.x = canvas.width/2; player.y = canvas.height-120;
  state = STATE.COUNTDOWN; overlay.classList.add('hidden'); countdown = 120;
});

// expose some functions for buttons
function playerShoot(){ if(player.cooldown <= 0){ player.cooldown = player.rapid ? 6 : 14; player.shots.push({x:player.x, y:player.y-24, vy:-12}); if(player.spread){ player.shots.push({x:player.x-12,y:player.y-20,vy:-10}); player.shots.push({x:player.x+12,y:player.y-20,vy:-10}); } if(sfxToggle.checked){ SND.shoot.currentTime = 0; SND.shoot.play(); } } }
document.getElementById('btnFire')?.addEventListener('click', ()=> playerShoot());

// spawn helpers (drone) button
document.getElementById('btnSpecial')?.addEventListener('click', ()=>{
  if(player.drones.length < 3){ spawnDrone(); showToast('Drone deployed'); }
});

// ----- Main render loop -----
function mainLoop(){
  // basic update (logic above)
  update();
  // draw UI overlays already drawn in update()
  requestAnimationFrame(mainLoop);
}
mainLoop();

// store high score
function saveHighScore(){
  const s = Math.floor(score);
  if(s > highScore){ highScore = s; localStorage.setItem('galaxy_high', highScore); }
}

// initial UI
document.getElementById('showHigh').innerText = 'High Score: ' + highScore;

// auto-detect control mode
(function autoControlDetect(){
  if(navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent)){
    controlModeEl.value = 'mobile';
    document.getElementById('mobileControls').classList.remove('hidden');
  } else {
    controlModeEl.value = 'keyboard';
    document.getElementById('mobileControls').classList.add('hidden');
  }
})();

// game ready toast
showToast('Ready — press Enter to start', 2000);
