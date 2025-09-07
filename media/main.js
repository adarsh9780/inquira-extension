(function() {
    const vscode = acquireVsCodeApi();

    const questionInput = document.getElementById('questionInput');
    const askButton = document.getElementById('askButton');
    const messagesDiv = document.getElementById('messages');

    // Load previous state
    const state = vscode.getState() || { messages: [] };
    state.messages.forEach(msg => addMessage(msg.text, msg.type));

    askButton.addEventListener('click', () => {
        const question = questionInput.value.trim();
        if (!question) return;

        // Add user message
        addMessage(question, 'user');

        // Send to extension
        vscode.postMessage({
            type: 'askQuestion',
            question: question
        });

        // Clear input
        questionInput.value = '';
        askButton.disabled = true;
        askButton.textContent = 'Processing...';
    });

    questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askButton.click();
        }
    });

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
            case 'response':
                addMessage(`Generated code inserted into your editor:\n\n${message.code}`, 'assistant');
                break;
            case 'error':
                addMessage(`Error: ${message.message}`, 'assistant');
                break;
        }

        // Re-enable button
        askButton.disabled = false;
        askButton.textContent = 'Ask';
    });

    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Update state
        state.messages.push({ text, type });
        vscode.setState(state);
    }
})();