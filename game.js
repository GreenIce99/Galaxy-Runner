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

// ================== SETTINGS ==================
const musicToggle=document.getElementById("musicToggle");
const soundToggle=document.getElementById("soundToggle");
const volumeSlider=document.getElementById("volumeSlider");
const difficultySelect=document.getElementById("difficulty");
const controlSelect=document.getElementById("controlType");
const settingsPanel=document.getElementById("settingsPanel");
const settingsBtn=document.getElementById("settingsBtn");
const closeSettings=document.getElementById("closeSettings");
settingsBtn.onclick=()=>settingsPanel.style.display="block";
closeSettings.onclick=()=>settingsPanel.style.display="none";

// ================== MOBILE BUTTONS ==================
const upBtn=document.getElementById("upBtn");
const downBtn=document.getElementById("downBtn");
const leftBtn=document.getElementById("leftBtn");
const rightBtn=document.getElementById("rightBtn");
const fireBtn=document.getElementById("fireBtn");
const specialBtn=document.getElementById("specialBtn");
[upBtn,downBtn,leftBtn,rightBtn,fireBtn,specialBtn].forEach(btn=>{
btn.addEventListener("touchstart",e=>{e.preventDefault();mobile[btn.id.replace("Btn","").toLowerCase()]=true;});
btn.addEventListener("touchend",e=>{e.preventDefault();mobile[btn.id.replace("Btn","").toLowerCase()]=false;});
});

// ================== SOUNDS ==================
const sounds={
shoot:new Audio("https://freesound.org/data/previews/341/341695_3248244-lq.mp3"),
explosion:new Audio("https://freesound.org/data/previews/219/219149_4101046-lq.mp3"),
powerup:new Audio("https://freesound.org/data/previews/331/331912_3248244-lq.mp3"),
bgm:new Audio("https://freesound.org/data/previews/458/458410_5121236-lq.mp3")
};
sounds.bgm.loop=true;sounds.bgm.volume=0.3;

// ================== UTILITIES ==================
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.style.display="block";setTimeout(()=>t.style.display="none",2000);}
function saveHighScore(){if(score>highScore){highScore=score;localStorage.setItem("galaxyHighScore",highScore);}}

// ================== START GAME ==================
function startGame(){
gameState=STATE.COUNTDOWN;
player.x=canvas.width/2;player.y=canvas.height-100;player.shots=[];player.cooldown=0;player.lives=3;
player.drones=[];player.energyReady=true;
enemies=[];powerups=[];particles=[];boss=null;score=0;
document.getElementById("mobileControls").style.display=(controlSelect.value==="mobile")?"block":"none";
sounds.bgm.currentTime=0;if(musicToggle.checked)sounds.bgm.play();
countdownTimer=180;
}

// ================== DRAW PLAYER ==================
function drawPlayer(){
ctx.save(); ctx.translate(player.x,player.y);
ctx.fillStyle="cyan";
ctx.beginPath(); ctx.moveTo(0,-player.h/2); ctx.lineTo(-player.w/2,player.h/2); ctx.lineTo(player.w/2,player.h/2); ctx.closePath(); ctx.fill();
ctx.restore();
}

// ================== MAIN LOOP ==================
let frame=0,countdownTimer=180;
function loop(){
ctx.setTransform(1,0,0,1,0,0);
ctx.fillStyle="black"; ctx.fillRect(0,0,canvas.width,canvas.height);

if(gameState===STATE.TITLE){
ctx.fillStyle="#0f0"; ctx.font="50px monospace"; ctx.textAlign="center";
ctx.fillText("GALAXY RUNNER",canvas.width/2,canvas.height/2-50);
ctx.font="25px monospace"; if(Math.floor(frame/30)%2===0) ctx.fillText("PRESS ENTER TO START",canvas.width/2,canvas.height/2+20);
ctx.fillText("HIGH SCORE: "+highScore,canvas.width/2,canvas.height/2+60);
} else if(gameState===STATE.COUNTDOWN){
ctx.fillStyle="#0f0"; ctx.font="50px monospace"; ctx.textAlign="center";
let count=Math.ceil(countdownTimer/60); ctx.fillText(count,canvas.width/2,canvas.height/2);
countdownTimer--; if(countdownTimer<=0){gameState=STATE.PLAYING;}
} else if(gameState===STATE.PLAYING){
// movement
let moveX=0,moveY=0;
if(controlSelect.value==="keyboard"){if(keys["ArrowLeft"]||keys["a"]) moveX=-1;if(keys["ArrowRight"]||keys["d"]) moveX=1;if(keys["ArrowUp"]||keys["w"]) moveY=-1;if(keys["ArrowDown"]||keys["s"]) moveY=1;}
else{if(mobile.left) moveX=-1;if(mobile.right) moveX=1;if(mobile.up) moveY=-1;if(mobile.down) moveY=1;}
player.x+=moveX*player.speed; player.y+=moveY*player.speed;
if(player.x<player.w/2) player.x=player.w/2;if(player.x>canvas.width-player.w/2) player.x=canvas.width-player.w/2;
if(player.y<player.h/2) player.y=player.h/2;if(player.y>canvas.height-player.h/2) player.y=canvas.height-player.h/2;

drawPlayer();
document.getElementById("ui").innerText="Score: "+score+" Lives: "+player.lives+" High: "+highScore;

frame++; requestAnimationFrame(loop);
} else if(gameState===STATE.GAMEOVER){
ctx.fillStyle="#0f0"; ctx.font="50px monospace"; ctx.textAlign="center";
ctx.fillText("GAME OVER",canvas.width/2,canvas.height/2-50);
ctx.font="25px monospace"; ctx.fillText("PRESS ENTER TO PLAY AGAIN",canvas.width/2,canvas.height/2+20);
ctx.fillText("HIGH SCORE: "+highScore,canvas.width/2,canvas.height/2+60);
}
}
loop();

// ================== RESTART ==================
document.addEventListener("keydown",e=>{
if(gameState===STATE.TITLE&&e.key==="Enter") startGame();
if((gameState===STATE.GAMEOVER||gameState===STATE.TITLE)&&e.key==="Enter"){saveHighScore();startGame();}
});
