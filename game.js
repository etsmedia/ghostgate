function startGame() {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const scaleX = 1920 / 800;
  const scaleY = 1080 / 200;
  const scale = Math.min(scaleX, scaleY);
  const groundY = 1050;

  let bear = {
    x: 50 * scale,
    y: groundY,
    width: 44 * scale,
    height: 61 * scale,
    vy: 0,
    jump: -10 * scale,
    gravity: 0.5 * scale,
    onGround: true
  };

  let obstacles = [];
  const obstacleTypes = [
    { src: "assets/obstacle.png", width: 30 * scale, height: 37 * scale },
    { src: "assets/obstacle-2.png", width: 34 * scale, height: 27 * scale },
    { src: "assets/obstacle-3.png", width: 37 * scale, height: 25 * scale }
  ];

let goal = { 
  x: 3000 * scale, 
  width: 94 * scale, 
  height: 115 * scale 
};
goal.y = groundY - goal.height;

  let showGoal = false;
  let goalReached = false;

  let gameOver = false;
  let gameWon = false;
  let startTime = null;
  const totalGameTime = 105000;

  // === 背景圖 ===
  const bgImg = new Image();
  bgImg.src = "assets/bg.png";

  const bearImg = new Image();
  bearImg.src = "assets/bear.png";
  const obstacleImgs = obstacleTypes.map(obj => {
    const img = new Image();
    img.src = obj.src;
    return img;
  });
  const goalImg = new Image();
  goalImg.src = "assets/goal.png";

  const jumpSound = new Audio("sounds/jump.mp3");
  const winSound = new Audio("sounds/win.mp3");
  const deathSound = new Audio("sounds/death.mp3");
  const bgm = new Audio("sounds/bgm.mp3");
  bgm.loop = true;

  let isBlackingOut = false;
  let nextBlackoutTime = 0;
  let blackoutDuration = 0;

  let spawnObstacleInterval = null;
  let lastDoubleSpawn = false;

  function scheduleNextBlackout(currentTime) {
    const nextIn = 5000 + Math.random() * 5000;
    blackoutDuration = 300 + Math.random() * 200;
    nextBlackoutTime = currentTime + nextIn;
  }

  function spawnObstacle() {
    const idx = Math.floor(Math.random() * obstacleTypes.length);
    const type = obstacleTypes[idx];
    const baseX = canvas.width + Math.random() * (200 * scale);
    const baseY = groundY - type.height;

    const obstacleObj = {
      x: baseX,
      y: baseY,
      baseY: baseY,
      width: type.width,
      height: type.height,
      typeIndex: idx,
      img: obstacleImgs[idx],
      floatPhase: Math.random() * Math.PI * 2
    };

    obstacles.push(obstacleObj);

    const shouldDouble = Math.random() < 0.1 && !lastDoubleSpawn;
    if (shouldDouble) {
      const secondX = baseX + 50 * scale + Math.random() * (30 * scale);
      obstacles.push({
        x: secondX,
        y: baseY,
        baseY: baseY,
        width: type.width,
        height: type.height,
        typeIndex: idx,
        img: obstacleImgs[idx],
        floatPhase: Math.random() * Math.PI * 2
      });
      lastDoubleSpawn = true;
    } else {
      lastDoubleSpawn = false;
    }
  }

  function startSpawningObstacles() {
    if (spawnObstacleInterval) clearInterval(spawnObstacleInterval);
    spawnObstacle();
    spawnObstacleInterval = setInterval(() => {
      if (gameOver) {
        clearInterval(spawnObstacleInterval);
        return;
      }
      if (showGoal && Math.random() < 0.3) return;
      spawnObstacle();
    }, (800 + Math.random() * 500));
  }

  function resetGame() {
    bear.y = groundY;
    bear.vy = 0;
    bear.onGround = true;
    goal.x = 3000 * scale;
    showGoal = false;
    goalReached = false;
    obstacles = [];
    gameOver = false;
    gameWon = false;
    startTime = null;
    isBlackingOut = false;
    scheduleNextBlackout(0);
    bgm.currentTime = 0;
    bgm.play();
    startSpawningObstacles();
    requestAnimationFrame(gameLoop);
  }

  // === 修改後的背景繪製（等比 cover 模式） ===
  function drawBackground() {
    if (!bgImg.complete) return;

    const imgAspect = bgImg.width / bgImg.height;
    const canvasAspect = canvas.width / canvas.height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasAspect > imgAspect) {
      // canvas 比較寬 → 以寬度為基準，裁掉上下
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgAspect;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      // canvas 比較高 → 以高度為基準，裁掉左右
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgAspect;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight);
  }

