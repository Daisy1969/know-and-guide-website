document.addEventListener('DOMContentLoaded', function () {
    // Inject Chatbot HTML
    const chatbotContainer = document.createElement('div');
    chatbotContainer.className = 'chatbot-widget';
    chatbotContainer.innerHTML = `
        <button class="chatbot-toggle" id="chatbot-toggle">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
        </button>
        <div class="chatbot-window" id="chatbot-window">
            <div class="chatbot-header">
                <h3>Know & Guide AI</h3>
                <button class="chatbot-close" id="chatbot-close">&times;</button>
            </div>
            <div class="chatbot-messages" id="chatbot-messages">
                <!-- Messages will appear here -->
            </div>
            <div class="chatbot-input-area">
                <input type="text" id="chatbot-input" placeholder="Ask me anything...">
                <button class="chatbot-send" id="chatbot-send">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(chatbotContainer);

    // Elements
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const windowEl = document.getElementById('chatbot-window');
    const messagesEl = document.getElementById('chatbot-messages');
    const inputEl = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');

    // State
    let isOpen = false;
    let conversationState = 'INIT'; // INIT, NAME, EMAIL, CHAT
    let userDetails = { name: '', email: '' };

    // Knowledge Base
    const knowledgeBase = {
        pricing: `Our development services start at a base of <strong>$250 AUD</strong>. <br>
                  - <strong>AI Tool (3 hours):</strong> Discounted to $200 AUD.<br>
                  - <strong>Medium Project (3 Days):</strong> $1000 AUD (includes various additions).<br>
                  - <strong>Enterprise:</strong> Please contact us for a quote.<br>
                  Hosting: We can host via our domain for 1 year, or use your domain (you pay Google Cloud costs).`,

        projects: `We have built several Gemini-powered applications:<br>
                   - <strong>Maths Penpal:</strong> Voice-activated AI tutor for ACARA v9.0.<br>
                   - <strong>Handball Game:</strong> Web-based sports game.<br>
                   - <strong>Studio AI:</strong> Creative workflow automation.<br>
                   Check our <a href="#blog" style="color:#4f46e5">blog</a> for more details.`,

        dm_aide: `<strong>Advanced DM Aide</strong> is our premier tool for Dungeon Masters.<br>
                  Access it here: <a href="https://advancedmaide.knowandguide.com/" target="_blank" style="color:#4f46e5">advancedmaide.knowandguide.com</a><br>
                  <em>Note: Subscription emails contain an activation code and link, valid for 1 year.</em>`,

        contact: `You can reach us at <a href="mailto:winseral@knowandguide.com" style="color:#4f46e5">winseral@knowandguide.com</a> for more information.`,

        default: `I can help you with information about our AI development services, pricing, and projects like Maths Penpal or DM Aide. How can I assist you?`
    };

    // Functions
    function toggleChat() {
        isOpen = !isOpen;
        windowEl.classList.toggle('active', isOpen);
        if (isOpen && messagesEl.children.length === 0) {
            addBotMessage("Hello! I'm the Know & Guide AI Assistant. I can help you with our services and projects.");
            setTimeout(() => {
                addBotMessage("To better assist you and allow us to follow up, could you please tell me your name?");
                conversationState = 'NAME';
            }, 500);
        }
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.innerHTML = text;
        messagesEl.appendChild(msgDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addBotMessage(text) {
        addMessage(text, 'bot');
    }

    function addUserMessage(text) {
        addMessage(text, 'user');
    }

    function processInput() {
        const text = inputEl.value.trim();
        if (!text) return;

        addUserMessage(text);
        inputEl.value = '';

        setTimeout(() => {
            handleLogic(text);
        }, 600);
    }

    function handleLogic(text) {
        const lowerText = text.toLowerCase();

        if (conversationState === 'NAME') {
            userDetails.name = text;
            addBotMessage(`Nice to meet you, ${userDetails.name}. Could you please provide your email address so we can send you feedback or follow up?`);
            conversationState = 'EMAIL';
            return;
        }

        if (conversationState === 'EMAIL') {
            userDetails.email = text;
            addBotMessage(`Thank you. I've noted your details. Now, how can I help you today?`);
            addBotMessage(`<div class="quick-options">
                <button class="quick-option" onclick="ask('pricing')">Pricing</button>
                <button class="quick-option" onclick="ask('projects')">Projects</button>
                <button class="quick-option" onclick="ask('dm aide')">DM Aide</button>
                <button class="quick-option" onclick="ask('feedback')">Give Feedback</button>
            </div>`);
            conversationState = 'CHAT';
            return;
        }

        // Chat Logic
        if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('quote')) {
            addBotMessage(knowledgeBase.pricing);
        } else if (lowerText.includes('project') || lowerText.includes('app') || lowerText.includes('built')) {
            addBotMessage(knowledgeBase.projects);
        } else if (lowerText.includes('dm') || lowerText.includes('dungeon') || lowerText.includes('aide')) {
            addBotMessage(knowledgeBase.dm_aide);
        } else if (lowerText.includes('contact') || lowerText.includes('email')) {
            addBotMessage(knowledgeBase.contact);
        } else if (lowerText.includes('feedback')) {
            const subject = encodeURIComponent(`Feedback from ${userDetails.name}`);
            const body = encodeURIComponent(`Name: ${userDetails.name}\nEmail: ${userDetails.email}\n\nFeedback:\n[Please type your feedback here]`);
            addBotMessage(`We value your feedback! Click the link below to send us an email directly via your preferred mail client:<br><br>
            <a href="mailto:winseral@knowandguide.com?subject=${subject}&body=${body}" style="background:#4f46e5; color:white; padding:8px 16px; border-radius:4px; text-decoration:none; display:inline-block;">Send Feedback Email</a>`);
        } else {
            addBotMessage(knowledgeBase.default);
        }
    }

    // Expose ask function for quick options
    window.ask = function (keyword) {
        handleLogic(keyword);
    };

    // Event Listeners
    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', processInput);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processInput();
    });
});
