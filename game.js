// ================================
// game.js - Galaxy Runner: Full Arcade Version
// ================================

// ----- Canvas & resize -----
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resize);
resize();

// ----- Elements -----
const uiScore = document.getElementById('score') || document.getElementById('ui');
const uiLives = document.getElementById('lives') || document.getElementById('ui');
const uiHigh = document.getElementById('highscore');
const toastEl = document.getElementById('toast');
const overlay = document.getElementById('overlay');
const titleScreen = document.getElementById('titleScreen');
const countdownScreen = document.getElementById('countdownScreen');
const countdownBig = document.getElementById('countdownBig');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const playAgainBtn = document.getElementById('playAgain');

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');

const musicToggle = document.getElementById('musicToggle');
const sfxToggle = document.getElementById('sfxToggle') || document.getElementById('soundToggle'); // fallback
const volumeControl = document.getElementById('volume') || document.getElementById('volumeSlider');
const difficultyEl = document.getElementById('difficulty');
const controlModeEl = document.getElementById('controlMode') || document.getElementById('controlType');

const mobileControls = document.getElementById('mobileControls');
const upBtn = document.getElementById('upBtn');
const leftBtn = document.getElementById('leftBtn');
const downBtn = document.getElementById('downBtn');
const rightBtn = document.getElementById('rightBtn');
const fireBtn = document.getElementById('fireBtn');
const specialBtn = document.getElementById('specialBtn');

// ----- Game states -----
const STATE = { TITLE: 0, COUNTDOWN: 1, PLAYING: 2, GAMEOVER: 3 };
let state = STATE.TITLE;

// ----- Player -----
const player = {
  x: canvas.width/2,
  y: canvas.height-120,
  w: 36,
  h: 36,
  speed: 6,
  shots: [],
  cooldown: 0,
  lives: 3,
  shield: 0,
  rapid: false,
  spread: false,
  drones: [],
  charge: 0
};

// ----- Score/highscore -----
let score = 0;
let highScore = parseInt(localStorage.getItem('galaxy_high') || '0', 10) || 0;
if(uiHigh) uiHigh.textContent = 'High: ' + highScore;

// ----- Arrays -----
let enemies = [];
let enemyBullets = [];
let powerups = [];
let particles = [];
let boss = null;

// ----- Timers -----
let frame = 0;
let countdown = 180; // 60fps -> 3 sec
let waveTimer = 0;
let bossCooldown = 800; // when to spawn boss by timer or score

// ----- Input -----
const keys = {};
let mobileState = { up:false, down:false, left:false, right:false, fire:false, special:false };

document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup', e => { keys[e.key] = false; });

// mobile buttons handlers (if present)
function hookMobileBtn(el, prop){
  if(!el) return;
  el.addEventListener('touchstart', e => { e.preventDefault(); mobileState[prop] = true; }, {passive:false});
  el.addEventListener('touchend', e => { e.preventDefault(); mobileState[prop] = false; }, {passive:false});
}
hookMobileBtn(upBtn, 'up');
hookMobileBtn(downBtn, 'down');
hookMobileBtn(leftBtn, 'left');
hookMobileBtn(rightBtn, 'right');
hookMobileBtn(fireBtn, 'fire');
hookMobileBtn(specialBtn, 'special');

// ----- Audio -----
const SND = {
  shoot: new Audio('https://freesound.org/data/previews/341/341695_3248244-lq.mp3'),
  explode: new Audio('https://freesound.org/data/previews/219/219149_4101046-lq.mp3'),
  power: new Audio('https://freesound.org/data/previews/331/331912_3248244-lq.mp3'),
  boss: new Audio('https://freesound.org/data/previews/178/178385_3248244-lq.mp3'),
  bgm: new Audio('https://freesound.org/data/previews/458/458410_5121236-lq.mp3')
};
for(let k in SND) { if(SND[k]) SND[k].volume = 0.3; }
SND.bgm.loop = true;

