import { getSshHosts, appendSshHost, updateSshHost } from "@/utils/ssh";
import { HostListStore } from "@/context/host-list-store";
import { FormStore } from "@/context/form-store";
import { useDialog } from "@opentui-ui/dialog/solid";

export const useSaveHost = () => {
  const [, setHostList] = HostListStore.use();
  const [form] = FormStore.use();
  const dialog = useDialog();

  return () => {
    if (!form.host.alias || !form.host.hostname || !form.host.user) return;
    if (form.isEditing && !form.isDirty) return;
    if (form.isEditing) {
      updateSshHost(form.host, form.editingAlias!);
    } else {
      appendSshHost(form.host);
    }
    setHostList("hosts", getSshHosts());
    dialog.close();
  };
};
