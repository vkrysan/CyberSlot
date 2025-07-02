document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("reel");
  const ctx = canvas.getContext("2d");
  const spinBtn = document.getElementById("spinBtn");
  const stopBtn = document.getElementById("stopBtn");
  const resultDiv = document.getElementById("result");

  const symbols = ["🍒", "🍋", "🍊", "🍇", "🍉", "🍎"];
  const symbolHeight = 80;
  const visibleCount = 4;
  const reelLength = symbols.length;

  let position = 0; // текущая позиция барабана (в пикселях)
  let speed = 0; // текущая скорость (пикс/кадр)
  let spinning = false;
  let animationFrame;
  let stopRequested = false;
  let deceleration = 0.15; // замедление

  // Звуки
  let spinAudio = new Audio("assets/spin.mp3");
  let stopAudio = new Audio("assets/stop.mp3");
  spinAudio.loop = true;

  // Адаптивные размеры
  function getSizes() {
    // Более компактные размеры
    let w = Math.min(window.innerWidth * 0.18, 180);
    let h = Math.min(w * visibleCount, 340);
    let symbolH = h / visibleCount;
    return { w, h, symbolH };
  }

  function resizeCanvas() {
    const { w, h, symbolH } = getSizes();
    canvas.width = w;
    canvas.height = h;
    symbolHeight = symbolH;
    drawReel();
  }

  window.addEventListener("resize", resizeCanvas);

  // Имитация "сервера"
  function fakeServerRequest() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * symbols.length);
        resolve(symbols[randomIndex]);
      }, 800 + Math.random() * 1200);
    });
  }

  let targetSymbol = null;
  let scaleAnim = 1;
  let scaleDirection = 1;
  let scaleAnimating = false;

  function drawReel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = -1; i < visibleCount + 1; i++) {
      let symbolIndex = Math.floor(position / symbolHeight + i) % reelLength;
      if (symbolIndex < 0) symbolIndex += reelLength;
      let y = i * symbolHeight - (position % symbolHeight);
      ctx.save();
      // scale и glow для центрального символа
      if (i === 1 && scaleAnimating) {
        ctx.translate(canvas.width / 2, y + symbolHeight / 2);
        ctx.scale(scaleAnim, scaleAnim);
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 30;
        ctx.font = `${Math.round(symbolHeight * 0.75)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(symbols[symbolIndex], 0, 0);
        ctx.restore();
        continue;
      }
      ctx.font = `${Math.round(symbolHeight * 0.75)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        symbols[symbolIndex],
        canvas.width / 2,
        y + symbolHeight / 2
      );
      ctx.restore();
    }
    // рамка
    ctx.strokeStyle = "#ffb300";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, symbolHeight, canvas.width, symbolHeight);
  }

  function animate() {
    position += speed;
    if (position < 0) position += reelLength * symbolHeight;
    if (position >= reelLength * symbolHeight)
      position -= reelLength * symbolHeight;

    drawReel();

    if (spinning) {
      if (!stopRequested && speed < 24) {
        speed += 0.7;
        if (speed > 24) speed = 24;
      }
      if (stopRequested) {
        // если есть целевой символ, замедляем и ловим его
        if (targetSymbol) {
          let centerIndex =
            Math.floor(position / symbolHeight + 1) % reelLength;
          if (centerIndex < 0) centerIndex += reelLength;
          let targetIndex = symbols.indexOf(targetSymbol);
          let diff = (targetIndex - centerIndex + reelLength) % reelLength;
          let deltaPx = diff * symbolHeight - (position % symbolHeight);

          // Если мы почти на нужной позиции и скорость маленькая — останавливаем
          if (Math.abs(deltaPx) < 2 && speed < 2) {
            speed = 0;
            spinning = false;
            showResult();
            return;
          }

          // Если близко к цели — плавно замедляем
          if (speed > 2) {
            speed -= deceleration;
          } else {
            speed = Math.max(0.7, speed - deceleration * 2);
          }
        } else {
          // fallback: обычное замедление
          if (speed > 2) {
            speed -= deceleration;
          } else {
            let mod = position % symbolHeight;
            if (mod < 2 || mod > symbolHeight - 2) {
              speed = 0;
              spinning = false;
              showResult();
              return;
            }
            speed = Math.max(0.7, speed - deceleration * 2);
          }
        }
      }
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function showResult() {
    position = Math.round(position / symbolHeight) * symbolHeight;
    let centerIndex = Math.floor(position / symbolHeight + 1) % reelLength;
    if (centerIndex < 0) centerIndex += reelLength;
    drawReel();
    resultDiv.textContent = `Выпало: ${symbols[centerIndex]}`;
    console.log(`Выпало: ${symbols[centerIndex]}`);
    spinAudio.pause();
    spinAudio.currentTime = 0;
    stopAudio.play();
    // scale-анимация
    scaleAnim = 1.0;
    scaleDirection = 1;
    scaleAnimating = true;
    animateScale();
  }

  function animateScale() {
    if (!scaleAnimating) return;
    scaleAnim += 0.04 * scaleDirection;
    if (scaleAnim > 1.18) scaleDirection = -1;
    if (scaleAnim < 1.0) {
      scaleAnim = 1.0;
      scaleAnimating = false;
      drawReel();
      return;
    }
    drawReel();
    requestAnimationFrame(animateScale);
  }

  spinBtn.onclick = async () => {
    if (spinning) return;
    spinning = true;
    stopRequested = false;
    speed = 2;
    resultDiv.textContent = "";
    targetSymbol = null;
    spinAudio.play();
    animate();
    // "запрос" к серверу
    const symbolFromServer = await fakeServerRequest();
    targetSymbol = symbolFromServer;
    stopRequested = true;
  };

  stopBtn.onclick = () => {
    if (spinning) stopRequested = true;
  };

  // начальный рендер
  resizeCanvas();
});
