document.addEventListener("DOMContentLoaded", () => {
  const symbols = ["🍒", "🍋", "🍊", "🍇", "🍉", "🍎"];
  const visibleCount = 4;

  class Reel {
    /**
     * @param {HTMLCanvasElement} canvas - Canvas для отрисовки барабана
     * @param {HTMLElement} resultDiv - Элемент для вывода результата
     */
    constructor(canvas, resultDiv) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.resultDiv = resultDiv;
      this.position = 0;
      this.speed = 0;
      this.spinning = false;
      this.stopRequested = false;
      this.deceleration = 0.15;
      this.symbolHeight = 80;
      this.targetSymbol = null;
      this.scaleAnim = 1;
      this.scaleDirection = 1;
      this.scaleAnimating = false;
      this.reelLength = symbols.length;
      this.visibleCount = visibleCount;
      this.spinAudio = new Audio("assets/spin.mp3");
      this.stopAudio = new Audio("assets/stop.mp3");
      this.spinAudio.loop = true;
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.draw();
    }

    getSizes() {
      let w = Math.min(window.innerWidth * 0.18, 180);
      let h = Math.min(w * this.visibleCount, 340);
      let symbolH = h / this.visibleCount;
      return { w, h, symbolH };
    }

    resize() {
      const { w, h, symbolH } = this.getSizes();
      this.canvas.width = w;
      this.canvas.height = h;
      this.symbolHeight = symbolH;
      this.draw();
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (let i = -1; i < this.visibleCount + 1; i++) {
        let symbolIndex =
          Math.floor(this.position / this.symbolHeight + i) % this.reelLength;
        if (symbolIndex < 0) symbolIndex += this.reelLength;
        let y = i * this.symbolHeight - (this.position % this.symbolHeight);
        ctx.save();
        if (i === 1 && this.scaleAnimating) {
          ctx.translate(this.canvas.width / 2, y + this.symbolHeight / 2);
          ctx.scale(this.scaleAnim, this.scaleAnim);
          ctx.shadowColor = "#ffd700";
          ctx.shadowBlur = 30;
          ctx.font = `${Math.round(this.symbolHeight * 0.75)}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(symbols[symbolIndex], 0, 0);
          ctx.restore();
          continue;
        }
        ctx.font = `${Math.round(this.symbolHeight * 0.75)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          symbols[symbolIndex],
          this.canvas.width / 2,
          y + this.symbolHeight / 2
        );
        ctx.restore();
      }
      ctx.strokeStyle = "#ffb300";
      ctx.lineWidth = 4;
      ctx.strokeRect(
        0,
        this.symbolHeight,
        this.canvas.width,
        this.symbolHeight
      );
    }

    animate() {
      this.position += this.speed;
      if (this.position < 0)
        this.position += this.reelLength * this.symbolHeight;
      if (this.position >= this.reelLength * this.symbolHeight)
        this.position -= this.reelLength * this.symbolHeight;
      this.draw();
      if (this.spinning) {
        if (!this.stopRequested && this.speed < 24) {
          this.speed += 0.7;
          if (this.speed > 24) this.speed = 24;
        }
        if (this.stopRequested) {
          if (this.targetSymbol) {
            let centerIndex =
              Math.floor(this.position / this.symbolHeight + 1) %
              this.reelLength;
            if (centerIndex < 0) centerIndex += this.reelLength;
            let targetIndex = symbols.indexOf(this.targetSymbol);
            let diff =
              (targetIndex - centerIndex + this.reelLength) % this.reelLength;
            let deltaPx =
              diff * this.symbolHeight - (this.position % this.symbolHeight);
            if (Math.abs(deltaPx) < 2 && this.speed < 2) {
              this.speed = 0;
              this.spinning = false;
              this.showResult();
              return;
            }
            if (this.speed > 2) {
              this.speed -= this.deceleration;
            } else {
              this.speed = Math.max(0.7, this.speed - this.deceleration * 2);
            }
          } else {
            if (this.speed > 2) {
              this.speed -= this.deceleration;
            } else {
              let mod = this.position % this.symbolHeight;
              if (mod < 2 || mod > this.symbolHeight - 2) {
                this.speed = 0;
                this.spinning = false;
                this.showResult();
                return;
              }
              this.speed = Math.max(0.7, this.speed - this.deceleration * 2);
            }
          }
        }
        requestAnimationFrame(() => this.animate());
      }
    }

    animateScale() {
      if (!this.scaleAnimating) return;
      this.scaleAnim += 0.04 * this.scaleDirection;
      if (this.scaleAnim > 1.18) this.scaleDirection = -1;
      if (this.scaleAnim < 1.0) {
        this.scaleAnim = 1.0;
        this.scaleAnimating = false;
        this.draw();
        return;
      }
      this.draw();
      requestAnimationFrame(() => this.animateScale());
    }

    showResult() {
      this.position =
        Math.round(this.position / this.symbolHeight) * this.symbolHeight;
      let centerIndex =
        Math.floor(this.position / this.symbolHeight + 1) % this.reelLength;
      if (centerIndex < 0) centerIndex += this.reelLength;
      this.draw();
      this.spinAudio.pause();
      this.spinAudio.currentTime = 0;
      this.stopAudio.play();
      this.scaleAnim = 1.0;
      this.scaleDirection = 1;
      this.scaleAnimating = true;
      this.animateScale();
      if (this.resultDiv) {
        this.resultDiv.textContent = `Выпало: ${symbols[centerIndex]}`;
        console.log(`Выпало: ${symbols[centerIndex]}`);
      }
    }

    getResultSymbol() {
      let centerIndex =
        Math.floor(this.position / this.symbolHeight + 1) % this.reelLength;
      if (centerIndex < 0) centerIndex += this.reelLength;
      return symbols[centerIndex];
    }

    async spin() {
      if (this.spinning) return;
      this.spinning = true;
      this.stopRequested = false;
      this.speed = 2;
      this.targetSymbol = null;
      this.scaleAnimating = false;
      if (this.resultDiv) this.resultDiv.textContent = "";
      this.spinAudio.play();
      this.animate();
      const symbolFromServer = await fakeServerRequest();
      this.targetSymbol = symbolFromServer;
      this.stopRequested = true;
    }

    stop() {
      if (this.spinning) this.stopRequested = true;
    }
  }

  function fakeServerRequest() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * symbols.length);
        resolve(symbols[randomIndex]);
      }, 800 + Math.random() * 1200);
    });
  }

  const canvas = document.getElementById("reel");
  const resultDiv = document.getElementById("result");
  const spinBtn = document.getElementById("spinBtn");
  const stopBtn = document.getElementById("stopBtn");

  const reel = new Reel(canvas, resultDiv);

  spinBtn.onclick = () => reel.spin();
  stopBtn.onclick = () => reel.stop();
});
