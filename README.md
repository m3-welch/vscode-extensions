# vscode-extensions
A collection of VS Code extensions for personal use

## Extensions

- [Super Markdown Live View](extensions/super-markdown-live-view/README.md) — edit Markdown with a local rendered live view.
- [AI-DLC State Tracker](extensions/ai-dlc-state-tracker/README.md): view the workspace's
  `aidlc-state.md` as rendered Markdown in VS Code.

## Publishing

Run the **Publish extensions** workflow manually and enter `all` or a comma-separated
list of extension directory names. The available names are discovered from
`extensions/` directories containing a `package.json`. Add a repository secret
named `VSCE_PAT` with a Visual Studio Marketplace publishing token.

## Spec Kit

This repository uses [GitHub Spec Kit](https://github.com/github/spec-kit) with
GitHub Copilot. Start by running `/speckit-constitution` in Copilot Chat to
establish project principles. For each feature, use `/speckit-specify`, then
`/speckit-plan`, `/speckit-tasks`, and `/speckit-implement`; finish with
`/speckit-converge`. `/speckit-clarify` and `/speckit-analyze` are optional
workflow steps.

The skills are in `.github/skills/`, and the shared templates and scripts are
in `.specify/`.
