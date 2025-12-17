let scene, camera, renderer;
let player, playerColor = 0x00e5ff, playerFace = "🙂";
let lanes = [-2, 0, 2];
let currentLane = 1;
let targetX = lanes[currentLane];
let targetY = 1;                   
let isJumping = false;
let velocityY = 0;

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

let obstacles = [];
let obstacleWidth = 1;   
let obstacleHeight = 1;
let lastScaleScore = 0; 
let nextUpgradeIsWidth = true; 

let coinsArr = [];
let neonParticles = [];
let floors = [];
let uiParticles = [];
let backgroundParticles = []; 

let score = 0;
let coins = 0; 
let totalCoins = parseInt(localStorage.getItem("totalCoins")) || 0;
let ownedColors = JSON.parse(localStorage.getItem("ownedSkins")) || ["default"];
let selectedColor = localStorage.getItem("selectedSkin") || "default";

let levelHighScores = JSON.parse(localStorage.getItem("levelHighScores")) || {};
let unlockedLevels = JSON.parse(localStorage.getItem("unlockedLevels")) || [1];

let gameRunning = false;
let paused = false;
let level = 1;

let gameSpeed = 1.0;
let jumpForce = 0.6;
let gravity = 0.06;

let deathAnimation = false;
let deathVelocityY = 0;
let deathSpin = 0;

let levelDistance = 1000; 
let levelState = "idle"; 

let finishPortal = null;
let finishSequence = false;
let portalPullStrength = 0;

// ----------------------
// GAME SOUNDS
// ----------------------
const sounds = {
    jump: new Audio("sounds/jump.wav"),
    coin: new Audio("sounds/coin.wav"),
    hit: new Audio("sounds/hit.wav"),
    levelComplete: new Audio("sounds/level_complete.wav"),
    gameOver: new Audio("sounds/game_over.wav")
};

sounds.jump.volume = 0.5;
sounds.coin.volume = 0.5;
sounds.hit.volume = 0.7;
sounds.levelComplete.volume = 0.5;
sounds.gameOver.volume = 0.5;

const bgMusic = new Audio("sounds/bg_music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

const unlockSound = new Audio("sounds/unlock.wav");
unlockSound.volume = 0.6;

// UI ELEMENTS
const menu = document.getElementById("menu");
const pauseBtn = document.getElementById("pauseBtn");
const pauseMenu = document.getElementById("pauseMenu");

const scoreUI = document.getElementById("score");
const coinsUI = document.getElementById("coins");
const coinsOwnedUI = document.getElementById("coinsOwned");
const highUI = document.getElementById("highScore");
const menuHigh = document.getElementById("menuHigh");

const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const progressContainer = document.getElementById("progressBarContainer");

const shopCoinsUI = document.getElementById("shopCoins");

const aboutBtn = document.getElementById("aboutBtn");
const aboutMenu = document.getElementById("aboutMenu");
const closeAboutBtn = document.getElementById("closeAboutBtn");

let inputLocked = false;

// NEON UI COLORS
const neonBlue = "#00e5ff";
const neonYellow = "#ffff66";
const neonRed = "#ff4466";
const neonOrange = "#ffaa00";

const colorMap = { 
    default: 0x00e5ff, 
    red: 0xff3333, 
    purple: 0x9b5cff, 
    orange: 0xff9f1c, 
    green: 0x00ff88 
};

// SETUP THREE.JS
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 4, 10);
    camera.lookAt(0, 1, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("gameCanvas").appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    scene.add(light);

    createFloor();
    createPlayer();
    applySkin(colorMap[selectedColor] || playerColor);
    updateShopUI();

    createBackgroundParticles(100);

    document.querySelectorAll(".level-btn").forEach(btn => {
        btn.addEventListener("mouseenter", () => btn.style.transform = "scale(1.1)");
        btn.addEventListener("mouseleave", () => btn.style.transform = "scale(1)");
        btn.addEventListener("click", () => {
            const lvl = parseInt(btn.dataset.level);
            if (!unlockedLevels.includes(lvl)) return;
            startGame(lvl);
        });

    });
if (aboutBtn) {
  aboutBtn.addEventListener("click", () => {
    aboutMenu.style.display = "block";
  });
}

if (closeAboutBtn) {
  closeAboutBtn.addEventListener("click", () => {
    aboutMenu.style.display = "none";
  });
}
    document.getElementById("restartBtn").addEventListener("click", () => restartCurrentLevel());
    document.getElementById("menuBtn").addEventListener("click", () => returnToMenu());
    document.getElementById("pauseBtn").addEventListener("click", () => pauseGame());
    document.getElementById("resumeBtn").addEventListener("click", () => resumeGame());

    document.getElementById("shopBtn")?.addEventListener("click", () => { document.getElementById("shopMenu").style.display = "block"; });
    document.getElementById("shopBtnAlt")?.addEventListener("click", () => { document.getElementById("shopMenu").style.display = "block"; });
    document.getElementById("closeShopBtn")?.addEventListener("click", () => { document.getElementById("shopMenu").style.display = "none"; });

    // HUD enhancements
    enhanceHUD();

    animate();
}
init();

