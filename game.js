// ================== CANVAS ==================
const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight;}
window.addEventListener("resize",resize);resize();

// ================== GAME STATES ==================
const STATE={TITLE:0,COUNTDOWN:1,PLAYING:2,GAMEOVER:3};
let gameState=STATE.TITLE;

// ================== PLAYER ==================
let player={x:0,y:0,w:40,h:40,speed:6,shots:[],cooldown:0,lives:3,shield:0,rapid:false,spread:false,drones:[],energyReady:true};

// ================== SCORE ==================
let score=0,highScore=localStorage.getItem("galaxyHighScore")||0;

// ================== ENEMIES / POWERUPS / PARTICLES ==================
let enemies=[],enemyCooldown=0,powerups=[],particles=[],boss=null,shake=0;

// ================== CONTROLS ==================
let keys={},mobile={up:false,down:false,left:false,right:false,fire:false,special:false};
document.addEventListener("keydown",e=>keys[e.key]=true);
document.addEventListener("keyup",e=>keys[e.key]=false);

// ================== MOBILE BUTTONS ==================
const btns=["up","down","left","right","fire","special"];
btns.forEach(b=>{
 let el=document.getElementById(b+"Btn");
 if(!el)return;
 el.addEventListener("touchstart",e=>{e.preventDefault();mobile[b]=true;});
 el.addEventListener("touchend",e=>{e.preventDefault();mobile[b]=false;});
});

// ================== SOUNDS ==================
function sound(src){let a=new Audio(src);a.volume=0.2;return a;}
const sfx={
 shoot:()=>sound("https://actions.google.com/sounds/v1/weapons/laser_burst.ogg").play(),
 boom:()=>sound("https://actions.google.com/sounds/v1/explosions/explosion.ogg").play(),
 power:()=>sound("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg").play()
};

// ================== UTILITIES ==================
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.style.display="block";setTimeout(()=>t.style.display="none",2000);}
function saveHighScore(){if(score>highScore){highScore=score;localStorage.setItem("galaxyHighScore",highScore);}}

// ================== START GAME ==================
let countdownTimer=180;
function startGame(){
 gameState=STATE.COUNTDOWN;
 player.x=canvas.width/2;player.y=canvas.height-100;player.shots=[];player.cooldown=0;player.lives=3;
 player.drones=[];player.energyReady=true;
 enemies=[];powerups=[];particles=[];boss=null;score=0;
 countdownTimer=180;
}

// ================== DRAW PLAYER ==================
function drawPlayer(){
 ctx.save(); ctx.translate(player.x,player.y);
 ctx.fillStyle="cyan";
 ctx.beginPath(); ctx.moveTo(0,-player.h/2); ctx.lineTo(-player.w/2,player.h/2); ctx.lineTo(player.w/2,player.h/2); ctx.closePath(); ctx.fill();
 ctx.restore();
}

// ================== ENEMIES ==================
function spawnEnemy(){
 let type=Math.random();
 let x=Math.random()*canvas.width,y=-40;
 if(type<0.5){ // chaser
   enemies.push({x,y,w:30,h:30,hp:1,type:"chaser"});
 }else if(type<0.8){ // zigzag
   enemies.push({x,y,w:30,h:30,hp:1,type:"zigzag",dir:Math.random()<0.5?-2:2});
 }else{ // shooter
   enemies.push({x,y,w:30,h:30,hp:2,type:"shooter",cd:90});
 }
}

// ================== UPDATE ENEMIES ==================
function updateEnemies(){
 for(let e of enemies){
   if(e.type==="chaser"){e.y+=2;if(e.x<player.x)e.x+=1;else e.x-=1;}
   if(e.type==="zigzag"){e.y+=2;e.x+=e.dir;if(e.x<0||e.x>canvas.width)e.dir*=-1;}
   if(e.type==="shooter"){e.y+=1;if(e.cd--<=0){ // shoot bullet
     e.cd=90;
     enemies.push({x:e.x,y:e.y,w:5,h:10,hp:1,type:"ebullet",vy:4});
   }}
   if(e.type==="ebullet"){e.y+=e.vy;}
 }
 enemies=enemies.filter(e=>e.y<canvas.height+50 && e.hp>0);
}

// ================== COLLISION ==================
function collide(a,b){
 return Math.abs(a.x-b.x)<(a.w+b.w)/2 && Math.abs(a.y-b.y)<(a.h+b.h)/2;
}