// volume control
if(volumeControl){
  volumeControl.addEventListener('input', ()=> {
    const v = parseFloat(volumeControl.value);
    for(let k in SND){ if(SND[k]) SND[k].volume = Math.min(1, v); }
    SND.bgm.volume = v * 0.6;
  });
}

// sound helper
function playSound(name){
  if(!sfxToggle) return;
  const enabled = (sfxToggle.checked !== undefined) ? sfxToggle.checked : true;
  if(!enabled) return;
  if(!SND[name]) return;
  try { SND[name].currentTime = 0; SND[name].play(); } catch(e){}
}
function playBgm(){
  if(!musicToggle) return;
  if(musicToggle.checked){ try{ SND.bgm.currentTime = 0; SND.bgm.play(); } catch(e){} }
}
function stopBgm(){ try{ SND.bgm.pause(); SND.bgm.currentTime = 0; } catch(e){} }

// ----- Utilities -----
function rand(min, max){ return Math.random()*(max-min)+min; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function showToast(text, ms=1400){
  if(!toastEl) return;
  toastEl.textContent = text; toastEl.style.display = 'block';
  setTimeout(()=>{ toastEl.style.display = 'none'; }, ms);
}

// spawn particles
function spawnParticles(x,y,color,count=18){
  for(let i=0;i<count;i++){
    particles.push({
      x, y,
      vx: rand(-3,3), vy: rand(-3,3),
      life: rand(20,70),
      color
    });
  }
}

// ----- Spawning Enemies & Powerups -----
function spawnEnemy(type){
  const x = rand(40, canvas.width-40);
  const y = -40;
  if(type === 'chaser') enemies.push({x,y,w:32,h:32,type:'chaser',hp:2});
  else if(type === 'zig') enemies.push({x,y,w:30,h:30,type:'zig',hp:1,phase:rand(0,Math.PI*2)});
  else if(type === 'shooter') enemies.push({x,y,w:36,h:36,type:'shooter',hp:3,cd:120});
  else if(type === 'split') enemies.push({x,y,w:36,h:36,type:'split',hp:2});
  else enemies.push({x,y,w:28,h:28,type:'small',hp:1});
}

function spawnPowerUp(x,y){
  const types = ['shield','rapid','spread','bomb','drone','health','freeze','mult'];
  powerups.push({x,y,vy:2,type: types[Math.floor(Math.random()*types.length)]});
}

// ----- Player actions -----
function playerShoot(){
  if(player.cooldown > 0) return;
  player.cooldown = player.rapid ? 6 : 16;
  if(player.spread){
    player.shots.push({x:player.x-10,y:player.y-22,vy:-9});
    player.shots.push({x:player.x,y:player.y-24,vy:-10});
    player.shots.push({x:player.x+10,y:player.y-22,vy:-9});
  } else {
    player.shots.push({x:player.x,y:player.y-24,vy:-12});
  }
  playSound('shoot');
}

// spawn drone
function spawnDrone(){
  if(player.drones.length >= 3) return;
  player.drones.push({angle: rand(0,Math.PI*2), dist: 50, fire: 0});
  showToast('Drone Deployed',1000);
}

// apply powerup
function applyPowerup(p){
  if(p.type === 'shield'){ player.shield = 360; showToast('Shield'); }
  if(p.type === 'rapid'){ player.rapid = true; setTimeout(()=>player.rapid=false,10000); showToast('Rapid Fire'); }
  if(p.type === 'spread'){ player.spread = true; setTimeout(()=>player.spread=false,10000); showToast('Spread Shot'); }
  if(p.type === 'bomb'){ enemies.forEach(e=>spawnParticles(e.x,e.y,'orange',22)); enemies=[]; showToast('Bomb'); }
  if(p.type === 'drone'){ spawnDrone(); }
  if(p.type === 'health'){ player.lives++; showToast('Extra Life'); }
  if(p.type === 'freeze'){ enemies.forEach(e=>e.frozen = 120); showToast('Freeze'); }
  if(p.type === 'mult'){ score += 100; showToast('Score Bonus'); }
  playSound('power');
}

// ----- Boss -----
function spawnBoss(){
  boss = { x: canvas.width/2 - 160, y:-200, w:320, h:140, hp: 350, phase:1, timer:0, vx:1.5 };
  showToast('BOSS!',1500);
  playSound('boss');
}

function updateBoss(){
  if(!boss) return;
  // entry
  if(boss.y < 40) boss.y += 1.5;
  else {
    boss.timer++;
    boss.x += Math.cos(boss.timer*0.02)*boss.vx;
    // boss fires minions or bullets
    if(boss.timer % 90 === 0){
      // spawn minion enemies under boss
      for(let i=0;i<3;i++) enemies.push({ x: boss.x + 40 + i*80, y: boss.y + boss.h + 10, w: 24, h:24, type:'small', hp:1, vy:2 });
    }
    if(boss.timer % 140 === 0){
      // left-right bullet sweep
      for(let i=0;i<8;i++){
        enemyBullets.push({ x: boss.x + 20 + i*(boss.w/8), y: boss.y + boss.h, vx:0, vy:4 });
      }
    }
  }
  if(boss.hp <= 0){
    spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, 'magenta', 80);
    score += 500;
    spawnPowerUp(boss.x + boss.w/2, boss.y + boss.h/2);
    boss = null;
    showToast('Boss Defeated!',2000);
  }
}

