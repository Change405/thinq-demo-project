---
name: lint-and-changelog
description: Lint this project's code with the bundled script (syntax, hygiene, and the user's Caps-case rule for function names), then write a changelog from the standard template and export it as a PDF to send to the group. Use when the user asks to lint, check code style or naming, prepare a release, or write/send a changelog.
---

# Lint and changelog

Two jobs, usually run together: lint the code, then write a changelog the user can send to the group as a PDF. If the user asks for only one, do only that one.

## The user's naming preference: Caps case function names

**The user prefers Caps case (PascalCase) for function names**: every word starts with a capital letter and there are no underscores or dashes.

| Wrong | Right |
|---|---|
| `getTotal` | `GetTotal` |
| `format_price` | `FormatPrice` |
| `onClick` | `OnClick` |

This applies to function declarations and to functions stored in a variable (`const GetTotal = () => ...`). Follow it in any code you write, not only when linting.

**Exceptions.** Do not rename names a framework calls by exact name, because renaming them breaks the app. The script already skips these: SvelteKit's `load`, `actions`, `entries`, `prerender`, `ssr`, `csr`, `trailingSlash`, `config`, the hooks (`handle`, `handleFetch`, `handleError`, `reroute`, `init`, `transport`), and endpoint handlers (`GET`, `POST`, etc.). Object keys such as `default:` inside `actions` are also left alone. If you find another framework-required name, add it to `exemptNames` in `scripts/lint.mjs` instead of renaming it.

## Step 1: Run the linter

From the project root:

```bash
node .claude/skills/lint-and-changelog/scripts/lint.mjs
```

It checks `src` by default. Pass other paths to check those instead. It reports `file:line`, the problem and the rule name, and exits with 1 if it finds any problem. Checks:

- `syntax`: every `.js` file must parse. Every `.svelte` file must compile (only when `svelte` is installed; run `npm install` if the script says it is not).
- `caps-case-functions`: function names must be Caps case. The message suggests the new name.
- `no-debugger`, `no-var`: no `debugger` statements, no `var`.
- ESLint: also runs if the project has an ESLint config and eslint is installed.

## Step 2: Double-check Caps case by hand

The script finds names with patterns, so it can miss some. **Always double-check after it passes.** Read through the changed files (or all of `src` on a first run) and look for function names that are not Caps case in places the script does not cover, for example:

- class methods and object methods (`{ getTotal() {} }`)
- functions exported under another name (`export { getTotal as total }`)
- functions inside Svelte markup (`onclick={() => ...}` handlers that call helper functions)
- functions passed as named callbacks

Report each one you find with its `file:line`. Tell the user the script missed it.

## Step 3: Fix problems

Show the user the list of problems first. Fix them only after the user agrees. When you rename a function, update every call site and import (search the whole repo for the old name), then run the linter again until it is clean.

## Step 4: Write the changelog

1. Copy `templates/changelog.md` to `changelogs/CHANGELOG-<version>.md` in the project root (for example `changelogs/CHANGELOG-0.2.0.md`). Do not edit the template itself.
2. Fill in the placeholders (`{{...}}`):
   - Get the version from `package.json` unless the user gives one. Use today's date. Ask the user for the author name if you do not know it.
   - Build Added / Changed / Fixed / Removed from `git log` since the last tag or the last changelog (ask the user for the start point if neither exists). Write each entry in plain words for the group, not commit-message jargon. One line per change.
   - Fill the **Code quality** table from the results of Steps 1 to 3.
   - Delete any section that has nothing in it, rather than leaving "None".
3. Show the user the filled-in changelog and wait for them to approve it.

## Step 5: Export the PDF

```bash
node .claude/skills/lint-and-changelog/scripts/changelog-pdf.mjs changelogs/CHANGELOG-<version>.md
```

It writes the PDF next to the Markdown file. It stops if any `{{...}}` placeholder is still in the file. It needs Google Chrome, Chromium or Edge (set `CHROME_PATH` if the browser is somewhere else).

Give the user the path to the PDF. **Do not send it to the group yourself.** If the user asks you to send it, confirm the recipients and the message text first.
