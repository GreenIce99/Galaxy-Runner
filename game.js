// game.js - Galaxy Runner: cleaned, fixed, and improved
// Drop into same folder as index.html + style.css

// ---------- Helpers / DOM safe lookups ----------
const $ = id => document.getElementById(id) || null;
const canvas = $('game');
if(!canvas){
  console.error('Canvas element with id="game" not found. Create <canvas id="game"></canvas> in your HTML.');
}
const ctx = canvas ? canvas.getContext('2d') : null;
function safeGet(id){ return $(id); }

// ensure canvas size
function resize(){ if(!canvas) return; canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resize);
resize();

// UI elements (optional — code tolerates missing ones)
const uiScore = safeGet('score');
const uiLives = safeGet('lives');
const uiHigh = safeGet('highscore');
const toastEl = safeGet('toast');
const overlay = safeGet('overlay');
const titleScreen = safeGet('titleScreen');
const countdownScreen = safeGet('countdownScreen');
const countdownBig = safeGet('countdownBig');
const gameOverScreen = safeGet('gameOverScreen');
const finalScoreEl = safeGet('finalScore');
const playAgainBtn = safeGet('playAgain');
const settingsBtn = safeGet('settingsBtn');
const settingsPanel = safeGet('settingsPanel');
const closeSettings = safeGet('closeSettings');
const musicToggle = safeGet('musicToggle');
const sfxToggle = safeGet('sfxToggle') || safeGet('soundToggle');
const volumeControl = safeGet('volume') || safeGet('volumeSlider');
const controlModeEl = safeGet('controlMode') || safeGet('controlType');

// mobile
const mobileControls = safeGet('mobileControls');
const upBtn = safeGet('upBtn');
const leftBtn = safeGet('leftBtn');
const downBtn = safeGet('downBtn');
const rightBtn = safeGet('rightBtn');
const fireBtn = safeGet('fireBtn');
const specialBtn = safeGet('specialBtn');

// ---------- Game state ----------
const STATE = { TITLE: 0, COUNTDOWN: 1, PLAYING: 2, GAMEOVER: 3 };
let state = STATE.TITLE;
let frame = 0;
let shake = 0;

// ---------- Player ----------
const player = {
  x: (canvas ? canvas.width/2 : 400),
  y: (canvas ? canvas.height-120 : 400),
  w: 36, h: 36,
  speed: 6,
  shots: [],
  cooldown: 0,
  lives: 3,
  shield: 0,
  rapid: false,
  spread: false,
  drones: [],
};

// ---------- Score ----------
let score = 0;
let highScore = parseInt(localStorage.getItem('galaxy_high') || '0', 10) || 0;
if(uiHigh) uiHigh.textContent = 'High: ' + highScore;

// ---------- Arrays ----------
let enemies = [];
let enemyBullets = [];
let powerups = [];
let particles = [];
let boss = null;

// ---------- Timers ----------
let countdown = 180; // 60fps ~ 3s
let waveTimer = 0;

// ---------- Input ----------
const keys = {};
let mobileState = { up:false, down:false, left:false, right:false, fire:false, special:false };
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup', e => { keys[e.key] = false; });

// hook mobile buttons safely
function hookMobileBtn(el, prop){
  if(!el) return;
  el.addEventListener('touchstart', e => { e.preventDefault(); mobileState[prop] = true; }, {passive:false});
  el.addEventListener('touchend', e => { e.preventDefault(); mobileState[prop] = false; }, {passive:false});
}
hookMobileBtn(upBtn,'up'); hookMobileBtn(downBtn,'down'); hookMobileBtn(leftBtn,'left'); hookMobileBtn(rightBtn,'right');
hookMobileBtn(fireBtn,'fire'); hookMobileBtn(specialBtn,'special');

