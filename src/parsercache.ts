import * as crypto from "crypto";
import * as vscode from "vscode";

import * as proto3Node from "./parser/proto3/nodes";
import { Proto3Parser } from "./parser/proto3/parser";
import * as textProtoNode from "./parser/textproto/nodes";
import { TextProtoParser } from "./parser/textproto/parser";

interface Proto3Document {
  hash: string;
  result: proto3Node.DocumentNode;
}

interface TextProtoDocument {
  hash: string;
  result: textProtoNode.DocumentNode;
}

const proto3Parser = new Proto3Parser();
const textProtoParser = new TextProtoParser();

const proto3Cache = new Map<string, Proto3Document>();
const textProtoCache = new Map<string, TextProtoDocument>();

export const parseProto3 = (
  doc: vscode.TextDocument
): proto3Node.DocumentNode => {
  const text = doc.getText();
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  const cache = proto3Cache.get(doc.uri.toString());

  if (cache && cache.hash === hash) {
    return cache.result;
  }

  const result = proto3Parser.parse(text);
  proto3Cache.set(doc.uri.toString(), { hash, result });
  return result;
};

export const parseTextProto = (
  doc: vscode.TextDocument
): textProtoNode.DocumentNode => {
  const text = doc.getText();
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  const cache = textProtoCache.get(doc.uri.toString());

  if (cache && cache.hash === hash) {
    return cache.result;
  }

  const result = textProtoParser.parse(text);
  textProtoCache.set(doc.uri.toString(), { hash, result });
  return result;
};