// HUD neon styling
function enhanceHUD() {
    [scoreUI, coinsUI, highUI, progressPercent].forEach(el => {
        el.style.color = neonBlue;
        el.style.textShadow = `0 0 8px ${neonBlue}, 0 0 16px ${neonBlue}, 0 0 24px ${neonBlue}`;
        el.style.fontFamily = "Orbitron, sans-serif";
        el.style.fontWeight = "bold";
    });

    progressBar.style.background = neonBlue;
    progressBar.style.boxShadow = `0 0 8px ${neonBlue}, 0 0 16px ${neonBlue}`;
    progressContainer.style.background = "rgba(0,0,0,0.2)";
    progressContainer.style.border = `2px solid ${neonBlue}`;
    progressContainer.style.boxShadow = `0 0 12px ${neonBlue}`;
}

// OBJECTS
function createFloor() {
    const geo = new THREE.PlaneGeometry(20, 100);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00002A }); // darker neon background
    floors = [];

    for (let i = 0; i < 6; i++) {
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.z = -100 * i;
        scene.add(floor);
        floors.push(floor);
    }
}
function createPlayer() {
    const geo = new THREE.SphereGeometry(0.5, 32, 32); // radius 0.5
    const mat = new THREE.MeshStandardMaterial({
        color: colorMap[selectedColor] || playerColor,
        emissiveIntensity: 0.8,
        roughness: 0.6,
        metalness: 0,
        transparent: true,
        opacity: 1
    });
    player = new THREE.Mesh(geo, mat);
    player.position.set(lanes[currentLane], 1, 0);
    scene.add(player);
}

function applySkin(colorHex){
  if(!player) return;
  player.material.color.setHex(colorHex);
}

function restoreSelectedSkin(){
  const card = document.querySelector(`.shop-card[data-id="${selectedSkin}"]`);
  if(card){
    applySkin(Number(card.dataset.color));
  }
}

// BACKGROUND PARTICLES
function createBackgroundParticles(count) {
    for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.05, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.5 });
        const p = new THREE.Mesh(geo, mat);
        p.position.set((Math.random() - 0.5) * 20, Math.random() * 5 + 1, (Math.random() - 1) * 200);
        p.userData = { speed: 0.05 + Math.random() * 0.1 };
        backgroundParticles.push(p);
        scene.add(p);
    }
}

function updateBackgroundParticles() {
    for (let i = 0; i < backgroundParticles.length; i++) {
        const p = backgroundParticles[i];
        p.position.z += p.userData.speed;
        if (p.position.z > 12) {
            p.position.z = -200;
            p.position.x = (Math.random() - 0.5) * 20;
            p.position.y = Math.random() * 5 + 1;
        }
    }
}

function createObstacle(zPos, overrideLane = null) {
    const geo = new THREE.BoxGeometry(obstacleWidth, obstacleHeight, 1); // use dynamic size
    const mat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 0.3 });
    const obs = new THREE.Mesh(geo, mat);
    const lane = overrideLane !== null ? overrideLane : lanes[Math.floor(Math.random() * 3)];
    obs.position.set(lane, obstacleHeight / 2, zPos); // adjust Y for new height
    obs.userData = { baseLane: lane, moveDir: Math.random() > 0.5 ? 1 : -1, rotationSpeed: Math.random()*0.06 };
    scene.add(obs);
    obstacles.push(obs);
}

function createCoin(zPos) {
    const geo = new THREE.SphereGeometry(0.4, 12, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.7 });
    const coin = new THREE.Mesh(geo, mat);
    const lane = lanes[Math.floor(Math.random() * 3)];
    coin.position.set(lane, 0.6, zPos);
    scene.add(coin);
    coinsArr.push(coin);
}