// ---------- Audio (safe) ----------
const SND = {
  shoot: createAudio('https://freesound.org/data/previews/341/341695_3248244-lq.mp3'),
  explode: createAudio('https://freesound.org/data/previews/219/219149_4101046-lq.mp3'),
  power: createAudio('https://freesound.org/data/previews/331/331912_3248244-lq.mp3'),
  boss: createAudio('https://freesound.org/data/previews/178/178385_3248244-lq.mp3'),
  bgm: createAudio('https://freesound.org/data/previews/458/458410_5121236-lq.mp3', true)
};
function createAudio(src, loop=false){
  try{
    const a = new Audio(src);
    a.loop = !!loop;
    a.volume = 0.3;
    return a;
  }catch(e){
    return null;
  }
}
if(volumeControl){
  volumeControl.addEventListener('input', ()=> {
    const v = parseFloat(volumeControl.value);
    for(let k in SND){ if(SND[k]) SND[k].volume = Math.min(1, v); }
    if(SND.bgm) SND.bgm.volume = v * 0.6;
  });
}
function playSound(name){
  if(!name) return;
  const enabled = (sfxToggle && typeof sfxToggle.checked !== 'undefined') ? sfxToggle.checked : true;
  if(!enabled) return;
  if(!SND[name]) return;
  try{ SND[name].currentTime = 0; SND[name].play(); }catch(e){}
}
function playBgm(){ if(musicToggle && !musicToggle.checked) return; if(SND.bgm) try{ SND.bgm.currentTime=0; SND.bgm.play(); }catch(e){} }
function stopBgm(){ if(SND.bgm) try{ SND.bgm.pause(); SND.bgm.currentTime=0; }catch(e){} }

// ---------- Utilities ----------
function rand(min,max){ return Math.random()*(max-min)+min; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function showToast(text, ms=1200){ if(!toastEl) return; toastEl.textContent = text; toastEl.style.display='block'; setTimeout(()=>{ toastEl.style.display='none'; }, ms); }

// ---------- Spawning ----------
function spawnEnemy(type='small'){
  const x = rand(40, (canvas?canvas.width:800)-40);
  const y = -40;
  if(type==='chaser') enemies.push({x,y,w:32,h:32,type:'chaser',hp:2});
  else if(type==='zig') enemies.push({x,y,w:30,h:30,type:'zig',hp:1,phase:rand(0,Math.PI*2)});
  else if(type==='shooter') enemies.push({x,y,w:36,h:36,type:'shooter',hp:3,cd:120});
  else if(type==='split') enemies.push({x,y,w:36,h:36,type:'split',hp:2});
  else enemies.push({x,y,w:28,h:28,type:'small',hp:1});
}
function spawnPowerUp(x,y){
  const types = ['shield','rapid','spread','bomb','drone','health','freeze','mult'];
  powerups.push({x,y,vy:2,type: types[Math.floor(Math.random()*types.length)]});
}

// ---------- Player actions ----------
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

// ----- Drones & powerups -----
function spawnDrone(){
  if(player.drones.length >= 3) return;
  player.drones.push({angle: rand(0,Math.PI*2), dist: 60, fire: 0});
  showToast('Drone Deployed',1000);
}
function applyPowerup(p){
  if(!p) return;
  switch(p.type){
    case 'shield': player.shield = 360; showToast('Shield'); break;
    case 'rapid': player.rapid = true; setTimeout(()=>player.rapid=false,10000); showToast('Rapid Fire'); break;
    case 'spread': player.spread = true; setTimeout(()=>player.spread=false,10000); showToast('Spread Shot'); break;
    case 'bomb': enemies.forEach(e=>spawnParticles(e.x,e.y,'orange',22)); enemies=[]; showToast('Bomb'); break;
    case 'drone': spawnDrone(); break;
    case 'health': player.lives++; showToast('Extra Life'); break;
    case 'freeze': enemies.forEach(e=>e.frozen = 120); showToast('Freeze'); break;
    case 'mult': score += 100; showToast('Score Bonus'); break;
  }
  playSound('power');
}

// ---------- Boss ----------
function spawnBoss(){
  boss = { x: (canvas?canvas.width/2 - 160:240), y:-200, w:320, h:140, hp: 350, timer:0, vx:1.5 };
  showToast('BOSS!',1500); playSound('boss');
}
function updateBoss(){
  if(!boss) return;
  if(boss.y < 40) boss.y += 1.5;
  else {
    boss.timer++;
    boss.x += Math.cos(boss.timer*0.02)*boss.vx;
    if(boss.timer % 90 === 0){
      for(let i=0;i<3;i++) enemies.push({ x: boss.x + 40 + i*80, y: boss.y + boss.h + 10, w: 24, h:24, type:'small', hp:1, vy:2 });
    }
    if(boss.timer % 140 === 0){
      for(let i=0;i<8;i++){
        enemyBullets.push({ x: boss.x + 20 + i*(boss.w/8), y: boss.y + boss.h, vx:0, vy:4 });
      }
    }
  }
  if(boss.hp <= 0){
    spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, 'magenta', 80);
    score += 500; spawnPowerUp(boss.x + boss.w/2, boss.y + boss.h/2);
    boss = null; showToast('Boss Defeated!',2000);
  }
}

