let gameRunning = false;
let paused = false;
let gameOver = false;

// UI
const scoreUI = document.getElementById("score");
const coinsUI = document.getElementById("coins");
const hudUI = document.getElementById("hud");
const menuUI = document.getElementById("menu");
const pauseBtn = document.getElementById("pauseBtn");
const pauseMenu = document.getElementById("pauseMenu");
const pauseTitle = document.getElementById("pauseTitle");
const resumeBtn = document.getElementById("resumeBtn");

// Sounds
const sndCoin = new Audio("sounds/coin.wav");
const sndJump = new Audio("sounds/jump.wav");
const sndGameOver = new Audio("sounds/gameover.wav");

// ===== THREE.JS SETUP =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 3, 8); // slightly above and behind player

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ===== Player =====
let playerGeometry = new THREE.BoxGeometry(1, 1, 1);
let playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

// ===== Ground =====
const ground1 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 200), new THREE.MeshBasicMaterial({ color: 0x444444 }));
const ground2 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 200), new THREE.MeshBasicMaterial({ color: 0x555555 }));
ground1.position.z = -80; ground2.position.z = -280;
scene.add(ground1, ground2);

function updateGround(speed) {
  ground1.position.z += speed;
  ground2.position.z += speed;
  if (ground1.position.z > camera.position.z + 50) ground1.position.z = ground2.position.z - 200;
  if (ground2.position.z > camera.position.z + 50) ground2.position.z = ground1.position.z - 200;
}

// ===== Obstacles + Coins =====
let obstacles = [], coins = [];
let obstacleInterval, coinInterval;

// Jump physics
let yVelocity = 0, onGround = true;
let moveLeft = false, moveRight = false;

// Death animation
let deathAnimation = false, deathTimer = 0;

// ===== Shop =====
const shopMenu = document.getElementById("shopMenu");
const coinsOwnedUI = document.getElementById("coinsOwned");
const charButtons = document.querySelectorAll(".char-btn");

let ownedCoins = 0;
let currentColor = 0x00ff00;
let currentFace = "😀";
let ownedChars = []; // array of owned colors

function openShop() {
  paused = true;
  shopMenu.style.display = "block";
  updateCoinsUI();
  updateShopButtons();
}

function closeShop() {
  shopMenu.style.display = "none";
  paused = false;
}

function updateCoinsUI() {
  coinsOwnedUI.textContent = "Coins: " + ownedCoins;
}

function updateShopButtons() {
  charButtons.forEach(btn => {
    const color = parseInt(btn.dataset.color);
    if (ownedChars.includes(color)) {
      if (currentColor === color) {
        btn.textContent = `Selected ${btn.dataset.face}`;
      } else {
        btn.textContent = `Select ${btn.dataset.face}`;
      }
    } else {
      btn.textContent = `${btn.dataset.face} - ${btn.dataset.cost} Coins`;
    }
  });
}

// Character button click
charButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const cost = parseInt(btn.dataset.cost);
    const color = parseInt(btn.dataset.color);
    const face = btn.dataset.face;

    if (ownedChars.includes(color)) {
      currentColor = color;
      currentFace = face;
      player.material.color.setHex(currentColor);
    } else if (ownedCoins >= cost) {
      ownedCoins -= cost;
      ownedChars.push(color);
      currentColor = color;
      currentFace = face;
      player.material.color.setHex(currentColor);
    } else {
      alert("Not enough coins!");
    }
    updateCoinsUI();
    updateShopButtons();
  });
});

// ===== Event listeners =====
document.addEventListener("keydown", e => {
  if (!gameRunning || paused || startingAnimation || deathAnimation) return;
  if (e.key === "ArrowLeft") moveLeft = true;
  if (e.key === "ArrowRight") moveRight = true;
  if (e.key === " " && onGround) { yVelocity = 0.23; sndJump.play(); onGround = false; }
});
document.addEventListener("keyup", e => { if (e.key==="ArrowLeft") moveLeft=false; if(e.key==="ArrowRight") moveRight=false; });

// ===== Mobile Swipe Controls =====
let touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;
const swipeThreshold = 50; // minimum distance for swipe

document.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  handleSwipe();
});

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > swipeThreshold) moveRight = true;
    else if (deltaX < -swipeThreshold) moveLeft = true;
  } else {
    if (deltaY < -swipeThreshold && onGround) { yVelocity = 0.23; sndJump.play(); onGround = false; }
  }

  // Reset movement shortly after swipe
  setTimeout(() => { moveLeft = false; moveRight = false; }, 150);
}

