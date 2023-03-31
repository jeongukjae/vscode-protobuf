# vscode-protobuf

vscode-protobuf provides additional features for editing Protocol Buffers and its text format.

## Features

* Syntax highlighting for Protocol Buffers and its text format.
* Diagnostic messages for Protocol Buffers. (`protoc`, `buf`)
* Code formatting for Protocol Buffers and its text format. (`clang-format`, `buf`, `txtpbfmt`)

<!-- Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow. -->

## Extension Settings

This extension contributes the following settings:

| Setting | Description | Default |
| --- | --- | --- |
| `protobuf3.compiler.provider` | The compiler to use for compiling Protocol Buffers 3 files. | `protoc` |
| `protobuf3.format.provider` | The formatter to use for formatting Protocol Buffers 3 files. |  |`clang-format`
| `protobuf3.protoc.executable` | The path to the protoc executable. | `protoc` |
| `protobuf3.protoc.arguments` | The arguments to pass to protoc. | `[]` |
| `protobuf3.buf.executable` | The path to the buf executable. | `buf` |
| `protobuf3.buf.arguments` | The arguments to pass to buf. | `[]` |
| `protobuf3.clang-format.executable` | The path to the clang-format executable. | `clang-format` |
| `protobuf3.clang-format.arguments` | The arguments to pass to clang-format. | `['-style=google']` |
| `textproto.format.provider` | The formatter to use for formatting Protocol Buffers Text Format  |files. | `txtpbfmt`
| `textproto.txtpbfmt.executable` | The path to the txtpbfmt executable. | `txtpbfmt` |
| `textproto.txtpbfmt.arguments` | The arguments to pass to txtpbfmt. | `[]` |

## TODO

- [ ] Add support for compiling on save.
- [ ] Add go to definition/declaration for message types.

## Release Notes

### 0.1.0

Initial release of vscode-protobuf.
