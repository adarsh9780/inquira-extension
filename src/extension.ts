import * as vscode from 'vscode';
import { InquiraViewProvider } from './providers/InquiraViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Inquira extension is now active!');

    // Register the webview provider for the side panel
    const provider = new InquiraViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(InquiraViewProvider.viewType, provider)
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('inquira.showView', () => {
            vscode.commands.executeCommand('workbench.view.explorer');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('inquira.openSettings', () => {
            provider.openSettings();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('inquira.generateSchema', async () => {
            await provider.generateSchema();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('inquira.viewSchema', () => {
            provider.viewSchema();
        })
    );
}

export function deactivate() {}