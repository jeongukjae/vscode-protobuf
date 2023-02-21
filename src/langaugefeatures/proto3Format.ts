import * as vscode from 'vscode';
import * as os from 'os';
import * as cp from 'child_process';
import { isCommandAvailable, isExecutableFileAvailable } from '../utils';

export const proto3FormatProvider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        const formatOption = vscode.workspace.getConfiguration('protobuf3.format');
        if (formatOption.get('provider') === "clang-format") {
            return formatUsingClangFormat(document);
        } else if (formatOption.get('provider') === "buf") {
            return formatUsingBuf(document);
        }

        vscode.window.showErrorMessage(`Unknown format provider: ${formatOption.get('provider')}`);
        return [];
    },
};

function formatUsingClangFormat(document: vscode.TextDocument): vscode.TextEdit[] {
    const clangFormatOption = vscode.workspace.getConfiguration('protobuf3.clang-format');
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

function formatUsingBuf(document: vscode.TextDocument): vscode.TextEdit[] {
    const bufOption = vscode.workspace.getConfiguration('protobuf3.buf');
    const bufPath = bufOption.get('executable', 'buf');

    if (!(isCommandAvailable(bufPath) || isExecutableFileAvailable(bufPath))) {
        vscode.window.showErrorMessage(`buf (path: ${bufPath}) executable not found.\nCheck your PATH or install buf.\nYou can install it with following instructions: https://docs.buf.build/installation`);
        return [];
    }

    let args = ["format"];
    // TODO: arguments?

    let cwd = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
    if (!cwd) {
        cwd = os.tmpdir();
    }
    let formatResult = cp.execFileSync(bufPath, args, {input: document.getText(), cwd: cwd});
    return [new vscode.TextEdit(
        new vscode.Range(0, 0, document.lineCount, document.lineAt(document.lineCount - 1).text.length),
        formatResult.toString(),
    )];
}
