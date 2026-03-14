(() => {
  const AGENT_BY_ID = {
    human: 'Jake',
    ai1: 'Nikey',
    ai2: 'Bob',
    ai3: 'Phil'
  };

  const WIN_ACE_SECONDS = 40;
  const SKILL_STEP_SECONDS = 3;
  const SKILL_STEP_PERCENT = 3;
  const ACE_SERVE_LIMIT_SECONDS = 3;
  const START_SKILL_PERCENT = 120; // requested +20% start baseline
  const SPEED_BOOST_MULTIPLIER = 1.2; // requested +20% agent speed

  function fmt(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function rankBounds(rank) {
    const margin = 28;
    if (rank === 1) return { minX: 400 + margin, maxX: 800 - margin, minY: 0 + margin, maxY: 400 - margin };
    if (rank === 2) return { minX: 0 + margin, maxX: 400 - margin, minY: 0 + margin, maxY: 400 - margin };
    if (rank === 3) return { minX: 0 + margin, maxX: 400 - margin, minY: 400 + margin, maxY: 800 - margin };
    return { minX: 400 + margin, maxX: 800 - margin, minY: 400 + margin, maxY: 800 - margin };
  }

  function clampToRankSquare(player) {
    const b = rankBounds(player.rank);
    player.x = Math.max(b.minX, Math.min(b.maxX, player.x));
    player.y = Math.max(b.minY, Math.min(b.maxY, player.y));
  }

  function ensureStats(game) {
    if (game.__stats) return;
    const stats = {};
    const matchAce = {};
    Object.values(AGENT_BY_ID).forEach(name => {
      stats[name] = {
        games: 0,
        matches: 0,
        aceSecondsTotal: 0,
        skillPercent: START_SKILL_PERCENT,
      };
      matchAce[name] = 0;
    });

    game.__stats = {
      perAgent: stats,
      matchAceSecondsByAgent: matchAce,
      currentAceAgent: null,
      currentAceSeconds: 0,
      matchInProgress: true,
      matchLog: [],
      matchCounter: 1,
      pendingReset: false,
    };
  }

  function logEvent(game, text) {
    const s = game.__stats;
    s.matchLog.unshift(`${new Date().toLocaleTimeString('en-AU', { hour12: false })} — ${text}`);
    s.matchLog = s.matchLog.slice(0, 2);
  }

  function disableHumanMouse(game) {
    if (!game || game.__mouseDisabled) return;
    game.__mouseDisabled = true;
    game.canvas.style.pointerEvents = 'none';
    if (game.ui?.changeNameBtn) game.ui.changeNameBtn.style.display = 'none';
  }

  function convertHumanToAIAgent(game) {
    if (!game || game.__humanConverted) return;
    if (typeof AIPlayer !== 'function') return;
    if (!game.humanPlayer || game.humanPlayer instanceof AIPlayer) {
      game.__humanConverted = true;
      return;
    }

    const old = game.humanPlayer;
    const ai = new AIPlayer('human', old.x, old.y, old.color || '#4ecca3');
    ai.rank = old.rank;
    ai.angle = old.angle || 0;
    ai.serveTimer = old.serveTimer || 0;

    const idx = game.players.findIndex(p => p.id === 'human');
    if (idx >= 0) game.players[idx] = ai;
    game.humanPlayer = ai;
    game.__humanConverted = true;
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
      if (!p.__speedBoostApplied && typeof p.speed === 'number') {
        p.speed = p.speed * SPEED_BOOST_MULTIPLIER;
        p.__speedBoostApplied = true;
      }
    });
    if (game.ui?.playerRank) game.ui.playerRank.innerText = 'Agent Watch';
  }

  function patchDrawForSquareLabels(game) {
    if (!game || game.__agentDrawPatched) return;
    game.__agentDrawPatched = true;

    const originalDraw = game.draw.bind(game);
    game.draw = function patchedDraw() {
      originalDraw();

      const byRank = {};
      for (const p of this.players || []) byRank[p.rank] = p.agentName || p.id || 'Agent';

      const ctx = this.ctx;
      ctx.save();
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labels = [
        { x: 200, y: 80, text: `KING — ${byRank[2] || '-'}` },
        { x: 600, y: 80, text: `ACE — ${byRank[1] || '-'}` },
        { x: 200, y: 720, text: `QUEEN — ${byRank[3] || '-'}` },
        { x: 600, y: 720, text: `JACK — ${byRank[4] || '-'}` },
      ];

      labels.forEach((l) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(l.x - 180, l.y - 16, 360, 32);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(l.text, l.x, l.y);
      });

      ctx.restore();
    };
  }

  function beginNextMatch(game) {
    const s = game.__stats;
    Object.keys(s.matchAceSecondsByAgent).forEach(k => { s.matchAceSecondsByAgent[k] = 0; });
    s.currentAceAgent = null;
    s.currentAceSeconds = 0;
    s.matchInProgress = true;
    s.pendingReset = false;

    game.resetGame();
    setAgentNames(game);
    convertHumanToAIAgent(game);
  }

  function patchTrackingLogic(game) {
    if (!game || game.__trackingPatched) return;
    game.__trackingPatched = true;
    ensureStats(game);

    const originalUpdate = game.update.bind(game);
    game.update = function patchedUpdate(dt) {
      originalUpdate(dt);

      const s = this.__stats;
      const ace = (this.players || []).find(p => p.rank === 1);

      if (ace && this.roundActive && s.matchInProgress) {
        const name = ace.agentName || ace.id || 'Agent';

        if (s.currentAceAgent !== name) {
          s.currentAceAgent = name;
          logEvent(this, `${name} moved into ACE square`);
        }

        // Strict serve rule in ACE: serve within 3s or rotate out to Jack
        if (this.ball?.heldBy === ace && Number(ace.serveTimer || 0) > ACE_SERVE_LIMIT_SECONDS) {
          logEvent(this, `⏱️ ${name} exceeded 3s serve limit in ACE → rotated to JACK`);
          this.handleOut(ace);
        }

        s.matchAceSecondsByAgent[name] += dt;
        s.currentAceSeconds = s.matchAceSecondsByAgent[name];
        s.perAgent[name].aceSecondsTotal += dt;

        const skillBoost = Math.floor(s.perAgent[name].aceSecondsTotal / SKILL_STEP_SECONDS) * SKILL_STEP_PERCENT;
        s.perAgent[name].skillPercent = START_SKILL_PERCENT + skillBoost;

        if (this.ui?.aceTime) this.ui.aceTime.innerText = `${name} ${fmt(s.currentAceSeconds)}`;

        const best = Object.entries(s.perAgent).sort((a,b)=>b[1].aceSecondsTotal-a[1].aceSecondsTotal)[0];
        if (this.ui?.bestTime && best) this.ui.bestTime.innerText = `${best[0]} ${fmt(best[1].aceSecondsTotal)}`;

        // Match win when any agent reaches 40s total in ACE this match
        if (s.currentAceSeconds >= WIN_ACE_SECONDS && !s.pendingReset) {
          s.matchInProgress = false;
          s.pendingReset = true;
          s.perAgent[name].matches += 1;
          Object.values(s.perAgent).forEach(a => a.games += 1);
          logEvent(this, `🏆 Match ${s.matchCounter} won by ${name} (${WIN_ACE_SECONDS}s total in ACE)`);
          s.matchCounter += 1;

          setTimeout(() => beginNextMatch(this), 900);
        }
      }

      for (const p of this.players || []) {
        clampToRankSquare(p);
      }

      renderPanels(this);
    };
  }

  function renderPanels(game) {
    if (!game || !game.__stats) return;
    const s = game.__stats;

    const holderEl = document.getElementById('current-ace-holder');
    const progEl = document.getElementById('current-ace-progress');
    const statusEl = document.getElementById('current-match-status');
    if (holderEl) holderEl.textContent = s.currentAceAgent || '-';
    if (progEl) progEl.textContent = `${Math.floor(s.currentAceSeconds)} / ${WIN_ACE_SECONDS}s`;
    if (statusEl) statusEl.textContent = s.matchInProgress ? `Match ${s.matchCounter} running` : 'Resetting next match…';

    const tbody = document.getElementById('agent-scoreboard');
    if (tbody) {
      tbody.innerHTML = Object.entries(s.perAgent)
        .map(([name, v]) => `<tr><td>${name}</td><td>${v.matches}</td><td>${fmt(v.aceSecondsTotal)}</td><td>${v.skillPercent}%</td></tr>`)
        .join('');
    }

    const log = document.getElementById('match-log');
    if (log) log.innerHTML = s.matchLog.map(i => `<li>${i}</li>`).join('');
  }

  function autopilotTick() {
    const g = window.game;
    if (!g || !g.humanPlayer || !g.ball || !g.input) return;

    disableHumanMouse(g);
    setAgentNames(g);
    convertHumanToAIAgent(g);
    patchDrawForSquareLabels(g);
    patchTrackingLogic(g);

    // no human inputs in watch mode
    const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];
    keys.forEach(k => { g.input.keys[k] = false; });
    g.input.clicked = false;

    // keep all players in their rank squares every tick
    for (const p of g.players || []) {
      clampToRankSquare(p);
    }
  }

  function boot() {
    let attempts = 0;
    const startTimer = setInterval(() => {
      attempts++;
      if (startWhenReady() || attempts > 40) clearInterval(startTimer);
    }, 150);

    setInterval(autopilotTick, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