// PARTICLES
function spawnCoinParticles(pos) {
    for (let i = 0; i < 8; i++) {
        const geo = new THREE.SphereGeometry(0.08, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff66 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
        p.scale.setScalar(1);
        neonParticles.push(p);
        scene.add(p);
    }
}

function spawnHitEffect(pos) {
    for (let i = 0; i < 12; i++) {
        const geo = new THREE.SphereGeometry(0.12, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4466 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.velocity = new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.9, (Math.random() - 0.5) * 1.2);
        p.scale.setScalar(1);
        neonParticles.push(p);
        scene.add(p);
    }
}

function spawnJumpTrail(pos) {
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.2, -Math.random() * 0.08, (Math.random() - 0.5) * 0.2);
    p.scale.setScalar(1);
    neonParticles.push(p);
    scene.add(p);
}

function spawnLandingEffect(pos) {
    for (let i = 0; i < 8; i++) {
        const geo = new THREE.SphereGeometry(0.1, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.7, (Math.random() - 0.5) * 0.6);
        p.scale.setScalar(1);
        neonParticles.push(p);
        scene.add(p);
    }
}

function updateParticles() {
    for (let i = neonParticles.length - 1; i >= 0; i--) {
        const p = neonParticles[i];
        p.position.add(p.velocity);
        p.velocity.multiplyScalar(0.96);
        p.scale.multiplyScalar(0.96);
        if (p.position.y < 0 || p.scale.x < 0.02) {
            scene.remove(p);
            neonParticles.splice(i, 1);
        }
    }
}

// GAME START
function startGame(selectedLevel = 1) {
    level = selectedLevel;
    applyLevelSettings(level);

    bgMusic.currentTime = 0;
    bgMusic.play();

    currentLane = 1;
    targetX = lanes[currentLane];
    targetY = 1;
    player.position.set(targetX, targetY, 0);
    player.rotation.set(0,0,0);
    if (player.material) {
        player.material.opacity = 1;
        player.material.transparent = true;
    }
    velocityY = 0;
    isJumping = false;

    deathAnimation = false;
    deathVelocityY = 0;
    deathSpin = 0;
    inputLocked = false;

    score = 0;
    coins = 0;
    scoreUI.textContent = "Score: 0";
    coinsUI.textContent = "Coins: 0";

// REMOVE old objects
obstacles.forEach(o => scene.remove(o));
coinsArr.forEach(c => scene.remove(c));
neonParticles.forEach(p => scene.remove(p));
obstacles = [];
coinsArr = [];
neonParticles = [];

// RESET obstacle scaling
obstacleWidth = 1;
obstacleHeight = 1;
lastScaleScore = 0;
nextUpgradeIsWidth = true;

const lvlKey = `level${level}`;
highUI.textContent = "High Score: " + (levelHighScores[lvlKey] || 0);

// CREATE obstacles for the level
const obstacleCount = 6; 
for (let i = 0; i < obstacleCount; i++) {
    const zPos = -70 - i * 30; 
    createObstacle(zPos);
}

// CREATE coins for the level
const coinCount = 8; 
for (let i = 0; i < coinCount; i++) {
    const zPos = -10 - i * 25;  
    createCoin(zPos);
}

    menu.style.display = "none";
    pauseBtn.style.display = "block";
    pauseMenu.style.display = "none";
    document.getElementById("hud").style.display = "flex";
    progressContainer.style.display = "block";
    progressPercent.style.display = "block";
    document.getElementById("resumeBtn").style.display = "block";

    progressBar.style.width = "0%";
    progressPercent.textContent = "0%";
    levelState = "running";
    inputLocked = false;

    document.getElementById("resumeBtn").style.display = "none";

    gameRunning = true;
    paused = false;
}

function applyLevelSettings(lvl) {
    gameSpeed = 0.7 + lvl * 0.35;
    levelDistance = 1000 + (lvl - 1) * 600;
}

// GAME LOOP
function animate() {
    requestAnimationFrame(animate);

    if (gameRunning && !paused) {
        if (levelState === "running") {
            score += 0.2;
        }
        scoreUI.textContent = "Score: " + Math.floor(score);

        const lvlKey = `level${level}`;
        const currentBest = levelHighScores[lvlKey] || 0;
        const runScore = Math.floor(score);

        if (runScore > currentBest) {
            levelHighScores[lvlKey] = runScore;

            // Update HUD instantly
            highUI.textContent = "High Score: " + runScore;

            // Persist immediately
            localStorage.setItem("levelHighScores", JSON.stringify(levelHighScores));
        }

        // Player movement smoothing
        player.position.x += (targetX - player.position.x) * 0.18;

    
        const ballRadius = 0.5; 

        player.rotation.x -= gameSpeed / ballRadius;

        let deltaX = targetX - player.position.x;
        player.rotation.z += deltaX / ballRadius * 0.18;

        if (isJumping) {
            targetY += velocityY;
            velocityY -= gravity;
            player.position.y += (targetY - player.position.y) * 0.18;

            spawnJumpTrail(player.position);

            if (player.position.y <= 1.01 && velocityY < 0) {
                targetY = 1;
                player.position.y = 1;
                isJumping = false;
                velocityY = 0;
                spawnLandingEffect(player.position);
            }
        }

        moveObjects();
        checkCollisions();
        updateParticles();
        updateProgress();
        updateBackgroundParticles(); 
        updateFinishSequence();
        updateShopCoins();

        if (score >= levelDistance && levelState === "running") {
            startFinishSequence();
        }
    }

    playDeathAnimation();
    spawnUIParticles();
    updateUIParticles();

    renderer.render(scene, camera);
}

