import * as vscode from 'vscode';
import * as cp from 'child_process';
import { isCommandAvailable, isExecutableFileAvailable } from '../utils';

export const textprotoFormatProvider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        const formatOption = vscode.workspace.getConfiguration('textproto.format');
        if (formatOption.get('provider', "txtpbfmt") === "txtpbfmt") {
            return formatUsingTxtpbfmt(document);
        }

        vscode.window.showErrorMessage(`Unknown format provider: ${formatOption.get('provider')}`);
        return [];
    },
};

function formatUsingTxtpbfmt(document: vscode.TextDocument): vscode.TextEdit[] {
    const txtpbfmtOption = vscode.workspace.getConfiguration('textproto.txtpbfmt');
    const txtpbfmtPath = txtpbfmtOption.get('executable', 'txtpbfmt');

    if (!(isCommandAvailable(txtpbfmtPath) || isExecutableFileAvailable(txtpbfmtPath))) {
        vscode.window.showErrorMessage(`txtpbfmt (path: ${txtpbfmtPath}) executable not found.\nCheck your PATH or install txtpbfmt.\nYou can install it with following instructions: https://github.com/protocolbuffers/txtpbfmt`);
        return [];
    }

    let args: string[] = [];
    txtpbfmtOption.get('arguments', []).forEach((arg: string) => {
        args.push(arg);
    });

    let formatResult = cp.execFileSync(txtpbfmtPath, args, {input: document.getText()});
    return [new vscode.TextEdit(
        new vscode.Range(0, 0, document.lineCount, document.lineAt(document.lineCount - 1).text.length),
        formatResult.toString(),
    )];
}