// ---------- Particles ----------
function spawnParticles(x,y,color,count=18){
  for(let i=0;i<count;i++){
    particles.push({ x,y, vx: rand(-3,3), vy: rand(-3,3), life: rand(20,70), color });
  }
}

// ---------- Collisions ----------
function rectsIntersect(a,b){
  if(!a||!b) return false;
  const aw = a.w || 10, ah = a.h || 10, bw = b.w || 10, bh = b.h || 10;
  return (Math.abs(a.x - b.x) * 2 < (aw + bw)) && (Math.abs(a.y - b.y) * 2 < (ah + bh));
}

// ---------- Updates ----------
function updateEnemies(){
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    if(e.type === 'chaser'){
      const dx = player.x - e.x, dy = player.y - e.y;
      const dist = Math.hypot(dx,dy) || 1;
      e.x += (dx/dist) * 1.6; e.y += (dy/dist) * 1.6;
    } else if(e.type === 'zig'){
      e.phase = (e.phase || 0) + 0.08;
      e.x += Math.sin(e.phase)*2; e.y += 2;
    } else if(e.type === 'shooter'){
      e.y += 1.2;
      e.cd = (e.cd || 0) - 1;
      if(e.cd <= 0){
        e.cd = 100;
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*3, vy: Math.sin(angle)*3, w:6, h:6 });
      }
    } else if(e.type === 'split'){
      e.y += 1.6;
    } else { e.y += 2.2; }

    if(e.frozen) e.frozen--;

    if(e.y > (canvas?canvas.height:800) + 80 || e.x < -80 || e.x > (canvas?canvas.width:800)+80) enemies.splice(i,1);
  }
}

function updatePowerups(){
  for(let i=powerups.length-1;i>=0;i--){
    const p = powerups[i];
    p.y += p.vy;
    if(rectsIntersect(p, player)){ applyPowerup(p); powerups.splice(i,1); continue; }
    if(p.y > (canvas?canvas.height:800) + 40) powerups.splice(i,1);
  }
}

