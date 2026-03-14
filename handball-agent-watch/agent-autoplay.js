(() => {
  function startWhenReady() {
    const startBtn = document.getElementById('start-btn');
    const nameInput = document.getElementById('player-name-input');
    if (!startBtn || !nameInput) return false;

    nameInput.value = 'Agent Jack';
    startBtn.click();
    return true;
  }

  function autopilotTick() {
    const g = window.game;
    if (!g || !g.humanPlayer || !g.ball || !g.input) return;

    const p = g.humanPlayer;
    const b = g.ball;

    // clear controls each tick
    g.input.keys['ArrowUp'] = false;
    g.input.keys['ArrowDown'] = false;
    g.input.keys['ArrowLeft'] = false;
    g.input.keys['ArrowRight'] = false;
    g.input.keys['w'] = false;
    g.input.keys['a'] = false;
    g.input.keys['s'] = false;
    g.input.keys['d'] = false;

    // target ball when close to jack quadrant, otherwise drift to home
    const homeX = 600;
    const homeY = 600;
    const targetX = (b.x > 360 && b.y > 360) ? b.x : homeX;
    const targetY = (b.x > 360 && b.y > 360) ? b.y : homeY;

    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const deadzone = 14;

    if (dy < -deadzone) { g.input.keys['ArrowUp'] = true; g.input.keys['w'] = true; }
    if (dy > deadzone) { g.input.keys['ArrowDown'] = true; g.input.keys['s'] = true; }
    if (dx < -deadzone) { g.input.keys['ArrowLeft'] = true; g.input.keys['a'] = true; }
    if (dx > deadzone) { g.input.keys['ArrowRight'] = true; g.input.keys['d'] = true; }

    // aim toward opposite half for returns
    g.input.mouseX = 420;
    g.input.mouseY = 320;

    // trigger hit when close to ball and ball is in play
    const nearBall = Math.hypot(b.x - p.x, b.y - p.y) < 72;
    if (nearBall && !b.heldBy) {
      g.input.clicked = true;
    }
  }

  function boot() {
    // start game automatically
    let attempts = 0;
    const startTimer = setInterval(() => {
      attempts++;
      if (startWhenReady() || attempts > 30) clearInterval(startTimer);
    }, 150);

    // run autopilot loop
    setInterval(autopilotTick, 50);

    // UI label
    const h1 = document.querySelector('#start-screen h1');
    if (h1) h1.textContent = 'Handball — Agent vs Agent Watch';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