// ----- Collision helpers -----
function rectsIntersect(a,b){
  return (Math.abs(a.x - b.x) * 2 < (a.w + b.w)) && (Math.abs(a.y - b.y) * 2 < (a.h + b.h));
}

// ----- Update loops -----
function updateEnemies(){
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    if(e.type === 'chaser'){
      const dx = player.x - e.x, dy = player.y - e.y;
      const dist = Math.hypot(dx,dy) || 1;
      e.x += (dx/dist) * 1.6;
      e.y += (dy/dist) * 1.6;
    } else if(e.type === 'zig'){
      e.phase = (e.phase || 0) + 0.08;
      e.x += Math.sin(e.phase)*2;
      e.y += 2;
    } else if(e.type === 'shooter'){
      e.y += 1.2;
      e.cd = (e.cd || 0) - 1;
      if(e.cd <= 0){
        e.cd = 100;
        // shoot towards player
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*3, vy: Math.sin(angle)*3, w:6, h:6 });
      }
    } else if(e.type === 'split'){
      e.y += 1.6;
    } else {
      e.y += 2.2;
    }

    if(e.frozen) e.frozen--;

    // offscreen
    if(e.y > canvas.height + 80 || e.x < -80 || e.x > canvas.width+80) enemies.splice(i,1);
  }
}

function updatePowerups(){
  for(let i=powerups.length-1;i>=0;i--){
    const p = powerups[i];
    p.y += p.vy;
    if(rectsIntersect(p, player)){ applyPowerup(p); powerups.splice(i,1); continue; }
    if(p.y > canvas.height + 40) powerups.splice(i,1);
  }
}

function updateShots(){
  // player shots
  for(let i=player.shots.length-1;i>=0;i--){
    const s = player.shots[i];
    s.y += s.vy;
    // hit enemy
    let hit = false;
    for(let j=enemies.length-1;j>=0;j--){
      const e = enemies[j];
      if(rectsIntersect(s, e)){
        e.hp -= 1;
        hit = true;
        spawnParticles(e.x, e.y, 'yellow', 10);
        if(e.hp <= 0){
          // split behavior
          if(e.type === 'split'){
            spawnEnemy('small'); spawnEnemy('small');
          }
          if(Math.random() < 0.25) spawnPowerUp(e.x, e.y);
          score += (e.type==='shooter'?40:10);
          playSound('explode');
          enemies.splice(j,1);
        }
        break;
      }
    }
    if(hit || s.y < -20) player.shots.splice(i,1);
  }

  // enemy bullets
  for(let i=enemyBullets.length-1;i>=0;i--){
    const b = enemyBullets[i];
    b.x += b.vx || 0; b.y += b.vy || 0;
    if(rectsIntersect(b, player)){
      enemyBullets.splice(i,1);
      player.lives--; spawnParticles(player.x, player.y, 'red', 22); playSound('explode'); shake = 8;
      if(player.lives <= 0){ state = STATE.GAMEOVER; saveHighScore(); overlay.classList.remove('hidden'); gameOverScreen.classList.remove('hidden'); finalScoreEl.textContent = 'Score: '+Math.floor(score); }
    } else if(b.y > canvas.height + 40 || b.x < -40 || b.x > canvas.width + 40) enemyBullets.splice(i,1);
  }
}

