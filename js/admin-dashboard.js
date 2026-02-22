(function () {
  const AUTH_EMAIL = "michaeljharvey1@gmail.com";
  // Phase 1 only: move to server-side auth in production.
  const AUTH_PASSPHRASE = "OpenClaw-Admin-Phase1";

  const loginBtn = document.getElementById("loginBtn");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("passphrase");
  const msg = document.getElementById("loginMsg");
  const dashboard = document.getElementById("dashboard");
  const loginCard = document.getElementById("loginCard");

  function nowIso() {
    return new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" });
  }

  function buildReport() {
    const report = {
      generatedAt: nowIso(),
      window: "Overnight window: 19:00–03:00 AEST",
      health: [
        { name: "Gateway", pct: 100, status: "🟢" },
        { name: "Telegram Link", pct: 100, status: "🟢" },
        { name: "Agent Runtime", pct: 86, status: "🟡" },
        { name: "Jobs/Cron", pct: 74, status: "🟡" }
      ],
      timeline: [
        "✅ Repo audit updated",
        "✅ Agent structure synced (Claire, Jane, Bob, James, Bill)",
        "✅ Admin dashboard plan committed",
        "⚠️ Cron report automation pending gateway scheduler auth"
      ],
      agents: [
        "🧭 Claire — Orchestrator, governance, strategic routing",
        "📝 Jane — Blog manager / 2IC",
        "🛠️ Bob — Master coder, implementation owner",
        "🧪 James — Mandatory code auditor and release gate",
        "📊 Bill — Operations reporting and dashboard summaries"
      ],
      releaseGate: "James approval required before internet deploy/upload: YES",
      priorities: [
        "Implement server-side auth for /admin",
        "Connect dashboard data to live OpenClaw status source",
        "Enable 3:00am Telegram delivery scheduler"
      ]
    };

    localStorage.setItem("kgAdminReport", JSON.stringify(report));
    return report;
  }

  function render(report) {
    document.getElementById("datePill").textContent = `Generated: ${report.generatedAt}`;
    document.getElementById("windowTxt").textContent = report.window;

    const healthGrid = document.getElementById("healthGrid");
    healthGrid.innerHTML = report.health
      .map(h => `
        <div class="metric">
          <h3>${h.name} <span class="status">${h.status}</span></h3>
          <div class="bar"><div class="fill ${h.pct < 85 ? "warn" : ""}" style="width:${h.pct}%"></div></div>
          <p class="small">${h.pct}%</p>
        </div>
      `)
      .join("");

    document.getElementById("timeline").innerHTML = report.timeline.map(i => `<li>${i}</li>`).join("");
    document.getElementById("agents").innerHTML = report.agents.map(i => `<li>${i}</li>`).join("");
    document.getElementById("releaseGate").textContent = report.releaseGate;
    document.getElementById("priorities").innerHTML = report.priorities.map(i => `<li>${i}</li>`).join("");
  }

  loginBtn.addEventListener("click", () => {
    const email = (emailInput.value || "").trim().toLowerCase();
    const pass = passInput.value || "";

    if (email !== AUTH_EMAIL) {
      msg.textContent = "Access denied: unauthorized email.";
      return;
    }
    if (pass !== AUTH_PASSPHRASE) {
      msg.textContent = "Access denied: invalid passphrase.";
      return;
    }

    msg.textContent = "Login successful. Loading latest dashboard…";
    const report = buildReport();
    render(report);
    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
  });
})();
