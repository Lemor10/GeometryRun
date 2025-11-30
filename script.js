let gameRunning = false;
let paused = false;
let gameOver = false;
let currentLevel = 1;
let totalLevels = 5;

// UI
const scoreUI = document.getElementById("score");
const coinsUI = document.getElementById("coins");
const hudUI = document.getElementById("hud");
const menuUI = document.getElementById("menu");
const pauseBtn = document.getElementById("pauseBtn");
const pauseMenu = document.getElementById("pauseMenu");
const pauseTitle = document.getElementById("pauseTitle");
const resumeBtn = document.getElementById("resumeBtn");
const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");

// Sounds
const sndCoin = new Audio("sounds/coin.wav");
const sndJump = new Audio("sounds/jump.wav");
const sndGameOver = new Audio("sounds/gameover.wav");

// ===== THREE.JS SETUP =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

// Camera
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 3, 8);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ===== Player =====
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
let playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

// Player trail
let trailCubes = [];
function createTrail() {
  const cubeGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const cubeMat = new THREE.MeshStandardMaterial({ color: player.material.color.getHex(), transparent: true, opacity: 0.6 });
  const cube = new THREE.Mesh(cubeGeo, cubeMat);
  cube.position.copy(player.position);
  scene.add(cube);
  trailCubes.push({ mesh: cube, life: 1 });
}

// ===== Neon Background Lines =====
let neonLines = [];
for (let i = 0; i < 30; i++) {
  const geo = new THREE.BoxGeometry(0.05, 0.05, 50);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.2 });
  const line = new THREE.Mesh(geo, mat);
  line.position.set((Math.random() * 12) - 6, Math.random() * 5, -i * 20);
  scene.add(line);
  neonLines.push(line);
}

// ===== Ground =====
const ground1 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 200), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x0000ff, emissiveIntensity: 0.1 }));
const ground2 = new THREE.Mesh(new THREE.BoxGeometry(20, 0.1, 200), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x0000ff, emissiveIntensity: 0.1 }));
ground1.position.z = -80; ground2.position.z = -280;
scene.add(ground1, ground2);

function updateGround(speed) {
  ground1.position.z += speed; ground2.position.z += speed;
  if (ground1.position.z > camera.position.z + 50) ground1.position.z = ground2.position.z - 200;
  if (ground2.position.z > camera.position.z + 50) ground2.position.z = ground1.position.z - 200;
}

// ===== Obstacles & Coins =====
let obstacles = [], coins = [];
let obstacleInterval, coinInterval;
let yVelocity = 0, onGround = true;
let deathAnimation = false, deathTimer = 0;

// Shop & Progress
const shopMenu = document.getElementById("shopMenu");
const coinsOwnedUI = document.getElementById("coinsOwned");
const charButtons = document.querySelectorAll(".char-btn");
let ownedCoins = 0, currentColor = 0x00ff00, currentFace = "😀", ownedChars = [];

// ===== Progress Bar =====
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");

// ===== Shop Functions =====
function openShop() { paused = true; shopMenu.style.display = "block"; updateCoinsUI(); updateShopButtons(); }
function closeShop() { shopMenu.style.display = "none"; paused = false; }
function updateCoinsUI() { coinsOwnedUI.textContent = "Coins: " + ownedCoins; }
function updateShopButtons() {
  charButtons.forEach(btn => {
    const color = parseInt(btn.dataset.color);
    if (ownedChars.includes(color)) btn.textContent = currentColor === color ? `Selected ${btn.dataset.face}` : `Select ${btn.dataset.face}`;
    else btn.textContent = `${btn.dataset.face} - ${btn.dataset.cost} Coins`;
  });
}
charButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const cost = parseInt(btn.dataset.cost);
    const color = parseInt(btn.dataset.color);
    const face = btn.dataset.face;
    if (ownedChars.includes(color)) { currentColor = color; currentFace = face; player.material.color.setHex(currentColor); }
    else if (ownedCoins >= cost) { ownedCoins -= cost; ownedChars.push(color); currentColor = color; currentFace = face; player.material.color.setHex(currentColor); }
    else alert("Not enough coins!");
    updateCoinsUI(); updateShopButtons();
  });
});

