import * as crypto from "crypto";
import * as vscode from "vscode";

import { DocumentNode } from "./parser/nodes";
import { Proto3Parser } from "./parser/parser";

interface Proto3Document {
  hash: string;
  result: DocumentNode;
}

const parser = new Proto3Parser();

const proto3Cache = new Map<string, Proto3Document>();

export const parseProto3 = (doc: vscode.TextDocument): DocumentNode => {
  const text = doc.getText();
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  const cache = proto3Cache.get(doc.uri.toString());

  if (cache && cache.hash === hash) {
    return cache.result;
  }

  const result = parser.parse(text);
  proto3Cache.set(doc.uri.toString(), { hash, result });
  return result;
};
