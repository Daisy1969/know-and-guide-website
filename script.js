document.addEventListener("DOMContentLoaded", () => {
    console.log("Know & Guide Website Loaded");

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

        card.addEventListener("click", (event) => {
            if (event.target.closest("a")) return;
            window.location.href = href;
        });

        blogContainer.prepend(card);
    };

    addBlogCard({
        id: "tarot-quest-blog-card",
        ariaLabel: "Tarot Quest Galactic Edition blog update",
        href: "blog/tarot-quest-galactic-edition.html",
        html: `
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
            </div>`
    });

    addBlogCard({
        id: "surya-shakti-blog-card",
        ariaLabel: "Surya Shakti voice coach iPhone prototype blog update",
        href: "blog/surya-shakti-voice-coach-iphone.html",
        html: `
            <div class="blog-image"
                style="background: radial-gradient(circle at 50% 28%, rgba(251,146,60,.98), transparent 24%), radial-gradient(circle at 18% 78%, rgba(245,158,11,.42), transparent 30%), linear-gradient(145deg, #251106 0%, #6b2a0b 48%, #120805 100%); height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 8px 8px 0 0; color: #fff; text-align: center; padding: 1rem;">
                <div>
                    <div style="font-size: 3rem; margin-bottom: .25rem; color: #ffedd5;">☀</div>
                    <div style="font-size: 1.55rem; font-weight: 800; line-height: 1.1;">Surya Shakti</div>
                    <div style="font-size: .92rem; color: #fed7aa; margin-top: .4rem; letter-spacing: .05em; text-transform: uppercase;">iPhone Voice Coach</div>
                </div>
            </div>
            <div class="blog-content">
                <h3>Building a Surya Shakti Voice Coach for iPhone</h3>
                <p class="date">July 19, 2026</p>
                <p>A private native iPhone practice companion with English and Sanskrit prompts, voice recognition, cycle tracking, AirPods support, and pronunciation feedback.</p>
                <a href="blog/surya-shakti-voice-coach-iphone.html" class="read-more">Read More &rarr;</a>
            </div>`
    });
});