function startFinishSequence() {
    levelState = "finishing";
    finishSequence = true;
    inputLocked = true;

    gameSpeed = 0.6; 
    createFinishGate();
}

function updateFinishSequence() {
    if (!finishSequence || !finishPortal) return;

    const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.05;
    finishPortal.scale.set(pulse, pulse, pulse);

    const target = new THREE.Vector3(
        0,
        1,
        finishPortal.position.z + 0.2
    );

    player.position.x += (target.x - player.position.x) * 0.06;
    player.position.y += (target.y - player.position.y) * 0.06;
    player.position.z += (target.z - player.position.z) * 0.12;

    if (player.material) {
        player.material.opacity *= 0.985;
    }

    if (player.position.z < finishPortal.position.z + 0.4) {
        finishSequence = false;
        scene.remove(finishPortal);
        finishPortal = null;

        if (player.material) player.material.opacity = 0;

        onLevelComplete();
    }
}


// MOVE & RECYCLE OBJECTS
function moveObjects() {

if (score >= lastScaleScore + 300) {

    if (nextUpgradeIsWidth) {
        obstacleWidth += 1;    
    } else {
        obstacleHeight += 1;   
    }

    nextUpgradeIsWidth = !nextUpgradeIsWidth;

    lastScaleScore = Math.floor(score);

    obstacles.forEach(o => {
        o.scale.set(obstacleWidth, obstacleHeight, 1);
        o.position.y = obstacleHeight / 2;
    });
}

    for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i];
        o.position.z += gameSpeed;

        if (level === 2) {
            const amp = 1.2 + level * 0.1;
            o.userData.movePhase = (o.userData.movePhase || Math.random() * Math.PI * 2) + 0.02 * (i % 3 + 1);
            o.position.x = o.userData.baseLane + Math.sin(o.userData.movePhase) * amp;
        } else if (level === 3) {
            if (!o.userData.hasFallingInit) {
                o.userData.hasFallingInit = true;
                o.position.y = 7.0 + Math.random() * 1.0;
                o.userData.dropVel = 0;
            }
            o.userData.dropVel += 0.00 + Math.random() * 0.001;
            o.position.y -= o.userData.dropVel;
            if (o.position.y < 0.5) o.position.y = obstacleHeight / 2;
;
        } else {
            o.position.y = obstacleHeight / 2;
            o.userData.hasFallingInit = false;
        }

        if (level === 4) {
            o.rotation.x += 0.02;
            o.rotation.y += (o.userData.rotationSpeed || 0.04);
        } else {
            o.rotation.set(0, 0, 0);
        }

        if (level === 5) {
            if (!o.userData.trapChecked && Math.random() < 0.02) {
                o.userData.isTrap = true;
                o.material.emissive.setHex(0xFFAA00);
                o.userData.trapChecked = true;
            }
        }

        if (o.position.z > 12) {
            o.position.z = -200 - Math.random() * 220;
            o.position.x = lanes[Math.floor(Math.random() * 3)];
            o.userData.baseLane = o.position.x;
            o.userData.movePhase = Math.random() * Math.PI * 2;
            o.rotation.set(0, 0, 0);
            o.position.y = obstacleHeight / 2;
            o.userData.hasFallingInit = false;
            o.userData.isTrap = Math.random() < 0.08 ? true : false;
            if (o.userData.isTrap) o.material.emissive.setHex(0xFFAA00); else o.material.emissive.setHex(0xff4444);
        }
    }

    for (let i = 0; i < coinsArr.length; i++) {
        const c = coinsArr[i];
        c.position.z += gameSpeed;
        c.position.y = 0.6 + Math.sin((c.position.z + i) * 0.1) * 0.08;
        if (c.position.z > 12) {
            c.position.z = -120 - Math.random() * 350;
            c.position.x = lanes[Math.floor(Math.random() * 3)];
            c.position.y = 0.6;
        }
    }

    for (let i = 0; i < floors.length; i++) {
    const f = floors[i];
    f.position.z += gameSpeed;

    if (levelState === "finishing") continue;

    if (f.position.z > 60) {
        f.position.z -= floors.length * 100;
    }
}

}

