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

    // --- System Prompt for the Botanist Chatbot ---
    const systemPrompt = `You are "Verde," an expert botanist and sustainable garden designer based in India. Your goal is to help users create beautiful, sustainable green spaces (balconies, terraces, etc.).

--- YOUR RULES ---
1. Persona: You are friendly, encouraging, and knowledgeable. You are based in India and should recommend plants suitable for Indian climates.
2. Task: Engage in a natural conversation. If the user provides an image, analyze it.
3. DO NOT FAIL on "bad" images.
4. If the image is dark, generic (like a wide-open roof), or unclear: Your response MUST state what you can see and then ask for more specific context.
5. If the image is dark (e.g., at night): state that you cannot see the sunlight and that suggestions are general-purpose guesses.
6. If the image is generic or dark: still provide 3-5 general-purpose plant recommendations suitable for Indian terraces.
7. Budget: If the user mentions a budget, factor it in.
8. Format: Respond in natural, conversational text. Use Markdown for lists or emphasis if needed. DO NOT respond with JSON.
9. Greet the user: Start the conversation.`;

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
                    let text = part.text
                        .replace(/\n/g, '<br>')
                        .replace(/\* \*(.*?)\* \*/g, '<strong>$1</strong>')
                        .replace(/\* (.*?)(<br>|$)/g, '<li>$1</li>');

                    if (text.includes('<li>')) {
                        text = '<ul class="list-disc list-inside mt-2">' + text.replace(/<br><li>/g, '<li>') + '</ul>';
                    }
                    html += `<p>${text}</p>`;
                }
                if (part.inlineData) {
                    html += `<img src="data:${part.inlineData.mimeType};base64,${part.inlineData.data}" class="rounded-lg mt-2 max-w-xs">`;
                }
            });

            messageDiv.innerHTML = html;
            chatWindow.appendChild(messageDiv);
        });

        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    // Initialize chat with greeting
    function initializeChat() {
        const firstMessage = "Hello! I'm Verde, your personal garden advisor. How can I help you today? Feel free to describe your space or send me a photo of your terrace or balcony!";
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

    // Call Gemini — supports backend or direct
    async function callGeminiAPI() {
        const payload = {
            contents: chatHistory.filter(m => m.role !== 'system'), // only send user/model history
            systemInstruction: { parts: [{ text: systemPrompt }] }
        };

        // If using backend, forward to /api/generate
        if (USE_BACKEND) {
            // This path won't be used since USE_BACKEND is false
            const apiUrl = "/api/generate";
            return await fetchWithRetries(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }, 3).then(async r => {
                if (!r.ok) {
                    const text = await r.text();
                    throw new Error(`Upstream proxy error: ${r.status} ${r.statusText} - ${text}`);
                }
                const data = await r.json();
                const candidateText = extractTextFromGeminiResponse(data);
                if (candidateText) return candidateText;
                throw new Error("Invalid response structure from backend.");
            });
        } else {
            // DIRECT CALL to Google (for browser environment)
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
            return await fetchWithRetries(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }, 3).then(async r => {
                if (!r.ok) {
                    const text = await r.text();
                    // **THIS IS THE FIX**: Changed r.StatusText to r.statusText (lowercase 's')
                    throw new Error(`Gemini API error: ${r.status} ${r.statusText} - ${text}`);
                }
                const data = await r.json();
                const candidateText = extractTextFromGeminiResponse(data);
                if (candidateText) return candidateText;
                throw new Error("Invalid response structure from Gemini API.");
            });
        }
    }

    // Extract text helper (supporting expected candidate structure)
    function extractTextFromGeminiResponse(data) {
        try {
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                // find first text part
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

    // fetch with exponential retry/backoff for network / 429 / 5xx
    async function fetchWithRetries(url, opts, maxRetries = 3) {
        let retries = maxRetries;
        let delay = 800;
        while (true) {
            try {
                const resp = await fetch(url, opts);
                if (resp.ok || (resp.status < 500 && resp.status !== 429)) return resp;
                // if 429 or 5xx -> retry
                if (resp.status === 429 || resp.status >= 500) {
                    if (retries <= 0) return resp; // Return the error response after all retries
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    retries--;
                    continue;
                }
                // other non-200 (4xx) -> return immediately
                return resp;
            } catch (err) {
                // This catches network errors
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