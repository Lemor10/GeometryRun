//--------------------------------------------
// BASIC GAME STATES
//--------------------------------------------
let scene, camera, renderer;
let player, playerColor = 0x00e5ff, playerFace = "🙂";
let lanes = [-2, 0, 2];
let currentLane = 1;
let targetX = lanes[currentLane]; // Smooth target X for lane
let targetY = 1;                   // Smooth target Y for jump
let isJumping = false;
let velocityY = 0;
let obstacles = [];
let coinsArr = [];
let neonParticles = [];
let floors = [];

let score = 0;
let coins = 0;
let highScore = 0;

let gameRunning = false;
let paused = false;
let level = 1;

let gameSpeed = 1.0;
let jumpForce = 0.7;
let gravity = 0.06;

//--------------------------------------------
// UI ELEMENTS
//--------------------------------------------
const menu = document.getElementById("menu");
const pauseBtn = document.getElementById("pauseBtn");
const pauseMenu = document.getElementById("pauseMenu");

const scoreUI = document.getElementById("score");
const coinsUI = document.getElementById("coins");
const highUI = document.getElementById("highScore");
const menuHigh = document.getElementById("menuHigh");

const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const progressContainer = document.getElementById("progressBarContainer");

//--------------------------------------------
// SETUP THREE.JS
//--------------------------------------------
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 4, 10); // Higher and farther back
    camera.lookAt(0, 1, 0);        // Look slightly above ground

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("gameCanvas").appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    scene.add(light);

    createFloor();
    createPlayer();

    animate();
}
init();

//--------------------------------------------
// OBJECTS
//--------------------------------------------
function createFloor() {
    const geo = new THREE.PlaneGeometry(20, 100); // Longer plane
    const mat = new THREE.MeshBasicMaterial({ color: 0x0000FF });
    floors = [];

    // Create enough segments to cover visible area
    for (let i = 0; i < 5; i++) {
        const floor = new THREE.Mesh(geo, mat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.z = -100 * i;
        scene.add(floor);
        floors.push(floor);
    }
}

function createPlayer() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: playerColor, emissive: playerColor, emissiveIntensity: 0.5 });
    player = new THREE.Mesh(geo, mat);
    player.position.set(lanes[currentLane], 1, 0);
    scene.add(player);
}

function createObstacle(zPos) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 0.3 });
    const obs = new THREE.Mesh(geo, mat);
    const lane = lanes[Math.floor(Math.random() * 3)];
    obs.position.set(lane, 0.5, zPos);
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

