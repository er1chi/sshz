import { render, useRenderer, useKeyboard } from "@opentui/solid"
import { type SelectOption } from "@opentui/core"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { createSignal, Show } from "solid-js"

function parseSshConfig(content: string): SelectOption[] {
  const options: SelectOption[] = []
  const lines = content.split("\n")
  let currentAliases: string[] = []
  let currentHostname: string | undefined
  let currentUser: string | undefined

  const flushHost = () => {
    if (currentAliases.length > 0) {
      for (const alias of currentAliases) {
        const desc = currentUser && currentHostname
          ? `${currentUser}@${currentHostname}`
          : currentHostname || alias
        options.push({
          name: alias,
          description: desc,
          value: alias,
        })
      }
    }
    currentAliases = []
    currentHostname = undefined
    currentUser = undefined
  }

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim()
    if (!line) continue

    const hostMatch = line.match(/^Host\s+(.+)$/i)
    if (hostMatch) {
      flushHost()
      const aliases = hostMatch[1].trim().split(/\s+/).filter(a => !a.includes("*") && !a.includes("?"))
      currentAliases = aliases
      continue
    }

    const kvMatch = line.match(/^(\w+)\s+(.+)$/)
    if (kvMatch && currentAliases.length > 0) {
      const key = kvMatch[1].toLowerCase()
      const val = kvMatch[2].trim()
      if (key === "hostname") currentHostname = val
      if (key === "user") currentUser = val
    }
  }

  flushHost()
  return options
}

function getSshHosts(): SelectOption[] {
  try {
    const configPath = path.join(os.homedir(), ".ssh", "config")
    if (!fs.existsSync(configPath)) return []
    const content = fs.readFileSync(configPath, "utf-8")
    return parseSshConfig(content)
  } catch {
    return []
  }
}

function appendSshHost(alias: string, hostname: string, user: string, port?: string, identityFile?: string) {
  const sshDir = path.join(os.homedir(), ".ssh")
  const configPath = path.join(sshDir, "config")

  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, { mode: 0o700 })
  }

  let block = `\nHost ${alias}\n    HostName ${hostname}\n    User ${user}`
  if (port) block += `\n    Port ${port}`
  if (identityFile) block += `\n    IdentityFile ${identityFile}`
  block += "\n"

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, block, { mode: 0o600 })
  } else {
    let existing = fs.readFileSync(configPath, "utf-8")
    if (existing.length > 0 && !existing.endsWith("\n")) {
      block = "\n" + block
    }
    fs.appendFileSync(configPath, block)
  }
}

const outputFile = process.env.SSHZ_OUTPUT || path.join(os.tmpdir(), `sshz-${process.pid}.out`)

type FocusField = "alias" | "hostname" | "user" | "options" | "port" | "identityFile"