// Spawn Obstacle
function spawnObstacle() {
  if (!gameRunning || paused) return;
  let obstacleHeight = 1 + Math.floor(score / 2000); 
  const obs = new THREE.Mesh(new THREE.BoxGeometry(1, obstacleHeight, 1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  obs.position.set((Math.random() * 6) - 3, obstacleHeight/2, player.position.z - 40);
  scene.add(obs);
  obstacles.push(obs);
}

// Spawn Coin
function spawnCoin() {
  if (!gameRunning || paused) return;
  const coin = new THREE.Mesh(new THREE.SphereGeometry(0.4,16,16), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
  coin.position.set((Math.random()*6)-3,1.5,player.position.z-40);
  scene.add(coin);
  coins.push(coin);
}

// Trigger Death
function triggerDeath() {
  if (deathAnimation || gameOver) return;
  deathAnimation = true; gameOver=true; paused=true; deathTimer=0;
  sndGameOver.play();
  pauseTitle.textContent = "Game Over";
  resumeBtn.style.display = "none";
  pauseMenu.style.opacity = 0;
  pauseMenu.style.display = "flex";
  pauseMenu.style.transform = "scale(0.5)";
}

// Score & speed
let score=0, coinCount=0, baseSpeed=0.10, speedBoost=0;

// Smooth start animation
let startingAnimation=false, startAnimProgress=0;
function runStartAnimation() {
  startAnimProgress+=0.01;
  if (startAnimProgress>=1){
    startingAnimation=false; pauseBtn.style.display="block";
    obstacleInterval=setInterval(spawnObstacle,1200);
    coinInterval=setInterval(spawnCoin,900); return;
  }
  let t=startAnimProgress; let ease=t*t*(3-2*t);
  player.position.y=3-(2*ease);
  camera.position.z=(player.position.z+10)-(5*ease);
  camera.position.y=4-(1*ease); // slightly higher camera
}

// Start Game
function startGame() {
  menuUI.style.display="none"; hudUI.style.display="block"; pauseBtn.style.display="none";
  gameRunning=true; paused=false; gameOver=false; deathAnimation=false;
  score=0; coinCount=0; speedBoost=0;
  player.position.set(0,3,5); player.rotation.set(0,0,0); player.material.color.setHex(currentColor);
  startAnimProgress=0; startingAnimation=true; yVelocity=0; onGround=false;
  obstacles.forEach(o=>scene.remove(o)); coins.forEach(c=>scene.remove(c)); obstacles=[]; coins=[];
}

// Pause / Resume
function pauseGame(){ paused=true; pauseMenu.style.display="flex"; pauseBtn.style.display="none"; }
function resumeGame(){ if(gameOver) return; paused=false; pauseMenu.style.display="none"; pauseBtn.style.display="block"; }

// Restart / Menu
function restartGame(){ gameOver=false; deathAnimation=false; pauseMenu.style.display="none"; startGame(); }
function returnToMenu(){ paused=false; gameRunning=false; gameOver=false; deathAnimation=false; pauseMenu.style.display="none"; hudUI.style.display="none"; pauseBtn.style.display="none"; menuUI.style.display="flex"; clearInterval(obstacleInterval); clearInterval(coinInterval); }

// Animate loop
function animate(){
  requestAnimationFrame(animate);
  if(startingAnimation){ runStartAnimation(); renderer.render(scene,camera); return; }
  if(deathAnimation){
    deathTimer+=0.02; player.position.y=1+Math.sin(deathTimer*3)*2; player.rotation.x+=0.15; player.rotation.z+=0.12;
    if(deathTimer>1.3){ deathAnimation=false; let menuAnimProgress=0; function animateMenuPop(){ menuAnimProgress+=0.05; if(menuAnimProgress>1) menuAnimProgress=1; let ease=menuAnimProgress*menuAnimProgress*(3-2*menuAnimProgress); pauseMenu.style.opacity=ease; pauseMenu.style.transform=`scale(${0.5+0.5*ease})`; if(menuAnimProgress<1) requestAnimationFrame(animateMenuPop); } animateMenuPop(); }
    renderer.render(scene,camera); return;
  }

  if(gameRunning && !paused){
    const currentSpeed=baseSpeed+speedBoost;
    player.position.z-=currentSpeed;
    updateGround(currentSpeed);
    if(moveLeft && player.position.x>-3) player.position.x-=0.1;
    if(moveRight && player.position.x<3) player.position.x+=0.1;

    player.position.y+=yVelocity; yVelocity-=0.01;
    if(player.position.y<=1){ player.position.y=1; yVelocity=0; onGround=true; }

    obstacles.forEach((obs,i)=>{
      obs.position.z+=currentSpeed;
      if(obs.position.z>camera.position.z+5){ scene.remove(obs); obstacles.splice(i,1); }
      if(Math.abs(obs.position.x-player.position.x)<1 && Math.abs(obs.position.z-player.position.z)<1 && Math.abs(obs.position.y-player.position.y)<(obs.geometry.parameters.height/2+0.5)){ triggerDeath(); }
    });

    coins.forEach((c,i)=>{
      c.position.z+=currentSpeed;
      if(c.position.z>camera.position.z+5){ scene.remove(c); coins.splice(i,1); }
      if(Math.abs(c.position.x-player.position.x)<1 && Math.abs(c.position.z-player.position.z)<1 && Math.abs(c.position.y-player.position.y)<1.2){
        sndCoin.play(); scene.remove(c); coins.splice(i,1); coinCount++; ownedCoins++; updateCoinsUI(); updateShopButtons();
      }
    });

    score++; if(score%1000===0) speedBoost+=0.05;
    scoreUI.textContent="Score: "+score; coinsUI.textContent="Coins: "+coinCount;

    camera.position.z=player.position.z+8; // behind player
    camera.position.y=4; // above player
  }
  renderer.render(scene,camera);
}
animate();
