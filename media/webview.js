(function() {
    const vscode = acquireVsCodeApi();

    const questionInput = document.getElementById('questionInput');
    const askButton = document.getElementById('askButton');
    const messagesDiv = document.getElementById('messages');
    const thinkingSpinner = document.getElementById('thinkingSpinner');
    const schemaButton = document.getElementById('schemaButton');
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const cancelSettings = document.getElementById('cancelSettings');
    const saveSettings = document.getElementById('saveSettings');
    const mainContent = document.getElementById('mainContent');
    const apiKeyInput = document.getElementById('apiKey');
    const dataPathInput = document.getElementById('dataPath');
    const contextInput = document.getElementById('context');
    const modelInput = document.getElementById('model');


    // Enable input by default
    if (questionInput) questionInput.disabled = false;
    if (askButton) {
        askButton.disabled = false;
        askButton.textContent = 'Ask';
    }

    console.log('Webview initialized, elements found:', {
        questionInput: !!questionInput,
        askButton: !!askButton,
        messagesDiv: !!messagesDiv
    });

    // Add scroll listener for infinite scroll
    if (messagesDiv) {
        messagesDiv.addEventListener('scroll', () => {
            if (messagesDiv.scrollTop === 0) {
                vscode.postMessage({ type: 'loadMoreMessages' });
            }
        });
    }

    // Modal functionality
    function openSettingsModal() {
        if (settingsModal && mainContent) {
            settingsModal.style.display = 'block';
            mainContent.classList.add('hidden');
            // Request current settings when modal opens
            vscode.postMessage({ type: 'requestSettings' });
        }
    }

    function closeSettingsModal() {
        if (settingsModal && mainContent) {
            settingsModal.style.display = 'none';
            mainContent.classList.remove('hidden');
        }
    }

    // Schema button event listener
    if (schemaButton) {
        schemaButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'openSchema' });
        });
    }

    // Settings button event listeners
    if (settingsButton) {
        settingsButton.addEventListener('click', openSettingsModal);
    }

    if (closeSettings) {
        closeSettings.addEventListener('click', closeSettingsModal);
    }

    if (cancelSettings) {
        cancelSettings.addEventListener('click', closeSettingsModal);
    }

    // Settings form submission
    if (saveSettings) {
        saveSettings.addEventListener('click', (e) => {
            e.preventDefault();
            const apiKey = apiKeyInput.value;
            const dataPath = dataPathInput.value;
            const context = contextInput.value;
            const model = modelInput.value;

            vscode.postMessage({
                type: 'updateSettings',
                apiKey: apiKey,
                dataPath: dataPath,
                context: context,
                model: model
            });
        });
    }

    if (askButton) {
        askButton.addEventListener('click', (e) => {
            console.log('Ask button clicked');
            e.preventDefault();
            const question = questionInput.value.trim();
            if (!question) {
                console.log('No question provided');
                return;
            }
            console.log('Sending question:', question);
            addMessage(question, 'user');
            vscode.postMessage({
                type: 'askQuestion',
                question: question
            });
            questionInput.value = '';
            askButton.disabled = true;
            askButton.style.display = 'none';
            thinkingSpinner.style.display = 'flex';
        });
    } else {
        vscode.postMessage({ type: 'debug', message: 'Ask button not found' });
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'loadMessages':
                // Load messages from memory
                if (message.messages && message.messages.length > 0) {
                    message.messages.forEach((msg) => {
                        addMessage(msg.content, msg.type);
                    });
                }
                break;
            case 'loadSettings':
                if (message.settings) {
                    apiKeyInput.value = message.settings.apiKey || '';
                    dataPathInput.value = message.settings.dataPath || '';
                    contextInput.value = message.settings.context || '';
                    modelInput.value = message.settings.modelName || 'gemini-2.5-flash';
                }
                break;
            case 'openSettings':
                openSettingsModal();
                break;
            case 'settingsUpdated':
                closeSettingsModal();
                break;
            case 'response':
                console.log('Received response:', message);
                // Combine explanation and code for markdown rendering
                const fullResponse = (message.explanation || '') + '\n\n**Generated Code:**\n\n```python\n' + message.code + '\n```';
                addMessage(fullResponse, 'assistant');
                askButton.disabled = false;
                askButton.style.display = 'block';
                thinkingSpinner.style.display = 'none';
                break;
            case 'error':
                console.log('Received error:', message);
                addMessage('**Error:** ' + message.message, 'assistant');
                askButton.disabled = false;
                askButton.style.display = 'block';
                thinkingSpinner.style.display = 'none';
                break;
        }
    });

    if (questionInput) {
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                askButton.click();
            }
        });
    }

    function renderMarkdown(text) {
        if (!text) return '';

        // Basic markdown parsing
        let html = text;

        // Code blocks (```language\ncode\n```)
        html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || '';
            return `<pre class="code-block" data-language="${language}"><code>${escapeHtml(code.trim())}</code></pre>`;
        });

        // Inline code (`code`)
        html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

        // Bold (**text** or __text__)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

        // Italic (*text* or _text_)
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');

        // Headers (# ## ###)
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Line breaks
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function addMessage(text, type, code, explanation) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + type;

        if (type === 'assistant') {
            // For assistant messages, just render the text as markdown
            // The text already includes both explanation and code
            if (text) {
                const textDiv = document.createElement('div');
                textDiv.className = 'message-text';
                textDiv.innerHTML = renderMarkdown(text);
                messageDiv.appendChild(textDiv);
            }
        } else {
            // User messages - render as markdown too
            messageDiv.innerHTML = renderMarkdown(text);
        }

        messagesDiv.appendChild(messageDiv);

        // Smooth scroll to bottom for new messages
        setTimeout(() => {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 10);
    }
})();