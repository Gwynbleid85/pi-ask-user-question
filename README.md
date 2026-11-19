# pi-ask-user-question

Human-facing question dialogs for [Pi](https://github.com/earendil-works/pi), with waiting-state reporting for **Herdr Core** and **legacy Herdr**.

This is a standalone package. It does not install subagent orchestration or the worker-to-parent `ask_question` tool.

## Requirements

- **Pi 1.5.2+** for the current TUI helpers and prompt lifecycle events.
- An interactive TUI session for the full question UI. Choice dialogs are not supported in RPC, JSON, or print mode.
- Git access to this private repository for installation from GitHub.

## Install

Before installing, follow the migration section below if you have standalone copies or the previously bundled subagents version.

```sh
pi install git:github.com/Gwynbleid85/pi-ask-user-question
```

Authenticate Git with an account that can access this private repository. For GitHub CLI users, `gh auth login` followed by `gh auth setup-git` configures HTTPS Git access if needed. Do not put access tokens in package URLs or settings.

Alternatively, install a local clone by its absolute path:

```sh
pi install /absolute/path/to/pi-ask-user-question
```

Choose either the GitHub source or a local source, not both. Restart Pi or run `/reload` after changing the installed resources.

## Migrating existing installations

Pi rejects multiple extensions registering the same tool name. Keep **one** `ask_user_question` installation and **one** legacy prompt bridge.

### 1. Update the subagents package

An earlier revision of `pi-interactive-subagents` mistakenly bundled this question tool. The cleanup removes that bundling without changing subagent orchestration. Update the **installed package**, not just a separate development clone:

```sh
pi update git:github.com/Gwynbleid85/pi-interactive-subagents
```

Use the exact installed source shown by `pi list` if it differs. If that source is pinned to the old commit or tag, change the declaration to a cleaned-up ref first; updating a pinned ref does not move it. Package-management commands are separate from starting an interactive session; do this before restarting Pi.

### 2. Back up standalone copies before installing this package

If you have these files under the default Pi config directory, move them outside extension discovery:

```sh
mkdir -p ~/.pi/agent/extension-backups
for file in ask-user-question.ts herdr-ui-prompts.ts; do
  if [ -f "$HOME/.pi/agent/extensions/$file" ]; then
    mv -i "$HOME/.pi/agent/extensions/$file" "$HOME/.pi/agent/extension-backups/$file"
  fi
done
```

Adjust the paths if you use a custom Pi config directory. Also remove any explicit settings or CLI references to those standalone files. Then install this package and restart Pi or run `/reload`.

**Keep Herdr's managed `herdr-agent-state.ts`.** It is the legacy state reporter, not a duplicate of this package's bridge. Never load both the standalone bridge and the packaged bridge: each would add a blocked count.

Editing or cloning this repository does not automatically move your global files or install the package. Until you migrate, you can continue using the already-fixed standalone question tool after updating subagents.

## Tool: `ask_user_question`

Ask one question per call. The agent pauses while the user answers.

```json
{
  "question": "Where should the report be saved?",
  "details": "Choose a destination before I write the file.",
  "options": [
    { "label": "Project directory (Recommended)", "value": "project" },
    { "label": "Downloads", "value": "downloads" }
  ]
}
```

- Omit `options`, or use an empty array, for a free-text editor.
- Set `multiSelect: true` to allow multiple choices.
- Options accept `label`, optional `value`, and optional `description`. A value defaults to its label.
- Choice dialogs always provide an inline **Other** field for a custom answer.
- Use arrow keys to navigate. In multi-select, **Space** toggles an option and **Submit** sends the selection. **Escape** cancels.
- Other-field drafts preserve Unicode, whitespace, editing position and cursor focus while wrapping to the available terminal width.
- A shared UI mutex serializes questions with other popup tools that use the same lock.

Results include model-facing text and structured `details`: `status` (`answered`, `cancelled`, or `unavailable`), `question`, `context`, `mode`, and `answers`. Selected options contain their label, value and one-based index. Free-text and Other answers contain their label and value.

## Herdr waiting-state support

### Herdr Core: native status

Both choice dialogs pass Pi's supported custom-UI option:

```ts
{ blocked: { kind: "question", message: question } }
```

Pi reports the terminal as blocked while the dialog is visible and restores its appropriate status when it closes. Free-text questions use Pi's built-in editor, which already reports native waiting status. Herdr Core can then apply attention styling and notifications, subject to its settings and native program-status support. No app mod or direct socket reporter is needed.

### Legacy Herdr: prompt bridge

The bundled `herdr-ui-prompts.ts` listens to Pi's `ui_prompt_start` and `ui_prompt_end` events and sends balanced `herdr:blocked` events to Herdr's existing managed reporter. It covers blocking dialogs from other extensions too, acts only in TUI mode, ignores duplicate starts/ends, and releases its own signal on shutdown.

Legacy reporting requires Herdr's managed integration to be installed and enabled in a Herdr-managed terminal. This package does not ship or overwrite that managed file. The bridge does not emit competing native terminal status reports.

## Validate waiting status

After activation, ask the agent to use `ask_user_question` with choices. While it is open, switch to another chat and check attention styling and notification. Submit an answer or press Escape, then check that the waiting status clears. If it still shows running, confirm Pi was reloaded and that only one question tool and bridge are enabled.

## Development

Node.js **22.18+** is required for the TypeScript test runner; use a Node version supported by your Pi installation.

```sh
npm ci
npm test
npm pack --dry-run
```

Pi supplies the runtime imports. Development dependencies are pinned to Pi 1.5.2 for reproducible tests. Tests cover single/multi-select behavior, native blocked payloads, free text, cancellation, headless calls, Unicode and resize handling, mutex cleanup, bridge ownership, and package registration. They do not depend on a user's global Pi installation or the legacy managed reporter.

## License

MIT. See [LICENSE](LICENSE).
