(() => {
  const canvas = document.getElementById("matrix-rain");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const menuEl = document.getElementById("menuGrid");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const chars =
  "アカサタナハマヤラワガザダバパイキシチニヒミリヲギジヂビピウクスツヌフムユルンゴゾドブポエケセテネヘメヨレヲゲゼデベペオコソトノホモヨロヲゴゾドボポ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const fontSize = 14;

  let columns = Math.floor(canvas.width / fontSize);
  let drops = new Array(columns).fill(1);

  window.addEventListener("resize", () => {
    columns = Math.floor(canvas.width / fontSize);
    drops = new Array(columns).fill(1);
  });

  let glitchIntensity = 0;
  let glitchTimer = 0;

  function drawRain() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f0";
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  function applyBackgroundGlitch() {
    if (glitchIntensity > 0) {
      const shift = glitchIntensity * 32;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "rgba(0, 255, 0, 0.4)";
      ctx.fillRect(-shift, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 150, 0, 0.4)";
      ctx.fillRect(shift, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      glitchIntensity -= 8;
    }
  }

  function triggerGlitchBurst() {
    if (!menuEl) return;
    menuEl.classList.add("glitching");
    setTimeout(() => menuEl.classList.remove("glitching"), 1500);
  }

  function draw() {
    drawRain();
    applyBackgroundGlitch();

    glitchTimer++;
    if (glitchTimer > 360 && Math.random() > 0.97) {
      glitchIntensity = 50;
      triggerGlitchBurst();
      glitchTimer = 0;
    }

    ctx.strokeStyle = "rgba(0, 255, 0, 0.03)";
    for (let i = 0; i < canvas.height; i += 5) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
  }

  setInterval(draw, 35);
})();
