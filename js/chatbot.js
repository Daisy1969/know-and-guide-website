import { GoogleGenerativeAI } from "@google/generative-ai";

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
    let conversationState = 'INIT'; // INIT, CHAT

    // Initialize Gemini
    let genAI = null;
    let model = null;
    let chatSession = null;

    try {
        if (typeof CONFIG !== 'undefined' && CONFIG.API_KEY) {
            genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        } else {
            console.error("CONFIG.API_KEY not found.");
        }
    } catch (e) {
        console.error("Error initializing Gemini:", e);
    }

    const systemPrompt = `
    You are the Know & Guide AI Assistant. You help users with AI development services.
    
    Services & Pricing:
    - Base development: $250 AUD.
    - AI Tool (3 hours): $200 AUD (Discounted).
    - Medium Project (3 Days): $1000 AUD.
    - Hosting: 1 year via our domain or user pays Google Cloud costs.
    
    Projects:
    - Maths Penpal: Voice-activated AI tutor for ACARA v9.0.
    - Handball Game: Web-based sports game.
    - Studio AI: Creative workflow automation.
    - Advanced DM Aide: Tool for Dungeon Masters (advancedmaide.knowandguide.com).
    
    Contact: winseral@knowandguide.com.
    
    Style: Professional, helpful, concise.
    `;

    // Functions
    function toggleChat() {
        isOpen = !isOpen;
        windowEl.classList.toggle('active', isOpen);
        if (isOpen && messagesEl.children.length === 0) {
            initChat();
        }
    }

    async function initChat() {
        addBotMessage("✨ Hello! I'm the Know & Guide <strong>Gemini</strong> Assistant.<br>I can help you with pricing, projects, or just chat!");

        if (model) {
            try {
                chatSession = model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{ text: systemPrompt + "\n\nHello." }],
                        },
                        {
                            role: "model",
                            parts: [{ text: "Hello! I am ready to help you with Know & Guide services." }],
                        },
                    ],
                });
            } catch (e) {
                addBotMessage("Error initializing AI. Operating in limited mode.");
            }
        }
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.innerHTML = text; // Allow HTML for links
        messagesEl.appendChild(msgDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addBotMessage(text) {
        addMessage(text, 'bot');
    }

    function addUserMessage(text) {
        addMessage(text, 'user');
    }

    async function processInput() {
        const text = inputEl.value.trim();
        if (!text) return;

        addUserMessage(text);
        inputEl.value = '';
        inputEl.disabled = true;

        if (chatSession) {
            try {
                const result = await chatSession.sendMessage(text);
                const response = await result.response;
                const advice = response.text();
                addBotMessage(marked.parse(advice)); // Use marked if available, otherwise raw text
            } catch (error) {
                console.error("Gemini Error:", error);

                // Detailed Error for User Debugging
                let errorMessage = error.message || error.toString();
                if (errorMessage.includes("403")) errorMessage += "<br>(Likely API Key restriction or API not enabled)";

                addBotMessage(`⚠️ <strong>Connection Error:</strong><br>${errorMessage}<br><br>Please check console (F12) for more details.`);

                // Fallback logic
                handleFallback(text);
            }
        } else {
            addBotMessage("⚠️ <strong>System Error:</strong> AI Model not initialized. Check config.js.");
            handleFallback(text);
        }
        inputEl.disabled = false;
        inputEl.focus();
    }

    function handleFallback(text) {
        // Simple keywords if AI fails
        const lower = text.toLowerCase();
        if (lower.includes('price')) addBotMessage("Our base service starts at $200 AUD for small AI tools.");
        else if (lower.includes('contact')) addBotMessage("Email us at winseral@knowandguide.com");
        else addBotMessage("I'm having trouble connecting to the AI brain right now. Please email us at winseral@knowandguide.com");
    }

    // Event Listeners
    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', processInput);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processInput();
    });
});