function updateShots(){
  // player shots
  for(let i=player.shots.length-1;i>=0;i--){
    const s = player.shots[i];
    s.y += s.vy;
    let hit = false;
    for(let j=enemies.length-1;j>=0;j--){
      const e = enemies[j];
      if(Math.abs(s.x - e.x) < (e.w/2 + 6) && Math.abs(s.y - e.y) < (e.h/2 + 6)){
        e.hp -= 1; hit = true; spawnParticles(e.x, e.y, 'yellow', 10);
        if(e.hp <= 0){
          if(e.type === 'split'){ spawnEnemy('small'); spawnEnemy('small'); }
          if(Math.random() < 0.25) spawnPowerUp(e.x, e.y);
          score += (e.type === 'shooter' ? 40 : 10);
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
      if(player.lives <= 0){
        state = STATE.GAMEOVER; saveHighScore();
        if(overlay) overlay.classList.remove('hidden');
        if(gameOverScreen) gameOverScreen.classList.remove('hidden');
        if(finalScoreEl) finalScoreEl.textContent = 'Score: '+Math.floor(score);
      }
    } else if(b.y > (canvas?canvas.height:800) + 40 || b.x < -40 || b.x > (canvas?canvas.width:800) + 40) enemyBullets.splice(i,1);
  }
}

function updateDrones(){
  for(let d of player.drones){
    d.angle += 0.04;
    d.fire = (d.fire || 0) - 1;
    if(d.fire <= 0){
      let nearest = null, nd = 9999;
      for(let e of enemies){
        const ex = player.x + Math.cos(d.angle)*d.dist;
        const ey = player.y + Math.sin(d.angle)*d.dist;
        const dx = e.x - ex, dy = e.y - ey;
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

// ---------- Spawning waves ----------
function spawnWave(){
  const r = Math.random();
  if(r < 0.45) { for(let i=0;i<4;i++) spawnEnemy('small'); }
  else if(r < 0.7) { for(let i=0;i<3;i++) spawnEnemy('zig'); }
  else if(r < 0.9) { for(let i=0;i<2;i++) spawnEnemy('chaser'); }
  else { spawnEnemy('shooter'); }
}

// ---------- Draw helpers ----------
function drawPlayer(){
  if(!ctx) return;
  ctx.save();
  ctx.fillStyle = '#6cf';
  ctx.fillRect(player.x - player.w/2, player.y - player.h/2, player.w, player.h);
  if(player.shield > 0){
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,200,255,0.6)';
    ctx.lineWidth = 3;
    ctx.arc(player.x, player.y, Math.max(player.w, player.h), 0, Math.PI*2);
    ctx.stroke();
    player.shield--;
  }
  ctx.restore();
}

// ---------- Main loop ----------
function updateAll(){
  frame++;
  if(!ctx || !canvas) { requestAnimationFrame(updateAll); return; }

  // screen shake
  if(shake > 0){ ctx.setTransform(1,0,0,1, rand(-shake,shake), rand(-shake,shake)); shake--; } else ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = 'black'; ctx.fillRect(0,0,canvas.width,canvas.height);

  // state machine
  if(state === STATE.TITLE){
    if(overlay) overlay.classList.remove('hidden');
    if(titleScreen) titleScreen.classList.remove('hidden');
    if(countdownScreen) countdownScreen.classList.add('hidden');
    if(gameOverScreen) gameOverScreen.classList.add('hidden');
  }
  else if(state === STATE.COUNTDOWN){
    if(overlay) overlay.classList.remove('hidden');
    if(titleScreen) titleScreen.classList.add('hidden');
    if(countdownScreen) countdownScreen.classList.remove('hidden');
    if(countdownBig) countdownBig.textContent = Math.ceil(countdown/60);
    countdown--;
    if(countdown <= 0){
      state = STATE.PLAYING;
      if(overlay) overlay.classList.add('hidden');
      playBgm();
    }
  }
  else if(state === STATE.PLAYING){
    if(overlay) overlay.classList.add('hidden');
    // input
    let moveX = 0, moveY = 0;
    const controlMode = controlModeEl ? controlModeEl.value : 'auto';
    const useMobile = (controlMode === 'mobile' || (controlMode === 'auto' && navigator.maxTouchPoints>0));
    if(useMobile){
      if(mobileState.left) moveX = -1; if(mobileState.right) moveX = 1;
      if(mobileState.up) moveY = -1; if(mobileState.down) moveY = 1;
      if(mobileState.fire) playerShoot();
    } else {
      if(keys['ArrowLeft']||keys['a']) moveX = -1;
      if(keys['ArrowRight']||keys['d']) moveX = 1;
      if(keys['ArrowUp']||keys['w']) moveY = -1;
      if(keys['ArrowDown']||keys['s']) moveY = 1;
      if(keys[' ']||keys['Spacebar']) playerShoot();
    }

    player.x += moveX * player.speed; player.y += moveY * player.speed;
    player.x = clamp(player.x, 20, canvas.width - 20);
    player.y = clamp(player.y, 40, canvas.height - 40);

    if(player.cooldown > 0) player.cooldown--;

    // spawn waves
    waveTimer--;
    if(waveTimer <= 0){ spawnWave(); waveTimer = clamp(80 - Math.floor(score/30), 40, 160); }

    // random powerups
    if(Math.random() < 0.006) spawnPowerUp(rand(60, canvas.width - 60), -20);

    // boss trigger by score
    if(score > 500 && !boss && Math.random() < 0.0015) spawnBoss();

    // updates
    updateEnemies();
    updateShots();
    updatePowerups();
    updateDrones();
    updateBoss();

    // draw actors
    for(let e of enemies){
      ctx.fillStyle = (e.type==='shooter') ? '#ff9' : (e.type==='chaser' ? '#f66' : '#f33');
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
    }
    ctx.fillStyle = '#f90';
    for(let b of enemyBullets) ctx.fillRect(b.x-4,b.y-4,b.w||6,b.h||6);

    for(let p of powerups){
      ctx.beginPath(); ctx.fillStyle = '#0ff'; ctx.arc(p.x,p.y,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000'; ctx.font='10px monospace'; ctx.fillText((p.type||'?')[0].toUpperCase(), p.x-4, p.y+3);
    }

    ctx.fillStyle = '#6f6';
    for(let s of player.shots) ctx.fillRect(s.x-3,s.y-10,6,12);

    for(let d of player.drones){
      const dx = player.x + Math.cos(d.angle) * d.dist;
      const dy = player.y + Math.sin(d.angle) * d.dist;
      ctx.fillStyle = '#0ff';
      ctx.fillRect(dx-5, dy-5, 10, 10);
    }

    drawPlayer();

    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      ctx.fillStyle = p.color; ctx.fillRect(p.x,p.y,2,2);
      p.x += p.vx; p.y += p.vy; p.life--;
      if(p.life <= 0) particles.splice(i,1);
    }

    if(boss){
      ctx.fillStyle = '#b0f'; ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
      ctx.fillStyle = '#222'; ctx.fillRect(8,8, canvas.width-16, 12);
      ctx.fillStyle = '#f55'; ctx.fillRect(8,8, (canvas.width-16) * clamp(boss.hp/350,0,1), 12);
    }

    // UI
    if(uiScore) uiScore.textContent = 'Score: ' + Math.floor(score);
    if(uiLives) uiLives.textContent = 'Lives: ' + player.lives;
    if(uiHigh) uiHigh.textContent = 'High: ' + highScore;

    // gently increase score
    score += 0.03;
  }
  else if(state === STATE.GAMEOVER){
    if(overlay) overlay.classList.remove('hidden');
    if(gameOverScreen) gameOverScreen.classList.remove('hidden');
  }

  requestAnimationFrame(updateAll);
}

// ---------- Save high score ----------
function saveHighScore(){
  const s = Math.floor(score);
  if(s > highScore){ highScore = s; localStorage.setItem('galaxy_high', highScore.toString()); if(uiHigh) uiHigh.textContent = 'High: ' + highScore; }
}

// ---------- Input: Enter / overlay ----------
document.addEventListener('keydown', e => {
  if(e.key === 'Enter'){
    if(state === STATE.TITLE){
      if(overlay) overlay.classList.add('hidden');
      state = STATE.COUNTDOWN; countdown = 180;
    } else if(state === STATE.GAMEOVER){
      restartGame();
    }
  }
});

// overlay tap (mobile) - safe if overlay exists
if(overlay){
  overlay.addEventListener('touchstart', e => {
    e.preventDefault();
    if(state === STATE.TITLE){
      if(overlay) overlay.classList.add('hidden');
      state = STATE.COUNTDOWN; countdown = 180;
    } else if(state === STATE.GAMEOVER){
      restartGame();
    }
  }, {passive:false});
}

// play again handler
if(playAgainBtn) playAgainBtn.addEventListener('click', restartGame);
function restartGame(){
  score = 0; player.lives = 3; player.shots = []; enemies = []; powerups = []; boss = null;
  if(overlay) overlay.classList.add('hidden');
  state = STATE.COUNTDOWN; countdown = 180;
  playBgm();
}

// settings UI
if(settingsBtn && settingsPanel) settingsBtn.addEventListener('click', ()=> settingsPanel.classList.toggle('hidden'));
if(closeSettings && settingsPanel) closeSettings.addEventListener('click', ()=> settingsPanel.classList.add('hidden'));

// control mode auto-detect
(function detectControls(){
  if(controlModeEl){
    const mode = controlModeEl.value || 'auto';
    if(mode === 'auto'){
      if(navigator.maxTouchPoints && navigator.maxTouchPoints > 0){
        controlModeEl.value = 'mobile'; if(mobileControls) mobileControls.classList.remove('hidden');
      } else {
        controlModeEl.value = 'keyboard'; if(mobileControls) mobileControls.classList.add('hidden');
      }
    } else {
      if(mode === 'mobile'){ if(mobileControls) mobileControls.classList.remove('hidden'); }
      else { if(mobileControls) mobileControls.classList.add('hidden'); }
    }
  }
})();

// start loop
requestAnimationFrame(updateAll);
console.log('Galaxy Runner fixed game.js loaded — press Enter to start.');

// ---------- End of file ----------