function updateDrones(){
  for(let d of player.drones){
    d.angle += 0.04;
    d.fire = (d.fire || 0) - 1;
    if(d.fire <= 0){
      // fire small particle toward nearest enemy
      let nearest = null, nd = 9999;
      for(let e of enemies){
        const dx = e.x - (player.x + Math.cos(d.angle)*d.dist), dy = e.y - (player.y + Math.sin(d.angle)*d.dist);
        const D = Math.hypot(dx,dy);
        if(D < nd){ nd = D; nearest = e; }
      }
      if(nearest && nd < 500){
        particles.push({ x: player.x + Math.cos(d.angle)*d.dist, y: player.y + Math.sin(d.angle)*d.dist, vx:(nearest.x-player.x)*0.02, vy:(nearest.y-player.y)*0.02, life:40, color:'cyan' });
      }
      d.fire = 30;
    }
  }
}

// ----- Main update -----
function spawnWave(){
  const r = Math.random();
  if(r < 0.45) { for(let i=0;i<4;i++) spawnEnemy('small'); }
  else if(r < 0.7) { for(let i=0;i<3;i++) spawnEnemy('zig'); }
  else if(r < 0.9) { for(let i=0;i<2;i++) spawnEnemy('chaser'); }
  else { spawnEnemy('shooter'); }
}