function drawTimer(timestamp) {
  const elapsed = timestamp - startTime;
  const remaining = Math.max(0, totalGameTime - elapsed);
  const displayRemaining = Math.max(0, totalGameTime - elapsed - 10000);
  const seconds = Math.floor(displayRemaining / 1000);
  const millis = Math.floor((displayRemaining % 1000) / 10);

  ctx.fillStyle = "white";
  ctx.font = `${20 * scale}px 'Press Start 2P', monospace`; // 像素字體
  ctx.fillText(`TIME ${seconds}.${millis.toString().padStart(2, '0')}`, 20 * scale, 50 * scale);

  if (remaining <= 0 && !gameOver) {
    gameOver = true;
    bgm.pause();
    alert("Time's up! Press Space or Tap to restart.");
  }

  if (remaining <= 15000 && !showGoal) {
    showGoal = true;
    for (let i = 0; i < 3; i++) spawnObstacle();
  }
}


  function draw(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景（cover 裁切）
    drawBackground();

    if (isBlackingOut) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.drawImage(bearImg, bear.x, bear.y - bear.height, bear.width, bear.height);
    for (const obs of obstacles) {
      const floatOffset = Math.sin(timestamp / 100 + obs.floatPhase) * 2 * scale;
      ctx.drawImage(obs.img, obs.x, obs.baseY + floatOffset, obs.width, obs.height);
    }

    if (showGoal) ctx.drawImage(goalImg, goal.x, goal.y, goal.width, goal.height);
    drawTimer(timestamp);
  }

  function update(timestamp) {
    const elapsed = timestamp - startTime;
    const progressRatio = Math.min(1, elapsed / totalGameTime);
    const obstacleSpeed = (5 + progressRatio * 5) * scale;

    if (timestamp >= nextBlackoutTime && !isBlackingOut) {
      isBlackingOut = true;
      setTimeout(() => {
        isBlackingOut = false;
        scheduleNextBlackout(timestamp);
      }, blackoutDuration);
    }

    bear.vy += bear.gravity;
    bear.y += bear.vy;
    if (bear.y >= groundY) {
      bear.y = groundY;
      bear.vy = 0;
      bear.onGround = true;
    }

    for (const obs of obstacles) {
      obs.x -= obstacleSpeed;
    }

    if (showGoal) goal.x -= obstacleSpeed;

    for (const obs of obstacles) {
      const floatOffset = Math.sin(timestamp / 100 + obs.floatPhase) * 2 * scale;
      const obsY = obs.baseY + floatOffset;
      if (
        bear.x + bear.width > obs.x &&
        bear.x < obs.x + obs.width &&
        bear.y > obsY
      ) {
        gameOver = true;
        bgm.pause();
        deathSound.play();
        alert("闖關失敗！幸運也是成功的關鍵！\n按空白鍵或輕觸螢幕重新開始。");
        return;
      }
    }

    if (!goalReached && showGoal && bear.x + bear.width > goal.x) {
      gameOver = true;
      gameWon = true;
      goalReached = true;
      bgm.pause();
      winSound.play();
      alert("恭喜闖關成功！請按空白鍵或輕觸螢幕重新開始。");
    }

    draw(timestamp);
  }

  function gameLoop(timestamp) {
    if (startTime === null) {
      startTime = timestamp;
      scheduleNextBlackout(timestamp);
    }
    if (!gameOver) {
      update(timestamp);
      requestAnimationFrame(gameLoop);
    }
  }

  function handleJumpOrRestart() {
    if (bear.onGround && !gameOver) {
      bear.vy = bear.jump;
      bear.onGround = false;
      jumpSound.currentTime = 0;
      jumpSound.play();
    } else if (gameOver) {
      resetGame();
    }
  }

  document.addEventListener("keydown", e => {
    if (e.key === " " || e.key === "ArrowUp") handleJumpOrRestart();
  });

  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    handleJumpOrRestart();
  });

  resetGame();
}
