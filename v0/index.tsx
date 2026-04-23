import { render, useRenderer, useKeyboard } from "@opentui/solid"
import { type SelectOption } from "@opentui/core"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { createSignal, Show, createMemo } from "solid-js"

const COLORS = {
  bg: "#111111",
  panelBg: "#1c1c1e",
  orange: "#ff9f0a",
  orangeDim: "#cc7f08",
  selectedBg: "#ff9f0a",
  selectedText: "#000000",
  title: "#ffffff",
  accessory: "#8e8e93",
  muted: "#636366",
  separator: "#2c2c2e",
  border: "#3a3a3c",
  inputBg: "#2c2c2e",
  placeholder: "#48484a",
}

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

function deleteSshHost(alias: string): boolean {
  const configPath = path.join(os.homedir(), ".ssh", "config")
  if (!fs.existsSync(configPath)) return false

  const content = fs.readFileSync(configPath, "utf-8")
  const lines = content.split("\n")

  let inTargetBlock = false
  let found = false
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const lineWithoutComment = rawLine.split("#")[0].trim()

    const hostMatch = lineWithoutComment.match(/^Host\s+(.+)$/i)
    if (hostMatch) {
      const aliases = hostMatch[1].trim().split(/\s+/)
      inTargetBlock = aliases.includes(alias)
      if (inTargetBlock) {
        found = true
        continue
      }
    }

    if (!inTargetBlock) {
      result.push(rawLine)
    }
  }

  if (!found) return false

  let output = result.join("\n")
  while (output.endsWith("\n\n")) {
    output = output.slice(0, -1)
  }

  fs.writeFileSync(configPath, output, { mode: 0o600 })
  return true
}

const outputFile = process.env.SSHZ_OUTPUT || path.join(os.tmpdir(), `sshz-${process.pid}.out`)

type FocusField = "alias" | "hostname" | "user" | "options" | "port" | "identityFile"

