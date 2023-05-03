import * as cp from "child_process";
import * as os from "os";
import * as path from "path";
import { TextEncoder } from "util";
import * as vscode from "vscode";

import { isCommandAvailable, isExecutableFileAvailable } from "../../utils";

export const proto3FormatProvider: vscode.DocumentFormattingEditProvider = {
  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    // TODO: support cancellation?
    const formatOption = vscode.workspace.getConfiguration("protobuf3.format");
    const provider = formatOption.get("provider", "clang-format");
    if (provider === "clang-format") {
      return formatUsingClangFormat(document);
    } else if (provider === "buf") {
      return formatUsingBuf(document);
    }

    vscode.window.showErrorMessage(`Unknown format provider: ${provider}`);
    return null;
  },
};

function formatUsingClangFormat(
  document: vscode.TextDocument
): vscode.TextEdit[] {
  const clangFormatOption = vscode.workspace.getConfiguration(
    "protobuf3.clang-format"
  );
  const clangFormatPath = clangFormatOption.get("executable", "clang-format");

  if (
    !(
      isCommandAvailable(clangFormatPath) ||
      isExecutableFileAvailable(clangFormatPath)
    )
  ) {
    vscode.window.showErrorMessage(
      `clang-format (path: ${clangFormatPath}) executable not found.\n` +
        `Check your PATH or install clang-format.\n` +
        `You can install it with apt, homebrew or other package managers.`
    );
    return [];
  }

  // clang-format assumes the filename to determine the language.
  let args = ["--assume-filename=a.proto"];
  clangFormatOption.get("arguments", []).forEach((arg: string) => {
    args.push(arg);
  });

  let formatResult = cp.execFileSync(clangFormatPath, args, {
    input: document.getText(),
  });
  return [
    new vscode.TextEdit(
      new vscode.Range(
        0,
        0,
        document.lineCount,
        document.lineAt(document.lineCount - 1).text.length
      ),
      formatResult.toString()
    ),
  ];
}

async function formatUsingBuf(
  document: vscode.TextDocument
): Promise<vscode.TextEdit[]> {
  const bufOption = vscode.workspace.getConfiguration("protobuf3.buf");
  const bufPath = bufOption.get("executable", "buf");

  if (!(isCommandAvailable(bufPath) || isExecutableFileAvailable(bufPath))) {
    vscode.window.showErrorMessage(
      `buf (path: ${bufPath}) executable not found.\n` +
        `Check your PATH or install buf.\n` +
        `You can install it with following instructions: ` +
        `https://docs.buf.build/installation`
    );
    return [];
  }

  let args = ["format"];
  bufOption.get("arguments", []).forEach((arg: string) => {
    args.push(arg);
  });

  let cwd = path.join(os.tmpdir(), "buf-format-" + getRandomID());

  let inputFile = vscode.Uri.file(
    path.join(cwd, "sample-" + getRandomID() + ".proto")
  );
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(cwd));
  await vscode.workspace.fs.writeFile(
    inputFile,
    new TextEncoder().encode(document.getText())
  );
  let inputPath = inputFile.fsPath;

  let formatResult = cp.execFileSync(bufPath, args, {
    input: inputPath,
    cwd: cwd,
  });

  // TODO: error handling
  return [
    new vscode.TextEdit(
      new vscode.Range(
        0,
        0,
        document.lineCount,
        document.lineAt(document.lineCount - 1).text.length
      ),
      formatResult.toString()
    ),
  ];
}

function getRandomID(): string {
  return Math.floor(Math.random() * 100000000).toString();
}
