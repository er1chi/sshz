# sshz v0 — OpenTUI + Solid.js Proof of Concept

A minimal SSH host picker built with [OpenTUI](https://opentui.com) and Solid.js bindings.

## How it works

1. The TUI displays a list of SSH hosts.
2. When you select a host, `renderer.destroy()` restores the terminal to its original state.
3. The selected host is printed to stdout and the process exits.
4. The `sshz` wrapper script captures the host and runs `ssh <host>` in the same terminal session.

## Files

| File | Purpose |
|------|---------|
| `index.tsx` | OpenTUI Solid.js app with a `<select>` component |
| `sshz` | Bash wrapper that runs the TUI and then executes `ssh` |
| `package.json` | Bun dependencies |
| `tsconfig.json` | TypeScript JSX config for `@opentui/solid` |
| `bunfig.toml` | Bun preload for Solid JSX transform |

## Usage

Install dependencies:
```bash
bun install
```

Run via the wrapper (recommended):
```bash
./sshz
```

Or run the TUI directly:
```bash
bun index.tsx
```

## Customizing hosts

sshz reads your SSH hosts automatically from `~/.ssh/config`. If the file is missing or empty, the TUI displays an empty state with the option to add a new host.

You can also add a host directly from the TUI by pressing `n` and filling in the required fields (Alias, Hostname, User). Optional fields (Port, IdentityFile) are available via the expandable options toggle.

### Manual config format

```
Host production
    HostName prod.example.com
    User deploy

Host staging
    HostName staging.example.com
    User deploy
```

## Key bindings

| Key | Action |
|-----|--------|
| ↑ / k | Move up |
| ↓ / j | Move down |
| Enter | Select host and connect |
| `n` | Add new host (opens modal) |
| `Tab` / `Shift+Tab` | Cycle fields in modal |
| `Esc` | Cancel modal |
| Ctrl+C | Cancel and exit |