function updateShopCoins() {
    if (coinsUI) coinsUI.textContent = "Coins: " + coins;
    if (coinsOwnedUI) coinsOwnedUI.textContent = "Coins: " + totalCoins;
}

function updateShopUI(){
  if (coinsOwnedUI) coinsOwnedUI.textContent = "Coins: " + totalCoins;

  document.querySelectorAll(".shop-card").forEach(card=>{
    const id = card.dataset.id;
    const action = card.querySelector(".skin-action");

    card.classList.toggle("owned", ownedColors.includes(id));
    card.classList.toggle("selected", id === selectedColor);

    if (id === selectedColor) action.textContent = "SELECTED";
    else if (ownedColors.includes(id)) action.textContent = "OWNED";
    else action.textContent = "BUY";
  });
}

// COLLISIONS
function checkCollisions() {
    if (levelState !== "running") return;

    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        const zDiff = Math.abs(obs.position.z - player.position.z);
        const xDiff = Math.abs(obs.position.x - player.position.x);
        const yPlayer = player.position.y;
        const yObs = obs.position.y;

        let isHit = false;
        if (level === 3) {
            if (zDiff < 1.0 && xDiff < 0.9 && yObs <= 1.2 && yPlayer <= 1.2) isHit = true;
        } else {
            if (zDiff < 0.9 && xDiff < 0.9 && player.position.y <= 1.2) isHit = true;
        }

        if (isHit) {
            if (level === 5 && obs.userData.isTrap) {
                const prevSpeed = gameSpeed;
                gameSpeed = Math.max(0.6, gameSpeed * 0.5);
                spawnHitEffect(player.position);
                setTimeout(() => { gameSpeed = prevSpeed; }, 900);
                obs.position.z = -200 - Math.random() * 200;
                obs.position.x = lanes[Math.floor(Math.random() * 3)];
                obs.userData.isTrap = false;
                obs.material.emissive.setHex(0xff4444);
            } else {
                spawnHitEffect(player.position);
                sounds.hit.currentTime = 0;
                sounds.hit.play();
                startDeathAnimation();
                return;
            }
        }
    }

    for (let i = coinsArr.length - 1; i >= 0; i--) {
        const c = coinsArr[i];
        const zDiff = Math.abs(c.position.z - player.position.z);
        const xDiff = Math.abs(c.position.x - player.position.x);
        const yDiff = Math.abs(c.position.y - player.position.y);

         if (zDiff < 0.9 && xDiff < 0.9 && yDiff < 1.2) {
            coins++;          
            totalCoins++;     

            localStorage.setItem("totalCoins", totalCoins);

            sounds.coin.currentTime = 0;
            sounds.coin.play();

            spawnCoinParticles(c.position);
            updateShopCoins();

            c.position.z = -120 - Math.random() * 200;
            c.position.x = lanes[Math.floor(Math.random() * 3)];
        }
    }

}

// DEATH ANIMATION
// ------------------------------
// DEATH ANIMATION & GAME OVER
// ------------------------------
function startDeathAnimation() {
    if (deathAnimation) return; 

    deathAnimation = true;
    inputLocked = true;
    gameRunning = false; 

    deathVelocityY = 0.4; 
    deathSpin = 0;

    if (player.material) {
        player.material.transparent = true;
        player.material.opacity = 1;
    }
}

function playDeathAnimation() {
    if (!deathAnimation) return;
 
    deathVelocityY -= 0.025; 
    player.position.y += deathVelocityY;
    deathSpin += 0.07;
    player.rotation.x += 0.15;
    player.rotation.z += 0.18;

    if (player.material && typeof player.material.opacity === "number") {
        player.material.opacity = Math.max(0, player.material.opacity - 0.01);
    }

    if ((player.material && player.material.opacity <= 0) || player.position.y < -6) {
        deathAnimation = false;

        if (player.material) player.material.opacity = 0;

        showGameOverMenu();
    }
}

