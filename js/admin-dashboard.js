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
  const togglePassBtn = document.getElementById("togglePass");

  function nowIso() {
    return new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" });
  }

  function morningStamp() {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
    const day = d.toISOString().slice(0, 10);
    return `${day} 03:00 AEST`;
  }

  function buildFallbackReport() {
    const report = {
      generatedAt: nowIso(),
      morningReportAt: morningStamp(),
      window: "Overnight window: 19:00–03:00 AEST",
      health: [
        { name: "Gateway", pct: 100, status: "🟢" },
        { name: "Telegram Link", pct: 100, status: "🟢" },
        { name: "Agent Runtime", pct: 90, status: "🟢" },
        { name: "Jobs/Cron", pct: 90, status: "🟢" }
      ],
      timeline: [
        "✅ Admin brief loaded (fallback mode)",
        "✅ Core dashboard cards available",
        "⚠️ Latest JSON brief not found — using fallback data"
      ],
      agents: [
        "🧭 Claire — orchestration and governance",
        "🧪 James — audit gate",
        "🛠️ Bob — implementation lead",
        "👨‍💻 Nikey — backend pipeline",
        "👨‍💻 Phil — frontend spectator UX",
        "🧑‍💻 Jake — integration reliability",
        "📝 Jane — comms",
        "📊 Bill — reporting",
        "🛍️ Ella — growth"
      ],
      releaseGate: "James approval required before internet deploy/upload: YES",
      priorities: [
        "Sync morning brief JSON before 06:00 AEST",
        "Keep project %/delta current",
        "Update sponsor pipeline daily"
      ],
      projectBoard: [
        { project: "Handball Live Game", complete: "95%", delta: "+7%", eta: "Today", agents: "Claire, James, Bob, Nikey, Phil, Jake" },
        { project: "Website Admin + Morning Brief", complete: "97%", delta: "+1%", eta: "1–2 days", agents: "Claire, Bill" },
        { project: "Maths Penpal Growth", complete: "74%", delta: "+2%", eta: "5–10 days", agents: "Jane, Ella, Bill" },
        { project: "Zodiac Consensus Engine", complete: "48%", delta: "+10%", eta: "2–3 weeks", agents: "Claire, Bob, Nikey, Phil, Jake, Jane" },
        { project: "Web Controller v2", complete: "10%", delta: "+10%", eta: "3–5 weeks", agents: "Claire (lead), Bob, Jake" }
      ],
      fileDirectory: [
        "admin.html — admin dashboard page container and layout",
        "js/admin-dashboard.js — login + dashboard render logic",
        "admin-brief.json — morning brief data source",
        "handball-watch.html — public spectator watch interface",
        "_control/MORNING_BRIEF_CHECKLIST.md — mandatory daily update checklist",
        "_control/SPONSOR_OUTREACH_PIPELINE_TRACKER_2026-03-05.md — sponsor pipeline tracker"
      ],
      rebuildPlan: [
        "Clone know-and-guide-website repo and install any required tooling",
        "Restore key admin files: admin.html, js/admin-dashboard.js, admin-brief.json",
        "Validate login flow and JSON load in browser",
        "Run OpenClaw morning brief and regenerate admin-brief.json",
        "Commit/push to main and verify live site propagation",
        "If failure persists, rollback to last known good commit",
        "OAuth fix (openai-codex): if 401 refresh_token_reused appears, run 'openclaw onboard --auth-choice openai-codex', then 'openclaw gateway restart', then verify with 'openclaw status'"
      ],
      setupRequirements: [
        "macOS/Linux host with git, node, npm/pnpm, and stable internet",
        "GitHub access to Daisy1969/know-and-guide-website with push permission",
        "OpenClaw installed and gateway healthy (openclaw status)",
        "OpenAI/Codex authentication completed and refresh-token valid",
        "Chat channel connected (Telegram) for morning brief delivery",
        "Workspace path configured: ~/.openclaw/workspace"
      ],
      agentToday: [
        "Bob — complete final watch-route wiring and E2E smoke test (ETA today 14:00)",
        "Nikey — validate live event ordering and reconnect edge cases (ETA today 15:00)",
        "Phil — final spectator UI polish + error states (ETA today 13:00)",
        "Jake — reliability verification + rollback rehearsal (ETA today 16:00)",
        "Bill — refresh KPI and admin metrics sync (ETA today 12:30)",
        "Jane — sponsor/comms sequencing updates (ETA today 17:00)",
        "Ella — sponsor outreach support assets (ETA today 17:30)",
        "Claire — orchestration, release decisions, morning/admin sync (continuous)",
        "James — audit checks + pass/fail decisions (rolling today)"
      ],
      jamesDecisions: [
        "Sample format: PASS — <item> — Reason: <why passed>",
        "Sample format: FAIL — <item> — Reason: <why failed> / Required fix: <action>",
        "Public releases require explicit James decision with reasons.",
        "Admin content updates (Mike-only) are exception and do not require James sign-off."
      ],
      orgAreas: [
        "Leadership & Governance — Mike, Claire",
        "Engineering Delivery — Bob, Nikey, Phil, Jake",
        "Audit & Release Gate — James",
        "Growth & Revenue — Jane, Ella",
        "Operations & Reporting — Bill"
      ]
    };

    localStorage.setItem("kgAdminReport", JSON.stringify(report));
    return report;
  }

  function render(report) {
    document.getElementById("datePill").textContent = `Generated: ${report.generatedAt}`;
    document.getElementById("windowTxt").textContent = `${report.window} • Morning report: ${report.morningReportAt}`;

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

    document.getElementById("timeline").innerHTML = (report.timeline || []).map(i => `<li>${i}</li>`).join("");
    document.getElementById("agents").innerHTML = (report.agents || []).map(i => `<li>${i}</li>`).join("");
    document.getElementById("releaseGate").textContent = report.releaseGate || "N/A";

    const projectBoard = document.getElementById("projectBoard");
    if (projectBoard) {
      projectBoard.innerHTML = (report.projectBoard || []).map(p => `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${p.project || ""}</td>
          <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${p.complete || ""}</td>
          <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${p.delta || ""}</td>
          <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${p.eta || ""}</td>
          <td style="padding:8px; border-bottom:1px solid #f1f5f9;">${p.agents || ""}</td>
        </tr>
      `).join("");
    }

    document.getElementById("priorities").innerHTML = (report.priorities || []).map(i => `<li>${i}</li>`).join("");

    const fileDirectory = document.getElementById("fileDirectory");
    if (fileDirectory) fileDirectory.innerHTML = (report.fileDirectory || []).map(i => `<li>${i}</li>`).join("");

    const rebuildPlan = document.getElementById("rebuildPlan");
    if (rebuildPlan) rebuildPlan.innerHTML = (report.rebuildPlan || []).map(i => `<li>${i}</li>`).join("");

    const setupRequirements = document.getElementById("setupRequirements");
    if (setupRequirements) setupRequirements.innerHTML = (report.setupRequirements || []).map(i => `<li>${i}</li>`).join("");

    const agentToday = document.getElementById("agentToday");
    if (agentToday) agentToday.innerHTML = (report.agentToday || []).map(i => `<li>${i}</li>`).join("");

    const jamesDecisions = document.getElementById("jamesDecisions");
    if (jamesDecisions) jamesDecisions.innerHTML = (report.jamesDecisions || []).map(i => `<li>${i}</li>`).join("");

    const orgAreas = document.getElementById("orgAreas");
    if (orgAreas) orgAreas.innerHTML = (report.orgAreas || []).map(i => `<li>${i}</li>`).join("");
  }

  togglePassBtn?.addEventListener("click", () => {
    const isHidden = passInput.type === "password";
    passInput.type = isHidden ? "text" : "password";
    togglePassBtn.textContent = isHidden ? "🙈" : "👁️";
    togglePassBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });

  loginBtn.addEventListener("click", async () => {
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

    let report;
    try {
      const res = await fetch("./admin-brief.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`brief fetch failed: ${res.status}`);
      report = await res.json();
      localStorage.setItem("kgAdminReport", JSON.stringify(report));
    } catch (e) {
      report = buildFallbackReport();
    }

    render(report);
    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
  });
})();