//--------------------------------------------
// PARTICLES
//--------------------------------------------
function spawnCoinParticles(pos) {
    for (let i = 0; i < 6; i++) {
        const geo = new THREE.SphereGeometry(0.1, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.velocity = new THREE.Vector3((Math.random() - 0.5)/2, Math.random()/2, (Math.random() - 0.5)/2);
        neonParticles.push(p);
        scene.add(p);
    }
}

function spawnHitEffect(pos) {
    for (let i = 0; i < 10; i++) {
        const geo = new THREE.SphereGeometry(0.1, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.velocity = new THREE.Vector3((Math.random() - 0.5)/1.5, Math.random()/1.5, (Math.random() - 0.5)/1.5);
        neonParticles.push(p);
        scene.add(p);
    }
}

function updateParticles() {
    for (let i = neonParticles.length - 1; i >= 0; i--) {
        const p = neonParticles[i];
        p.position.add(p.velocity);
        p.velocity.multiplyScalar(0.95);
        p.scale.multiplyScalar(0.95);
        if (p.position.y < 0 || p.scale.x < 0.01) {
            scene.remove(p);
            neonParticles.splice(i, 1);
        }
    }
}

//--------------------------------------------
// GAME START
//--------------------------------------------
function startGame(selectedLevel) {
    level = selectedLevel;
    gameSpeed = 0.25 + (level * 0.05);

    currentLane = 1;
    targetX = lanes[currentLane];
    targetY = 1;
    player.position.set(targetX, targetY, 0);
    velocityY = 0;
    isJumping = false;

    score = 0;
    coins = 0;
    scoreUI.textContent = "Score: 0";
    coinsUI.textContent = "Coins: 0";

    obstacles.forEach(o => scene.remove(o));
    coinsArr.forEach(c => scene.remove(c));
    obstacles = [];
    coinsArr = [];

    menu.style.display = "none";
    pauseBtn.style.display = "block";
    pauseMenu.style.display = "none";
    document.getElementById("hud").style.display = "flex";
    progressContainer.style.display = "block";
    progressPercent.style.display = "block";

    progressBar.style.width = "0%";
    progressPercent.textContent = "0%";

    // Pre-fill obstacles and coins to cover visible area
    for (let z = -20; z > -200; z -= 30) createObstacle(z);
    for (let z = -10; z > -150; z -= 15) createCoin(z);

    gameRunning = true;
    paused = false;

    document.getElementById("resumeBtn").style.display = "block";
}

//--------------------------------------------
// GAME LOOP
//--------------------------------------------
function animate() {
    requestAnimationFrame(animate);

    if (gameRunning && !paused) {
        score += 0.1;
        scoreUI.textContent = "Score: " + Math.floor(score);

        // Smooth X movement
        player.position.x += (targetX - player.position.x) * 0.15;

        // Smooth jump
        if (isJumping) {
            targetY += velocityY;
            velocityY -= gravity;
            player.position.y += (targetY - player.position.y) * 0.15;

            spawnJumpTrail(player.position);

            if (player.position.y <= 1.01 && velocityY < 0) {
                targetY = 1;
                player.position.y = 1;
                isJumping = false;
                velocityY = 0;
                spawnLandingEffect(player.position);
            }
        }

        moveObjects();       // Move & recycle obstacles/coins/floor
        checkCollisions();
        updateParticles();
        updateProgress();
    }

    renderer.render(scene, camera);
}

//--------------------------------------------
// JUMP & LANDING PARTICLES
//--------------------------------------------
function spawnJumpTrail(pos) {
    const geo = new THREE.SphereGeometry(0.08, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(pos);
    p.velocity = new THREE.Vector3((Math.random()-0.5)/5, -Math.random()/10, (Math.random()-0.5)/5);
    neonParticles.push(p);
    scene.add(p);
}

function spawnLandingEffect(pos) {
    for (let i = 0; i < 8; i++) {
        const geo = new THREE.SphereGeometry(0.1, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(pos);
        p.velocity = new THREE.Vector3((Math.random() - 0.5)/2, Math.random()/2, (Math.random() - 0.5)/2);
        neonParticles.push(p);
        scene.add(p);
    }
}

//--------------------------------------------
// MOVE & RECYCLE OBJECTS
//--------------------------------------------
function moveObjects() {
    // Obstacles
    obstacles.forEach(o => {
        o.position.z += gameSpeed;
        if (o.position.z > 10) { // behind player
            o.position.z = -180;   // spawn ahead
            o.position.x = lanes[Math.floor(Math.random() * 3)];
        }
    });

    // Coins
    coinsArr.forEach(c => {
        c.position.z += gameSpeed;
        if (c.position.z > 10) {
            c.position.z = -150;
            c.position.x = lanes[Math.floor(Math.random() * 3)];
        }
    });

    // Floors
    floors.forEach(f => {
        f.position.z += gameSpeed;
        if (f.position.z > 50) { // move floor behind
            f.position.z -= floors.length * 100;
        }
    });
}

//--------------------------------------------
// COLLISIONS
//--------------------------------------------
function checkCollisions() {
    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (
            Math.abs(obs.position.z - player.position.z) < 0.8 &&
            Math.abs(obs.position.x - player.position.x) < 0.8 &&
            player.position.y <= 1.2
        ) {
            spawnHitEffect(player.position);
            return gameOver();
        }
    }

    for (let i = coinsArr.length - 1; i >= 0; i--) {
        const c = coinsArr[i];
        if (Math.abs(c.position.z - player.position.z) < 0.8 &&
            Math.abs(c.position.x - player.position.x) < 0.8) {
            coins++;
            coinsUI.textContent = "Coins: " + coins;
            spawnCoinParticles(c.position);
            c.position.z = -150;
            c.position.x = lanes[Math.floor(Math.random() * 3)];
        }
    }
}

//--------------------------------------------
// PROGRESS BAR
//--------------------------------------------
function updateProgress() {
    let percent = Math.min(100, Math.floor(score / (level * 10)));
    progressBar.style.width = percent + "%";
    progressPercent.textContent = percent + "%";
}

//--------------------------------------------
// GAME OVER
//--------------------------------------------
function gameOver() {
    gameRunning = false;
    paused = true;

    pauseBtn.style.display = "none";
    pauseMenu.style.display = "flex";
    document.getElementById("pauseTitle").innerText = "Game Over";

    document.getElementById("resumeBtn").style.display = "none";

    if (score > highScore) {
        highScore = Math.floor(score);
        highUI.textContent = "High Score: " + highScore;
        menuHigh.textContent = highScore;
    }
}

//--------------------------------------------
// PAUSE / RESUME
//--------------------------------------------
pauseBtn.addEventListener("click", () => {
    paused = true;
    pauseBtn.style.display = "none";
    pauseMenu.style.display = "flex";
    document.getElementById("resumeBtn").style.display = "block";
});

document.getElementById("resumeBtn").addEventListener("click", () => {
    paused = false;
    pauseBtn.style.display = "block";
    pauseMenu.style.display = "none";
});

document.getElementById("restartBtn").addEventListener("click", () => {
    startGame(level);
});

document.getElementById("menuBtn").addEventListener("click", () => {
    pauseMenu.style.display = "none";
    menu.style.display = "flex";
    pauseBtn.style.display = "none";
    progressContainer.style.display = "none";
    progressPercent.style.display = "none";
    document.getElementById("hud").style.display = "none";
    gameRunning = false;
    paused = false;
});

//--------------------------------------------
// MOVEMENT WITH SMOOTH LERP
//--------------------------------------------
document.addEventListener("keydown", (e) => {
    if (!gameRunning) return;

    if (e.code === "ArrowLeft" && currentLane > 0) {
        currentLane--;
        targetX = lanes[currentLane];
    }

    if (e.code === "ArrowRight" && currentLane < 2) {
        currentLane++;
        targetX = lanes[currentLane];
    }

    if ((e.code === "ArrowUp" || e.code === "Space") && !isJumping) {
        isJumping = true;
        velocityY = jumpForce;
    }
});

//--------------------------------------------
// SHOP
//--------------------------------------------
document.querySelectorAll(".char-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const cost = parseInt(btn.dataset.cost);
        const color = btn.dataset.color;
        const face = btn.dataset.face;

        if (coins >= cost) {
            coins -= cost;
            coinsUI.textContent = "Coins: " + coins;
            playerColor = parseInt(color);
            playerFace = face;
            player.material.color.setHex(playerColor);
            player.material.emissive.setHex(playerColor);
        }
    });
});

document.getElementById("shopBtn").onclick = () => { document.getElementById("shopMenu").style.display = "block"; };
document.getElementById("shopBtnAlt").onclick = () => { document.getElementById("shopMenu").style.display = "block"; };
document.getElementById("closeShopBtn").onclick = () => { document.getElementById("shopMenu").style.display = "none"; };

//--------------------------------------------
// SETTINGS
//--------------------------------------------
document.getElementById("settingsBtn").onclick =
document.getElementById("settingsBtnAlt").onclick = () => { document.getElementById("settingsMenu").style.display = "block"; };
document.getElementById("closeSettingsBtn").onclick = () => { document.getElementById("settingsMenu").style.display = "none"; };