// ===== Input =====
let targetX = 0;
document.addEventListener("keydown", e => {
  if (!gameRunning || paused || startingAnimation || deathAnimation) return;
  if (e.key === "ArrowLeft") targetX = Math.max(player.position.x - 2, -3);
  if (e.key === "ArrowRight") targetX = Math.min(player.position.x + 2, 3);
  if (e.key === " " && onGround) { yVelocity = 0.23; sndJump.play(); createJumpParticles(); onGround = false; }
});

// Swipe for mobile
let touchStartX = 0, touchEndX = 0, swipeThreshold = 50;
document.addEventListener("touchstart", e => touchStartX = e.changedTouches[0].screenX);
document.addEventListener("touchend", e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); });
function handleSwipe() { 
  if(touchEndX-touchStartX>swipeThreshold) targetX=Math.min(player.position.x+2,3); 
  else if(touchEndX-touchStartX<-swipeThreshold) targetX=Math.max(player.position.x-2,-3); 
}

// ===== Spawn =====
function spawnObstacle() {
  if(!gameRunning || paused) return;
  const obsHeight = 1 + Math.floor(score/500);
  const obsWidth = 1 + Math.floor(score/500)*0.3;
  const mat = new THREE.MeshStandardMaterial({ color:0xff0000, emissive:0xff0000, emissiveIntensity:0.4 });
  const obs = new THREE.Mesh(new THREE.BoxGeometry(obsWidth, obsHeight, 1), mat);
  obs.position.set((Math.random()*6)-3, obsHeight/2, player.position.z-40);
  scene.add(obs); obstacles.push(obs);
}

function spawnCoin() {
  if(!gameRunning || paused) return;
  const coin = new THREE.Mesh(new THREE.SphereGeometry(0.4,16,16), new THREE.MeshStandardMaterial({ color:0xffff00, emissive:0xffff00, emissiveIntensity:0.8 }));
  coin.position.set((Math.random()*6)-3,1.5,player.position.z-40);
  scene.add(coin); coins.push(coin);
}

// Jump particles
function createJumpParticles() {
  for(let i=0;i<6;i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8), new THREE.MeshStandardMaterial({ color:0xffffff, transparent:true, opacity:0.8 }));
    p.position.set(player.position.x,player.position.y-0.5,player.position.z);
    scene.add(p);
    let life=0; (function anim(){ life+=0.03; p.position.y+=0.05; p.material.opacity-=0.03; if(p.material.opacity>0) requestAnimationFrame(anim); else scene.remove(p); })();
  }
}

// ===== Death =====
function triggerDeath() {
  if(deathAnimation || gameOver) return;
  deathAnimation=true; gameOver=true; paused=true; deathTimer=0;
  sndGameOver.play();
  pauseTitle.textContent="Game Over"; resumeBtn.style.display="none";
  pauseMenu.style.opacity=0; pauseMenu.style.display="flex"; pauseMenu.style.transform="scale(0.5)";
}

// ===== Score/Speed =====
let score=0, coinCount=0, baseSpeed=0.10, speedBoost=0;
let playerDistance=0, levelDistance=3000;
let startingAnimation=false, startAnimProgress=0;

// ===== Portal =====
let portal=null;
let portalAnimation=false;
function createPortal(){
  const portalGeo = new THREE.TorusGeometry(2,0.3,16,100);
  const portalMat = new THREE.MeshStandardMaterial({ color:0x00ffff, emissive:0x00ffff, emissiveIntensity:0.6 });
  portal = new THREE.Mesh(portalGeo, portalMat);
  portal.position.set(0,1,player.position.z-50);
  scene.add(portal);
  portalAnimation = true;
}

