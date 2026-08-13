document.addEventListener("DOMContentLoaded", () => {
    console.log("Know & Guide Website Loaded");

    const navLinks = document.querySelector(".nav-links");

    if (navLinks) {
        const navStyles = document.createElement("style");
        navStyles.id = "learning-hubs-navigation-styles";
        navStyles.textContent = `
            .nav-links { align-items: center; }
            .learning-hubs-item { position: relative; }
            .learning-hubs-toggle {
                display: inline-flex; align-items: center; gap: .35rem; padding: 0; border: 0;
                background: transparent; color: var(--gray-600); font: inherit; font-size: .95rem;
                font-weight: 500; line-height: 1.6; cursor: pointer; transition: color .2s;
            }
            .learning-hubs-toggle:hover,
            .learning-hubs-toggle:focus-visible,
            .learning-hubs-toggle[aria-expanded="true"] { color: var(--primary); }
            .learning-hubs-toggle:focus-visible {
                outline: 3px solid rgba(79,70,229,.25); outline-offset: 5px; border-radius: .25rem;
            }
            .learning-hubs-chevron { display: inline-block; font-size: .75rem; transition: transform .2s ease; }
            .learning-hubs-toggle[aria-expanded="true"] .learning-hubs-chevron { transform: rotate(180deg); }
            .learning-hubs-menu {
                position: absolute; top: calc(100% + .85rem); left: 50%; z-index: 300; display: none;
                width: min(560px, calc(100vw - 2rem)); padding: 1rem; transform: translateX(-50%);
                grid-template-columns: minmax(0,1.2fr) minmax(0,1fr); gap: .75rem;
                background: var(--white); border: 1px solid var(--gray-200); border-radius: .9rem;
                box-shadow: var(--shadow-lg);
            }
            .learning-hubs-item.is-open .learning-hubs-menu { display: grid; }
            .learning-hubs-menu::before {
                content: ""; position: absolute; top: -.45rem; left: 50%; width: .8rem; height: .8rem;
                transform: translateX(-50%) rotate(45deg); background: var(--white);
                border-top: 1px solid var(--gray-200); border-left: 1px solid var(--gray-200);
            }
            .hub-group { position: relative; display: grid; align-content: start; gap: .2rem; padding: .45rem; border-radius: .65rem; }
            .hub-group + .hub-group { background: var(--gray-100); }
            .hub-group-title {
                padding: .35rem .55rem .45rem; color: var(--dark); font-size: .72rem; font-weight: 800;
                letter-spacing: .06em; text-transform: uppercase;
            }
            .nav-links .learning-hubs-menu a {
                display: block; padding: .58rem .65rem; border-radius: .5rem; color: var(--gray-600);
                font-size: .9rem; line-height: 1.3; white-space: nowrap;
            }
            .nav-links .learning-hubs-menu a:hover,
            .nav-links .learning-hubs-menu a:focus-visible { color: var(--primary); background: #eef2ff; }
            .nav-links .learning-hubs-menu a:focus-visible {
                outline: 2px solid rgba(79,70,229,.35); outline-offset: 1px;
            }
            .cortex-nav-link { font-weight: 800 !important; color: #4338ca !important; }
            @media (max-width: 768px) {
                .learning-hubs-toggle { font-size: .85rem; }
                .learning-hubs-menu { width: min(360px, calc(100vw - 1.5rem)); grid-template-columns: 1fr; }
                .nav-links .learning-hubs-menu a { white-space: normal; }
            }
        `;
        document.head.appendChild(navStyles);

        navLinks.innerHTML = `
            <li><a href="/#home">Home</a></li>
            <li class="learning-hubs-item">
                <button class="learning-hubs-toggle" type="button" aria-expanded="false" aria-controls="learning-hubs-menu" aria-haspopup="true">
                    <span>Learning Hubs</span><span class="learning-hubs-chevron" aria-hidden="true">▼</span>
                </button>
                <div class="learning-hubs-menu" id="learning-hubs-menu" role="menu" aria-label="Learning Hubs">
                    <div class="hub-group">
                        <span class="hub-group-title">Learning &amp; Education</span>
                        <a href="/academy.html" role="menuitem">K&amp;G Academy</a>
                        <a href="/school/year9-maths/week1.html" role="menuitem">Year 9 Maths Hub</a>
                        <a href="/dr-k-curriculum.html" role="menuitem">Dr. K&rsquo;s Hub</a>
                        <a href="/neuro-hub.html" role="menuitem">Neuro Hub</a>
                        <a href="/india.html" role="menuitem">India Learning Hub</a>
                    </div>
                    <div class="hub-group">
                        <span class="hub-group-title">Projects &amp; Research</span>
                        <a class="cortex-nav-link" href="/cortex-os.html" role="menuitem">Cortex OS Research</a>
                        <a href="/blog/youth-headwear.html" role="menuitem">SNC Youth Headwear</a>
                        <a href="/cloud-roadmap.html" role="menuitem">K&amp;G Roadmap</a>
                    </div>
                </div>
            </li>
            <li><a href="/#blog">Blog</a></li>
            <li><a href="/admin.html">Admin</a></li>
            <li>
                <a href="https://etherealchronicler.com/page" target="_blank" rel="noopener noreferrer" class="cart-link" aria-label="Shopping Cart">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                </a>
            </li>
        `;

        const hubsItem = navLinks.querySelector(".learning-hubs-item");
        const hubsToggle = navLinks.querySelector(".learning-hubs-toggle");
        const hubsMenu = navLinks.querySelector(".learning-hubs-menu");
        const closeHubsMenu = ({ returnFocus = false } = {}) => {
            hubsItem.classList.remove("is-open");
            hubsToggle.setAttribute("aria-expanded", "false");
            if (returnFocus) hubsToggle.focus();
        };
        const openHubsMenu = () => {
            hubsItem.classList.add("is-open");
            hubsToggle.setAttribute("aria-expanded", "true");
        };
        hubsToggle.addEventListener("click", () => {
            hubsToggle.getAttribute("aria-expanded") === "true" ? closeHubsMenu() : openHubsMenu();
        });
        hubsMenu.addEventListener("click", event => { if (event.target.closest("a")) closeHubsMenu(); });
        document.addEventListener("click", event => { if (!hubsItem.contains(event.target)) closeHubsMenu(); });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && hubsItem.classList.contains("is-open")) closeHubsMenu({ returnFocus: true });
        });
    }

    const blogContainer = document.getElementById("blog-container");
    if (!blogContainer) return;

    const addBlogCard = ({ id, ariaLabel, html, href }) => {
        if (document.getElementById(id)) return;
        const card = document.createElement("div");
        card.id = id;
        card.className = "blog-card";
        card.style.cursor = "pointer";
        card.setAttribute("role", "article");
        card.setAttribute("aria-label", ariaLabel);
        card.innerHTML = html;
        card.addEventListener("click", event => {
            if (!event.target.closest("a")) window.location.href = href;
        });
        blogContainer.prepend(card);
    };

    addBlogCard({
        id: "tarot-quest-blog-card",
        ariaLabel: "Tarot Quest Galactic Edition blog update",
        href: "blog/tarot-quest-galactic-edition.html",
        html: `
            <div class="blog-image" style="background:radial-gradient(circle at 25% 25%,rgba(168,85,247,.95),transparent 34%),radial-gradient(circle at 78% 28%,rgba(245,158,11,.78),transparent 31%),linear-gradient(145deg,#09011b 0%,#23104d 48%,#050713 100%);height:200px;display:flex;align-items:center;justify-content:center;border-radius:8px 8px 0 0;color:#fff;text-align:center;padding:1rem;">
                <div><div style="font-size:2.6rem;margin-bottom:.35rem;">✦</div><div style="font-size:1.65rem;font-weight:800;line-height:1.1;">Tarot Quest</div><div style="font-size:.95rem;color:#fde68a;margin-top:.4rem;letter-spacing:.05em;text-transform:uppercase;">Galactic Edition</div></div>
            </div>
            <div class="blog-content"><h3>Tarot Quest: Galactic Edition</h3><p class="date">July 18, 2026</p><p>Learn all 78 tarot cards through galactic artwork, guided lessons, quizzes, spoken coaching, readings, and a private journal.</p><a href="blog/tarot-quest-galactic-edition.html" class="read-more">Read More &rarr;</a></div>`
    });

    addBlogCard({
        id: "surya-shakti-blog-card",
        ariaLabel: "Surya Shakti voice coach iPhone prototype blog update",
        href: "blog/surya-shakti-voice-coach-iphone.html",
        html: `
            <div class="blog-image" style="background:radial-gradient(circle at 50% 28%,rgba(251,146,60,.98),transparent 24%),radial-gradient(circle at 18% 78%,rgba(245,158,11,.42),transparent 30%),linear-gradient(145deg,#251106 0%,#6b2a0b 48%,#120805 100%);height:200px;display:flex;align-items:center;justify-content:center;border-radius:8px 8px 0 0;color:#fff;text-align:center;padding:1rem;">
                <div><div style="font-size:3rem;margin-bottom:.25rem;color:#ffedd5;">☀</div><div style="font-size:1.55rem;font-weight:800;line-height:1.1;">Surya Shakti</div><div style="font-size:.92rem;color:#fed7aa;margin-top:.4rem;letter-spacing:.05em;text-transform:uppercase;">iPhone Voice Coach</div></div>
            </div>
            <div class="blog-content"><h3>Building a Surya Shakti Voice Coach for iPhone</h3><p class="date">July 19, 2026</p><p>A private native iPhone practice companion with English and Sanskrit prompts, voice recognition, cycle tracking, AirPods support, and pronunciation feedback.</p><a href="blog/surya-shakti-voice-coach-iphone.html" class="read-more">Read More &rarr;</a></div>`
    });

    addBlogCard({
        id: "cortex-os-blog-card",
        ariaLabel: "Cortex OS research programme",
        href: "cortex-os.html",
        html: `
            <div class="blog-image" style="background:radial-gradient(circle at 25% 25%,rgba(99,102,241,.95),transparent 34%),radial-gradient(circle at 78% 28%,rgba(14,165,233,.65),transparent 31%),linear-gradient(145deg,#070b18 0%,#1e1b4b 55%,#0b1022 100%);height:200px;display:flex;align-items:center;justify-content:center;border-radius:8px 8px 0 0;color:#fff;text-align:center;padding:1rem;">
                <div><div style="font-size:2.6rem;margin-bottom:.35rem;">◉</div><div style="font-size:1.7rem;font-weight:800;line-height:1.1;">Cortex OS</div><div style="font-size:.9rem;color:#c7d2fe;margin-top:.4rem;letter-spacing:.05em;text-transform:uppercase;">AI-Native Computing</div></div>
            </div>
            <div class="blog-content"><h3>Cortex OS Research Programme</h3><p class="date">July 20, 2026</p><p>Read the manifesto for an intelligence-first operating system built around distributed cognition, local autonomy and deterministic safety.</p><a href="cortex-os.html" class="read-more">Explore Cortex OS &rarr;</a></div>`
    });

    addBlogCard({
        id: "two-moon-rising-blog-card",
        ariaLabel: "Two Moon Rising book outline",
        href: "blog/two-moon-rising.html",
        html: `
            <div class="blog-image" style="background:radial-gradient(circle at 22% 27%,#fff8dc 0 7%,#ffd66d 8%,transparent 17%),radial-gradient(circle at 76% 29%,#f8fbff 0 9%,#a5b4fc 10%,transparent 21%),radial-gradient(circle at 50% 118%,rgba(79,70,229,.58),transparent 43%),linear-gradient(150deg,#050817 0%,#15123c 52%,#090b1a 100%);height:200px;display:flex;align-items:flex-end;justify-content:center;border-radius:8px 8px 0 0;color:#fff;text-align:center;padding:1rem;">
                <div style="padding:.65rem .9rem;background:rgba(5,8,23,.68);border:1px solid rgba(199,210,254,.22);border-radius:10px;backdrop-filter:blur(5px);"><div style="font-size:1.8rem;font-weight:800;line-height:1.05;">Two Moon Rising</div><div style="font-size:.82rem;color:#c7d2fe;margin-top:.35rem;letter-spacing:.06em;text-transform:uppercase;">Book Outline</div></div>
            </div>
            <div class="blog-content"><h3>Two Moon Rising — A Book Outline in Development</h3><p class="date">August 7, 2026</p><p>A new book project shared at the outline stage so readers, collaborators and future-facing thinkers can explore the concept as it develops.</p><a href="blog/two-moon-rising.html" class="read-more">Explore the Outline &rarr;</a></div>`
    });

    addBlogCard({
        id: "paper-fleet-duel-blog-card",
        ariaLabel: "FlickFleet App Store release — formerly Paper Fleet Duel",
        href: "blog/paper-fleet-duel.html",
        html: `
            <div class="blog-image" style="background:repeating-linear-gradient(0deg,transparent 0 28px,rgba(92,132,170,.18) 29px 30px),linear-gradient(90deg,transparent 49.6%,rgba(23,35,59,.72) 49.7% 50.3%,transparent 50.4%),linear-gradient(145deg,#faf4e6 0%,#efe2c8 100%);height:200px;display:flex;align-items:center;justify-content:center;border-radius:8px 8px 0 0;color:#17233b;text-align:center;padding:1rem;position:relative;overflow:hidden;">
                <div style="position:absolute;top:14px;right:14px;padding:.3rem .55rem;border-radius:999px;background:#111827;color:#fff;font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;">Now on App Store</div>
                <div style="position:absolute;width:70%;height:4px;background:#b4232e;transform:rotate(-20deg);border-radius:99px;"></div>
                <div style="position:relative;padding:.75rem 1rem;background:rgba(255,255,255,.9);border:1px solid rgba(99,80,49,.2);border-radius:10px;"><div style="font-size:1.8rem;font-weight:800;line-height:1.05;">FlickFleet</div><div style="font-size:.82rem;color:#b4232e;margin-top:.35rem;letter-spacing:.06em;text-transform:uppercase;">Paper Fleet Duel Released</div></div>
            </div>
            <div class="blog-content"><h3>Paper Fleet Duel Becomes FlickFleet — Now on the App Store</h3><p class="date">August 13, 2026</p><p>The pen-and-paper naval flick game has reached the App Store as FlickFleet, with moving ships, progression, offline AI and a refined adaptive HUD.</p><a href="blog/paper-fleet-duel.html" class="read-more">Read the Launch Story &rarr;</a><br><a href="https://apps.apple.com/app/flickfleet/id6794210416" target="_blank" rel="noopener noreferrer" class="read-more">Download FlickFleet &rarr;</a></div>`
    });
});
