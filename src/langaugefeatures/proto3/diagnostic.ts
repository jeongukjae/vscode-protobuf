import * as cp from "child_process";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import { isCommandAvailable, isExecutableFileAvailable } from "../../utils";

// Generate a diagnostic from following steps.
// 1. Try to compile the proto file.
// 2. Try to run linter on the proto file.
export const doProto3Diagnostic = (
  document: vscode.TextDocument,
  diag: vscode.DiagnosticCollection
) => {
  let diagnostics = doCompilerDiagnostic(document);
  let result = diagnostics.concat(doLinterDiagnostic(document));
  diag.set(document.uri, result);
};

const doCompilerDiagnostic = (
  document: vscode.TextDocument
): vscode.Diagnostic[] => {
  const protoCompilerOption =
    vscode.workspace.getConfiguration("protobuf3.compiler");
  const protoCompiler = protoCompilerOption.get("provider", "protoc");

  if (protoCompiler === "protoc") {
    return compileTempWithProtoc(document);
  }
  if (protoCompiler === "buf") {
    return lintWithBuf(document);
  }

  vscode.window.showErrorMessage(`Unknown proto compiler: ${protoCompiler}`);
  return [];
};

const doLinterDiagnostic = (
  document: vscode.TextDocument
): vscode.Diagnostic[] => {
  const protoCompilerOption =
    vscode.workspace.getConfiguration("protobuf3.compiler");
  const protoCompiler = protoCompilerOption.get("provider");

  const apiLinterOption = vscode.workspace.getConfiguration(
    "protobuf3.api-linter"
  );
  let result: vscode.Diagnostic[] = [];
  if (apiLinterOption.get("enabled", false)) {
    result = lintWithApiLinter(document);
  }

  const bufOption = vscode.workspace.getConfiguration("protobuf3.buf");
  if (bufOption.get("lint.enabled", false)) {
    if (protoCompiler !== "buf") {
      // buf linter is already run in the compiler step.
      result = result.concat(lintWithBuf(document));
    }
    return result;
  }

  return result;
};

function compileTempWithProtoc(
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  // Slightly modified from
  // https://github.com/zxh0/vscode-proto3/blob/master/src/proto3Diagnostic.ts
  // Big thanks to zxh0 for the original code!
  const protocOption = vscode.workspace.getConfiguration("protobuf3.protoc");
  const protocPath = protocOption.get("executable", "protoc");

  if (
    !(isCommandAvailable(protocPath) || isExecutableFileAvailable(protocPath))
  ) {
    vscode.window.showErrorMessage(
      `protoc (path: ${protocPath}) executable not found.\n` +
        `Check your PATH or install protoc.`
    );
    return [];
  }

  let args: string[] = [];
  protocOption.get("arguments", []).forEach((arg: string) => {
    args.push(arg);
  });

  args.push(`--cpp_out=${os.tmpdir()}`);

  if (
    args.filter(
      (arg) => arg.indexOf("-I") !== -1 || arg.indexOf("--proto_path") !== -1
    ).length === 0
  ) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (workspaceFolder) {
      args.push(`-I${workspaceFolder.uri.fsPath}`);
    }
  }

  args.push(document.fileName);
  let result = cp.spawnSync(protocPath, args);
  if (result.status === 0 || result.stderr.toString().length === 0) {
    return []; // no error
  }

  let stderr = result.stderr.toString();
  let shortFileName = path.parse(document.fileName).name;
  const diagnostics: vscode.Diagnostic[] = stderr
    .split("\n")
    .filter((line) => line.includes(shortFileName))
    .map((lineString) => protocErrorToDiagnostic(document, lineString))
    .filter((diag): diag is vscode.Diagnostic => diag !== null);

  return diagnostics;
}

function protocErrorToDiagnostic(
  doc: vscode.TextDocument,
  errline: string
): vscode.Diagnostic | null {
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
  for (var c of line.text) {
    col += c === "\t" ? 8 - (col % 8) : 1;
    if (col > startCol) {
      break;
    }
    startChar += 1;
  }
  let endChar = line.text.length;
  let tokenEnd = line.text.substring(startChar).match(/[\s;{}\[\],<>()=]/);
  if (
    tokenEnd !== undefined &&
    tokenEnd !== null &&
    tokenEnd.index !== undefined
  ) {
    endChar = startChar + tokenEnd.index;
  }
  let range = new vscode.Range(startLine, startChar, startLine, endChar);
  let msg = `protoc: ${errorInfo[3]}`;
  return new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Warning);
}

