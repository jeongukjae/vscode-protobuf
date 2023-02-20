import * as vscode from 'vscode';
import * as cp from 'child_process';
import { isCommandAvailable, isExecutableFileAvailable } from '../utils';

export const proto3FormatProvider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        const formatOption = vscode.workspace.getConfiguration('protobuf.format');
        if (formatOption.get('provider', "clang-format") === "clang-format") {
            return formatUsingClangFormat(document);
        }

        vscode.window.showErrorMessage(`Unknown format provider: ${formatOption.get('provider')}`);
        return [];
    },
};

function formatUsingClangFormat(document: vscode.TextDocument): vscode.TextEdit[] {
    const clangFormatOption = vscode.workspace.getConfiguration('protobuf.clang-format');
    const clangFormatPath = clangFormatOption.get('executable', 'clang-format');

    if (!(isCommandAvailable(clangFormatPath) || isExecutableFileAvailable(clangFormatPath))) {
        vscode.window.showErrorMessage(`clang-format (path: ${clangFormatPath}) executable not found.\nCheck your PATH or install clang-format.\nYou can install it with apt, homebrew or other package managers.`);
        return [];
    }

    // clang-format assumes the filename to determine the language.
    let args = [
        '--assume-filename=a.proto',
    ];
    clangFormatOption.get('arguments', []).forEach((arg: string) => {
        args.push(arg);
    });

    let formatResult = cp.execFileSync(clangFormatPath, args, {input: document.getText()});
    return [new vscode.TextEdit(
        new vscode.Range(0, 0, document.lineCount, document.lineAt(document.lineCount - 1).text.length),
        formatResult.toString(),
    )];
}
