# vscode-extensions Constitution

## Core Principles

### I. User-Focused Extensions
Every extension MUST address a clear user workflow and provide a coherent, discoverable
experience. Features MUST remain within the extension's stated purpose; unrelated behavior
requires a separate justification. This keeps the collection focused and useful.

### II. Native VS Code Integration
Extensions MUST use documented VS Code extension APIs and platform contribution points for
commands, settings, and interface elements. They MUST respect the user's configured
environment and avoid surprising changes to workspace or editor state.

### III. Privacy and Security by Default
Extensions MUST request and use only the access and data needed for their stated functionality.
They MUST NOT expose secrets or send workspace or user data to external services without a
clear, documented feature need and user awareness. Inputs from workspaces and external sources
MUST be treated as untrusted.

### IV. Verifiable Quality
Changes to observable behavior MUST include automated tests for the principal behavior and
relevant failure cases. Contributors MUST run the existing checks applicable to the change.
When automation is impractical, the change description MUST record the manual verification
performed.

### V. Simplicity and Compatibility
Extensions MUST keep dependencies, activation, and configuration limited to what their features
require. They MUST declare and respect their supported VS Code version range. Breaking changes
MUST be intentional, documented, and justified by user value.

## Additional Constraints

Each extension MUST have a clear identity and documented purpose. Manifests MUST declare the
extension's supported VS Code engine range and only the commands, settings, and other
contributions it needs. New dependencies MUST be justified by functionality that cannot be
reasonably provided with existing platform APIs or project dependencies.

## Development Workflow

Feature work MUST follow the repository's Spec Kit workflow: specify, plan, generate tasks,
implement, and converge. Clarification and analysis steps MUST be used when requirements or
design consistency warrant them. Implementation changes MUST be reviewed against these
principles and validated with the existing checks relevant to the affected extension.

## Governance

This constitution governs project decisions and supersedes conflicting local practices.
Amendments MUST be made in this file, state their rationale in the change description, and
include any required migration or compatibility implications. A change MUST NOT be considered
complete until its compliance with these principles and its applicable validation results have
been reviewed.

Versioning follows semantic versioning: MAJOR for incompatible changes to principles or
governance, MINOR for new principles or materially expanded requirements, and PATCH for
clarifications or non-semantic wording changes. The version and amendment date MUST be updated
with every amendment. Contributors and reviewers MUST identify and resolve any conflict with
this constitution before approval.

**Version**: 1.0.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13