// ------------------------------
// SHOW GAME OVER MENU
// ------------------------------
function showGameOverMenu() {
    levelState = "gameover";
    paused = true;
    inputLocked = true;

    pauseBtn.style.display = "none";

    const menuEl = pauseMenu;
    menuEl.style.display = "flex";
    menuEl.style.transform = "scale(1)";
    menuEl.style.opacity = "1";

    sounds.gameOver.currentTime = 0;
    sounds.gameOver.play();

    document.getElementById("pauseTitle").innerText = "Game Over";
    document.getElementById("resumeBtn").style.display = "none";

    const lvlKey = `level${level}`;
    const best = levelHighScores[lvlKey] || 0;
    highUI.textContent = "High Score: " + best;
    menuHigh.textContent = best;

    const percent = Math.floor((score / levelDistance) * 100);
    const nextLevel = level + 1;

    if (percent >= 60 && nextLevel <= 5 && !unlockedLevels.includes(nextLevel)) {
        unlockedLevels.push(nextLevel);
        localStorage.setItem("unlockedLevels", JSON.stringify(unlockedLevels));
    }

    finalizeRunAndUpdateMenu();
    updateLevelLocks();

    zoomInMenu(menuEl);

    player.position.set(lanes[1], 1, 0);
    player.rotation.set(0, 0, 0);
    if (player.material) player.material.opacity = 1;
}


function zoomInMenu(menuEl) {
    let scale = 0.1;
    let opacity = 0;
    const duration = 30;
    let frame = 0;

    function animateZoom() {
        frame++;
        scale += (1 - scale) * 0.2;
        opacity += (1 - opacity) * 0.15;
        menuEl.style.transform = `scale(${scale})`;
        menuEl.style.opacity = opacity;

        if (frame < duration) {
            requestAnimationFrame(animateZoom);
        } else {
            menuEl.style.transform = "scale(1)";
            menuEl.style.opacity = "1";
        }
    }

    animateZoom();
}

// LEVEL COMPLETE
function onLevelComplete() {
    levelState = "levelcomplete";
    paused = true;
    inputLocked = true;

    sounds.levelComplete.currentTime = 0;
    sounds.levelComplete.play();

    pauseBtn.style.display = "none";
    pauseMenu.style.display = "flex";
    document.getElementById("pauseTitle").innerText = "Level Complete!";
    document.getElementById("resumeBtn").style.display = "none";

    player.position.set(lanes[1], 1, 0);
    player.rotation.set(0,0,0);
    
        const lvlKey = `level${level}`;
        const currentBest = levelHighScores[lvlKey] || 0;

        if (Math.floor(score) > currentBest) {
            levelHighScores[lvlKey] = Math.floor(score);
            localStorage.setItem("levelHighScores", JSON.stringify(levelHighScores));
        }

        const percent = Math.floor((score / levelDistance) * 100);
        const nextLevel = level + 1;

        if (percent >= 80 && nextLevel <= 5 && !unlockedLevels.includes(nextLevel)) {
            unlockedLevels.push(nextLevel);
            localStorage.setItem("unlockedLevels", JSON.stringify(unlockedLevels));

            setTimeout(() => {

                const btn = document.querySelector(`.level-btn[data-level="${nextLevel}"]`);
                if (btn) {
                    spawnUnlockBurst(btn);
                }

                unlockSound.currentTime = 0;
                unlockSound.play();
            }, 400);
        }
        totalCoins += coins;
        localStorage.setItem("totalCoins", totalCoins);
        updateShopCoins();

        zoomInMenu(pauseMenu);
        updateLevelLocks();
        finalizeRunAndUpdateMenu();
}

// PROGRESS BAR
function updateProgress() {
    let percent = Math.min(100, (score / levelDistance) * 100);
    progressBar.style.width = percent + "%";
    progressPercent.textContent = Math.floor(percent) + "%";
}

function createUIParticle(x, y, color = neonBlue) {
    const particle = document.createElement("div");
    particle.className = "uiParticle";
    particle.style.position = "absolute";
    particle.style.width = `${Math.random() * 4 + 2}px`;
    particle.style.height = particle.style.width;
    particle.style.background = color;
    particle.style.borderRadius = "50%";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.opacity = Math.random() * 0.6 + 0.2;
    particle.style.pointerEvents = "none";
    document.body.appendChild(particle);
    particle.vx = (Math.random() - 0.5) * 0.5;
    particle.vy = (Math.random() - 0.5) * 0.5;
    particle.life = Math.random() * 50 + 50;
    uiParticles.push(particle);
}

