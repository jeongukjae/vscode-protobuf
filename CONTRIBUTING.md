# Contributing

Contributions are always welcome, and feel free to file issues and suggestions in the [GitHub issue](https://github.com/jeongukjae/vscode-protobuf/issues)!

## Development

### Requirements

* Node.js 16+

### Install dependencies & build

```sh
yarn install
yarn build
# The package will be built to `vscode-protobuf-{version}.vsix` file.
```

### Run the extension

Run `Run Extension` task defined in [`.vscode/launch.json`](.vscode/launch.json).

### Run the tests

```sh
# Run extension tests
yarn test:extension
# Run unittest
yarn test:unit

# Run all tests
yarn test
```

### Run the linter and formatter

```sh
# Run linter
yarn lint

# Run formatter
yarn format
```