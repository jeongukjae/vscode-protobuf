import * as vscode from 'vscode';
import * as os from 'os';
import * as cp from 'child_process';
import * as path from 'path';
import { isCommandAvailable, isExecutableFileAvailable } from '../utils';

export const doProto3Diagnostic = (document: vscode.TextDocument, diag: vscode.DiagnosticCollection) => {
    const protoCompilerOption = vscode.workspace.getConfiguration('protobuf3.compiler');
    const protoCompiler = protoCompilerOption.get('provider');

    if (protoCompiler === 'protoc') {
        compileTempWithProtoc(document, diag);
    } else if (protoCompiler === 'buf') {
        compileTempWithBuf(document, diag);
    } else {
        vscode.window.showErrorMessage(`Unknown proto compiler: ${protoCompiler}`);
    }
};

function compileTempWithProtoc(document: vscode.TextDocument, diag: vscode.DiagnosticCollection) {
    // Slightly modified from https://github.com/zxh0/vscode-proto3/blob/master/src/proto3Diagnostic.ts
    // Big thanks to zxh0 for the original code!
    const protocOption = vscode.workspace.getConfiguration('protobuf3.protoc');
    const protocPath = protocOption.get('executable', 'protoc');

    if (!(isCommandAvailable(protocPath) || isExecutableFileAvailable(protocPath))) {
        vscode.window.showErrorMessage(`protoc (path: ${protocPath}) executable not found.\nCheck your PATH or install protoc.`);
        return;
    }

    let args = [];
    protocOption.get('arguments', []).forEach((arg: string) => {
        args.push(arg);
    });

    args.push(`--cpp_out=${os.tmpdir()}`);

    if (args.filter((arg) => arg.indexOf('-I') !== -1 || arg.indexOf('--proto_path') !== -1).length === 0) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (workspaceFolder) {
            args.push(`-I${workspaceFolder.uri.fsPath}`);
        }
    }

    args.push(document.fileName);
    let result = cp.spawnSync(protocPath, args);
    if (result.status === 0 || result.stderr.toString().length === 0) {
        return; // no error
    }

    let stderr = result.stderr.toString();
    let shortFileName = path.parse(document.fileName).name;
    const diagnostics: vscode.Diagnostic[] = stderr.split('\n')
        .filter(line => line.includes(shortFileName))
        .map((lineString) => protocErrorToDiagnostic(document, lineString))
        .filter((diag): diag is vscode.Diagnostic => diag !== null);

    diag.set(document.uri, diagnostics);
}

function compileTempWithBuf(document: vscode.TextDocument, diag: vscode.DiagnosticCollection) {
    const bufOption = vscode.workspace.getConfiguration('protobuf3.buf');
    const bufPath = bufOption.get('executable', 'buf');

    if (!(isCommandAvailable(bufPath) || isExecutableFileAvailable(bufPath))) {
        vscode.window.showErrorMessage(`buf (path: ${bufPath}) executable not found.\nCheck your PATH or install buf.`);
        return;
    }

    let args = ["lint"];
    bufOption.get('arguments', []).forEach((arg: string) => {
        args.push(arg);
    });

    args.push(document.fileName + "#include_package_files=true");
    args.push("--error-format=json");

    let cwd = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
    if (!cwd) {
        cwd = os.tmpdir();
    }

    let result = cp.spawnSync(bufPath, args, { cwd: cwd, encoding: "utf-8" });
    if (result.error !== undefined) {
        vscode.window.showErrorMessage(`buf (path: ${bufPath}) failed to run.\n${result.error.message}`);
        return;
    }
    if (result.status !== null && result.status === 0) {
        return;
    }

    const diagnostics: vscode.Diagnostic[] = result.stdout.trim()
        .split("\n")
        .map((lineString) => JSON.parse(lineString))
        .map((line) => bufErrorToDiagnostic(document, line))
        .filter((diag): diag is vscode.Diagnostic => diag !== null);

    diag.set(document.uri, diagnostics);
}

function protocErrorToDiagnostic(doc: vscode.TextDocument, errline: string): vscode.Diagnostic|null {
    let errorInfo = errline.match(/\w+\.proto:(\d+):(\d+):\s*(.*)/);
    if (!errorInfo) {
        return null;
    }
    let startLine = parseInt(errorInfo[1]) - 1;
    let startCol = parseInt(errorInfo[2]) - 1;

    // protoc calculates tab width (eight spaces) and returns colunm number.
    let line = doc.lineAt(startLine);
    let startChar = 0;
    let col = 0;
    for(var c of line.text) {
        col += ( c === "\t" ? (8 - col % 8): 1 );
        if( col >= startCol ) {
            break;
        }
        startChar += 1;
    }
    let endChar = line.text.length;
    let tokenEnd = line.text.substring(startChar).match(/[\s;{}\[\],<>()=]/);
    if (tokenEnd !== undefined && tokenEnd !== null && tokenEnd.index !== undefined) {
        endChar = startChar + tokenEnd.index;
    }
    let range = new vscode.Range(startLine, startChar, startLine, endChar);
    let msg = errorInfo[3];
    return new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error);
}

/* eslint-disable @typescript-eslint/naming-convention */
interface BufError {
    path: string;
    start_line: number;
    start_column: number;
    end_line: number;
    end_column: number;
    type: string;
    message: string;
}

function bufErrorToDiagnostic(doc: vscode.TextDocument, err: BufError): vscode.Diagnostic|null {
    let [startLine, startCol] = [err.start_line - 1, err.start_column - 1];
    let [endLine, endCol] = [err.end_line - 1, err.end_column - 1];

    if (endLine === startLine) {
        let line = doc.lineAt(startLine);
        endCol = line.text.length;
        let tokenEnd = line.text.substring(startCol).match(/[\s;{}\[\],<>()=]/);
        if (tokenEnd !== undefined && tokenEnd !== null && tokenEnd.index !== undefined) {
            endCol = startCol + tokenEnd.index;
        }
    }
    let range = new vscode.Range(startLine, startCol, endLine, endCol);
    return new vscode.Diagnostic(range, err.message, vscode.DiagnosticSeverity.Error);
}