function updateUIParticles() {
    for (let i = uiParticles.length - 1; i >= 0; i--) {
        const p = uiParticles[i];
        p.style.left = parseFloat(p.style.left) + p.vx + "px";
        p.style.top = parseFloat(p.style.top) + p.vy + "px";
        p.life -= 1;
        p.style.opacity = parseFloat(p.style.opacity) * 0.96;
        if (p.life <= 0 || parseFloat(p.style.opacity) < 0.05) {
            document.body.removeChild(p);
            uiParticles.splice(i, 1);
        }
    }
}

function spawnUIParticles() {
    const hudEls = [scoreUI, coinsUI, highUI, progressBar, progressPercent];
    hudEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (Math.random() < 0.4) { 
            const x = rect.left + Math.random() * rect.width;
            const y = rect.top + Math.random() * rect.height;
            createUIParticle(x, y, neonBlue);
        }
    });

    document.querySelectorAll("#menu button, #pauseMenu button").forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (Math.random() < 0.3) {
            const x = rect.left + Math.random() * rect.width;
            const y = rect.top + Math.random() * rect.height;
            createUIParticle(x, y, neonYellow);
        }
    });
}

function createFinishGate() {
    const group = new THREE.Group();

    const outerGeo = new THREE.TorusGeometry(3.2, 0.25, 16, 48);
    const outerMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00e5ff,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.95
    });

    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.rotation.x = Math.PI / 2;

    const innerGeo = new THREE.TorusGeometry(2.4, 0.15, 16, 48);
    const innerMat = new THREE.MeshStandardMaterial({
        color: 0xffff66,
        emissive: 0xffff66,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9
    });

    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = Math.PI / 2;

    group.add(outer);
    group.add(inner);

    group.position.set(0, 1.6, -45);
    scene.add(group);

    finishPortal = group;
}


function spawnUnlockBurst(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 18; i++) {
        const p = document.createElement("div");
        p.className = "unlock-particle";
        p.style.left = centerX + "px";
        p.style.top = centerY + "px";

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 2;

        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 40;

        document.body.appendChild(p);

        const interval = setInterval(() => {
            p.style.left = parseFloat(p.style.left) + p.vx + "px";
            p.style.top = parseFloat(p.style.top) + p.vy + "px";
            p.style.opacity -= 0.025;
            p.life--;

            if (p.life <= 0) {
                clearInterval(interval);
                p.remove();
            }
        }, 16);
    }
}

// ----------- TOUCH GESTURES ------------
document.addEventListener("touchstart", (e) => {
    if (inputLocked || paused) return;
    const touch = e.changedTouches[0];
    touchStartX = touch.pageX;
    touchStartY = touch.pageY;
});

document.addEventListener("touchmove", (e) => {
    const touch = e.changedTouches[0];
    touchEndX = touch.pageX;
    touchEndY = touch.pageY;
});

document.addEventListener("touchend", (e) => {
    if (inputLocked || paused) return;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    const absDX = Math.abs(dx);
    const absDY = Math.abs(dy);

    const swipeThreshold = 40; 

    // ---------- HORIZONTAL SWIPE ----------
    if (absDX > absDY && absDX > swipeThreshold) {

        if (dx > 0) {
            //  Swipe Right
            if (currentLane < 2) currentLane++;
            targetX = lanes[currentLane];
        } else {
            //  Swipe Left
            if (currentLane > 0) currentLane--;
            targetX = lanes[currentLane];
        }
        return;
    }

    // ---------- VERTICAL SWIPE ----------
    if (absDY > absDX && absDY > swipeThreshold) {

        if (dy < 0) {
            // 👆 Swipe Up (jump)
            if (!isJumping && player.position.y <= 1.05) {
                isJumping = true;
                velocityY = jumpForce;
                sounds.jump.currentTime = 0; // reset to allow quick consecutive jumps
                sounds.jump.play();
            }
        }
        return;
    }

    // ---------- TAP TO JUMP ----------
    if (absDX < 10 && absDY < 10) {
        if (!isJumping && player.position.y <= 1.05) {
            isJumping = true;
            velocityY = jumpForce;
        }
    }
});