// ===== Start Game =====
function startGame(levelNum){
  currentLevel = levelNum;

  // Clear intervals to prevent multiple obstacles/coins
  clearInterval(obstacleInterval);
  clearInterval(coinInterval);

  menuUI.style.display = "none"; hudUI.style.display = "block"; pauseBtn.style.display = "block";

  gameRunning = true; paused = false; gameOver = false; deathAnimation = false; portalAnimation = false;
  score = 0; coinCount = 0; speedBoost = 0; playerDistance = 0;

  player.position.set(0,3,5);
  player.rotation.set(0,0,0);
  player.scale.setScalar(1);
  player.material.color.setHex(currentColor);

  startAnimProgress = 0; startingAnimation = true; yVelocity = 0; onGround = false;

  // Remove obstacles and coins
  obstacles.forEach(o => scene.remove(o));
  coins.forEach(c => scene.remove(c));
  obstacles = []; coins = [];

  // Remove portal
  if(portal){ scene.remove(portal); portal = null; }

  updateProgress();
}

// ===== Update Progress =====
function updateProgress(){
  let percent = Math.min((score/levelDistance)*100,100);
  progressBar.style.width = percent+"%";
  progressPercent.textContent = Math.floor(percent)+"%";
  if(percent >= 100 && !portal){
    createPortal();
    // DON'T pause the entire game, only block player input
    paused = false; // keep animation running
    targetX = player.position.x; // freeze lateral movement if needed
  }
}

// ===== Animate Portal =====
if(portalAnimation && portal){
  portal.rotation.y += 0.07;

  // Move player into portal automatically
  if(Math.abs(player.position.x-portal.position.x)<2 && player.position.z-portal.position.z < 2){
    player.position.z -= 0.2;
    player.scale.multiplyScalar(0.98); // shrink animation
    if(player.scale.x < 0.1){
      portalAnimation = false;
      showLevelComplete();
    }
  }
}
// ===== Animate =====
function animate(){
  requestAnimationFrame(animate);

  // Starting animation
  if(startingAnimation){
    startAnimProgress+=0.01; 
    let t=startAnimProgress; 
    let ease=t*t*(3-2*t); 
    player.position.y=3-(2*ease); 
    camera.position.z=(player.position.z+10)-(5*ease); 
    camera.position.y=4-(1*ease); 
    if(startAnimProgress>=1){ 
      startingAnimation=false; 
      pauseBtn.style.display="block"; 
      obstacleInterval=setInterval(spawnObstacle,1200); 
      coinInterval=setInterval(spawnCoin,900); 
      onGround=true;
    } 
    renderer.render(scene,camera); return; 
  }

  // Death animation
  if(deathAnimation){ 
    deathTimer+=0.02; 
    player.position.y=1+Math.sin(deathTimer*3)*2; 
    player.rotation.set(0,0,0); 
    if(deathTimer>1.3){ 
      deathAnimation=false; 
      let menuAnimProgress=0; 
      function animateMenuPop(){ 
        menuAnimProgress+=0.05; 
        if(menuAnimProgress>1) menuAnimProgress=1; 
        let ease=menuAnimProgress*menuAnimProgress*(3-2*menuAnimProgress); 
        pauseMenu.style.opacity=ease; 
        pauseMenu.style.transform=`scale(${0.5+0.5*ease})`; 
        if(menuAnimProgress<1) requestAnimationFrame(animateMenuPop); 
      } 
      animateMenuPop(); 
    } 
    renderer.render(scene,camera); return; 
  }

  if(gameRunning && !paused){
    const currentSpeed=baseSpeed+speedBoost;
    player.position.z-=currentSpeed;
    updateGround(currentSpeed);
    player.position.x += (targetX-player.position.x)*0.15;
    player.position.y+=yVelocity; yVelocity-=0.01; if(player.position.y<=1){ player.position.y=1; yVelocity=0; onGround=true; }

    // Trail
    if(!deathAnimation) createTrail();
    trailCubes.forEach((t,i)=>{ t.mesh.material.opacity-=0.02; if(t.mesh.material.opacity<=0){ scene.remove(t.mesh); trailCubes.splice(i,1); } });

    // Neon lines
    neonLines.forEach(l=>{ l.position.z+=currentSpeed*1.5; if(l.position.z>camera.position.z+10){ l.position.z=-200; l.position.x=(Math.random()*12)-6; l.position.y=Math.random()*5; } });

    // Obstacles
    obstacles.forEach((obs,i)=>{
      obs.position.z+=currentSpeed;
      const obsHalfX=obs.geometry.parameters.width/2, obsHalfY=obs.geometry.parameters.height/2;
      if(Math.abs(obs.position.x-player.position.x)<1+obsHalfX && Math.abs(obs.position.y-player.position.y)<0.5+obsHalfY && Math.abs(obs.position.z-player.position.z)<1){ triggerDeath(); player.material.color.setHex(0xff0000); }
      if(obs.position.z>camera.position.z+5){ scene.remove(obs); obstacles.splice(i,1); }
    });

    // Coins
    coins.forEach((c,i)=>{
      c.position.z+=currentSpeed;
      c.rotation.y += 0.1;
      if(Math.abs(c.position.x-player.position.x)<1 && Math.abs(c.position.y-player.position.y)<1.2 && Math.abs(c.position.z-player.position.z)<1){
        sndCoin.play(); scene.remove(c); coins.splice(i,1); coinCount++; ownedCoins++; updateCoinsUI(); updateShopButtons();
        for(let p=0;p<5;p++){
          const part=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),new THREE.MeshStandardMaterial({ color:0xffff00, transparent:true, opacity:1 }));
          part.position.copy(player.position); scene.add(part);
          (function anim(){ let life=0; function tick(){ life+=0.03; part.position.y+=0.03; part.material.opacity-=0.03; if(part.material.opacity>0) requestAnimationFrame(tick); else scene.remove(part); } tick(); })();
        }
      }
      if(c.position.z>camera.position.z+5){ scene.remove(c); coins.splice(i,1); }
    });

    // Score
    score++; if(score%500===0) speedBoost+=0.02;
    scoreUI.textContent="Score: "+score; coinsUI.textContent="Coins: "+coinCount;

    // Progress
    updateProgress();

    // Portal
    if(portalAnimation && portal){
      portal.rotation.y+=0.07;

      // Move player into portal automatically
      if(Math.abs(player.position.x-portal.position.x)<2 && player.position.z-portal.position.z < 2){
        player.position.z -= 0.2;
        player.scale.multiplyScalar(0.98); // shrink animation
        if(player.scale.x < 0.1){
          portalAnimation = false;
          gameRunning = false;
          showLevelComplete();
        }
      }
    }

    // Camera
    camera.position.z=player.position.z+8; camera.position.y=4;
  }
  renderer.render(scene,camera);
}
animate();

