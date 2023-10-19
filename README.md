# vscode-protobuf

***This project is not stable and currently under development. Please report any issues or feature requests to [GitHub issues](https://github.com/jeongukjae/vscode-protobuf/issues).***

vscode-protobuf provides additional features for editing Protocol Buffers and its Text Format.

[![codecov](https://codecov.io/gh/jeongukjae/vscode-protobuf/branch/main/graph/badge.svg?token=cfa725IQ9j)](https://codecov.io/gh/jeongukjae/vscode-protobuf)

## Features

* Add `Protocol Buffers 3` and `Protocol Buffers Text Format` language support.
* Syntax highlighting for Protocol Buffers and Text Format.
* Diagnostic messages (compile & lint) for Protocol Buffers. (`protoc`, `buf`, `api-linter`)
* Code formatting for Protocol Buffers and Text Format. (`clang-format` & `buf` for Protocol Buffers, `txtpbfmt` for Text Format)
* Symbol provider for Protocol Buffers and Text Format.
* Go to definition for Protocol Buffers.

<!-- Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow. -->

## Extension Settings

This extension contributes the following settings:

### For Protocol Buffers

| Setting | Description | Default |
| --- | --- | --- |
| `protobuf3.working_directory` | The working directory to use for running the Protocol Buffers 3 tools. | `.` |
| `protobuf3.compiler.provider` | The compiler to use for compiling Protocol Buffers 3 files. `protoc` or `buf` can be used. | `protoc` |
| `protobuf3.format.provider` | The formatter to use for formatting Protocol Buffers 3 files. `clang-format` or `buf` can be used. |`clang-format` |
| `protobuf3.api-linter.enabled` | Whether to enable api-linter. | `false` |
| `protobuf3.buf.lint.enabled` | Whether to enable buf lint. | `false` |
||||
| `protobuf3.protoc.executable` | The path to the protoc executable. | `protoc` |
| `protobuf3.protoc.arguments` | The arguments to pass to protoc. | `[]` |
| `protobuf3.api-linter.executable` | The path to the api-linter executable. | `api-linter` |
| `protobuf3.api-linter.arguments` | The arguments to pass to api-linter. | `[]` |
| `protobuf3.buf.executable` | The path to the buf executable. | `buf` |
| `protobuf3.buf.arguments` | The arguments to pass to buf. | `[]` |
| `protobuf3.clang-format.executable` | The path to the clang-format executable. | `clang-format` |
| `protobuf3.clang-format.arguments` | The arguments to pass to clang-format. | `['-style=google']` |

### For Text Format

| Setting | Description | Default |
| --- | --- | --- |
| `textproto.format.provider` | The formatter to use for formatting Protocol Buffers Text Format files. Only `txtpbfmt` is supported. | `txtpbfmt` |
||||
| `textproto.txtpbfmt.executable` | The path to the txtpbfmt executable. | `txtpbfmt` |
| `textproto.txtpbfmt.arguments` | The arguments to pass to txtpbfmt. | `[]` |

### Examples

*If you store protobuf files in `proto/` directory:*

```jsonc
{
    "protobuf3.working_directory": "./proto",
    // ...
}
```

*If you want to use `buf` for linting, formatting, and diagnostics:*

```jsonc
{
    "protobuf3.compiler.provider": "buf",
    "protobuf3.format.provider": "buf",
    "protobuf3.buf.lint.enabled": true,
    // Optional: "protobuf3.buf.executable": "/path/to/buf",
    // Optional: "protobuf3.buf.arguments": ["Some", "arguments", "for", "buf"],
}
```

*If you want to get diagnostics from `protoc`, format protobuf with `clang-format`, and lint with `api-linter`:*

```jsonc
{
    "protobuf3.compiler.provider": "protoc",
    // Optional: "protobuf3.protoc.executable": "/path/to/protoc",
    // Optional: "protobuf3.protoc.arguments": ["Some", "arguments", "for", "protoc"],
    "protobuf3.format.provider": "clang-format",
    // Optional: "protobuf3.clang-format.executable": "/path/to/clang-format",
    // Optional: "protobuf3.clang-format.arguments": ["Some", "arguments", "for", "clang-format"],
    "protobuf3.api-linter.enabled": true,
    // Optional: "protobuf3.api-linter.executable": "/path/to/api-linter",
    // Optional: "protobuf3.api-linter.arguments": ["Some", "arguments", "for", "api-linter"],
}
```

## TODO

TODOs are tracked in [GitHub issues](https://github.com/jeongukjae/vscode-protobuf/issues)

## Release Notes

Check [CHANGELOG.md](./CHANGELOG.md)
