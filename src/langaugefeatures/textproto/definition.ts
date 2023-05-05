// import * as vscode from "vscode";

// import * as proto3Nodes from "../../parser/proto3/nodes";
// import * as textProtoNodes from "../../parser/textproto/nodes";
// import { parseProto3, parseTextProto } from "../../parsercache";

// export const textprotoDefinitionProvider: vscode.DefinitionProvider = {
//   provideDefinition: (
//     document: vscode.TextDocument,
//     position: vscode.Position,
//     token: vscode.CancellationToken
//   ): vscode.ProviderResult<vscode.DefinitionLink[]> => {
//     let parseResult: textProtoNodes.DocumentNode;

//     try {
//       parseResult = parseTextProto(document);
//     } catch (e) {
//       vscode.window.showErrorMessage("cannot parse textproto file.");
//       return undefined;
//     }

//     let [path, message] = parseHeader(document, parseResult);
//     if (path === undefined || message === undefined) {
//       return undefined;
//     }

//     const targetRange = document.getWordRangeAtPosition(position);
//     if (targetRange === undefined) {
//       return undefined;
//     }

//     const targetOffset =
//       (document.offsetAt(targetRange.start) +
//         document.offsetAt(targetRange.end)) /
//       2;
//     let node = findNodeContainingOffset(parseResult, targetOffset);
//     if (node === undefined) {
//       return undefined;
//     }
//     switch (node.type) {
//       case textProtoNodes.NodeType.field:
//         let fieldNode = node as textProtoNodes.ValueNode;

//         let namePath = [];
//         let current = fieldNode;
//         while (
//           current.parent !== undefined &&
//           current.parent.type === textProtoNodes.NodeType.field
//         ) {
//           namePath.push(current.name);
//           current = current.parent as textProtoNodes.ValueNode;
//         }
//         namePath = namePath.reverse();

//         return findProtoMessage(path, message, namePath);
//     }

//     return;
//   },
// };

// // to find definition to protobuf file, text format should have comment like
// // # proto-file: some/proto/my_file.proto
// // # proto-message: MyMessage
// const parseHeader = (
//   document: vscode.TextDocument,
//   docNode: textProtoNodes.DocumentNode
// ): [string | undefined, string | undefined] => {
//   let path: string | undefined;
//   let message: string | undefined;

//   for (const child of docNode.children || []) {
//     if (child.type !== textProtoNodes.NodeType.comment) {
//       break;
//     }

//     let commentNode = child as textProtoNodes.CommentNode;
//     let comment = document.getText().slice(commentNode.start, commentNode.end);

//     if (comment.match(/# ?proto-file:/)) {
//       // slice first colon
//       path = comment.slice(comment.indexOf(":") + 1).trim();
//     } else if (comment.match(/# ?proto-message:/)) {
//       // slice first colon
//       message = comment.slice(comment.indexOf(":") + 1).trim();
//     } else {
//       // if comment is not proto-file or proto-message, then stop searching.
//       break;
//     }

//     if (path !== undefined && message !== undefined) {
//       break;
//     }
//   }

//   return [path, message];
// };

// const findNodeContainingOffset = (
//   node: textProtoNodes.Node,
//   offset: number
// ): textProtoNodes.Node | undefined => {
//   if (node.start < offset && offset < node.end) {
//     if (node.children) {
//       for (const child of node.children) {
//         let res = findNodeContainingOffset(child, offset);
//         if (res !== undefined) {
//           return res;
//         }
//       }
//     }

//     return node;
//   }

//   return undefined;
// };

// const findProtoMessage = async (
//   path: string,
//   message: string,
//   namePaths: string[]
// ): vscode.DefinitionLink[] => {
//   // TODO
// };
