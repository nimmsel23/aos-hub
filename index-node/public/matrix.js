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

  function draw() {
    drawRain();

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
