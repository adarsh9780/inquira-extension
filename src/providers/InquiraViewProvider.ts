import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LLMService } from '../services/LLMService';
import { SchemaManager } from '../services/SchemaManager';
import { CodeInjector } from '../services/CodeInjector';

interface ChatMessage {
    id?: number;
    timestamp: Date;
    type: 'user' | 'assistant';
    content: string;
    code?: string;
    explanation?: string;
}

export class InquiraViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'inquiraview';
    private _view?: vscode.WebviewView;
    private _llmService: LLMService;
    private _schemaManager: SchemaManager;
    private _codeInjector: CodeInjector;
    private _chatMessages: ChatMessage[] = [];
    private _loadedMessages: number = 0;
    private _totalMessages: number = 0;
    private _isLoadingMore: boolean = false;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this._llmService = new LLMService();
        this._schemaManager = new SchemaManager();
        this._codeInjector = new CodeInjector();
    }

    private getSettingsPath(): string {
        const homeDir = os.homedir();
        const settingsDir = path.join(homeDir, '.inquira');
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
        return path.join(settingsDir, 'settings.json');
    }

    private loadSettings(): any {
        const settingsPath = this.getSettingsPath();
        if (fs.existsSync(settingsPath)) {
            try {
                const data = fs.readFileSync(settingsPath, 'utf8');
                return JSON.parse(data);
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
        return {};
    }

    private saveSettings(settings: any): void {
        const settingsPath = this.getSettingsPath();
        try {
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('Resolving webview view');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        console.log('Webview HTML set');

        // Initialize message count and load initial messages
        this.updateMessageCount().then(() => {
            this.loadMessages(4, 0);
        });

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                console.log('Received message:', message);
                switch (message.type) {
                    case 'askQuestion':
                        console.log('Processing askQuestion:', message.question);
                        await this._handleQuestion(message.question);
                        break;
                    case 'loadMoreMessages':
                        if (!this._isLoadingMore && this._loadedMessages < this._totalMessages) {
                            this._isLoadingMore = true;
                            await this.loadMessages(4, this._loadedMessages);
                            this._isLoadingMore = false;
                        }
                        break;
                    case 'updateSettings':
                        await this._updateSettings(message.apiKey, message.dataPath, message.context, message.model);
                        break;
                    case 'requestSettings':
                        const settings = this.loadSettings();
                        this._view?.webview.postMessage({
                            type: 'loadSettings',
                            settings: settings
                        });
                        break;
                    case 'generateSchema':
                        await this._generateSchema();
                        break;
                    case 'openSchema':
                        this._openSchema();
                        break;
                    case 'viewSchema':
                        this._viewSchema();
                        break;
                    case 'openFileDialog':
                        const fileUri = await vscode.window.showOpenDialog({
                            canSelectFiles: true,
                            canSelectFolders: false,
                            canSelectMany: false,
                            defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
                            filters: {
                                'Data Files': ['csv', 'json', 'parquet']
                            }
                        });
                        if (fileUri && fileUri[0]) {
                            this._view?.webview.postMessage({
                                type: 'fileSelected',
                                path: fileUri[0].fsPath
                            });
                        }
                        break;
                }
            }
        );
    }

    private async _handleQuestion(question: string) {
        try {
            const settings = this.loadSettings();
            const apiKey = settings.apiKey || '';
            const dataPath = settings.dataPath || '';
            const model = settings.modelName || 'gemini-2.5-flash';

            if (!apiKey) {
                vscode.window.showErrorMessage('Please set your Google Gemini API key in settings');
                return;
            }

            if (!dataPath) {
                vscode.window.showErrorMessage('Please set your data file path in settings');
                return;
            }

            // Check if schema has been generated
            const currentSettings = this.loadSettings();
            if (!currentSettings.hasSchema) {
                vscode.window.showErrorMessage('Schema not generated. Please save settings first to generate schema.');
                return;
            }

            // Get schema
            const schema = await this._schemaManager.loadSchema(dataPath);
            if (!schema) {
                vscode.window.showErrorMessage('Schema not found. Please regenerate schema.');
                return;
            }

            // Get current file content for context
            const currentFileContent = await this.getCurrentFileContent();

            // Generate code using LLM with structured output
            const result = await this._llmService.generateCode(question, schema, apiKey, model, currentFileContent, dataPath);

            // Save user message to memory
            this._chatMessages.push({
                timestamp: new Date(),
                type: 'user',
                content: question
            });

            if (result.is_safe && result.is_relevant) {
                // Insert code into active editor
                await this._codeInjector.insertCode(result.code);

                // Save assistant response to memory
                this._chatMessages.push({
                    timestamp: new Date(),
                    type: 'assistant',
                    content: result.explanation,
                    code: result.code,
                    explanation: result.explanation
                });

                // Send response back to webview
                this._view?.webview.postMessage({
                    type: 'response',
                    code: result.code,
                    explanation: result.explanation
                });
            } else {
                const errorMessage = result.is_safe ? 'Question is not relevant to data analysis' : 'Question is not safe to answer';

                // Save error response to memory
                this._chatMessages.push({
                    timestamp: new Date(),
                    type: 'assistant',
                    content: errorMessage
                });

                this._view?.webview.postMessage({
                    type: 'error',
                    message: errorMessage
                });
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
            this._view?.webview.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }


    public async generateSchema(model?: string) {
        const settings = this.loadSettings();
        const dataPath = settings.dataPath || '';
        const apiKey = settings.apiKey || '';
        const context = settings.context || '';
        const modelToUse = model || settings.modelName || 'gemini-2.5-flash';

        if (!dataPath || !apiKey) {
            vscode.window.showErrorMessage('Please set data path and API key in settings first');
            return;
        }

        try {
            await this._schemaManager.generateSchema(dataPath, apiKey, modelToUse, context);
            // Update settings to mark schema as generated
            const updatedSettings = this.loadSettings();
            updatedSettings.hasSchema = true;
            this.saveSettings(updatedSettings);
            vscode.window.showInformationMessage('Schema generated successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate schema: ${error}`);
        }
    }

    public viewSchema() {
        const settings = this.loadSettings();
        const dataPath = settings.dataPath || '';

        if (!dataPath) {
            vscode.window.showErrorMessage('Please set data path in settings first');
            return;
        }

        const schemaPath = this._schemaManager.getSchemaPath(dataPath);
        vscode.workspace.openTextDocument(schemaPath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    private _openSchema() {
        const settings = this.loadSettings();
        const dataPath = settings.dataPath || '';

        if (!dataPath) {
            vscode.window.showErrorMessage('Please set data path in settings first');
            return;
        }

        const schemaPath = this._schemaManager.getSchemaPath(dataPath);
        vscode.workspace.openTextDocument(schemaPath).then(doc => {
            vscode.window.showTextDocument(doc);
        }, (error: any) => {
            vscode.window.showErrorMessage(`Failed to open schema file: ${error.message}`);
        });
    }

    public async openSettings() {
        // Open the settings modal by sending a message to the webview
        this._view?.webview.postMessage({ type: 'openSettings' });
    }

    private async _generateSchema() {
        await this.generateSchema();
    }

    private _viewSchema() {
        this.viewSchema();
    }

    private async getCurrentFileContent(): Promise<string> {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'python') {
                return activeEditor.document.getText();
            }
            return '';
        } catch (error) {
            console.error('Error getting current file content:', error);
            return '';
        }
    }

    private async loadMessages(limit: number = 4, offset: number = 0): Promise<void> {
        try {
            // Get messages from memory
            const messages = this._chatMessages.slice(-limit - offset, -offset || undefined).reverse();
            this._loadedMessages = Math.max(this._loadedMessages, offset + messages.length);

            // Send messages to webview
            this._view?.webview.postMessage({
                type: 'loadMessages',
                messages: messages,
                hasMore: this._loadedMessages < this._totalMessages
            });
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    private async updateMessageCount(): Promise<void> {
        try {
            this._totalMessages = this._chatMessages.length;
        } catch (error) {
            console.error('Error getting message count:', error);
        }
    }

    private async _updateSettings(apiKey: string, dataPath: string, context: string, model: string) {
        const settings = this.loadSettings();
        if (apiKey) settings.apiKey = apiKey;
        if (dataPath) settings.dataPath = dataPath;
        if (context) settings.context = context;
        if (model) settings.modelName = model;
        this.saveSettings(settings);

        // Auto-generate schema if dataPath and apiKey are set
        if (dataPath && apiKey) {
            try {
                await this.generateSchema(model);
                this._view?.webview.postMessage({ type: 'settingsUpdated' });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to generate schema: ${error}`);
                this._view?.webview.postMessage({ type: 'settingsUpdated' });
            }
        } else {
            this._view?.webview.postMessage({ type: 'settingsUpdated' });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.js'));

        const css = `
            .container {
                height: 100vh;
                display: flex;
                flex-direction: column;
                font-family: var(--vscode-font-family);
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
            }
            .header {
                padding: 10px;
                border-bottom: 1px solid var(--vscode-panel-border);
                background-color: var(--vscode-titleBar-activeBackground);
                display: flex;
                align-items: center;
            }
            .robot-icon {
                font-size: 18px;
                margin-right: 8px;
            }
            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
            }
            .header-buttons {
                display: flex;
                gap: 4px;
            }
            #schemaButton, #settingsButton {
                background: none;
                border: none;
                color: var(--vscode-foreground);
                cursor: pointer;
                font-size: 14px;
                padding: 4px;
                border-radius: 3px;
            }
            #schemaButton:hover, #settingsButton:hover {
                background-color: var(--vscode-toolbar-hoverBackground);
            }
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: var(--vscode-editor-background);
                z-index: 1000;
                display: none;
            }
            .modal-content {
                padding: 20px;
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .modal-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            .close-button {
                background: none;
                border: none;
                color: var(--vscode-foreground);
                cursor: pointer;
                font-size: 18px;
                padding: 4px 8px;
                border-radius: 3px;
            }
            .close-button:hover {
                background-color: var(--vscode-toolbar-hoverBackground);
            }
            .settings-form {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .form-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .form-group label {
                font-size: 12px;
                font-weight: 600;
                color: var(--vscode-foreground);
            }
            .form-group input, .form-group textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--vscode-input-border);
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 4px;
                font-size: 13px;
            }
            .form-group input:focus, .form-group textarea:focus {
                outline: none;
                border-color: var(--vscode-focusBorder);
            }
            .form-group textarea {
                height: 80px;
                resize: vertical;
                min-height: 60px;
                max-height: 120px;
            }
            .button-group {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
            }
            .btn-primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            .btn-primary:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .btn-secondary {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
            }
            .btn-secondary:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
            .main-content {
                position: relative;
                height: 100%;
            }
            .main-content.hidden {
                display: none;
            }
            .message-text {
                line-height: 1.5;
                width: 100%;
                box-sizing: border-box;
            }
            .message-text h1, .message-text h2, .message-text h3 {
                margin: 8px 0 4px 0;
                font-weight: 600;
                color: var(--vscode-foreground);
            }
            .message-text h1 {
                font-size: 18px;
            }
            .message-text h2 {
                font-size: 16px;
            }
            .message-text h3 {
                font-size: 14px;
            }
            .message-text p {
                margin: 4px 0;
            }
            .message-text strong {
                font-weight: 600;
            }
            .message-text em {
                font-style: italic;
            }
            .message-text .code-block {
                background-color: var(--vscode-textCodeBlock-background);
                border: 1px solid var(--vscode-textCodeBlock-border, var(--vscode-panel-border));
                border-radius: 4px;
                padding: 12px;
                margin: 8px 0;
                font-family: var(--vscode-editor-font-family, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
                font-size: 12px;
                overflow-x: auto;
                white-space: pre;
            }
            .message-text .code-block code {
                background: none;
                border: none;
                padding: 0;
                font-family: inherit;
                font-size: inherit;
            }
            .message-text .inline-code {
                background-color: var(--vscode-textCodeBlock-background);
                border: 1px solid var(--vscode-textCodeBlock-border, var(--vscode-panel-border));
                border-radius: 3px;
                padding: 2px 4px;
                font-family: var(--vscode-editor-font-family, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
                font-size: 11px;
            }
            .message-text br {
                content: '';
                display: block;
                margin: 4px 0;
            }
            .messages {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 140px; /* Leave space for input area (increased for better spacing) */
                padding: 10px;
                overflow-y: auto;
                overflow-x: hidden;
                box-sizing: border-box;
            }
            .input-container {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: var(--vscode-input-background);
                border-top: 1px solid var(--vscode-panel-border);
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .message {
                margin-bottom: 10px;
                padding: 8px 12px;
                border-radius: 4px;
                width: 100%;
                box-sizing: border-box;
            }
            .message.user {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                align-self: flex-end;
                margin-left: auto;
                max-width: 80%;
                align-self: flex-end;
            }
            .message.assistant {
                background: none;
                border: none;
                padding: 0;
            }
            .input-row {
                display: flex;
                align-items: flex-end;
                gap: 8px;
            }
            #questionInput {
                flex: 1;
                padding: 10px 14px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 6px;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                font-size: 14px;
                font-family: var(--vscode-font-family);
                resize: vertical;
                min-height: 60px;
                max-height: 120px;
                line-height: 1.4;
            }
            #questionInput:focus {
                outline: none;
                border-color: var(--vscode-focusBorder);
            }
            #askButton {
                margin-left: 10px;
                padding: 10px 18px;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
            }
            #askButton:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            #askButton:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .thinking-spinner {
                margin-left: 10px;
                color: var(--vscode-descriptionForeground);
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .spinner {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;

        const js = `
            (function() {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({ type: 'debug', message: 'Webview script started' });

                const questionInput = document.getElementById('questionInput');
                const askButton = document.getElementById('askButton');
                const messagesDiv = document.getElementById('messages');
                const settingsButton = document.getElementById('settingsButton');
                const settingsDiv = document.getElementById('settings');
                const saveSettingsButton = document.getElementById('saveSettings');
                const spinner = document.getElementById('spinner');
                const thinkingSpinner = document.getElementById('thinkingSpinner');
                const apiKeyInput = document.getElementById('apiKey');
                const dataPathInput = document.getElementById('dataPath');
                const contextInput = document.getElementById('context');
                const modelInput = document.getElementById('model');
                const browseDataPathButton = document.getElementById('browseDataPath');
                const browseDataPathButton = document.getElementById('browseDataPath');

                vscode.postMessage({ type: 'debug', message: 'Elements found: questionInput=' + !!questionInput + ', askButton=' + !!askButton + ', messagesDiv=' + !!messagesDiv });

                // Request settings on load
                vscode.postMessage({ type: 'requestSettings' });

                // Initially disable input until settings are loaded
                if (questionInput) questionInput.disabled = true;
                if (askButton) {
                    askButton.disabled = true;
                    askButton.textContent = 'Configure settings first';
                }

                console.log('Webview initialized, elements found:', {
                    questionInput: !!questionInput,
                    askButton: !!askButton,
                    messagesDiv: !!messagesDiv
                });

                // Add scroll listener for infinite scroll
                messagesDiv.addEventListener('scroll', () => {
                    if (messagesDiv.scrollTop === 0) {
                        vscode.postMessage({ type: 'loadMoreMessages' });
                    }
                });

                settingsButton.addEventListener('click', () => {
                    settingsDiv.style.display = settingsDiv.style.display === 'none' ? 'block' : 'none';
                });

                saveSettingsButton.addEventListener('click', () => {
                    const apiKey = apiKeyInput.value;
                    const dataPath = dataPathInput.value;
                    const context = contextInput.value;
                    const model = modelInput.value;
                    spinner.style.display = 'block';
                    saveSettingsButton.disabled = true;
                    vscode.postMessage({
                        type: 'updateSettings',
                        apiKey: apiKey,
                        dataPath: dataPath,
                        context: context,
                        model: model
                    });
                });

                if (browseDataPathButton) {
                    browseDataPathButton.addEventListener('click', () => {
                        vscode.postMessage({ type: 'openFileDialog' });
                    });
                }

                if (askButton) {
                    askButton.addEventListener('click', (e) => {
                        vscode.postMessage({ type: 'debug', message: 'Ask button clicked' });
                        console.log('Ask button clicked');
                        e.preventDefault();
                        const question = questionInput.value.trim();
                        if (!question) {
                            vscode.postMessage({ type: 'debug', message: 'No question provided' });
                            console.log('No question provided');
                            return;
                        }
                        vscode.postMessage({ type: 'debug', message: 'Sending question: ' + question });
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
                            // Load messages from database
                            if (message.messages && message.messages.length > 0) {
                                message.messages.forEach((msg: any) => {
                                    addMessage(msg.content, msg.type, msg.code, msg.explanation);
                                });
                            }
                            break;
                        case 'loadSettings':
                            if (message.settings) {
                                apiKeyInput.value = message.settings.apiKey || '';
                                dataPathInput.value = message.settings.dataPath || '';
                                contextInput.value = message.settings.context || '';
                                modelInput.value = message.settings.modelName || 'gemini-2.5-flash';

                                // Enable/disable input based on settings
                                const hasSettings = message.settings.apiKey && message.settings.dataPath && message.settings.hasSchema;
                                questionInput.disabled = !hasSettings;
                                askButton.disabled = !hasSettings;
                                askButton.textContent = hasSettings ? 'Ask' : 'Configure settings first';
                            } else {
                                // No settings found, disable input
                                questionInput.disabled = true;
                                askButton.disabled = true;
                                askButton.textContent = 'Configure settings first';
                            }
                            break;
                        case 'settingsUpdated':
                            spinner.style.display = 'none';
                            saveSettingsButton.disabled = false;
                            settingsDiv.style.display = 'none';

                            // Re-enable input after settings are saved
                            questionInput.disabled = false;
                            askButton.disabled = false;
                            askButton.style.display = 'block';
                            thinkingSpinner.style.display = 'none';
                            break;
                        case 'response':
                            console.log('Received response:', message);
                            addMessage('Generated code inserted into your editor:\\n\\n' + message.code, 'assistant');
                            askButton.disabled = false;
                            askButton.style.display = 'block';
                            thinkingSpinner.style.display = 'none';
                            break;
                        case 'fileSelected':
                            if (dataPathInput) {
                                dataPathInput.value = message.path;
                            }
                            break;
                        case 'error':
                            console.log('Received error:', message);
                            addMessage('Error: ' + message.message, 'assistant');
                            askButton.disabled = false;
                            askButton.style.display = 'block';
                            thinkingSpinner.style.display = 'none';
                            break;
                    }
                });
                questionInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        askButton.click();
                    }
                });
                function addMessage(text, type, code, explanation) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ' + type;

                    if (type === 'assistant' && code) {
                        // Create a collapsible code section
                        const summary = document.createElement('summary');
                        summary.textContent = explanation || 'Generated Code';
                        summary.style.cursor = 'pointer';
                        summary.style.fontWeight = 'bold';

                        const details = document.createElement('details');
                        details.appendChild(summary);

                        const codeBlock = document.createElement('pre');
                        codeBlock.textContent = code;
                        codeBlock.style.backgroundColor = 'var(--vscode-textCodeBlock-background)';
                        codeBlock.style.padding = '8px';
                        codeBlock.style.borderRadius = '4px';
                        codeBlock.style.marginTop = '5px';
                        codeBlock.style.fontSize = '12px';
                        codeBlock.style.overflow = 'auto';

                        details.appendChild(codeBlock);
                        messageDiv.appendChild(details);
                    } else {
                        messageDiv.textContent = text;
                    }

                    messagesDiv.appendChild(messageDiv);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            })();
        `;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' vscode-resource:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Inquira</title>
                <style>
                    html, body {
                        height: 100%;
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <span class="robot-icon">🤖</span>
                        <h3>Inquira</h3>
                        <div class="header-buttons">
                            <button id="schemaButton" title="View Schema">👁️</button>
                            <button id="settingsButton" title="Settings">⚙️</button>
                        </div>
                    </div>

                    <div id="settingsModal" class="modal">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h3>Settings</h3>
                                <button id="closeSettings" class="close-button" title="Close">×</button>
                            </div>
                            <form class="settings-form">
                                <div class="form-group">
                                    <label for="apiKey">Google Gemini API Key</label>
                                    <input type="password" id="apiKey" placeholder="Enter your API key" />
                                </div>
                                <div class="form-group">
                                    <label for="dataPath">Data File Path</label>
                                    <div style="display: flex; gap: 8px;">
                                        <input type="text" id="dataPath" placeholder="/path/to/your/data.csv" style="flex: 1;" />
                                        <button type="button" id="browseDataPath" class="btn btn-secondary" style="padding: 8px 12px;">Browse</button>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="context">Data Context (Optional)</label>
                                    <textarea id="context" placeholder="Describe your data..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="model">Model</label>
                                    <select id="model">
                                        <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                                        <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                                    </select>
                                </div>
                                <div class="button-group">
                                    <button type="button" id="cancelSettings" class="btn btn-secondary">Cancel</button>
                                    <button type="submit" id="saveSettings" class="btn btn-primary">Save Settings</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div id="mainContent" class="main-content">
                        <div id="messages" class="messages"></div>
                        <div class="input-container">
                            <textarea id="questionInput" placeholder="Ask a question about your data..." rows="3"></textarea>
                            <div class="input-row">
                                <button id="askButton">Ask ➤</button>
                                <div id="thinkingSpinner" class="thinking-spinner" style="display: none;">
                                    <span class="spinner">⏳</span> Assistant is thinking...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>${css}</style>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}