const App = () => {
  const renderer = useRenderer()
  const [hosts, setHosts] = createSignal<SelectOption[]>(getSshHosts())
  const [showModal, setShowModal] = createSignal(false)
  const [showOptions, setShowOptions] = createSignal(false)
  const [focusedField, setFocusedField] = createSignal<FocusField>("alias")

  const [alias, setAlias] = createSignal("")
  const [hostname, setHostname] = createSignal("")
  const [user, setUser] = createSignal("")
  const [port, setPort] = createSignal("")
  const [identityFile, setIdentityFile] = createSignal("")

  const fieldOrder: FocusField[] = ["alias", "hostname", "user", "options", "port", "identityFile"]

  const visibleFields = (): FocusField[] => {
    if (showOptions()) return fieldOrder
    return ["alias", "hostname", "user", "options"]
  }

  const nextField = () => {
    const visible = visibleFields()
    const idx = visible.indexOf(focusedField())
    const next = visible[(idx + 1) % visible.length]
    setFocusedField(next)
  }

  const prevField = () => {
    const visible = visibleFields()
    const idx = visible.indexOf(focusedField())
    const prev = visible[(idx - 1 + visible.length) % visible.length]
    setFocusedField(prev)
  }

  const saveHost = () => {
    if (!alias() || !hostname() || !user()) return
    appendSshHost(alias(), hostname(), user(), port() || undefined, identityFile() || undefined)
    setHosts(getSshHosts())
    setShowModal(false)
    setAlias("")
    setHostname("")
    setUser("")
    setPort("")
    setIdentityFile("")
    setShowOptions(false)
  }

  const handleSelect = (_index: number, option: SelectOption | null) => {
    if (!option) return
    const host = option.value || option.name
    fs.writeFileSync(outputFile, host)
    renderer.destroy()
    process.exit(0)
  }

  useKeyboard((key) => {
    if (!showModal()) {
      if (key.name === "n" && !key.ctrl && !key.meta && !key.shift) {
        setShowModal(true)
        setFocusedField("alias")
      }
      if (key.name === "q" && !key.ctrl && !key.meta && !key.shift) {
        renderer.destroy()
        process.exit(1)
      }
      return
    }

    if (key.name === "escape") {
      setShowModal(false)
      return
    }

    if (key.name === "tab") {
      key.stopPropagation()
      if (key.shift) prevField()
      else nextField()
      return
    }

    if (key.name === "up") {
      key.stopPropagation()
      prevField()
      return
    }

    if (key.name === "down") {
      key.stopPropagation()
      nextField()
      return
    }
  })

  return (
    <box width="100%" height="100%" flexDirection="column">
      <box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center">
        <Show
          when={hosts().length > 0}
          fallback={
            <text content="No configured SSH hosts found in ~/.ssh/config" />
          }
        >
          <select
            width={50}
            height={10}
            options={hosts()}
            selectedIndex={0}
            selectedBackgroundColor="#334455"
            selectedTextColor="#FFFF00"
            focused={!showModal()}
            onSelect={handleSelect}
          />
        </Show>
      </box>

      <box height={1} backgroundColor="#334455" flexDirection="row" alignItems="center">
        <text content=" [n] new host " textColor="#FFFFFF" />
        <text content=" [q] quit " textColor="#FFFFFF" />
      </box>

      <Show when={showModal()}>
        <box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          backgroundColor="#000000"
          opacity={0.8}
          zIndex={10}
          alignItems="center"
          justifyContent="center"
        >
          <box
            width={50}
            height={showOptions() ? 18 : 12}
            border={true}
            title="New Host"
            backgroundColor="#1a1a1a"
            zIndex={11}
            flexDirection="column"
            padding={1}
            gap={1}
          >
            <box flexDirection="row" width="100%">
              <text content="Alias *" width={10} />
              <input
                value={alias()}
                onChange={setAlias}
                onSubmit={() => nextField()}
                placeholder="production"
                width={36}
                focused={focusedField() === "alias"}
              />
            </box>

            <box flexDirection="row" width="100%">
              <text content="Host *" width={10} />
              <input
                value={hostname()}
                onChange={setHostname}
                onSubmit={() => nextField()}
                placeholder="prod.example.com"
                width={36}
                focused={focusedField() === "hostname"}
              />
            </box>

            <box flexDirection="row" width="100%">
              <text content="User *" width={10} />
              <input
                value={user()}
                onChange={setUser}
                onSubmit={() => nextField()}
                placeholder="deploy"
                width={36}
                focused={focusedField() === "user"}
              />
            </box>

            <box
              flexDirection="row"
              width="100%"
              focusable={true}
              focused={focusedField() === "options"}
              backgroundColor={focusedField() === "options" ? "#334455" : undefined}
              onKeyDown={(key) => {
                if (key.name === "return") {
                  setShowOptions(!showOptions())
                }
              }}
            >
              <text content={showOptions() ? "▲ Fewer options" : "▼ More options"} />
            </box>

            <Show when={showOptions()}>
              <box flexDirection="row" width="100%">
                <text content="Port" width={10} />
                <input
                  value={port()}
                  onChange={setPort}
                  onSubmit={() => nextField()}
                  placeholder="22"
                  width={36}
                  focused={focusedField() === "port"}
                />
              </box>

              <box flexDirection="row" width="100%">
                <text content="Key" width={10} />
                <input
                  value={identityFile()}
                  onChange={setIdentityFile}
                  onSubmit={saveHost}
                  placeholder="~/.ssh/id_rsa"
                  width={36}
                  focused={focusedField() === "identityFile"}
                />
              </box>
            </Show>

            <box flexDirection="row" width="100%" justifyContent="space-between">
              <text content="[enter] next/save" textColor="#888888" />
              <text content="[esc] cancel" textColor="#888888" />
            </box>
          </box>
        </box>
      </Show>
    </box>
  )
}

render(() => <App />)