function lintWithBuf(document: vscode.TextDocument): vscode.Diagnostic[] {
  const bufOption = vscode.workspace.getConfiguration("protobuf3.buf");
  const bufPath = bufOption.get("executable", "buf");

  if (!(isCommandAvailable(bufPath) || isExecutableFileAvailable(bufPath))) {
    vscode.window.showErrorMessage(
      `buf (path: ${bufPath}) executable not found.\n` +
        `Check your PATH or install buf.`
    );
    return [];
  }

  let args = ["lint"];
  bufOption.get("arguments", []).forEach((arg: string) => {
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
    vscode.window.showErrorMessage(
      `buf (path: ${bufPath}) failed to run.\n${result.error.message}`
    );
    return [];
  }
  if (result.status !== null && result.status === 0) {
    return [];
  }

  const diagnostics: vscode.Diagnostic[] = result.stdout
    .trim()
    .split("\n")
    .map((lineString) => JSON.parse(lineString))
    .map((line) => bufErrorToDiagnostic(document, line))
    .filter((diag): diag is vscode.Diagnostic => diag !== null);

  return diagnostics;
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

function bufErrorToDiagnostic(
  doc: vscode.TextDocument,
  err: BufError
): vscode.Diagnostic | null {
  let [startLine, startCol] = [err.start_line - 1, err.start_column - 1];
  let [endLine, endCol] = [err.end_line - 1, err.end_column - 1];

  if (endLine === startLine) {
    let line = doc.lineAt(startLine);
    endCol = line.text.length;
    let tokenEnd = line.text.substring(startCol).match(/[\s;{}\[\],<>()=]/);
    if (
      tokenEnd !== undefined &&
      tokenEnd !== null &&
      tokenEnd.index !== undefined
    ) {
      endCol = startCol + tokenEnd.index;
    }
  }
  let range = new vscode.Range(startLine, startCol, endLine, endCol);
  return new vscode.Diagnostic(
    range,
    `buf: ${err.message}`,
    vscode.DiagnosticSeverity.Warning
  );
}

function lintWithApiLinter(document: vscode.TextDocument): vscode.Diagnostic[] {
  const apiLinterOption = vscode.workspace.getConfiguration(
    "protobuf3.api-linter"
  );
  const apiLinterPath = apiLinterOption.get("executable", "api-linter");

  if (
    !(
      isCommandAvailable(apiLinterPath) ||
      isExecutableFileAvailable(apiLinterPath)
    )
  ) {
    vscode.window.showErrorMessage(
      `api-linter (path: ${apiLinterPath}) executable not found.\n` +
        `Check your PATH or install api-linter.\n` +
        `See https://linter.aip.dev for more information.`
    );
    return [];
  }

  let args: string[] = [];
  apiLinterOption.get("arguments", []).forEach((arg: string) => {
    args.push(arg);
  });

  args.push("--output-format=json");
  args.push(document.fileName);
  let cwd = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
  if (!cwd) {
    cwd = os.tmpdir();
  }

  let result = cp.spawnSync(apiLinterPath, args, {
    cwd: cwd,
    encoding: "utf-8",
  });

  let diagnostics: vscode.Diagnostic[] = [];
  try {
    // TODO: Filter with file_path?
    diagnostics = JSON.parse(result.stdout)
      .flatMap((item: ApiLinterError) => item.problems)
      .map((problem: ApiLinterProblem) => {
        let range = new vscode.Range(
          problem.location.start_position.line_number - 1,
          problem.location.start_position.column_number - 1,
          problem.location.end_position.line_number - 1,
          problem.location.end_position.column_number - 1
        );

        let messsage = `api-linter: ${problem.message}`;
        return new vscode.Diagnostic(
          range,
          messsage,
          vscode.DiagnosticSeverity.Warning
        );
      });
  } catch (e) {
    // If the output is not JSON, it should be a parse error.
    // And the error message should be shown from the compiler diagnostics.
  }

  return diagnostics;
}

interface ApiLinterError {
  file_path: string;
  problems: ApiLinterProblem[];
}

interface ApiLinterProblem {
  message: string;
  location: {
    start_position: {
      line_number: number;
      column_number: number;
    };
    end_position: {
      line_number: number;
      column_number: number;
    };
  };

  rule_id: string;
  rule_doc_uri: string;
}
