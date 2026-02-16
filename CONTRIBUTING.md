# Contributing to AIVory Monitor Deno Agent

Thank you for your interest in contributing to the AIVory Monitor Deno Agent. Contributions of all kinds are welcome -- bug reports, feature requests, documentation improvements, and code changes.

## How to Contribute

- **Bug reports**: Open an issue at [GitHub Issues](https://github.com/aivorynet/agent-deno/issues) with a clear description, steps to reproduce, and your environment details (Deno version, OS).
- **Feature requests**: Open an issue describing the use case and proposed behavior.
- **Pull requests**: See the Pull Request Process below.

## Development Setup

### Prerequisites

- Deno 1.38 or later

### Build and Test

```bash
cd monitor-agents/agent-deno
deno task build
deno test
```

### Running the Agent

Import the agent module in your Deno application and call the initialization function at startup. See the README for integration details.

## Coding Standards

- Follow the existing code style in the repository.
- Write tests for all new features and bug fixes.
- Use TypeScript strict mode.
- Follow the [Deno Style Guide](https://docs.deno.com/runtime/manual/references/contributing/style_guide).
- Ensure the agent works within Deno's permission model -- document any required permissions.

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Make your changes and write tests.
3. Ensure all tests pass (`deno test`) and the code is formatted (`deno fmt --check`).
4. Submit a pull request on [GitHub](https://github.com/aivorynet/agent-deno) or GitLab.
5. All pull requests require at least one review before merge.

## Reporting Bugs

Use [GitHub Issues](https://github.com/aivorynet/agent-deno/issues). Include:

- Deno version (`deno --version`) and OS
- Agent version
- Error output or stack traces
- Minimal reproduction steps

## Security

Do not open public issues for security vulnerabilities. Report them to **security@aivory.net**. See [SECURITY.md](SECURITY.md) for details.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
