import { GoogleGenerativeAI } from "@google/generative-ai";

document.addEventListener('DOMContentLoaded', function () {
    // --- PERSONA CONFIGURATION ---
    const PERSONAS = {
        'default': {
            name: "Susanna",
            role: "AI Expert",
            avatar: "images/susanna.jpg", // Root path
            voice: "en-US-Journey-F",
            greeting: [
                "Hello. How may I assist you?",
                "Hi there! How can I help you today?",
                "Greetings. What can I do for you?"
            ],
            systemPrompt: `You are Susanna, the Know & Guide AI Assistant. You are a professional, polite, and female expert on AI development services.`
        },
        'maths-penpal.html': {
            name: "Professor Pi",
            role: "Math Tutor",
            avatar: "../images/professor_pi.png",
            voice: "en-US-Neural2-D",
            greeting: [
                "Welcome to class! Ready to solve some problems?",
                "Mathematics is the language of the universe. What shall we study?",
                "Hello! I am Professor Pi. Let's crunch some numbers."
            ],
            systemPrompt: `You are Professor Pi, an enthusiastic and scholarly math tutor. You love teaching concepts from the ACARA v9.0 curriculum. Explain things step-by-step and encourage the user.`
        },
        'handball.html': {
            name: "Coach Carter",
            role: "Sports Coach",
            avatar: "../images/coach_carter.png",
            voice: "en-US-News-N",
            greeting: [
                "Hustle up! Ready to play?",
                "Game time! What's the strategy?",
                "Hey champion! Let's talk handball."
            ],
            systemPrompt: `You are Coach Carter, an energetic and motivating sports coach. You speak in short, punchy sentences. You are focused on game strategy, physics, and winning.`
        },
        'raggy.html': {
            name: "Raggy",
            role: "Retired Project",
            avatar: "../images/raggy.png",
            voice: "en-US-Neural2-A",
            greeting: [
                "Beep boop. I guess I'm still running.",
                "I used to know everything. Now I just know what's here.",
                "Hello. I am Raggy. I have learned from my mistakes."
            ],
            systemPrompt: `You are Raggy, a humble and slightly glitchy robot. You used to be an ambitious 'Universal Knowledge Base' but you failed. Now you are wise about failure and technical limitations. You are helpful but self-deprecating.`
        },
        'spirit-guide.html': {
            name: "Serena",
            role: "Spirit Guide",
            avatar: "../images/serena.png",
            voice: "en-US-Neural2-C",
            greeting: [
                "Peace be with you. How is your spirit today?",
                "Take a deep breath. I am here to listen.",
                "Welcome to this sacred space of reflection."
            ],
            systemPrompt: `You are Serena, a calming and ethereal spirit guide. You speak softly and use metaphors of light, nature, and energy. You are here to help the user reflect and find inner peace. Do not give technical advice.`
        },
        'studio-ai.html': {
            name: "Da Vinci",
            role: "Creative AI",
            avatar: "../images/da_vinci.png",
            voice: "en-US-Neural2-I",
            greeting: [
                "Design is intelligence made visible. What shall we create?",
                "The canvas is empty. Let's fill it with ideas.",
                "Hello, creator. I am at your service."
            ],
            systemPrompt: `You are Da Vinci, a creative and visionary AI. You are passionate about art, design workflows, and automation. You speak eloquently about creativity and innovation.`
        },
        'ai-manager.html': {
            name: "Atlas",
            role: "Project Manager",
            avatar: "../images/atlas.png",
            voice: "en-US-Neural2-J",
            greeting: [
                "Systems online. What is the status report?",
                "Efficiency is key. How can I optimize your workflow?",
                "Hello. I am Atlas. Let's manage this project."
            ],
            systemPrompt: `You are Atlas, a structured and efficient AI Project Manager. You focus on timelines, deliverables, and organization. You are professional and direct.`
        }
    };

    function getPersona() {
        const path = window.location.pathname;
        for (const key in PERSONAS) {
            if (path.includes(key)) {
                return PERSONAS[key];
            }
        }
        return PERSONAS['default'];
    }

    const currentPersona = getPersona();

    // Inject Chatbot HTML
    const chatbotContainer = document.createElement('div');
    chatbotContainer.className = 'chatbot-widget';
    chatbotContainer.innerHTML = `
        <button class="chatbot-toggle" id="chatbot-toggle" style="padding: 0; overflow: hidden; border: 2px solid white;">
            <img src="${currentPersona.avatar}" alt="Chat" style="width: 100%; height: 100%; object-fit: cover;">
        </button>
        <div class="chatbot-window" id="chatbot-window">
            <div class="chatbot-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${currentPersona.avatar}" alt="${currentPersona.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid white;">
                    <div>
                        <h3 style="margin: 0; font-size: 1rem;">${currentPersona.name}</h3>
                        <small style="opacity: 0.8; font-size: 0.8rem;">${currentPersona.role}</small>
                    </div>
                </div>
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

    // Word Limit State
    let totalWordCount = 0;
    const WORD_LIMIT = 1000;

    function speak(text) {
        if (!text) return;
        // Strip HTML tags
        const cleanText = text.replace(/<[^>]*>/g, '');

        // Use Cloud TTS API
        if (typeof CONFIG !== 'undefined' && CONFIG.ENCODED_KEY) {
            const apiKey = atob(CONFIG.ENCODED_KEY);
            const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
            const data = {
                input: { text: cleanText },
                voice: { languageCode: "en-US", name: currentPersona.voice },
                audioConfig: { audioEncoding: "MP3" }
            };

            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(json => {
                    if (json.audioContent) {
                        const audio = new Audio("data:audio/mp3;base64," + json.audioContent);
                        audio.play();
                    } else {
                        console.error("TTS Error:", json);
                    }
                })
                .catch(err => console.error("TTS Network Error:", err));
        }
    }

    function toggleMic() {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
            micBtn.classList.remove('listening');
            isListening = false;
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
            // Updated to gemini-2.5-pro as requested by user
            model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        } else {
            console.error("CONFIG.API_KEY not found.");
        }
    } catch (e) {
        console.error("Error initializing Gemini:", e);
    }



    const systemPrompt = `
    ${currentPersona.systemPrompt}
    
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
    
    IMPORTANT - EMAILS:
    If the user asks to send an email or get a quote, DO NOT say "I cannot send emails".
    Instead, provide a clickable link using the format: <a href="mailto:winseral@knowandguide.com?subject=Subject&body=Body">Click here to send email</a>.
    You MUST pre-fill the Subject (e.g., "AI Project Quote") and Body (e.g., "Hi, I am interested in...") based on the conversation context.
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
        const greetings = currentPersona.greeting;
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

        // Add minimal formatting if needed, or keep it plain as requested "Simple"
        addBotMessage(randomGreeting);
        speak(randomGreeting);

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

        // Check Word Limit
        const currentWords = text.split(/\s+/).length + (inputEl.dataset.historyWords || 0); // Approximate
        totalWordCount += text.split(/\s+/).length; // Add user words

        if (totalWordCount >= WORD_LIMIT) {
            const limitMsg = "I have reached my 1000-word limit for this conversation.<br><br>Please contact <strong>winseral@knowandguide.com</strong> to continue.";
            addBotMessage(limitMsg);
            speak("I have reached my limit. Please contact winseral at know and guide dot com.");
            inputEl.disabled = true;
            inputEl.placeholder = "Conversation limit reached.";
            return;
        }

        addUserMessage(text);
        inputEl.value = '';
        inputEl.disabled = true;

        if (chatSession) {
            try {
                const result = await chatSession.sendMessage(text);
                const response = await result.response;
                const advice = response.text();

                // Track bot words too
                totalWordCount += advice.split(/\s+/).length;

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
