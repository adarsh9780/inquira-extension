import * as vscode from 'vscode';

export class CodeInjector {
    public async insertCode(code: string): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;

        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const document = activeEditor.document;
        const languageId = document.languageId;

        if (languageId === 'python') {
            await this.insertIntoPythonFile(activeEditor, code);
        } else if (languageId === 'jupyter') {
            await this.insertIntoJupyterNotebook(activeEditor, code);
        } else {
            vscode.window.showErrorMessage('Unsupported file type. Please open a Python file or Jupyter notebook.');
        }
    }

    private async insertIntoPythonFile(editor: vscode.TextEditor, code: string): Promise<void> {
        const document = editor.document;
        const lastLine = document.lineCount - 1;
        const lastLineText = document.lineAt(lastLine).text;

        // Insert code at the end of the file
        const position = new vscode.Position(lastLine, lastLineText.length);
        const edit = new vscode.TextEdit(
            new vscode.Range(position, position),
            '\n\n' + code
        );

        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);

        // Move cursor to the inserted code
        const newPosition = new vscode.Position(lastLine + 2, 0);
        editor.selection = new vscode.Selection(newPosition, newPosition);
        editor.revealRange(new vscode.Range(newPosition, newPosition));
    }

    private async insertIntoJupyterNotebook(editor: vscode.TextEditor, code: string): Promise<void> {
        // For Jupyter notebooks, we need to use the notebook API
        const notebook = vscode.workspace.notebookDocuments.find(
            doc => doc.uri.toString() === editor.document.uri.toString()
        );

        if (!notebook) {
            vscode.window.showErrorMessage('Could not find notebook document');
            return;
        }

        // Get the active cell or the last cell
        let targetCellIndex = notebook.cellCount - 1;

        // Insert a new cell below the target cell
        const newCellIndex = targetCellIndex + 1;
        const cellData = new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            code,
            'python'
        );

        const edit = vscode.NotebookEdit.insertCells(newCellIndex, [cellData]);

        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(notebook.uri, [edit]);
        await vscode.workspace.applyEdit(workspaceEdit);

        // Focus on the new cell
        if (notebook.cellCount > newCellIndex) {
            const newCell = notebook.cellAt(newCellIndex);
            if (newCell) {
                await vscode.window.showTextDocument(newCell.document, {
                    selection: new vscode.Range(0, 0, 0, 0)
                });
            }
        }
    }
}