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
                <button class="chatbot-mic" id="chatbot-mic" title="Speak">
                    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 3.01-2.45 5.46-5.5 5.5S6 14.01 6 11H4c0 3.53 2.61 6.43 6 6.92V21h4v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>
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
    const micBtn = document.getElementById('chatbot-mic'); // New Mic Button

    // State
    let isOpen = false;
    let isListening = false;

    // Voice Setup
    const recognition = window.SpeechRecognition || window.webkitSpeechRecognition ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() : null;
    let synthesis = window.speechSynthesis;
    let femaleVoice = null;

    if (recognition) {
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            inputEl.value = transcript;
            processInput();
            micBtn.classList.remove('listening');
            isListening = false;
        };
        recognition.onend = () => {
            micBtn.classList.remove('listening');
            isListening = false;
        };
    } else {
        if (micBtn) micBtn.style.display = 'none'; // Hide if not supported
    }

    function loadVoices() {
        if (!synthesis) return;
        const voices = synthesis.getVoices();
        // Prefer Google US Female, then Microsoft Zira, then any female
        femaleVoice = voices.find(v => v.name.includes("Google US English") && v.name.includes("Female"))
            || voices.find(v => v.name.includes("Zira"))
            || voices.find(v => v.name.toLowerCase().includes("female"))
            || voices[0];
    }
    if (synthesis && synthesis.onvoiceschanged !== undefined) {
        synthesis.onvoiceschanged = loadVoices;
    }
    loadVoices(); // Init immediately too

    function speak(text) {
        if (!synthesis) return;
        // Strip HTML tags for clean reading
        const cleanText = text.replace(/<[^>]*>/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        synthesis.speak(utterance);
    }

    function toggleMic() {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
            micBtn.classList.add('listening');
            isListening = true;
        }
    }

    let conversationState = 'INIT'; // INIT, CHAT

    // Initialize Gemini
    let genAI = null;
    let model = null;
    let chatSession = null;

    try {
        if (typeof CONFIG !== 'undefined' && CONFIG.ENCODED_KEY) {
            const apiKey = atob(CONFIG.ENCODED_KEY);
            genAI = new GoogleGenerativeAI(apiKey);
            // Switched to alias 'gemini-flash-latest' as specific version was 404ing
            model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        } else {
            console.error("CONFIG.API_KEY not found.");
        }
    } catch (e) {
        console.error("Error initializing Gemini:", e);
    }

    const systemPrompt = `
    You are the Know & Guide AI Assistant. You are a professional, polite, and helpful female expert on AI development services.
    
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
    
    Style: Professional, polite, expert, concise. Respond as if speaking clearly.
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
        const welcomeText = "✨ Hello! I'm the Know & Guide <strong>Gemini</strong> Assistant.<br>I can help you with pricing, projects, or just chat!";
        addBotMessage(welcomeText);
        speak("Hello! I'm the Know and Guide Gemini Assistant. I can help you with pricing, projects, or just chat!");

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

    // Models to try in order
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
                addBotMessage(marked.parse(advice));
                speak(advice);
            } catch (error) {
                console.error("Gemini Error:", error);

                let errorMessage = error.message || error.toString();
                if (errorMessage.includes("Failed to fetch")) {
                    errorMessage += "<br>(Likely **API Key Restriction** mismatch.<br>Did you add 'www'?<br>Check Console for CORS errors.)";
                }

                addBotMessage(`⚠️ <strong>Connection Error:</strong><br>${errorMessage}`);
                handleFallback(text);
            }
        } else {
            addBotMessage("⚠️ <strong>System Error:</strong> AI Model not initialized.");
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
    if (micBtn) micBtn.addEventListener('click', toggleMic); // Mic Listener
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processInput();
    });
});
