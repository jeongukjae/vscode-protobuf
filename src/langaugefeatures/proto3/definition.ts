import * as vscode from "vscode";

import {
  DocumentNode,
  FieldNode,
  ImportNode,
  Node,
  NodeType,
} from "../../parser/proto3/nodes";
import { primitiveTypeMap } from "../../parser/proto3/tokens";
import { parseProto3 } from "../../parsercache";
import { proto3Index } from "../../proto3Index";

export const proto3DefinitionProvider: vscode.DefinitionProvider = {
  provideDefinition: (
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DefinitionLink[]> => {
    let parseResult: DocumentNode;

    try {
      parseResult = parseProto3(document);
    } catch (e) {
      vscode.window.showErrorMessage("cannot parse proto3 file.");
      return undefined;
    }

    const targetRange = document.getWordRangeAtPosition(position);
    if (targetRange === undefined) {
      return undefined;
    }

    const targetOffset =
      (document.offsetAt(targetRange.start) +
        document.offsetAt(targetRange.end)) /
      2;
    let node = findNodeContainingOffset(parseResult, targetOffset);
    if (node === undefined) {
      return undefined;
    }
    switch (node.type) {
      case NodeType.import:
        let iptNode = node as ImportNode;
        return findImportDefinition(iptNode);
      case NodeType.field:
        let fieldNode = node as FieldNode;
        return findFieldDefinition(document, parseResult, fieldNode.dtype);
      // TODO: find option definition.
    }

    return;
  },
};

const findNodeContainingOffset = (
  node: Node,
  offset: number
): Node | undefined => {
  if (node.start < offset && offset < node.end) {
    if (node.children) {
      for (const child of node.children) {
        let res = findNodeContainingOffset(child, offset);
        if (res !== undefined) {
          return res;
        }
      }
    }

    return node;
  }

  return undefined;
};

const findImportDefinition = (
  node: ImportNode
): vscode.ProviderResult<vscode.DefinitionLink[]> => {
  return vscode.workspace
    .findFiles("**/" + node.getImportPath())
    .then((uris) => {
      if (uris.length === 0) {
        return [];
      }

      return uris.map((uri) => {
        return {
          targetUri: uri,
          targetRange: new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
          ),
        };
      });
    });
};

const findFieldDefinition = (
  document: vscode.TextDocument,
  documentNode: DocumentNode,
  dtype: string
): Promise<vscode.DefinitionLink[]> | undefined => {
  if (dtype in primitiveTypeMap) {
    // it is a primitive type, do nothing.
    return;
  } else if (/map<.*?,.*?>/.test(dtype)) {
    // extract the key and value type.
    let matched = dtype.match(/map<(.+?),(.+?)>/);
    if (matched === null) {
      return;
    }

    let keyType = matched[1].trim();
    let valueType = matched[2].trim();

    return Promise.all([
      findFieldDefinition(document, documentNode, keyType),
      findFieldDefinition(document, documentNode, valueType),
    ]).then((resolved) => {
      let result: vscode.LocationLink[] = [];

      for (const item of resolved) {
        if (item !== undefined) {
          result = result.concat(item);
        }
      }

      return result;
    });
  }

  let pkgs: string[] = [];
  let typeName: string;
  if (!dtype.includes(".")) {
    let pkg_ = documentNode.getPackage();
    if (pkg_ === undefined) {
      vscode.window.showWarningMessage(
        "Cannot find package name in the proto file."
      );
      return;
    }
    pkgs = [pkg_.name];
    typeName = dtype;
  } else {
    let names = dtype.split(".");

    typeName = dtype;
    let basePkgNameParts = documentNode.getPackage()?.name.split(".") ?? [];

    if (names.length > 1) {
      typeName = names[names.length - 1];

      // NOTE: when basePkgNameParts is [a, b, c], and names [d, e, f],
      // we should find [a, b, c, d, e], [a, b, d, e], [a, d, e], and [d, e].
      // (f is the type name)
      for (let i = basePkgNameParts.length; i >= 0; i--) {
        let pkgNameParts = basePkgNameParts
          .slice(0, i)
          .concat(names.slice(0, names.length - 1));
        pkgs.push(pkgNameParts.join("."));
      }
    }
  }

  return findAllAccessiblePaths(document).then((paths) =>
    pkgs
      .map((pkg) =>
        proto3Index
          .findMsgOrEnum(pkg, typeName)
          .filter((def) => paths.has(def.link.targetUri.fsPath))
          .map((def) => def.link)
      )
      .flat()
  );
};

const findAllAccessiblePaths = async (
  doc: vscode.TextDocument
): Promise<Set<string>> => {
  let paths: Set<string> = new Set();
  paths.add(doc.uri.fsPath);

  let currentPath = proto3Index.listImports(doc.uri);
  const iterate = async (paths: Set<string>, currentPath: string[]) => {
    for (const path of currentPath) {
      let files = await vscode.workspace.findFiles("**/" + path);

      for (const file of files) {
        if (paths.has(file.fsPath)) {
          continue;
        }
        paths.add(file.fsPath);
        let currentPath = proto3Index.listImports(file);
        await iterate(paths, currentPath);
      }
    }
  };

  await iterate(paths, currentPath);
  return paths;
};
