//--------------------------------------------
// FULL UPDATED SCRIPT.JS (Level Select + Death Animation Zoom)
//--------------------------------------------

// BASIC GAME STATES
let scene, camera, renderer;
let player, playerColor = 0x00e5ff, playerFace = "🙂";
let lanes = [-2, 0, 2];
let currentLane = 1;
let targetX = lanes[currentLane]; // Smooth target X for lane
let targetY = 1;                   // Smooth target Y for jump
let isJumping = false;
let velocityY = 0;
// --------- SWIPE GESTURE CONTROLS ----------
let touchStartX = 0;
let touchStartY = 0;

let obstacles = [];
let coinsArr = [];
let neonParticles = [];
let floors = [];
let uiParticles = [];
let backgroundParticles = []; // NEW: background particle array

let score = 0;
let coins = 0;
let highScore = 0;

let gameRunning = false;
let paused = false;
let level = 1;

let gameSpeed = 1.0;
let jumpForce = 0.7;
let gravity = 0.06;

let deathAnimation = false;
let deathVelocityY = 0;
let deathSpin = 0;

let levelDistance = 1000; // how many score units to complete a level (scaled per level)
let levelState = "idle"; // "running", "gameover", "levelcomplete"

// UI ELEMENTS (assumes IDs already in HTML)
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

// Input locks (prevent inputs during transitions)
let inputLocked = false;

// NEON UI COLORS
const neonBlue = "#00e5ff";
const neonYellow = "#ffff66";
const neonRed = "#ff4466";
const neonOrange = "#ffaa00";

// SETUP THREE.JS
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 4, 10); // Higher and farther back
    camera.lookAt(0, 1, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("gameCanvas").appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    scene.add(light);

    createFloor();
    createPlayer();
    createBackgroundParticles(100); // NEW: spawn background particles

    document.querySelectorAll(".level-btn").forEach(btn => {
        btn.addEventListener("mouseenter", () => btn.style.transform = "scale(1.1)");
        btn.addEventListener("mouseleave", () => btn.style.transform = "scale(1)");
        btn.addEventListener("click", () => {
            const lvl = parseInt(btn.dataset.level || btn.getAttribute("data-level") || btn.innerText.replace(/[^\d]/g,''));
            startGame(lvl || 1);
        });
    });

    // ensure restart/menu/resume hooks are present
    document.getElementById("restartBtn").addEventListener("click", () => restartCurrentLevel());
    document.getElementById("menuBtn").addEventListener("click", () => returnToMenu());
    document.getElementById("pauseBtn").addEventListener("click", () => pauseGame());
    document.getElementById("resumeBtn").addEventListener("click", () => resumeGame());

    // shop/settings buttons handled elsewhere in your code, keep their hooks
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
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
        color: playerColor,
        emissive: playerColor,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 1
    });
    player = new THREE.Mesh(geo, mat);
    player.position.set(lanes[currentLane], 1, 0);
    scene.add(player);
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
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 0.3 });
    const obs = new THREE.Mesh(geo, mat);
    const lane = overrideLane !== null ? overrideLane : lanes[Math.floor(Math.random() * 3)];
    obs.position.set(lane, 0.5, zPos);
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

    obstacles.forEach(o => scene.remove(o));
    coinsArr.forEach(c => scene.remove(c));
    neonParticles.forEach(p => scene.remove(p));
    obstacles = [];
    coinsArr = [];
    neonParticles = [];

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

    for (let z = -70; z > -300; z -= 30) {
        createObstacle(z);
    }
    for (let z = -10; z > -240; z -= 15) {
        createCoin(z);
    }

    document.getElementById("resumeBtn").style.display = "none";

    gameRunning = true;
    paused = false;
}

function applyLevelSettings(lvl) {
    gameSpeed = 0.3 + lvl * 0.35;
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

        player.position.x += (targetX - player.position.x) * 0.18;

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
        updateBackgroundParticles(); // <-- update background particles every frame

        if (score >= levelDistance && levelState === "running") {
            onLevelComplete();
        }
    }

    playDeathAnimation();

        // NEW: UI particles
    spawnUIParticles();
    updateUIParticles();

    renderer.render(scene, camera);
}

// MOVE & RECYCLE OBJECTS
function moveObjects() {
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
                o.position.y = 6 + Math.random() * 4;
                o.userData.dropVel = 0;
            }
            o.userData.dropVel += 0.02 + Math.random() * 0.02;
            o.position.y -= o.userData.dropVel;
            if (o.position.y < 0.5) o.position.y = 0.5;
        } else {
            o.position.y = 0.5;
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
            o.position.y = 0.5;
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
            c.position.z = -120 - Math.random() * 200;
            c.position.x = lanes[Math.floor(Math.random() * 3)];
            c.position.y = 0.6;
        }
    }

    for (let i = 0; i < floors.length; i++) {
        const f = floors[i];
        f.position.z += gameSpeed;
        if (f.position.z > 60) {
            f.position.z -= floors.length * 100;
        }
    }
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
            coinsUI.textContent = "Coins: " + coins;
            spawnCoinParticles(c.position);

            c.position.z = -120 - Math.random() * 200;
            c.position.x = lanes[Math.floor(Math.random() * 3)];
        }
    }
}

