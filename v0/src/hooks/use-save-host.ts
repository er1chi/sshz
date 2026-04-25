import { getSshHosts, appendSshHost, updateSshHost } from "@/utils/ssh";
import { HostListStore } from "@/context/host-list-store";
import { blankHost, FormStore } from "@/context/form-store";

export const useSaveHost = () => {
  const [, setHostList] = HostListStore.use();
  const [form, setForm] = FormStore.use();

  return () => {
    if (!form.host.alias || !form.host.hostname || !form.host.user) return;
    if (form.isEditing && !form.isDirty) return;
    if (form.isEditing) {
      updateSshHost(form.host, form.editingAlias!);
    } else {
      appendSshHost(form.host);
    }
    setHostList("hosts", getSshHosts());
    setForm("showModal", false);
    setForm({
      host: blankHost,
      showOptions: false,
      isEditing: false,
      isDirty: false,
      editingAlias: undefined,
    });
  };
};
