import { useRenderer, useKeyboard } from "@opentui/solid"
import { type SelectOption } from "@opentui/core"
import * as fs from "node:fs"
import { createMemo } from "solid-js"
import { getSshHosts, getHostDetails, deleteSshHost } from "@/utils/ssh"
import { outputFile, filterHosts } from "@/utils/helpers"
import { type FocusField } from "@/types"
import { HostListStore } from "@/context/host-list-store"
import { FormStore } from "@/context/form-store"
import { DeleteStore } from "@/context/delete-store"

export const useAppKeyboard = () => {
  const renderer = useRenderer()
  const [hostList, setHostList] = HostListStore.use()
  const [form, setForm] = FormStore.use()
  const [deleteState, setDelete] = DeleteStore.use()

  const filteredHosts = createMemo(() => filterHosts(hostList.hosts, hostList.searchQuery))

  const fieldOrder: FocusField[] = ["alias", "hostname", "user", "options", "port", "identityFile"]

  const visibleFields = (): FocusField[] => {
    if (form.showOptions) return fieldOrder
    return ["alias", "hostname", "user", "options"]
  }

  const nextField = () => {
    const visible = visibleFields()
    const idx = visible.indexOf(form.focusedField)
    const next = visible[(idx + 1) % visible.length]
    setForm("focusedField", next)
  }

  const prevField = () => {
    const visible = visibleFields()
    const idx = visible.indexOf(form.focusedField)
    const prev = visible[(idx - 1 + visible.length) % visible.length]
    setForm("focusedField", prev)
  }

  const resetForm = () => {
    setForm({
      alias: "",
      hostname: "",
      user: "",
      port: "",
      identityFile: "",
      showOptions: false,
      isEditing: false,
    })
  }

  const openEditModal = (host: SelectOption) => {
    const details = getHostDetails(host.name)
    if (!details) return
    setForm({
      originalAlias: details.alias,
      originalHostname: details.hostname,
      originalUser: details.user,
      originalPort: details.port,
      originalIdentityFile: details.identityFile,
      alias: details.alias,
      hostname: details.hostname,
      user: details.user,
      port: details.port,
      identityFile: details.identityFile,
      showOptions: !!details.port || !!details.identityFile,
      isEditing: true,
      focusedField: "alias",
      showModal: true,
    })
  }

  const handleSelectHost = (host: SelectOption) => {
    const hostValue = host.value || host.name
    fs.writeFileSync(outputFile, hostValue)
    renderer.destroy()
    process.exit(0)
  }

  useKeyboard((key) => {
    if (deleteState.showDeleteConfirm) {
      if (key.name === "return") {
        key.stopPropagation()
        const host = deleteState.hostToDelete
        if (host && deleteSshHost(host.name)) {
          const newHosts = getSshHosts()
          setHostList("hosts", newHosts)
          const newFiltered = filterHosts(newHosts, hostList.searchQuery)
          setHostList("selectedIndex", Math.min(hostList.selectedIndex, Math.max(0, newFiltered.length - 1)))
          setHostList("statusMessage", `Deleted host '${host.name}'`)
          setTimeout(() => setHostList("statusMessage", ""), 3000)
        }
        setDelete("showDeleteConfirm", false)
        setDelete("hostToDelete", null)
        return
      }
      if (key.name === "q") {
        key.stopPropagation()
        setDelete("showDeleteConfirm", false)
        setDelete("hostToDelete", null)
        return
      }
      if (key.name === "escape") {
        setDelete("showDeleteConfirm", false)
        setDelete("hostToDelete", null)
        return
      }
      return
    }

    if (!form.showModal) {
      if (key.name === "n" && key.ctrl && !key.meta && !key.shift) {
        resetForm()
        setForm({ showModal: true, focusedField: "alias" })
        return
      }
      if (key.name === "e" && key.ctrl && !key.meta && !key.shift) {
        key.stopPropagation()
        const hostsList = filteredHosts()
        if (hostsList.length > 0) {
          openEditModal(hostsList[hostList.selectedIndex])
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
          setDelete("hostToDelete", hostsList[hostList.selectedIndex])
          setDelete("showDeleteConfirm", true)
        }
        return
      }
      if (key.name === "up") {
        key.stopPropagation()
        const total = filteredHosts().length
        if (total > 0) {
          setHostList("selectedIndex", (prev) => (prev - 1 + total) % total)
        }
        return
      }
      if (key.name === "down") {
        key.stopPropagation()
        const total = filteredHosts().length
        if (total > 0) {
          setHostList("selectedIndex", (prev) => (prev + 1) % total)
        }
        return
      }
      if (key.name === "return") {
        key.stopPropagation()
        const hostsList = filteredHosts()
        if (hostsList.length > 0) {
          handleSelectHost(hostsList[hostList.selectedIndex])
        }
        return
      }
      if (key.ctrl && key.name === "u") {
        key.stopPropagation()
        setHostList("searchQuery", "")
        setHostList("selectedIndex", 0)
        return
      }
      // Any printable character starts search
      if (key.name && key.name.length === 1 && !key.ctrl && !key.meta) {
        key.stopPropagation()
        setHostList("searchQuery", (prev) => prev + key.name)
        setHostList("selectedIndex", 0)
        return
      }
      if (key.name === "backspace") {
        key.stopPropagation()
        setHostList("searchQuery", (prev) => prev.slice(0, -1))
        setHostList("selectedIndex", 0)
        return
      }
      if (key.name === "escape") {
        key.stopPropagation()
        setHostList("searchQuery", "")
        setHostList("selectedIndex", 0)
        return
      }
      if (key.name === "s" && key.ctrl && !key.meta && !key.shift) {
        key.stopPropagation()
        setHostList("showIPs", (prev) => !prev)
        return
      }
      return
    }

    if (key.name === "escape") {
      setForm("showModal", false)
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

  return { nextField }
}