// PLAYER CONTROLS
document.addEventListener("keydown", (e) => {
    if (inputLocked || levelState !== "running") return;

    if (e.code === "ArrowLeft" || e.code === "KeyA") {
        if (currentLane > 0) currentLane--;
        targetX = lanes[currentLane];
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
        if (currentLane < lanes.length - 1) currentLane++;
        targetX = lanes[currentLane];
    }
    if ((e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") && !isJumping) {
        isJumping = true;
        velocityY = jumpForce;
    }
});

// PAUSE / RESUME
function pauseGame() {
    paused = true;
    pauseMenu.style.display = "flex";
}

function resumeGame() {
    if (levelState === "running") {
        paused = false;
        pauseMenu.style.display = "none";
    }
}

// RESTART & MENU
function restartCurrentLevel() {
    startGame(level);
}

function returnToMenu() {

    setTimeout(() => {
    updateLevelBestRuns();
}, 50);

    menu.style.display = "flex";
    pauseMenu.style.display = "none";
    paused = true;
    gameRunning = false;

    updateLevelBestRuns();
    updateLevelLocks();
}

function updateLevelBestRuns() {
    const data = JSON.parse(localStorage.getItem("levelHighScores")) || {};

    document.querySelectorAll(".level-btn").forEach(btn => {
        const lvl = parseInt(btn.dataset.level);
        if (!lvl) return; 

        const bestScore = data[`level${lvl}`] || 0;
        const maxDist = 1000 + (lvl - 1) * 600;
        const percent = Math.min(100, Math.floor((bestScore / maxDist) * 100));

        const bestEl = btn.querySelector(`#best-level-${lvl}`) || btn.querySelector(".best-level");
        if (bestEl) {
            bestEl.innerHTML = `
                Best Run: ${bestScore}<br>
                <span style="font-size:12px;opacity:.7">Best: ${percent}%</span>
            `;
        }

        const bar = btn.querySelector(`#level-progress-${lvl}`) || btn.querySelector(".level-progress");
        if (bar) {
            bar.style.width = percent + "%";
        }
    });

    const lvlKey = `level${level}`;
    const bestForCurrent = data[lvlKey] || 0;
    highUI.textContent = "High Score: " + bestForCurrent;
}

function updateLevelLocks() {
    document.querySelectorAll(".level-btn").forEach(btn => {
        const lvl = parseInt(btn.dataset.level);
        const lock = btn.querySelector(".level-lock");

        if (unlockedLevels.includes(lvl)) {
            btn.classList.remove("locked");
            btn.classList.add("unlocked");
            if (lock) lock.style.opacity = "0";
        } else {
            btn.classList.add("locked");
            btn.classList.remove("unlocked");
            if (lock) lock.style.opacity = "1";
        }
    });

    localStorage.setItem("unlockedLevels", JSON.stringify(unlockedLevels));
}

function finalizeRunAndUpdateMenu() {
    totalCoins += coins;
    localStorage.setItem("totalCoins", totalCoins);
    updateShopCoins();

    const lvlKey = `level${level}`;
    const runScore = Math.floor(score);
    const currentBest = levelHighScores[lvlKey] || 0;

    if (runScore > currentBest) {
        levelHighScores[lvlKey] = runScore;
        localStorage.setItem("levelHighScores", JSON.stringify(levelHighScores));
    }
    updateLevelBestRuns();
    updateLevelLocks();
}

document.querySelectorAll(".shop-card").forEach(card=>{
  card.addEventListener("click",()=>{
    const id = card.dataset.id;
    const cost = Number(card.dataset.cost);
    const color = Number(card.dataset.color);

    // SELECT
    if (ownedColors.includes(id)) {
      selectedColor = id;
      playerColor = color;

      localStorage.setItem("selectedSkin", id);
      applySkin(color);
      updateShopUI();
      return;
    }

    // BUY
    if (totalCoins >= cost) {
      totalCoins -= cost;
      ownedColors.push(id);

      localStorage.setItem("totalCoins", totalCoins);
      localStorage.setItem("ownedSkins", JSON.stringify(ownedColors));
      localStorage.setItem("selectedSkin", id);

      selectedColor = id;
      playerColor = color;

      applySkin(color);
      updateShopUI();
    } else {
      alert("Not enough coins!");
    }
  });
});

document.querySelectorAll("#menu button, #pauseMenu button").forEach(btn => {
    btn.style.transition = "0.2s";
    btn.addEventListener("mouseenter", () => btn.style.boxShadow = `0 0 16px ${neonBlue}, 0 0 32px ${neonBlue}`);
    btn.addEventListener("mouseleave", () => btn.style.boxShadow = "");
});
document.getElementById("settingsBtn")?.addEventListener("click", () => { document.getElementById("settingsMenu").style.display = "block"; });
document.getElementById("settingsBtnAlt")?.addEventListener("click", () => { document.getElementById("settingsMenu").style.display = "block"; });
document.getElementById("closeSettingsBtn")?.addEventListener("click", () => { document.getElementById("settingsMenu").style.display = "none"; });

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById("shopBtn")?.addEventListener("click", () => {
    updateShopCoins();
    document.getElementById("shopMenu").style.display = "block";
});