function updateAll(){
  frame++;
  // Clear transform & screen
  if(shake > 0){ ctx.setTransform(1,0,0,1, rand(-shake,shake), rand(-shake,shake)); shake--; } else ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = 'black'; ctx.fillRect(0,0,canvas.width,canvas.height);

  // State machine
  if(state === STATE.TITLE){
    overlay.classList.remove('hidden'); titleScreen.classList.remove('hidden'); countdownScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden');
  }
  else if(state === STATE.COUNTDOWN){
    overlay.classList.remove('hidden'); titleScreen.classList.add('hidden'); countdownScreen.classList.remove('hidden'); gameOverScreen.classList.add('hidden');
    countdownBig.textContent = Math.ceil(countdown / 60);
    countdown--;
    if(countdown <= 0){ state = STATE.PLAYING; overlay.classList.add('hidden'); playBgm(); }
  }
  else if(state === STATE.PLAYING){
    // hide overlays
    overlay.classList.add('hidden');

    // input movement
    let moveX = 0, moveY = 0;
    const controlMode = controlModeEl ? controlModeEl.value : 'auto';
    const useMobile = (controlMode === 'mobile' || (controlMode === 'auto' && navigator.maxTouchPoints>0));
    if(useMobile){
      if(mobileState.left) moveX = -1; if(mobileState.right) moveX = 1;
      if(mobileState.up) moveY = -1; if(mobileState.down) moveY = 1;
      if(mobileState.fire) playerShoot(); // button causes calling below also
    } else {
      if(keys['ArrowLeft']||keys['a']) moveX = -1;
      if(keys['ArrowRight']||keys['d']) moveX = 1;
      if(keys['ArrowUp']||keys['w']) moveY = -1;
      if(keys['ArrowDown']||keys['s']) moveY = 1;
      if(keys[' ']||keys['Spacebar']) { playerShoot(); }
    }

    // move player
    player.x += moveX * player.speed; player.y += moveY * player.speed;
    player.x = clamp(player.x, 20, canvas.width - 20);
    player.y = clamp(player.y, 40, canvas.height - 40);

    // cooldowns
    if(player.cooldown > 0) player.cooldown--;

    // spawn waves
    waveTimer--;
    if(waveTimer <= 0){ spawnWave(); waveTimer = clamp(80 - Math.floor(score/30), 40, 160); }

    // occasional powerup
    if(Math.random() < 0.005) spawnPowerUp(rand(60, canvas.width - 60), -20);

    // spawn boss by score
    if(score > 500 && !boss && Math.random() < 0.001) spawnBoss();

    // update actors
    updateEnemies();
    updateShots();
    updatePowerups();
    updateDrones();
    updateBoss();

    // bullets from player handled in updateShots
    // draw enemies
    for(let e of enemies){
      ctx.fillStyle = (e.type==='shooter') ? '#ff9' : (e.type==='chaser' ? '#f66' : '#f33');
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
    }
    // draw enemy bullets
    ctx.fillStyle = '#f90';
    for(let b of enemyBullets) ctx.fillRect(b.x-4,b.y-4,b.w||6,b.h||6);

    // draw powerups
    for(let p of powerups){
      ctx.beginPath(); ctx.fillStyle = '#0ff'; ctx.arc(p.x,p.y,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.font='10px monospace'; ctx.fillText(p.type[0].toUpperCase(), p.x-4, p.y+3);
    }

    // draw player shots
    ctx.fillStyle = '#6f6';
    for(let s of player.shots) ctx.fillRect(s.x-3,s.y-10,6,12);

    // draw drones
    for(let d of player.drones){
      const dx = player.x + Math.cos(d.angle) * d.dist;
      const dy = player.y + Math.sin(d.angle) * d.dist;
      ctx.fillStyle = '#0ff';
      ctx.fillRect(dx-5, dy-5, 10, 10);
      d.angle += 0.06;
    }

    // draw player
    drawPlayer();

    // draw particles
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      ctx.fillStyle = p.color; ctx.fillRect(p.x,p.y,2,2);
      p.x += p.vx; p.y += p.vy; p.life--;
      if(p.life <= 0) particles.splice(i,1);
    }

    // draw boss
    if(boss){
      ctx.fillStyle = '#b0f';
      ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
      // boss hp bar
      ctx.fillStyle = '#222'; ctx.fillRect(8,8, canvas.width-16, 12);
      ctx.fillStyle = '#f55'; ctx.fillRect(8,8, (canvas.width-16) * clamp(boss.hp/350,0,1), 12);
    }

    // UI
    if(uiScore) uiScore.textContent = 'Score: ' + Math.floor(score);
    if(uiLives) uiLives.textContent = 'Lives: ' + player.lives;
    if(uiHigh) uiHigh.textContent = 'High: ' + highScore;

    // increase score slowly
    score += 0.03;
  }
  else if(state === STATE.GAMEOVER){
    overlay.classList.remove('hidden');
    gameOverScreen.classList.remove('hidden');
  }

  frame++;
  requestAnimationFrame(updateAll);
}

// wrap playerShoot so mobile button can use it
function playerShoot(){
  if(player.cooldown > 0) return;
  player.cooldown = player.rapid ? 6 : 14;
  if(player.spread){
    player.shots.push({x:player.x-12,y:player.y-22,vy:-10,w:6,h:10});
    player.shots.push({x:player.x,y:player.y-26,vy:-12,w:6,h:10});
    player.shots.push({x:player.x+12,y:player.y-22,vy:-10,w:6,h:10});
  } else {
    player.shots.push({x:player.x,y:player.y-24,vy:-14,w:6,h:10});
  }
  playSound('shoot');
}
if(fireBtn) fireBtn.addEventListener('click', playerShoot);
if(specialBtn) specialBtn.addEventListener('click', ()=>{ spawnDrone(); });

