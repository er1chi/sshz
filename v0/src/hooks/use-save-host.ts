import { getSshHosts, appendSshHost, updateSshHost } from "@/utils/ssh";
import { HostListStore } from "@/context/host-list-store";
import { FormStore } from "@/context/form-store";

export const useSaveHost = () => {
  const [, setHostList] = HostListStore.use();
  const [form, setForm] = FormStore.use();

  return () => {
    if (!form.host.alias || !form.host.hostname || !form.host.user) return;
    if (form.isEditing) {
      const unchanged =
        form.host.alias === form.original.alias &&
        form.host.hostname === form.original.hostname &&
        form.host.user === form.original.user &&
        form.host.port === form.original.port &&
        form.host.identityFile === form.original.identityFile;
      if (unchanged) return;
      updateSshHost(
        form.original.alias,
        form.host.alias,
        form.host.hostname,
        form.host.user,
        form.host.port || undefined,
        form.host.identityFile || undefined,
      );
    } else {
      appendSshHost(
        form.host.alias,
        form.host.hostname,
        form.host.user,
        form.host.port || undefined,
        form.host.identityFile || undefined,
      );
    }
    setHostList("hosts", getSshHosts());
    setForm("showModal", false);
    setForm({
      host: {
        alias: "",
        hostname: "",
        user: "",
        port: "",
        identityFile: "",
      },
      showOptions: false,
      isEditing: false,
    });
  };
};
