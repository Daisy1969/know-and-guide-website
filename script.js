document.addEventListener("DOMContentLoaded", () => {
    console.log("Know & Guide Website Loaded");

    const blogContainer = document.getElementById("blog-container");
    if (!blogContainer || document.getElementById("tarot-quest-blog-card")) {
        return;
    }

    const card = document.createElement("div");
    card.id = "tarot-quest-blog-card";
    card.className = "blog-card";
    card.style.cursor = "pointer";
    card.setAttribute("role", "article");
    card.setAttribute("aria-label", "Tarot Quest Galactic Edition blog update");

    card.innerHTML = `
        <div class="blog-image"
            style="background: radial-gradient(circle at 25% 25%, rgba(168,85,247,.95), transparent 34%), radial-gradient(circle at 78% 28%, rgba(245,158,11,.78), transparent 31%), linear-gradient(145deg, #09011b 0%, #23104d 48%, #050713 100%); height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 8px 8px 0 0; color: #fff; text-align: center; padding: 1rem;">
            <div>
                <div style="font-size: 2.6rem; margin-bottom: .35rem;">✦</div>
                <div style="font-size: 1.65rem; font-weight: 800; line-height: 1.1;">Tarot Quest</div>
                <div style="font-size: .95rem; color: #fde68a; margin-top: .4rem; letter-spacing: .05em; text-transform: uppercase;">Galactic Edition</div>
            </div>
        </div>
        <div class="blog-content">
            <h3>Tarot Quest: Galactic Edition</h3>
            <p class="date">July 18, 2026</p>
            <p>Learn all 78 tarot cards through galactic artwork, guided lessons, quizzes, spoken coaching, readings, and a private journal.</p>
            <a href="blog/tarot-quest-galactic-edition.html" class="read-more">Read More &rarr;</a>
        </div>`;

    card.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        window.location.href = "blog/tarot-quest-galactic-edition.html";
    });

    blogContainer.prepend(card);
});
