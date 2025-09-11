// ================================
// Galaxy Runner: Universe Edition
// Fully upgraded arcade shooter
// ================================

// ----- Canvas & setup -----
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resize);
resize();

// ----- Game state -----
const STATE = { TITLE: 0, COUNTDOWN: 1, PLAYING: 2, GAMEOVER: 3 };
let state = STATE.TITLE;

// ----- Player -----
const player = {
  x: canvas.width/2, y: canvas.height-120, w:40, h:40,
  speed:6, shots:[], cooldown:0, lives:3, shield:0,
  rapid:false, spread:false, drones:[], charge:0
};

// ----- Score & highscore -----
let score = 0;
let highScore = parseInt(localStorage.getItem('galaxy_high') || '0',10);
let frame = 0;
let countdown = 180;

// ----- Arrays -----
let enemies = [];
let enemyBullets = [];
let powerups = [];
let particles = [];
let boss = null;

// ----- Input -----
const keys = {};
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

// ----- Utility -----
function rand(min,max){ return Math.random()*(max-min)+min; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function rectsIntersect(a,b){ return (Math.abs(a.x-b.x)*2 < (a.w+b.w)) && (Math.abs(a.y-b.y)*2 < (a.h+b.h)); }
function spawnParticles(x,y,color,count=15){
  for(let i=0;i<count;i++){
    particles.push({x,y,vx:rand(-3,3),vy:rand(-3,3),life:rand(20,50),color});
  }
}

// ----- Enemy spawn -----
function spawnEnemy(type){
  const x = rand(40,canvas.width-40), y=-40;
  if(type==='chaser') enemies.push({x,y,w:32,h:32,type:'chaser',hp:3});
  else if(type==='zig') enemies.push({x,y,w:28,h:28,type:'zig',hp:2,phase:rand(0,Math.PI*2)});
  else if(type==='shooter') enemies.push({x,y,w:36,h:36,type:'shooter',hp:3,cd:120});
  else enemies.push({x,y,w:28,h:28,type:'small',hp:1});
}

// ----- Power-ups -----
function spawnPowerUp(x,y){
  const types = ['shield','rapid','spread','bomb','drone','health','freeze','mult'];
  powerups.push({x,y,vy:2,type:types[Math.floor(Math.random()*types.length)]});
}
function applyPowerup(p){
  if(p.type==='shield'){ player.shield=360; showToast('Shield!'); }
  if(p.type==='rapid'){ player.rapid=true; setTimeout(()=>player.rapid=false,10000); showToast('Rapid Fire!'); }
  if(p.type==='spread'){ player.spread=true; setTimeout(()=>player.spread=false,10000); showToast('Spread Shot!'); }
  if(p.type==='bomb'){ enemies.forEach(e=>spawnParticles(e.x,e.y,'orange',20)); enemies=[]; showToast('BOMB!'); }
  if(p.type==='drone'){ spawnDrone(); }
  if(p.type==='health'){ player.lives++; showToast('Extra Life!'); }
  if(p.type==='freeze'){ enemies.forEach(e=>e.frozen=120); showToast('Freeze!'); }
  if(p.type==='mult'){ score+=100; showToast('Score Bonus!'); }
}

// ----- Player actions -----
function playerShoot(){
  if(player.cooldown>0) return;
  player.cooldown = player.rapid?6:14;
  if(player.spread){
    player.shots.push({x:player.x-12,y:player.y-22,vy:-10,w:6,h:10});
    player.shots.push({x:player.x,y:player.y-26,vy:-12,w:6,h:10});
    player.shots.push({x:player.x+12,y:player.y-22,vy:-10,w:6,h:10});
  } else {
    player.shots.push({x:player.x,y:player.y-24,vy:-14,w:6,h:10});
  }
}
function spawnDrone(){
  if(player.drones.length>=3) return;
  player.drones.push({angle:rand(0,Math.PI*2),dist:50,fire:0});
  showToast('Drone Deployed!');
}

// ----- Boss -----
function spawnBoss(){
  boss = {x:canvas.width/2-160,y:-200,w:320,h:140,hp:350,phase:1,timer:0,vx:1.5};
  showToast('BOSS INCOMING!');
}
function updateBoss(){
  if(!boss) return;
  if(boss.y<40) boss.y+=1.5;
  else {
    boss.timer++;
    boss.x += Math.cos(boss.timer*0.02)*boss.vx;
    if(boss.timer%90===0) for(let i=0;i<3;i++) enemies.push({x:boss.x+40+i*80,y:boss.y+boss.h+10,w:24,h:24,type:'small',hp:1,vy:2});
    if(boss.timer%140===0) for(let i=0;i<8;i++) enemyBullets.push({x:boss.x+20+i*(boss.w/8),y:boss.y+boss.h,vx:0,vy:4,w:6,h:6});
  }
  if(boss.hp<=0){ spawnParticles(boss.x+boss.w/2,boss.y+boss.h/2,'magenta',80); score+=500; spawnPowerUp(boss.x+boss.w/2,boss.y+boss.h/2); boss=null; showToast('Boss Defeated!'); }
}

// ----- Show toast -----
const toastEl = document.getElementById('toast');
function showToast(text,ms=1200){
  if(!toastEl) return;
  toastEl.textContent=text; toastEl.style.display='block';
  setTimeout(()=>{ toastEl.style.display='none'; },ms);
}

// ----- Update functions -----
function updateEnemies(){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if(e.type==='chaser'){ const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy)||1; e.x+=(dx/dist)*1.6; e.y+=(dy/dist)*1.6; }
    else if(e.type==='zig'){ e.phase=(e.phase||0)+0.08; e.x+=Math.sin(e.phase)*2; e.y+=2; }
    else if(e.type==='shooter'){ e.y+=1.2; e.cd=(e.cd||0)-1; if(e.cd<=0){ e.cd=100; const angle=Math.atan2(player.y-e.y,player.x-e.x); enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(angle)*3,vy:Math.sin(angle)*3,w:6,h:6}); } }
    else e.y+=2.2;
    if(e.frozen)e.frozen--;
    if(e.y>canvas.height+80 || e.x<-80 || e.x>canvas.width+80) enemies.splice(i,1);
  }
}
function updatePowerups(){
  for(let i=powerups.length-1;i>=0;i--){
    const p=powerups[i]; p.y+=p.vy;
    if(rectsIntersect(p,player)){ applyPowerup(p); powerups.splice(i,1); continue; }
    if(p.y>canvas.height+40) powerups.splice(i,1);
  }
}
function updateShots(){
  for(let i=player.shots.length-1;i>=0;i--){
    const s=player.shots[i]; s.y+=s.vy;
    let hit=false;
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];
      if(rectsIntersect(s,e)){
        e.hp--; hit=true; spawnParticles(e.x,e.y,'yellow',10);
        if(e.hp<=0){ if(e.type==='split'){ spawnEnemy('small'); spawnEnemy('small'); } if(Math.random()<0.25) spawnPowerUp(e.x,e.y); score+=(e.type==='shooter'?40:10); enemies.splice(j,1); }
        break;
      }
    }
    if(hit||s.y<-20) player.shots.splice(i,1);
  }
  for(let i=enemyBullets.length-1;i>=0;i--){
    const b=enemyBullets[i]; b.x+=b.vx||0; b.y+=b.vy||0;
    if(rectsIntersect(b,player)){ enemyBullets.splice(i,1); player.lives--; spawnParticles(player.x,player.y,'red',22); if(player.lives<=0) state=STATE.GAMEOVER; }
    else if(b.y>canvas.height+40||b.x<-40||b.x>canvas.width+40) enemyBullets.splice(i,1);
  }
}
function updateDrones(){
  for(let d of player.drones){
    d.angle+=0.04; d.fire=(d.fire||0)-1;
    if(d.fire<=0){
      let nearest=null,nd=9999;
      for(let e of enemies){ const dx=e.x-(player.x+Math.cos(d.angle)*d.dist),dy=e.y-(player.y+Math.sin(d.angle)*d.dist),D=Math.hypot(dx,dy); if(D<nd){ nd=D; nearest=e; } }
      if(nearest && nd<500){ particles.push({x:player.x+Math.cos(d.angle)*d.dist,y:player.y+Math.sin(d.angle)*d.dist,vx:(nearest.x-player.x)*0.02,vy:(nearest.y-player.y)*0.02,life:40,color:'cyan'}); }
      d.fire=30;
    }
  }
}

