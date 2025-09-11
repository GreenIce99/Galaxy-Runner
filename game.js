const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 480;
canvas.height = 640;

let gameState = "menu"; // "menu" | "countdown" | "playing" | "gameover"
let countdown = 3;
let score = 0;
let highScore = parseInt(localStorage.getItem("galaxyHighScore")) || 0;

const player = {
  x: canvas.width / 2 - 15,
  y: canvas.height - 60,
  w: 30,
  h: 30,
  speed: 5,
  bullets: []
};

let enemies = [];
let keys = {};
let countdownTimer = 0;

document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (gameState === "menu" && e.key === "Enter") {
    startCountdown();
  }
  if (gameState === "gameover" && e.key === "Enter") {
    resetGame();
  }
});
document.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("click", () => {
  if (gameState === "menu") startCountdown();
  if (gameState === "gameover") resetGame();
});

function startCountdown() {
  gameState = "countdown";
  countdown = 3;
  countdownTimer = Date.now();
}

function resetGame() {
  score = 0;
  enemies = [];
  player.bullets = [];
  startCountdown();
}

function spawnEnemy() {
  enemies.push({
    x: Math.random() * (canvas.width - 30),
    y: -30,
    w: 30,
    h: 30,
    speed: 2 + Math.random() * 2
  });
}

function update() {
  if (gameState === "playing") {
    // Move player
    if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
    if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;
    if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
    if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;

    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

    // Shooting
    if (keys[" "] && player.bullets.length < 5) {
      player.bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 4, h: 10, speed: 7 });
    }

    player.bullets.forEach((b, i) => {
      b.y -= b.speed;
      if (b.y < 0) player.bullets.splice(i, 1);
    });

    enemies.forEach((en, i) => {
      en.y += en.speed;
      if (en.y > canvas.height) enemies.splice(i, 1);

      // Collision with player
      if (en.x < player.x + player.w &&
          en.x + en.w > player.x &&
          en.y < player.y + player.h &&
          en.h + en.y > player.y) {
        gameOver();
      }

      // Bullets hit
      player.bullets.forEach((b, j) => {
        if (b.x < en.x + en.w &&
            b.x + b.w > en.x &&
            b.y < en.y + en.h &&
            b.h + b.y > en.y) {
          enemies.splice(i, 1);
          player.bullets.splice(j, 1);
          score += 10;
        }
      });
    });

    if (Math.random() < 0.02) spawnEnemy();
  }
}

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameState === "menu") {
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText("GALAXY RUNNER", 100, 200);
    ctx.font = "20px Arial";
    ctx.fillText("Press ENTER or CLICK to Start", 80, 300);
    ctx.fillText("High Score: " + highScore, 150, 350);
  }

  if (gameState === "countdown") {
    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.fillText(countdown, canvas.width / 2 - 15, canvas.height / 2);
    if (Date.now() - countdownTimer > 1000) {
      countdown--;
      countdownTimer = Date.now();
      if (countdown === 0) {
        gameState = "playing";
      }
    }
  }

  if (gameState === "playing") {
    ctx.fillStyle = "lime";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.fillStyle = "yellow";
    player.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

    ctx.fillStyle = "red";
    enemies.forEach(en => ctx.fillRect(en.x, en.y, en.w, en.h));

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 20);
  }

  if (gameState === "gameover") {
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", 130, 250);
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 180, 300);
    ctx.fillText("High Score: " + highScore, 160, 340);
    ctx.fillText("Press ENTER or CLICK to Play Again", 50, 400);
  }
}

function gameOver() {
  gameState = "gameover";
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("galaxyHighScore", highScore);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
