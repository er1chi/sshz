import { useRenderer, useKeyboard } from "@opentui/solid"
import { type SelectOption } from "@opentui/core"
import * as fs from "node:fs"
import { createSignal, createMemo } from "solid-js"
import { COLORS } from "@/utils/colors"
import { getSshHosts, appendSshHost, getHostDetails, updateSshHost, deleteSshHost } from "@/utils/ssh"
import { outputFile, filterHosts } from "@/utils/helpers"
import { type FocusField } from "@/types"
import { Header } from "@/components/Header"
import { ListView } from "@/components/ListView"
import { StatusBar } from "@/components/StatusBar"
import { HostModal } from "@/components/HostModal"
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal"

export const App = () => {
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
  const [showIPs, setShowIPs] = createSignal(false)

  const [alias, setAlias] = createSignal("")
  const [hostname, setHostname] = createSignal("")
  const [user, setUser] = createSignal("")
  const [port, setPort] = createSignal("")
  const [identityFile, setIdentityFile] = createSignal("")

  const [isEditing, setIsEditing] = createSignal(false)
  const [originalAlias, setOriginalAlias] = createSignal("")
  const [originalHostname, setOriginalHostname] = createSignal("")
  const [originalUser, setOriginalUser] = createSignal("")
  const [originalPort, setOriginalPort] = createSignal("")
  const [originalIdentityFile, setOriginalIdentityFile] = createSignal("")

  const hasChanges = createMemo(() => {
    if (!isEditing()) return true
    return (
      alias() !== originalAlias() ||
      hostname() !== originalHostname() ||
      user() !== originalUser() ||
      port() !== originalPort() ||
      identityFile() !== originalIdentityFile()
    )
  })

  const filteredHosts = createMemo(() => filterHosts(hosts(), searchQuery()))

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

  const resetForm = () => {
    setAlias("")
    setHostname("")
    setUser("")
    setPort("")
    setIdentityFile("")
    setShowOptions(false)
    setIsEditing(false)
  }

  const openEditModal = (host: SelectOption) => {
    const details = getHostDetails(host.name)
    if (!details) return
    setOriginalAlias(details.alias)
    setOriginalHostname(details.hostname)
    setOriginalUser(details.user)
    setOriginalPort(details.port)
    setOriginalIdentityFile(details.identityFile)
    setAlias(details.alias)
    setHostname(details.hostname)
    setUser(details.user)
    setPort(details.port)
    setIdentityFile(details.identityFile)
    setShowOptions(!!details.port || !!details.identityFile)
    setIsEditing(true)
    setFocusedField("alias")
    setShowModal(true)
  }

  const saveHost = () => {
    if (!alias() || !hostname() || !user()) return
    if (isEditing() && !hasChanges()) return
    if (isEditing()) {
      updateSshHost(originalAlias(), alias(), hostname(), user(), port() || undefined, identityFile() || undefined)
    } else {
      appendSshHost(alias(), hostname(), user(), port() || undefined, identityFile() || undefined)
    }
    setHosts(getSshHosts())
    setShowModal(false)
    resetForm()
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
          const newFiltered = filterHosts(newHosts, searchQuery())
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
        resetForm()
        setShowModal(true)
        setFocusedField("alias")
        return
      }
      if (key.name === "e" && key.ctrl && !key.meta && !key.shift) {
        key.stopPropagation()
        const hostsList = filteredHosts()
        if (hostsList.length > 0) {
          openEditModal(hostsList[selectedIndex()])
        }
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
      if (key.name === "s" && key.ctrl && !key.meta && !key.shift) {
        key.stopPropagation()
        setShowIPs((prev) => !prev)
        return
      }
      return
    }

    if (key.name === "escape") {
      setShowModal(false)
      resetForm()
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
      <Header />
      <ListView
        hosts={hosts}
        filteredHosts={filteredHosts}
        selectedIndex={selectedIndex}
        searchQuery={searchQuery}
        showIPs={showIPs}
      />
      <StatusBar
        showIPs={showIPs}
        searchQuery={searchQuery}
        statusMessage={statusMessage}
        hosts={hosts}
      />
      <HostModal
        showModal={showModal}
        showOptions={showOptions}
        focusedField={focusedField}
        alias={alias}
        hostname={hostname}
        user={user}
        port={port}
        identityFile={identityFile}
        isEditing={isEditing}
        hasChanges={hasChanges}
        setShowOptions={setShowOptions}
        setAlias={setAlias}
        setHostname={setHostname}
        setUser={setUser}
        setPort={setPort}
        setIdentityFile={setIdentityFile}
        nextField={nextField}
        saveHost={saveHost}
      />
      <DeleteConfirmModal
        showDeleteConfirm={showDeleteConfirm}
        hostToDelete={hostToDelete}
      />
    </box>
  )
}