// ----- UpdateShots function (used earlier) -----
const enemyBullets = [];
function updateShots(){
  // update player shots
  for(let i=player.shots.length-1;i>=0;i--){
    const s = player.shots[i];
    s.y += s.vy;
    // check enemy hits
    let hit = false;
    for(let j=enemies.length-1;j>=0;j--){
      const e = enemies[j];
      if(Math.abs(s.x - e.x) < (e.w/2 + 6) && Math.abs(s.y - e.y) < (e.h/2 + 6)){
        e.hp -= 1; hit = true;
        spawnParticles(e.x, e.y, 'yellow', 10);
        if(e.hp <= 0){
          if(e.type === 'split'){
            spawnEnemy('small'); spawnEnemy('small');
          }
          if(Math.random() < 0.2) spawnPowerUp(e.x, e.y);
          score += (e.type === 'shooter' ? 40 : 10);
          playSound('explode');
          enemies.splice(j,1);
        }
        break;
      }
    }
    if(hit || s.y < -20) player.shots.splice(i,1);
  }
}

// ----- Event: start / restart -----
document.addEventListener('keydown', e => {
  if(e.key === 'Enter'){
    if(state === STATE.TITLE){
      overlay.classList.add('hidden');
      state = STATE.COUNTDOWN; countdown = 180;
    } else if(state === STATE.GAMEOVER){
      // restart
      score = 0; player.lives = 3; player.shots = []; enemies = []; powerups = []; boss = null;
      overlay.classList.add('hidden'); state = STATE.COUNTDOWN; countdown = 180; playBgm();
    }
  }
});

// overlay tap to start (mobile)
overlay.addEventListener('touchstart', e => {
  e.preventDefault();
  if(state === STATE.TITLE){
    overlay.classList.add('hidden'); state = STATE.COUNTDOWN; countdown = 180;
  } else if(state === STATE.GAMEOVER){
    score = 0; player.lives = 3; player.shots = []; enemies = []; powerups = []; boss = null;
    overlay.classList.add('hidden'); state = STATE.COUNTDOWN; countdown = 180; playBgm();
  }
}, {passive:false});

// hook play again button
if(playAgainBtn) playAgainBtn.addEventListener('click', ()=>{
  score = 0; player.lives = 3; player.shots = []; enemies = []; powerups = []; boss = null;
  overlay.classList.add('hidden'); state = STATE.COUNTDOWN; countdown = 180; playBgm();
});

// settings UI
if(settingsBtn) settingsBtn.addEventListener('click', ()=> settingsPanel.classList.toggle('hidden'));
if(closeSettings) closeSettings.addEventListener('click', ()=> settingsPanel.classList.add('hidden'));

// apply control mode auto detection
(function detectControls(){
  if(controlModeEl){
    const mode = controlModeEl.value || 'auto';
    if(mode === 'auto'){
      if(navigator.maxTouchPoints && navigator.maxTouchPoints > 0){
        controlModeEl.value = 'mobile';
        if(mobileControls) mobileControls.classList.remove('hidden');
      } else {
        controlModeEl.value = 'keyboard';
        if(mobileControls) mobileControls.classList.add('hidden');
      }
    } else {
      if(mode === 'mobile'){ if(mobileControls) mobileControls.classList.remove('hidden'); }
      else { if(mobileControls) mobileControls.classList.add('hidden'); }
    }
  }
})();

// ----- Save high score -----
function saveHighScore(){
  const s = Math.floor(score);
  if(s > highScore){ highScore = s; localStorage.setItem('galaxy_high', highScore.toString()); if(uiHigh) uiHigh.textContent = 'High: ' + highScore; }
}

// ----- Start background loop -----
updateAll(); // starts RAF loop

// ----- Final notes message -----
console.log('Galaxy Runner game.js loaded — ready to play. Press Enter to start.');

// ================================
// END of game.js
// ================================
