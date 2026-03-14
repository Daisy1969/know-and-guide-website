(() => {
  const AGENT_BY_ID = {
    human: 'Jake',
    ai1: 'Nikey',
    ai2: 'Bob',
    ai3: 'Phil'
  };

  function fmt(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function rankBounds(rank) {
    // 800x800 court split at 400 with a small inner margin
    const margin = 28;
    if (rank === 1) return { minX: 400 + margin, maxX: 800 - margin, minY: 0 + margin, maxY: 400 - margin }; // ACE
    if (rank === 2) return { minX: 0 + margin, maxX: 400 - margin, minY: 0 + margin, maxY: 400 - margin }; // KING
    if (rank === 3) return { minX: 0 + margin, maxX: 400 - margin, minY: 400 + margin, maxY: 800 - margin }; // QUEEN
    return { minX: 400 + margin, maxX: 800 - margin, minY: 400 + margin, maxY: 800 - margin }; // JACK
  }

  function clampToRankSquare(player) {
    const b = rankBounds(player.rank);
    player.x = Math.max(b.minX, Math.min(b.maxX, player.x));
    player.y = Math.max(b.minY, Math.min(b.maxY, player.y));
  }

  function disableHumanMouse(game) {
    if (!game || game.__mouseDisabled) return;
    game.__mouseDisabled = true;

    // Stop direct mouse control of hand rotation/clicks
    game.canvas.style.pointerEvents = 'none';

    // Hide manual controls in watch mode
    if (game.ui?.changeNameBtn) game.ui.changeNameBtn.style.display = 'none';
    const startHint = document.querySelector('#start-screen p');
    if (startHint) startHint.textContent = 'Agent vs Agent autoplay mode enabled';
  }

  function startWhenReady() {
    const startBtn = document.getElementById('start-btn');
    const nameInput = document.getElementById('player-name-input');
    if (!startBtn || !nameInput) return false;

    nameInput.value = 'Jake';
    startBtn.click();
    return true;
  }

  function setAgentNames(game) {
    if (!game || !Array.isArray(game.players)) return;
    game.players.forEach((p) => {
      p.agentName = AGENT_BY_ID[p.id] || p.id || 'Agent';
    });

    if (game.ui?.playerRank) {
      game.ui.playerRank.innerText = 'Agent-Controlled';
    }
  }

  function patchAceTracking(game) {
    if (!game || game.__aceTrackingPatched) return;
    game.__aceTrackingPatched = true;

    game.__aceSecondsByAgent = Object.create(null);
    game.__bestAceAgent = null;
    game.__bestAceSeconds = 0;

    const originalUpdate = game.update.bind(game);
    game.update = function patchedUpdate(dt) {
      originalUpdate(dt);

      const ace = (this.players || []).find(p => p.rank === 1);
      if (ace && this.roundActive) {
        const name = ace.agentName || ace.id || 'Agent';
        this.__aceSecondsByAgent[name] = (this.__aceSecondsByAgent[name] || 0) + dt;

        const aceTime = this.__aceSecondsByAgent[name];
        if (aceTime > this.__bestAceSeconds) {
          this.__bestAceSeconds = aceTime;
          this.__bestAceAgent = name;
        }

        if (this.ui?.aceTime) this.ui.aceTime.innerText = `${name} ${fmt(aceTime)}`;
        if (this.ui?.bestTime) this.ui.bestTime.innerText = this.__bestAceAgent ? `${this.__bestAceAgent} - ${fmt(this.__bestAceSeconds)}` : '--:--';
      }

      // Keep every player constrained to their current rank square to preserve original tracking behavior.
      for (const p of this.players || []) {
        clampToRankSquare(p);
      }
    };
  }

  function patchDrawForDynamicSquareLabels(game) {
    if (!game || game.__agentDrawPatched) return;
    game.__agentDrawPatched = true;

    const originalDraw = game.draw.bind(game);
    game.draw = function patchedDraw() {
      originalDraw();

      const byRank = {};
      for (const p of this.players || []) {
        byRank[p.rank] = p.agentName || p.id || 'Agent';
      }

      const ctx = this.ctx;
      ctx.save();
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labels = [
        { x: 200, y: 80, text: `KING — ${byRank[2] || '-'}` },
        { x: 600, y: 80, text: `ACE — ${byRank[1] || '-'}` },
        { x: 200, y: 720, text: `QUEEN — ${byRank[3] || '-'}` },
        { x: 600, y: 720, text: `JACK — ${byRank[4] || '-'}` }
      ];

      labels.forEach((l) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(l.x - 175, l.y - 16, 350, 32);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(l.text, l.x, l.y);
      });

      ctx.restore();
    };
  }

  function autopilotTick() {
    const g = window.game;
    if (!g || !g.humanPlayer || !g.ball || !g.input) return;

    disableHumanMouse(g);
    setAgentNames(g);
    patchAceTracking(g);
    patchDrawForDynamicSquareLabels(g);

    // wipe manual controls continuously
    const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];
    keys.forEach(k => { g.input.keys[k] = false; });
    g.input.clicked = false;

    const p = g.humanPlayer;
    const b = g.ball;

    // Jack agent only acts in Jack square
    const inJackSquare = (b.x > 400 && b.y > 400);
    const targetX = inJackSquare ? b.x : 600;
    const targetY = inJackSquare ? b.y : 600;

    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const deadzone = 16;

    if (dy < -deadzone) { g.input.keys['ArrowUp'] = true; g.input.keys['w'] = true; }
    if (dy > deadzone) { g.input.keys['ArrowDown'] = true; g.input.keys['s'] = true; }
    if (dx < -deadzone) { g.input.keys['ArrowLeft'] = true; g.input.keys['a'] = true; }
    if (dx > deadzone) { g.input.keys['ArrowRight'] = true; g.input.keys['d'] = true; }

    // fixed aiming target to remove mouse-driven rotation from human cursor
    g.input.mouseX = 460;
    g.input.mouseY = 280;

    const nearBall = Math.hypot(b.x - p.x, b.y - p.y) < 68;
    if (nearBall && !b.heldBy && inJackSquare) {
      g.input.clicked = true;
    }

    // extra safety: never leave current rank square
    clampToRankSquare(p);
  }

  function boot() {
    const h1 = document.querySelector('#start-screen h1');
    if (h1) h1.textContent = 'Handball — Agent vs Agent Watch';

    let attempts = 0;
    const startTimer = setInterval(() => {
      attempts++;
      if (startWhenReady() || attempts > 30) clearInterval(startTimer);
    }, 150);

    setInterval(autopilotTick, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
