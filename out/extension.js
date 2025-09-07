"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const InquiraViewProvider_1 = require("./providers/InquiraViewProvider");
function activate(context) {
    console.log('Inquira extension is now active!');
    // Register the webview provider for the side panel
    const provider = new InquiraViewProvider_1.InquiraViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(InquiraViewProvider_1.InquiraViewProvider.viewType, provider));
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('inquira.showView', () => {
        vscode.commands.executeCommand('workbench.view.explorer');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('inquira.openSettings', () => {
        provider.openSettings();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('inquira.generateSchema', async () => {
        await provider.generateSchema();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('inquira.viewSchema', () => {
        provider.viewSchema();
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map