// ================== GAME LOOP ==================
let frame=0;
function loop(){
 ctx.setTransform(1,0,0,1,0,0);
 ctx.fillStyle="black"; ctx.fillRect(0,0,canvas.width,canvas.height);

 if(gameState===STATE.TITLE){
   ctx.fillStyle="#0f0"; ctx.font="50px monospace"; ctx.textAlign="center";
   ctx.fillText("GALAXY RUNNER",canvas.width/2,canvas.height/2-50);
   ctx.font="25px monospace"; if(Math.floor(frame/30)%2===0) ctx.fillText("PRESS ENTER TO START",canvas.width/2,canvas.height/2+20);
   ctx.fillText("HIGH SCORE: "+highScore,canvas.width/2,canvas.height/2+60);
 }

 else if(gameState===STATE.COUNTDOWN){
   ctx.fillStyle="#0f0"; ctx.font="50px monospace"; ctx.textAlign="center";
   let count=Math.ceil(countdownTimer/60); ctx.fillText(count,canvas.width/2,canvas.height/2);
   countdownTimer--; if(countdownTimer<=0){gameState=STATE.PLAYING;}
 }

 else if(gameState===STATE.PLAYING){
   // movement
   let moveX=0,moveY=0;
   if(keys["ArrowLeft"]||keys["a"]) moveX=-1;
   if(keys["ArrowRight"]||keys["d"]) moveX=1;
   if(keys["ArrowUp"]||keys["w"]) moveY=-1;
   if(keys["ArrowDown"]||keys["s"]) moveY=1;
   if(mobile.left) moveX=-1;if(mobile.right) moveX=1;
   if(mobile.up) moveY=-1;if(mobile.down) moveY=1;

   player.x+=moveX*player.speed; player.y+=moveY*player.speed;
   player.x=Math.max(player.w/2,Math.min(canvas.width-player.w/2,player.x));
   player.y=Math.max(player.h/2,Math.min(canvas.height-player.h/2,player.y));

   // shoot
   if((keys[" "]||mobile.fire) && player.cooldown<=0){
     player.shots.push({x:player.x,y:player.y-20,w:5,h:10,vy:-8});
     sfx.shoot();
     player.cooldown=player.rapid?5:15;
   }
   player.cooldown--;

   // update shots
   for(let s of player.shots){s.y+=s.vy;}
   player.shots=player.shots.filter(s=>s.y>-20);

   // spawn enemies
   if(enemyCooldown--<=0){spawnEnemy();enemyCooldown=30;}

   updateEnemies();

   // collisions
   for(let s of player.shots){
     for(let e of enemies){
       if(e.type!=="ebullet"&&collide(s,e)){e.hp--;s.y=-999;if(e.hp<=0){score+=10;sfx.boom();}}
     }
   }
   for(let e of enemies){
     if(e.type==="ebullet"||e.type==="chaser"||e.type==="zigzag"||e.type==="shooter"){
       if(collide(player,e)){
         player.lives--;e.hp=0;sfx.boom();
         if(player.lives<=0){saveHighScore();gameState=STATE.GAMEOVER;}
       }
     }
   }

   // draw
   drawPlayer();
   ctx.fillStyle="yellow";
   for(let s of player.shots){ctx.fillRect(s.x-2,s.y-10,4,10);}
   ctx.fillStyle="red";
   for(let e of enemies){ctx.fillRect(e.x-15,e.y-15,e.w,e.h);}

   document.getElementById("ui").innerText="Score: "+score+" Lives: "+player.lives+" High: "+highScore;
 }

 else if(gameState===STATE.GAMEOVER){
   ctx.fillStyle="#0f0"; ctx.font="50px monospace"; ctx.textAlign="center";
   ctx.fillText("GAME OVER",canvas.width/2,canvas.height/2-50);
   ctx.font="25px monospace"; ctx.fillText("PRESS ENTER TO PLAY AGAIN",canvas.width/2,canvas.height/2+20);
   ctx.fillText("HIGH SCORE: "+highScore,canvas.width/2,canvas.height/2+60);
 }

 frame++; requestAnimationFrame(loop);
}
loop();

// ================== RESTART ==================
document.addEventListener("keydown",e=>{
 if(gameState===STATE.TITLE&&e.key==="Enter") startGame();
 if(gameState===STATE.GAMEOVER&&e.key==="Enter"){startGame();}
});
