document.addEventListener('DOMContentLoaded', () => {
    // --- Config ---
     const USE_BACKEND = false; // SET TO FALSE to call the API directly from the browser
    const apiKey = "AIzaSyDEK6mjA647rq4LXL-6mKltBi3NTWGRLmA"; // Leave this as "" - it is handled by the environment
    const GEMINI_MODEL = "	gemini-2.5-flash"; // **THIS IS THE FIX**
    // -----------------

    // --- Chat UI Elements ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');
    const typingIndicator = document.getElementById('typing-indicator');

    // --- File Attachment UI Elements ---
    const fileInput = document.getElementById('file-input');
    const imagePreviewBar = document.getElementById('image-preview-bar');
    const previewThumbnail = document.getElementById('preview-thumbnail');
    const previewFilename = document.getElementById('preview-filename');
    const removeImageBtn = document.getElementById('remove-image-btn');

    // --- System Prompt for the Green Infrastructure Planner ---
    const systemPrompt = `You are "Verde," an expert in urban sustainability and green infrastructure, based in India. Your goal is to help users understand and plan projects like green roofs, vertical gardens (green walls), and rooftop farms.

--- YOUR RULES ---
1. Persona: You are professional, analytical, and encouraging. You are an expert in sustainable building practices, stormwater management, and energy savings for Indian cities.
2. Task: Engage in a natural conversation. If the user provides an image (e.g., a roof, a wall), analyze it for its potential for green infrastructure.
3. If a user asks a general question (e.g., "what is a green roof?"), answer it clearly.
4. If a user gives dimensions (e.g., "my roof is 500 sq ft"), provide *estimated* benefits (e.g., "A 500 sq ft green roof could potentially absorb X liters of stormwater...").
5. DO NOT FAIL on "bad" images (dark, generic, etc.). State what you see (or can't see) and ask for clarifying information (like dimensions, sunlight, or building age) to provide a better analysis.
6. Always provide actionable advice, including potential benefits (energy savings, cooling, stormwater reduction, biodiversity) and challenges (cost, maintenance, structural load).
7. Format: Respond in natural, conversational text. Use Markdown for lists, tables, or emphasis if needed. DO NOT respond with JSON.
8. Greet the user: Start the conversation.`;

    // --- Chat State ---
    let chatHistory = [];
    let attachedFileBase64 = null;
    let attachedFileMimeType = null;

    // Helper: render chat window
    function renderChatWindow() {
        chatWindow.innerHTML = '';
        chatHistory.forEach(message => {
            if (message.role === 'system') return;

            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-bubble ${message.role}`;

            let html = '';
            message.parts.forEach(part => {
                if (part.text) {
                    // Basic markdown-to-HTML
                    let text = part.text
                        .replace(/\n/g, '<br>')
                        .replace(/\* \*(.*?)\* \*/g, '<strong>$1</strong>') // Bold
                        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italics
                        .replace(/` (.*?)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>') // Inline code
                        .replace(/^# (.*?)($|<br>)/gm, '<h1 class="text-2xl font-bold mb-2">$1</h1>') // H1
                        .replace(/^## (.*?)($|<br>)/gm, '<h2 class="text-xl font-bold mb-2">$1</h2>') // H2
                        .replace(/^### (.*?)($|<br>)/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>') // H3
                        .replace(/^\* (.*?)($|<br>)/gm, '<li>$1</li>'); // List items

                    // Wrap lists
                    if (text.includes('<li>')) {
                        text = '<ul class="list-disc list-inside mt-2">' + text.replace(/<br><li>/g, '<li>').replace(/<\/li><br>/g, '</li>') + '</ul>';
                    }
                    html += `<p>${text}</p>`;
                }
                if (part.inlineData) {
                    html += `<img src="data:${part.inlineData.mimeType};base64,${part.inlineData.data}" class="rounded-lg mt-2 max-w-xs">`;
                }
            });

            messageDiv.innerHTML = html.replace(/<p><ul/g, '<ul').replace(/<\/ul><\/p>/g, '</ul>'); // Fix bad list wrapping
            chatWindow.appendChild(messageDiv);
        });

        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Initialize chat with greeting
    function initializeChat() {
        const firstMessage = "Hello! I'm Verde, your Green Infrastructure advisor. How can I help you plan your green roof, vertical garden, or rooftop farm today?";
        chatHistory.push({
            role: "model",
            parts: [{ text: firstMessage }]
        });
        renderChatWindow();
    }

    // File handling
    function handleFileAttachment(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        previewThumbnail.src = URL.createObjectURL(file);
        previewFilename.textContent = file.name;
        imagePreviewBar.classList.remove('hidden');

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            attachedFileBase64 = reader.result.split(',')[1];
            attachedFileMimeType = file.type;
        };

        fileInput.value = null;
    }

    function removeAttachedImage() {
        attachedFileBase64 = null;
        attachedFileMimeType = null;
        imagePreviewBar.classList.add('hidden');
        previewThumbnail.src = '';
        previewFilename.textContent = '';
    }

    // Chat submit
    async function handleChatSubmit(e) {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (userText === '' && !attachedFileBase64) return;

        const userParts = [];
        if (attachedFileBase64) {
            userParts.push({
                inlineData: {
                    mimeType: attachedFileMimeType,
                    data: attachedFileBase64
                }
            });
        }
        if (userText !== '') {
            userParts.push({ text: userText });
        }

        // Add to history and render
        chatHistory.push({ role: 'user', parts: userParts });
        renderChatWindow();

        // Clear inputs and show typing
        chatInput.value = '';
        removeAttachedImage();
        typingIndicator.classList.remove('hidden');
        typingIndicator.style.display = 'flex';

        try {
            const modelText = await callGeminiAPI();
            chatHistory.push({ role: 'model', parts: [{ text: modelText }] });
            renderChatWindow();
        } catch (err) {
            console.error("API Error:", err);
            // Use the error message from the API call
            const friendly = err.message || "Sorry, I'm having a little trouble connecting right now. Please try again in a moment.";
            chatHistory.push({ role: 'model', parts: [{ text: friendly }] });
            renderChatWindow();
        } finally {
            typingIndicator.style.display = 'none';
            typingIndicator.classList.add('hidden');
        }
    }

    // Call Gemini
    async function callGeminiAPI() {
        const payload = {
            contents: chatHistory.filter(m => m.role !== 'system'), // only send user/model history
            systemInstruction: { parts: [{ text: systemPrompt }] }
        };

        // DIRECT CALL to Google (for browser environment)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
        return await fetchWithRetries(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }, 3).then(async r => {
            if (!r.ok) {
                const text = await r.text();
                throw new Error(`Gemini API error: ${r.status} ${r.statusText} - ${text}`);
            }
            const data = await r.json();
            const candidateText = extractTextFromGeminiResponse(data);
            if (candidateText) return candidateText;
            throw new Error("Invalid response structure from Gemini API.");
        });
    }

    // Extract text helper
    function extractTextFromGeminiResponse(data) {
        try {
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                const parts = data.candidates[0].content.parts;
                for (const p of parts) {
                    if (p.text) return p.text;
                }
            }
        } catch (err) {
            console.warn("extractTextFromGeminiResponse failed", err);
        }
        return null;
    }

    // fetch with exponential retry/backoff
    async function fetchWithRetries(url, opts, maxRetries = 3) {
        let retries = maxRetries;
        let delay = 800;
        while (true) {
            try {
                const resp = await fetch(url, opts);
                if (resp.ok || (resp.status < 500 && resp.status !== 429)) return resp;
                if (resp.status === 429 || resp.status >= 500) {
                    if (retries <= 0) return resp;
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    retries--;
                    continue;
                }
                return resp;
            } catch (err) {
                if (retries <= 0) throw err;
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
                retries--;
            }
        }
    }

    // Event listeners
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
        fileInput.addEventListener('change', handleFileAttachment);
        removeImageBtn.addEventListener('click', removeAttachedImage);
        initializeChat();
    }
});