import { getSshHosts, appendSshHost, updateSshHost } from "@/utils/ssh"
import { HostListStore } from "@/context/host-list-store"
import { FormStore } from "@/context/form-store"

export const useSaveHost = () => {
  const [, setHostList] = HostListStore.use()
  const [form, setForm] = FormStore.use()

  return () => {
    if (!form.alias || !form.hostname || !form.user) return
    if (form.isEditing) {
      const unchanged =
        form.alias === form.originalAlias &&
        form.hostname === form.originalHostname &&
        form.user === form.originalUser &&
        form.port === form.originalPort &&
        form.identityFile === form.originalIdentityFile
      if (unchanged) return
      updateSshHost(form.originalAlias, form.alias, form.hostname, form.user, form.port || undefined, form.identityFile || undefined)
    } else {
      appendSshHost(form.alias, form.hostname, form.user, form.port || undefined, form.identityFile || undefined)
    }
    setHostList("hosts", getSshHosts())
    setForm("showModal", false)
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
}
