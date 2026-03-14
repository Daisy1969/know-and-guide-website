(() => {
  const AGENT_BY_RANK = {
    1: 'Nikey (Ace)',
    2: 'Bob (King)',
    3: 'Phil (Queen)',
    4: 'Jake (Jack)'
  };

  function constrainToJackSquare(player) {
    // Keep Jack agent inside bottom-right square with small margin
    const minX = 430;
    const maxX = 770;
    const minY = 430;
    const maxY = 770;
    player.x = Math.max(minX, Math.min(maxX, player.x));
    player.y = Math.max(minY, Math.min(maxY, player.y));
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
      p.agentName = AGENT_BY_RANK[p.rank] || p.id || 'Agent';
    });

    // Update HUD player rank display so viewers know this is agent-controlled
    if (game.ui?.playerRank) {
      game.ui.playerRank.innerText = 'Jack (Agent)';
    }
  }

  function patchDrawForAgentLabels(game) {
    if (!game || game.__agentDrawPatched) return;
    game.__agentDrawPatched = true;

    const originalDraw = game.draw.bind(game);
    game.draw = function patchedDraw() {
      originalDraw();

      const ctx = this.ctx;
      ctx.save();
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Square labels + assigned agents (top-left King, top-right Ace, bottom-left Queen, bottom-right Jack)
      const labels = [
        { x: 200, y: 80, text: `KING — ${AGENT_BY_RANK[2]}` },
        { x: 600, y: 80, text: `ACE — ${AGENT_BY_RANK[1]}` },
        { x: 200, y: 720, text: `QUEEN — ${AGENT_BY_RANK[3]}` },
        { x: 600, y: 720, text: `JACK — ${AGENT_BY_RANK[4]}` }
      ];

      labels.forEach((l) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(l.x - 175, l.y - 16, 350, 32);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(l.text, l.x, l.y);
      });

      // Small floating labels above each hand
      for (const p of this.players || []) {
        if (!p?.agentName) continue;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(p.x - 55, p.y - 45, 110, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.fillText(p.agentName.split(' ')[0], p.x, p.y - 35);
      }

      ctx.restore();
    };
  }

  function autopilotTick() {
    const g = window.game;
    if (!g || !g.humanPlayer || !g.ball || !g.input) return;

    setAgentNames(g);
    patchDrawForAgentLabels(g);

    const p = g.humanPlayer;
    const b = g.ball;

    // reset controls each tick
    const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];
    keys.forEach(k => { g.input.keys[k] = false; });

    // Jack agent only defends his own square (bottom-right)
    const inJackSquare = (b.x > 400 && b.y > 400);
    const homeX = 600;
    const homeY = 600;
    const targetX = inJackSquare ? b.x : homeX;
    const targetY = inJackSquare ? b.y : homeY;

    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const deadzone = 16;

    if (dy < -deadzone) { g.input.keys['ArrowUp'] = true; g.input.keys['w'] = true; }
    if (dy > deadzone) { g.input.keys['ArrowDown'] = true; g.input.keys['s'] = true; }
    if (dx < -deadzone) { g.input.keys['ArrowLeft'] = true; g.input.keys['a'] = true; }
    if (dx > deadzone) { g.input.keys['ArrowRight'] = true; g.input.keys['d'] = true; }

    // Aim into opposite half
    g.input.mouseX = 460;
    g.input.mouseY = 280;

    // Trigger hit when ball is in range
    const nearBall = Math.hypot(b.x - p.x, b.y - p.y) < 68;
    if (nearBall && !b.heldBy && inJackSquare) {
      g.input.clicked = true;
    }

    // Hard constrain to Jack square to prevent overlap crossing
    constrainToJackSquare(p);
  }

  function boot() {
    // rename start title
    const h1 = document.querySelector('#start-screen h1');
    if (h1) h1.textContent = 'Handball — Agent vs Agent Watch';

    // start game automatically
    let attempts = 0;
    const startTimer = setInterval(() => {
      attempts++;
      if (startWhenReady() || attempts > 30) clearInterval(startTimer);
    }, 150);

    // run autopilot loop
    setInterval(autopilotTick, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
