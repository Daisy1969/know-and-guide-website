(() => {
  const AGENT_BY_ID = {
    human: 'Jake',
    ai1: 'Nikey',
    ai2: 'Bob',
    ai3: 'Phil',
    ai4: 'Rae',
    ai5: 'Zed',
  };

  const WIN_ACE_SECONDS = 40;
  const SKILL_STEP_SECONDS = 3;
  const SKILL_STEP_PERCENT = 3;
  const ACE_SERVE_LIMIT_SECONDS = 3;
  const START_SKILL_PERCENT = 120;
  const SPEED_BOOST_MULTIPLIER = 1.2;

  const MODE_4 = '4';
  const MODE_6 = '6';

  const MODE_CONFIG = {
    [MODE_4]: {
      title: '4-Square Classic',
      rankNames: ['Ace', 'King', 'Queen', 'Jack'],
      centerSquares: [
        { rank: 2, label: 'KING', bounds: { minX: 0, maxX: 400, minY: 0, maxY: 400 }, centerX: 200, centerY: 200 },
        { rank: 1, label: 'ACE', bounds: { minX: 400, maxX: 800, minY: 0, maxY: 400 }, centerX: 600, centerY: 200 },
        { rank: 3, label: 'QUEEN', bounds: { minX: 0, maxX: 400, minY: 400, maxY: 800 }, centerX: 200, centerY: 600 },
        { rank: 4, label: 'JACK', bounds: { minX: 400, maxX: 800, minY: 400, maxY: 800 }, centerX: 600, centerY: 600 },
      ],
    },
    [MODE_6]: {
      title: '6-Square Extended',
      rankNames: ['Ace', 'King', 'Queen', 'Jack', 'Duke', 'Rookie'],
      // Equal-size 3x2 grid (all six squares same size)
      centerSquares: [
        { rank: 5, label: 'DUKE',   bounds: { minX: 0,   maxX: 266, minY: 0,   maxY: 400 }, centerX: 133, centerY: 200 },
        { rank: 2, label: 'KING',   bounds: { minX: 266, maxX: 533, minY: 0,   maxY: 400 }, centerX: 399, centerY: 200 },
        { rank: 1, label: 'ACE',    bounds: { minX: 533, maxX: 800, minY: 0,   maxY: 400 }, centerX: 666, centerY: 200 },
        { rank: 3, label: 'QUEEN',  bounds: { minX: 0,   maxX: 266, minY: 400, maxY: 800 }, centerX: 133, centerY: 600 },
        { rank: 4, label: 'JACK',   bounds: { minX: 266, maxX: 533, minY: 400, maxY: 800 }, centerX: 399, centerY: 600 },
        { rank: 6, label: 'ROOKIE', bounds: { minX: 533, maxX: 800, minY: 400, maxY: 800 }, centerX: 666, centerY: 600 },
      ],
    },
  };

  function fmt(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function getMode(game) {
    return game?.__watchMode === MODE_6 ? MODE_6 : MODE_4;
  }

  function getConfig(game) {
    return MODE_CONFIG[getMode(game)];
  }

  function rankName(game, rank) {
    const names = getConfig(game).rankNames;
    return names[rank - 1] || `R${rank}`;
  }

  function rankBounds(game, rank) {
    const margin = 28;
    const square = getConfig(game).centerSquares.find((s) => s.rank === rank);
    if (!square) return { minX: margin, maxX: 800 - margin, minY: margin, maxY: 800 - margin };
    return {
      minX: square.bounds.minX + margin,
      maxX: square.bounds.maxX - margin,
      minY: square.bounds.minY + margin,
      maxY: square.bounds.maxY - margin,
    };
  }

  function clampToRankSquare(game, player) {
    const b = rankBounds(game, player.rank);
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
    s.matchLog = s.matchLog.slice(0, 6);
  }

  function disableHumanMouse(game) {
    if (!game || game.__mouseDisabled) return;
    game.__mouseDisabled = true;
    game.canvas.style.pointerEvents = 'none';
    if (game.ui?.changeNameBtn) game.ui.changeNameBtn.style.display = 'none';
  }

  function convertHumanToAIAgent(game) {
    if (!game || !game.humanPlayer || game.humanPlayer instanceof AIPlayer) return;

    const old = game.humanPlayer;
    const ai = new AIPlayer('human', old.x, old.y, old.color || '#4ecca3');
    ai.rank = old.rank;
    ai.angle = old.angle || 0;
    ai.serveTimer = old.serveTimer || 0;
    ai.mastery = 1;
    ai.speed = Math.max(ai.speed || 0, 820);
    ai.reactionDelay = 0.02;

    const idx = game.players.findIndex(p => p.id === 'human');
    if (idx >= 0) game.players[idx] = ai;
    game.humanPlayer = ai;
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
    if (game.ui?.playerRank) {
      game.ui.playerRank.innerText = `Agent Watch (${getConfig(game).title})`;
    }
  }

  function ensureModePlayers(game) {
    const mode = getMode(game);
    const hasAi4 = game.players.some((p) => p.id === 'ai4');
    const hasAi5 = game.players.some((p) => p.id === 'ai5');
    if (mode === MODE_6) {
      const aiColors = ['#f97316', '#06b6d4', '#a855f7', '#84cc16', '#eab308', '#f43f5e'];
      if (!hasAi4) game.players.push(new AIPlayer('ai4', 80, 400, aiColors[0]));
      if (!hasAi5) game.players.push(new AIPlayer('ai5', 720, 400, aiColors[1]));
    } else {
      game.players = game.players.filter((p) => p.id !== 'ai4' && p.id !== 'ai5');
    }
  }

  function reassignRanksForMode(game) {
    ensureModePlayers(game);
    const mode = getMode(game);
    const rankById = mode === MODE_6
      ? { ai1: 1, ai2: 2, ai3: 3, human: 4, ai4: 5, ai5: 6 }
      : { ai1: 1, ai2: 2, ai3: 3, human: 4 };

    game.players = game.players.filter((p) => rankById[p.id] !== undefined);
    game.players.forEach((p) => { p.rank = rankById[p.id]; });
    updatePositionsForMode(game);
  }

  function updatePositionsForMode(game) {
    const cfg = getConfig(game);
    game.players.forEach((p) => {
      const sq = cfg.centerSquares.find((s) => s.rank === p.rank);
      if (!sq) return;
      p.x = sq.centerX;
      p.y = sq.centerY;
      if (p instanceof AIPlayer) {
        p.homeX = sq.centerX;
        p.homeY = sq.centerY;
      }
    });
  }

  function patchGameModeMethods(game) {
    if (!game || game.__modePatched) return;
    game.__modePatched = true;

    const originalReset = game.resetGame.bind(game);
    game.resetGame = function patchedResetGame() {
      originalReset();
      convertHumanToAIAgent(this);
      reassignRanksForMode(this);
      setAgentNames(this);
      logEvent(this, `Mode active: ${getConfig(this).title}`);
    };

    game.updatePositions = function patchedUpdatePositions() {
      updatePositionsForMode(this);
      setAgentNames(this);
    };

    game.getPlayerInSquare = function patchedGetPlayerInSquare(x, y) {
      const sq = getConfig(this).centerSquares.find((s) => {
        return x >= s.bounds.minX && x < s.bounds.maxX && y >= s.bounds.minY && y < s.bounds.maxY;
      });
      if (!sq) return null;
      return this.players.find((p) => p.rank === sq.rank) || null;
    };

    game.handleOut = function patchedHandleOut(outPlayer) {
      if (!outPlayer) return;
      this.playSound('out');

      const outRank = outPlayer.rank;
      const maxRank = getConfig(this).rankNames.length;
      const before = this.players
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((p) => `${rankName(this, p.rank)}:${p.agentName || p.id}`)
        .join(' | ');

      this.players.forEach((p) => {
        if (p === outPlayer) {
          p.rank = maxRank;
        } else if (p.rank > outRank) {
          p.rank -= 1;
        }
      });

      updatePositionsForMode(this);
      const after = this.players
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((p) => `${rankName(this, p.rank)}:${p.agentName || p.id}`)
        .join(' | ');
      logEvent(this, `↕️ Out: ${outPlayer.agentName || outPlayer.id} (${rankName(this, outRank)})`);
      logEvent(this, `Ownership: ${before} → ${after}`);
      this.resetRound();
    };
  }

  function patchDrawForReadability(game) {
    if (!game || game.__agentDrawPatched) return;
    game.__agentDrawPatched = true;

    const originalDraw = game.draw.bind(game);
    game.draw = function patchedDraw() {
      originalDraw();
      const ctx = this.ctx;
      const cfg = getConfig(this);
      const byRank = {};
      for (const p of this.players || []) byRank[p.rank] = p.agentName || p.id || 'Agent';

      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f43f5e';
      cfg.centerSquares.forEach((s) => {
        ctx.strokeRect(s.bounds.minX, s.bounds.minY, s.bounds.maxX - s.bounds.minX, s.bounds.maxY - s.bounds.minY);
      });

      ctx.font = 'bold 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      cfg.centerSquares.forEach((s) => {
        const text = `${s.label} — ${byRank[s.rank] || '-'}`;
        const w = Math.min(260, Math.max(120, (s.bounds.maxX - s.bounds.minX) - 12));
        const x = s.centerX;
        const y = s.rank <= 2 ? 70 : s.rank <= 4 ? 730 : 400;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
        ctx.fillRect(x - (w / 2), y - 14, w, 28);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(text, x, y);
      });

      ctx.font = 'bold 14px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(12, 10, 290, 30);
      ctx.fillStyle = '#93c5fd';
      ctx.textAlign = 'left';
      ctx.fillText(`Mode: ${cfg.title}`, 20, 26);
      ctx.restore();
    };
  }

  function beginNextMatch(game) {
    const s = game.__stats;
    Object.keys(s.matchAceSecondsByAgent).forEach(k => { s.matchAceSecondsByAgent[k] = 0; });
    Object.values(s.perAgent).forEach(a => {
      a.aceSecondsTotal = 0;
      a.skillPercent = START_SKILL_PERCENT;
    });

    s.currentAceAgent = null;
    s.currentAceSeconds = 0;
    s.matchInProgress = true;
    s.pendingReset = false;

    game.resetGame();
    setAgentNames(game);
  }

  function renderPanels(game) {
    if (!game || !game.__stats) return;
    const s = game.__stats;

    const holderEl = document.getElementById('current-ace-holder');
    const progEl = document.getElementById('current-ace-progress');
    const statusEl = document.getElementById('current-match-status');
    const modeEl = document.getElementById('mode-indicator');
    const rules6 = document.getElementById('rules-6square');

    if (holderEl) holderEl.textContent = s.currentAceAgent || '-';
    if (progEl) progEl.textContent = `${Math.floor(s.currentAceSeconds)} / ${WIN_ACE_SECONDS}s`;
    if (statusEl) statusEl.textContent = s.matchInProgress ? `Match ${s.matchCounter} running` : 'Resetting next match…';
    if (modeEl) modeEl.textContent = `Mode: ${getConfig(game).title}`;
    if (rules6) rules6.classList.toggle('hidden', getMode(game) !== MODE_6);

    const tbody = document.getElementById('agent-scoreboard');
    if (tbody) {
      const byRank = (game.players || []).reduce((acc, p) => {
        acc[p.agentName || p.id] = rankName(game, p.rank);
        return acc;
      }, {});

      tbody.innerHTML = Object.entries(s.perAgent)
        .map(([name, v]) => {
          const isPlaying = Object.values(AGENT_BY_ID).includes(name) && Object.values(byRank).some((_, idx) => Object.keys(byRank)[idx] === name);
          if (!isPlaying && getMode(game) === MODE_4 && (name === 'Rae' || name === 'Zed')) return '';
          return `<tr><td>${name}</td><td>${v.matches}</td><td>${fmt(v.aceSecondsTotal)}</td><td>${v.skillPercent}%</td><td>${byRank[name] || '-'}</td></tr>`;
        })
        .join('');
    }

    const log = document.getElementById('match-log');
    if (log) log.innerHTML = s.matchLog.map(i => `<li>${i}</li>`).join('');
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

        if (this.ball?.heldBy === ace && Number(ace.serveTimer || 0) > ACE_SERVE_LIMIT_SECONDS) {
          logEvent(this, `⏱️ ${name} exceeded 3s serve limit in ACE → rotated down`);
          this.handleOut(ace);
        }

        s.matchAceSecondsByAgent[name] += dt;
        s.currentAceSeconds = s.matchAceSecondsByAgent[name];
        s.perAgent[name].aceSecondsTotal += dt;

        const skillBoost = Math.floor(s.perAgent[name].aceSecondsTotal / SKILL_STEP_SECONDS) * SKILL_STEP_PERCENT;
        s.perAgent[name].skillPercent = START_SKILL_PERCENT + skillBoost;

        if (this.ui?.aceTime) this.ui.aceTime.innerText = `${name} ${fmt(s.currentAceSeconds)}`;

        const best = Object.entries(s.perAgent).sort((a, b) => b[1].aceSecondsTotal - a[1].aceSecondsTotal)[0];
        if (this.ui?.bestTime && best) this.ui.bestTime.innerText = `${best[0]} ${fmt(best[1].aceSecondsTotal)}`;

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

      for (const p of this.players || []) clampToRankSquare(this, p);
      renderPanels(this);
    };
  }

  function bindModeToggle() {
    const b4 = document.getElementById('mode-4-btn');
    const b6 = document.getElementById('mode-6-btn');
    if (!b4 || !b6 || window.__modeToggleBound) return;
    window.__modeToggleBound = true;

    const setMode = (mode) => {
      const game = window.game;
      window.__pendingWatchMode = mode;
      b4.classList.toggle('active', mode === MODE_4);
      b6.classList.toggle('active', mode === MODE_6);
      if (!game) return;
      game.__watchMode = mode;
      beginNextMatch(game);
      logEvent(game, `Switched to ${MODE_CONFIG[mode].title}`);
    };

    b4.addEventListener('click', () => setMode(MODE_4));
    b6.addEventListener('click', () => setMode(MODE_6));
  }

  function startWhenReady() {
    const startBtn = document.getElementById('start-btn');
    const nameInput = document.getElementById('player-name-input');
    if (!startBtn || !nameInput) return false;
    nameInput.value = 'Jake';
    startBtn.click();
    return true;
  }

  function autopilotTick() {
    bindModeToggle();

    const g = window.game;
    if (!g || !g.humanPlayer || !g.ball || !g.input) return;

    if (!g.__watchMode) g.__watchMode = window.__pendingWatchMode || MODE_4;
    disableHumanMouse(g);
    convertHumanToAIAgent(g);
    patchGameModeMethods(g);
    patchDrawForReadability(g);
    patchTrackingLogic(g);
    setAgentNames(g);

    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'];
    keys.forEach(k => { g.input.keys[k] = false; });
    g.input.clicked = false;

    for (const p of g.players || []) clampToRankSquare(g, p);
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