// ----- Wave spawn -----
let waveTimer=0;
function spawnWave(){
  const r=Math.random();
  if(r<0.45) for(let i=0;i<4;i++) spawnEnemy('small');
  else if(r<0.7) for(let i=0;i<3;i++) spawnEnemy('zig');
  else if(r<0.9) for(let i=0;i<2;i++) spawnEnemy('chaser');
  else spawnEnemy('shooter');
}

// ----- Draw Player -----
function drawPlayer(){
  ctx.fillStyle=player.shield?'cyan':'#6f6';
  ctx.fillRect(player.x-player.w/2,player.y-player.h/2,player.w,player.h);
}

// ----- Main loop -----
let shake=0;
function updateAll(){
  requestAnimationFrame(updateAll);
  if(shake>0){ ctx.setTransform(1,0,0,1,rand(-shake,shake),rand(-shake,shake)); shake--; } else ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='black'; ctx.fillRect(0,0,canvas.width,canvas.height);

  if(state===STATE.TITLE){
    ctx.fillStyle='white'; ctx.font='48px monospace'; ctx.fillText('GALAXY RUNNER',canvas.width/2-180,canvas.height/2-20);
    ctx.font='24px monospace'; ctx.fillText('Press ENTER to Start',canvas.width/2-120,canvas.height/2+20);
  }
  else if(state===STATE.COUNTDOWN){
    ctx.fillStyle='white'; ctx.font='96px monospace'; ctx.fillText(Math.ceil(countdown/60),canvas.width/2-30,canvas.height/2);
    countdown--; if(countdown<=0){ state=STATE.PLAYING; }
  }
  else if(state===STATE.PLAYING){
    // movement
    let moveX=0,moveY=0;
    if(keys['ArrowLeft']||keys['a']) moveX=-1;
    if(keys['ArrowRight']||keys['d']) moveX=1;
    if(keys['ArrowUp']||keys['w']) moveY=-1;
    if(keys['ArrowDown']||keys['s']) moveY=1;
    if(keys[' ']) playerShoot();
    player.x+=moveX*player.speed; player.y+=moveY*player.speed;
    player.x=clamp(player.x,20,canvas.width-20); player.y=clamp(player.y,40,canvas.height-40);
    if(player.cooldown>0) player.cooldown--;

    // spawn waves/powerups
    waveTimer--; if(waveTimer<=0){ spawnWave(); waveTimer=clamp(80-Math.floor(score/30),40,160); }
    if(Math.random()<0.005) spawnPowerUp(rand(60,canvas.width-60),-20);
    if(score>500&&!boss&&Math.random()<0.001) spawnBoss();

    // update actors
    updateEnemies(); updateShots(); updatePowerups(); updateDrones(); updateBoss();

    // draw enemies
    for(let e of enemies){ ctx.fillStyle=(e.type==='shooter')?'#ff9':(e.type==='chaser'?'#f66':'#f33'); ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h); }
    for(let b of enemyBullets){ ctx.fillStyle='#f90'; ctx.fillRect(b.x-4,b.y-4,b.w||6,b.h||6); }
    for(let p of powerups){ ctx.beginPath(); ctx.fillStyle='#0ff'; ctx.arc(p.x,p.y,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#000'; ctx.font='10px monospace'; ctx.fillText(p.type[0].toUpperCase(),p.x-4,p.y+3); }
    for(let s of player.shots){ ctx.fillStyle='#6f6'; ctx.fillRect(s.x-3,s.y-10,6,12); }
    for(let d of player.drones){ const dx=player.x+Math.cos(d.angle)*d.dist,dy=player.y+Math.sin(d.angle)*d.dist; ctx.fillStyle='#0ff'; ctx.fillRect(dx-5,dy-5,10,10); }
    drawPlayer();
    for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,2,2); p.x+=p.vx; p.y+=p.vy; p.life--; if(p.life<=0) particles.splice(i,1); }
    if(boss){ ctx.fillStyle='#b0f'; ctx.fillRect(boss.x,boss.y,boss.w,boss.h); ctx.fillStyle='#222'; ctx.fillRect(8,8,canvas.width-16,12); ctx.fillStyle='#f55'; ctx.fillRect(8,8,(canvas.width-16)*clamp(boss.hp/350,0,1),12); }

    score+=0.03;
  }
  else if(state===STATE.GAMEOVER){
    ctx.fillStyle='white'; ctx.font='48px monospace'; ctx.fillText('GAME OVER',canvas.width/2-140,canvas.height/2-20);
    ctx.font='24px monospace'; ctx.fillText('Press ENTER to Restart',canvas.width/2-130,canvas.height/2+20);
    if(score>highScore){ highScore=Math.floor(score); localStorage.setItem('galaxy_high',highScore.toString()); }
  }
}

// ----- Start / restart -----
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    if(state===STATE.TITLE||state===STATE.GAMEOVER){
      score=0; player.lives=3; player.shots=[]; enemies=[]; powerups=[]; boss=null; countdown=180; state=STATE.COUNTDOWN;
    }
  }
});

// ----- Start loop -----
updateAll();