// DEATH ANIMATION
function startDeathAnimation() {
    if (deathAnimation) return;
    deathAnimation = true;
    inputLocked = true;

    if (player.material) {
        player.material.transparent = true;
        player.material.opacity = 1;
    }

    deathVelocityY = 0.4; // slower upward impulse
    deathSpin = 0;

    gameRunning = false;
    paused = false; 
}

function playDeathAnimation() {
    if (!deathAnimation) return;

    deathVelocityY -= 0.025; // slower gravity
    player.position.y += deathVelocityY;

    deathSpin += 0.07;
    player.rotation.x += 0.15;
    player.rotation.z += 0.18;

    if (player.material && typeof player.material.opacity === "number") {
        player.material.opacity = Math.max(0, player.material.opacity - 0.01);
    }

    if (player.material && player.material.opacity <= 0 || player.position.y < -6) {
        deathAnimation = false;
        if (player.material) player.material.opacity = 0;
        finalizeGameOver();
    }
}

// GAME OVER UI
function finalizeGameOver() {
    levelState = "gameover";
    paused = true;
    inputLocked = true;

    pauseBtn.style.display = "none";

    const menuEl = pauseMenu;
    menuEl.style.display = "flex";
    menuEl.style.transform = "scale(0.1)";
    menuEl.style.opacity = "0";

    document.getElementById("pauseTitle").innerText = "Game Over";
    document.getElementById("resumeBtn").style.display = "none";

    if (score > highScore) {
        highScore = Math.floor(score);
        highUI.textContent = "High Score: " + highScore;
        menuHigh.textContent = highScore;
    }

    zoomInMenu(menuEl);

    player.position.set(lanes[1], 1, 0);
    player.rotation.set(0, 0, 0);
    if (player.material) player.material.opacity = 1;
}

// Smooth zoom-in
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

    pauseBtn.style.display = "none";
    pauseMenu.style.display = "flex";
    document.getElementById("pauseTitle").innerText = "Level Complete!";
    document.getElementById("resumeBtn").style.display = "none";

    player.position.set(lanes[1], 1, 0);
    player.rotation.set(0,0,0);

    if (score > highScore) {
        highScore = Math.floor(score);
        highUI.textContent = "High Score: " + highScore;
        menuHigh.textContent = highScore;
    }

    zoomInMenu(pauseMenu);
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

// Animate UI particles
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

// Spawn subtle particles behind HUD and buttons
function spawnUIParticles() {
    // random around HUD
    const hudEls = [scoreUI, coinsUI, highUI, progressBar, progressPercent];
    hudEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (Math.random() < 0.4) { // spawn chance
            const x = rect.left + Math.random() * rect.width;
            const y = rect.top + Math.random() * rect.height;
            createUIParticle(x, y, neonBlue);
        }
    });

    // random behind menu buttons
    document.querySelectorAll("#menu button, #pauseMenu button").forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (Math.random() < 0.3) {
            const x = rect.left + Math.random() * rect.width;
            const y = rect.top + Math.random() * rect.height;
            createUIParticle(x, y, neonYellow);
        }
    });
}

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
    menu.style.display = "flex";
    pauseMenu.style.display = "none";
    paused = true;
    gameRunning = false;
}

// BONUS: Add hover glow for menu buttons
document.querySelectorAll("#menu button, #pauseMenu button").forEach(btn => {
    btn.style.transition = "0.2s";
    btn.addEventListener("mouseenter", () => btn.style.boxShadow = `0 0 16px ${neonBlue}, 0 0 32px ${neonBlue}`);
    btn.addEventListener("mouseleave", () => btn.style.boxShadow = "");
});
// SETTINGS (keeps your existing behavior)
document.getElementById("settingsBtn")?.addEventListener("click", () => { document.getElementById("settingsMenu").style.display = "block"; });
document.getElementById("settingsBtnAlt")?.addEventListener("click", () => { document.getElementById("settingsMenu").style.display = "block"; });
document.getElementById("closeSettingsBtn")?.addEventListener("click", () => { document.getElementById("settingsMenu").style.display = "none"; });



// Responsive resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

window.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (!isGameRunning) return;

  // Vertical swipe → JUMP
  if (absY > absX && dy < -40) {
    if (!player.isJumping) {
      player.isJumping = true;
      player.velocityY = jumpPower;
    }
  }

  // Horizontal swipe → LANE CHANGE
  else if (absX > absY) {
    if (dx > 40) {
      // Swipe right
      moveLane(1);
    } 
    else if (dx < -40) {
      // Swipe left
      moveLane(-1);
    }
  }
});