const App = () => {
  const renderer = useRenderer()
  const [hosts, setHosts] = createSignal<SelectOption[]>(getSshHosts())
  const [showModal, setShowModal] = createSignal(false)
  const [showOptions, setShowOptions] = createSignal(false)
  const [focusedField, setFocusedField] = createSignal<FocusField>("alias")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [searchQuery, setSearchQuery] = createSignal("")
  const [statusMessage, setStatusMessage] = createSignal("")
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)
  const [hostToDelete, setHostToDelete] = createSignal<SelectOption | null>(null)

  const [alias, setAlias] = createSignal("")
  const [hostname, setHostname] = createSignal("")
  const [user, setUser] = createSignal("")
  const [port, setPort] = createSignal("")
  const [identityFile, setIdentityFile] = createSignal("")

  const filteredHosts = createMemo(() => {
    const query = searchQuery().toLowerCase().trim()
    if (!query) return hosts()
    return hosts().filter(h =>
      h.name.toLowerCase().includes(query) ||
      (h.description && h.description.toLowerCase().includes(query))
    )
  })

  const visibleCount = 10

  const scrollOffset = createMemo(() => {
    const idx = selectedIndex()
    const total = filteredHosts().length
    if (total <= visibleCount) return 0
    if (idx < visibleCount - 1) return 0
    if (idx > total - visibleCount) return total - visibleCount
    return idx - Math.floor(visibleCount / 2)
  })

  const visibleHosts = createMemo(() => {
    const offset = scrollOffset()
    return filteredHosts().slice(offset, offset + visibleCount)
  })

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
    setSelectedIndex(0)
    setSearchQuery("")
  }

  const handleSelectHost = (host: SelectOption) => {
    const hostValue = host.value || host.name
    fs.writeFileSync(outputFile, hostValue)
    renderer.destroy()
    process.exit(0)
  }

  useKeyboard((key) => {
    if (showDeleteConfirm()) {
      if (key.name === "return") {
        key.stopPropagation()
        const host = hostToDelete()
        if (host && deleteSshHost(host.name)) {
          const newHosts = getSshHosts()
          setHosts(newHosts)
          const query = searchQuery().toLowerCase().trim()
          const newFiltered = query
            ? newHosts.filter(h =>
                h.name.toLowerCase().includes(query) ||
                (h.description && h.description.toLowerCase().includes(query))
              )
            : newHosts
          setSelectedIndex(prev => Math.min(prev, Math.max(0, newFiltered.length - 1)))
          setStatusMessage(`Deleted host '${host.name}'`)
          setTimeout(() => setStatusMessage(""), 3000)
        }
        setShowDeleteConfirm(false)
        setHostToDelete(null)
        return
      }
      if (key.name === "q") {
        key.stopPropagation()
        setShowDeleteConfirm(false)
        setHostToDelete(null)
        return
      }
      if (key.name === "escape") {
        setShowDeleteConfirm(false)
        setHostToDelete(null)
        return
      }
      return
    }

    if (!showModal()) {
      if (key.name === "n" && key.ctrl && !key.meta && !key.shift) {
        setShowModal(true)
        setFocusedField("alias")
        return
      }
      if (key.name === "q" && key.ctrl && !key.meta && !key.shift) {
        renderer.destroy()
        process.exit(1)
      }
      if (key.name === "d" && key.ctrl && !key.meta && !key.shift) {
        key.stopPropagation()
        const hostsList = filteredHosts()
        if (hostsList.length > 0) {
          setHostToDelete(hostsList[selectedIndex()])
          setShowDeleteConfirm(true)
        }
        return
      }
      if (key.name === "up") {
        key.stopPropagation()
        const total = filteredHosts().length
        if (total > 0) {
          setSelectedIndex((prev) => (prev - 1 + total) % total)
        }
        return
      }
      if (key.name === "down") {
        key.stopPropagation()
        const total = filteredHosts().length
        if (total > 0) {
          setSelectedIndex((prev) => (prev + 1) % total)
        }
        return
      }
      if (key.name === "return") {
        key.stopPropagation()
        const hostsList = filteredHosts()
        if (hostsList.length > 0) {
          handleSelectHost(hostsList[selectedIndex()])
        }
        return
      }
      if (key.ctrl && key.name === "u") {
        key.stopPropagation()
        setSearchQuery("")
        setSelectedIndex(0)
        return
      }
      // Any printable character starts search
      if (key.name && key.name.length === 1 && !key.ctrl && !key.meta) {
        key.stopPropagation()
        setSearchQuery((prev) => prev + key.name)
        setSelectedIndex(0)
        return
      }
      if (key.name === "backspace") {
        key.stopPropagation()
        setSearchQuery((prev) => prev.slice(0, -1))
        setSelectedIndex(0)
        return
      }
      if (key.name === "escape") {
        key.stopPropagation()
        setSearchQuery("")
        setSelectedIndex(0)
        return
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
    <box width="100%" height="100%" flexDirection="column" backgroundColor={COLORS.bg}>
      {/* Header */}
      <box flexDirection="column" width="100%" padding={{ left: 2, right: 2, top: 1, bottom: 0 }}>
        <box flexDirection="row" alignItems="center" height={1}>
          <text content="sshz" textColor={COLORS.title} />
          <text content=" — SSH Host Manager" textColor={COLORS.muted} />
        </box>
        <box height={1} width="100%" backgroundColor={COLORS.separator} marginTop={1} />
      </box>

      {/* Main Content */}
      <box flexGrow={1} flexDirection="column" width="100%" padding={{ left: 2, right: 2, top: 1, bottom: 1 }}>
        <Show
          when={hosts().length > 0}
          fallback={
            <box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column" gap={1}>
              <text content="No configured SSH hosts found" textColor={COLORS.muted} />
              <text content="Press [^n] to add your first host" textColor={COLORS.accessory} />
            </box>
          }
        >
          {/* Search prompt */}
          <box flexDirection="row" height={1} marginBottom={1}>
            <text content="> " textColor={COLORS.orange} />
            <Show when={searchQuery()} fallback={
              <text content="Search hosts..." textColor={COLORS.placeholder} />
            }>
              <text content={searchQuery()} textColor={COLORS.title} />
              <text content="_" textColor={COLORS.orange} />
            </Show>
          </box>

          {/* Section header */}
          <box height={1} marginBottom={0} marginTop={1}>
            <text content="Configured Hosts" textColor={COLORS.orange} />
          </box>

          {/* Host list */}
          <box flexDirection="column" width="100%" gap={0}>
            <Show when={filteredHosts().length === 0}>
              <box height={1} marginTop={1}>
                <text content="No hosts match your search" textColor={COLORS.muted} />
              </box>
            </Show>

            {visibleHosts().map((host, i) => {
              const actualIndex = scrollOffset() + i
              const isSelected = actualIndex === selectedIndex()
              return (
                <box
                  flexDirection="row"
                  width="100%"
                  height={1}
                  backgroundColor={isSelected ? COLORS.selectedBg : undefined}
                >
                  <text
                    content={isSelected ? "›" : " "}
                    width={1}
                    textColor={isSelected ? COLORS.selectedText : COLORS.muted}
                  />
                  <text
                    content={host.name}
                    textColor={isSelected ? COLORS.selectedText : COLORS.title}
                  />
                  <box flexGrow={1} />
                  <text
                    content={host.description || ""}
                    textColor={isSelected ? COLORS.selectedText : COLORS.accessory}
                  />
                </box>
              )
            })}

            {/* Scroll indicator */}
            <Show when={filteredHosts().length > visibleCount}>
              <box height={1} marginTop={1} flexDirection="row">
                <text
                  content={` ${scrollOffset() + visibleHosts().length} / ${filteredHosts().length} `}
                  textColor={COLORS.muted}
                />
              </box>
            </Show>
          </box>
        </Show>
      </box>

      {/* Bottom status bar */}
      <box
        height={1}
        backgroundColor={COLORS.panelBg}
        flexDirection="row"
        alignItems="center"
        width="100%"
        padding={{ left: 1, right: 1 }}
      >
        <box flexDirection="row" gap={2}>
          <text content="[^n] new host" textColor={COLORS.accessory} />
          <text content="[^d] delete" textColor={COLORS.accessory} />
          <text content="[^q] quit" textColor={COLORS.accessory} />
          <text content="[↵] connect" textColor={COLORS.accessory} />
          <Show when={searchQuery().length > 1}>
            <text content="[esc] clear" textColor={COLORS.accessory} />
          </Show>
        </box>
        <box flexGrow={1} />
        <Show when={statusMessage()}>
          <text content={statusMessage()} textColor={COLORS.orange} />
        </Show>
        <Show when={!statusMessage() && hosts().length > 0}>
          <text content={`${hosts().length} hosts`} textColor={COLORS.muted} />
        </Show>
      </box>

      {/* Modal */}
      <Show when={showModal()}>
        <box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          backgroundColor="#000000"
          opacity={0.85}
          zIndex={10}
          alignItems="center"
          justifyContent="center"
        >
          <box
            width={56}
            height={showOptions() ? 20 : 14}
            border={true}
            borderColor={COLORS.border}
            title=" New Host "
            titleColor={COLORS.orange}
            backgroundColor={COLORS.panelBg}
            zIndex={11}
            flexDirection="column"
            padding={{ left: 2, right: 2, top: 1, bottom: 1 }}
            gap={1}
          >
            <box flexDirection="row" width="100%" height={1}>
              <text content="Alias" width={12} textColor={COLORS.accessory} />
              <input
                value={alias()}
                onChange={setAlias}
                onSubmit={() => nextField()}
                placeholder="production"
                width={40}
                focused={focusedField() === "alias"}
                backgroundColor={focusedField() === "alias" ? COLORS.inputBg : undefined}
                textColor={COLORS.title}
                placeholderColor={COLORS.placeholder}
              />
            </box>

            <box flexDirection="row" width="100%" height={1}>
              <text content="Host" width={12} textColor={COLORS.accessory} />
              <input
                value={hostname()}
                onChange={setHostname}
                onSubmit={() => nextField()}
                placeholder="prod.example.com"
                width={40}
                focused={focusedField() === "hostname"}
                backgroundColor={focusedField() === "hostname" ? COLORS.inputBg : undefined}
                textColor={COLORS.title}
                placeholderColor={COLORS.placeholder}
              />
            </box>

            <box flexDirection="row" width="100%" height={1}>
              <text content="User" width={12} textColor={COLORS.accessory} />
              <input
                value={user()}
                onChange={setUser}
                onSubmit={() => nextField()}
                placeholder="deploy"
                width={40}
                focused={focusedField() === "user"}
                backgroundColor={focusedField() === "user" ? COLORS.inputBg : undefined}
                textColor={COLORS.title}
                placeholderColor={COLORS.placeholder}
              />
            </box>

            <box
              flexDirection="row"
              width="100%"
              height={1}
              focusable={true}
              focused={focusedField() === "options"}
              backgroundColor={focusedField() === "options" ? COLORS.inputBg : undefined}
              onKeyDown={(key) => {
                if (key.name === "return") {
                  setShowOptions(!showOptions())
                }
              }}
            >
              <text
                content={showOptions() ? "▲ Fewer options" : "▼ More options"}
                textColor={focusedField() === "options" ? COLORS.orange : COLORS.accessory}
              />
            </box>

            <Show when={showOptions()}>
              <box flexDirection="row" width="100%" height={1}>
                <text content="Port" width={12} textColor={COLORS.accessory} />
                <input
                  value={port()}
                  onChange={setPort}
                  onSubmit={() => nextField()}
                  placeholder="22"
                  width={40}
                  focused={focusedField() === "port"}
                  backgroundColor={focusedField() === "port" ? COLORS.inputBg : undefined}
                  textColor={COLORS.title}
                  placeholderColor={COLORS.placeholder}
                />
              </box>

              <box flexDirection="row" width="100%" height={1}>
                <text content="Key" width={12} textColor={COLORS.accessory} />
                <input
                  value={identityFile()}
                  onChange={setIdentityFile}
                  onSubmit={saveHost}
                  placeholder="~/.ssh/id_rsa"
                  width={40}
                  focused={focusedField() === "identityFile"}
                  backgroundColor={focusedField() === "identityFile" ? COLORS.inputBg : undefined}
                  textColor={COLORS.title}
                  placeholderColor={COLORS.placeholder}
                />
              </box>
            </Show>

            <box flexDirection="row" width="100%" height={1} marginTop={1} justifyContent="space-between">
              <text content="[enter] next / save" textColor={COLORS.muted} />
              <text content="[esc] cancel" textColor={COLORS.muted} />
            </box>
          </box>
        </box>
      </Show>

      {/* Delete Confirmation Modal */}
      <Show when={showDeleteConfirm()}>
        <box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          backgroundColor="#000000"
          opacity={0.85}
          zIndex={20}
          alignItems="center"
          justifyContent="center"
        >
          <box
            width={40}
            height={6}
            border={true}
            borderColor={COLORS.border}
            title=" Confirm Delete "
            titleColor={COLORS.orange}
            backgroundColor={COLORS.panelBg}
            zIndex={21}
            flexDirection="column"
            padding={{ left: 2, right: 2, top: 1, bottom: 1 }}
            gap={1}
          >
            <box height={1}>
              <text content={`delete '${hostToDelete()?.name || ""}'?`} textColor={COLORS.title} />
            </box>
            <box flexDirection="row" width="100%" height={1} marginTop={1} justifyContent="space-between">
              <text content="[enter] yes" textColor={COLORS.muted} />
              <text content="[q] no" textColor={COLORS.muted} />
            </box>
          </box>
        </box>
      </Show>
    </box>
  )
}

render(() => <App />)
