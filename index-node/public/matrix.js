(() => {
  const canvas = document.getElementById("matrix-rain");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

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

  function getThemeColors() {
    const theme = document.documentElement.getAttribute('data-theme') || 'matrix';

    const colors = {
      matrix: {
        text: '#0f0',
        fade: 'rgba(0, 0, 0, 0.06)',
        scanline: 'rgba(0, 255, 0, 0.03)'
      },
      cyan: {
        text: '#0ff',
        fade: 'rgba(0, 0, 0, 0.06)',
        scanline: 'rgba(0, 255, 255, 0.03)'
      }
    };

    return colors[theme] || null;
  }

  function shouldRenderRain() {
    const theme = document.documentElement.getAttribute('data-theme') || 'matrix';
    return theme === 'matrix' || theme === 'cyan';
  }

  function drawRain() {
    if (!shouldRenderRain()) {
      // Clear canvas if theme doesn't support rain
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.opacity = '0';
      return;
    }

    canvas.style.opacity = '1';
    const colors = getThemeColors();
    if (!colors) return;

    ctx.fillStyle = colors.fade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = colors.text;
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

    if (!shouldRenderRain()) return;

    const colors = getThemeColors();
    if (!colors) return;

    ctx.strokeStyle = colors.scanline;
    for (let i = 0; i < canvas.height; i += 5) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
  }

  setInterval(draw, 35);
})();