// ===== Level Complete Animation =====
function showLevelComplete(){
  pauseTitle.textContent = "Level Complete!";
  pauseMenu.style.display = "flex";
  pauseMenu.style.opacity = 0;
  pauseMenu.style.transform = "scale(0.5)";
  resumeBtn.style.display = "none";
  let animProgress = 0;
  function animateComplete(){
    animProgress += 0.05;
    if(animProgress > 1) animProgress = 1;
    let ease = animProgress*animProgress*(3-2*animProgress);
    pauseMenu.style.opacity = ease;
    pauseMenu.style.transform = `scale(${0.5+0.5*ease})`;
    if(animProgress < 1) requestAnimationFrame(animateComplete);
    else setTimeout(()=> startGame(currentLevel+1>totalLevels?1:currentLevel+1), 1000);
  }
  animateComplete();
}

// ===== Restart / Menu =====
restartBtn.addEventListener("click",()=>{
  gameOver=false; deathAnimation=false; pauseMenu.style.display="none";
  startGame(currentLevel);
});
menuBtn.addEventListener("click",()=>{
  paused=false; gameRunning=false; gameOver=false; deathAnimation=false; portalAnimation=false;
  pauseMenu.style.display="none"; hudUI.style.display="none"; pauseBtn.style.display="none"; menuUI.style.display="flex";
  clearInterval(obstacleInterval); clearInterval(coinInterval);
  if(portal){scene.remove(portal); portal=null;}
});
pauseBtn.addEventListener("click",()=>{
  if(gameRunning && !paused){
    paused=true; pauseMenu.style.display="flex"; pauseBtn.style.display="none"; pauseTitle.textContent="Paused"; resumeBtn.style.display="inline-block";
  }
});
resumeBtn.addEventListener("click",()=>{
  if(!gameOver){ paused=false; pauseMenu.style.display="none"; pauseBtn.style.display="block"; }
});
