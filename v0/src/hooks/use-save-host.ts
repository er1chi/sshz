import { getSshHosts, appendSshHost, updateSshHost, validateSshHost } from "@/utils/ssh";
import { HostListStore } from "@/context/host-list-store";
import { FormStore } from "@/context/form-store";
import { useDialog } from "@opentui-ui/dialog/solid";
import { toast } from "@opentui-ui/toast/solid";

export const useSaveHost = () => {
  const [, setHostList] = HostListStore.use();
  const [form] = FormStore.use();
  const dialog = useDialog();

  return () => {
    const validation = validateSshHost(form.host);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Invalid SSH host");
      return;
    }
    if (form.isEditing && !form.isDirty) return;
    if (form.isEditing) {
      updateSshHost(validation.data, form.editingAlias!);
    } else {
      appendSshHost(validation.data);
    }
    setHostList("hosts", getSshHosts());
    dialog.close();
  };
};
