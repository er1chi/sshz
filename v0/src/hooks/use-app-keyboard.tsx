import { useRenderer, useKeyboard } from "@opentui/solid";
import { type SelectOption } from "@opentui/core";
import * as fs from "node:fs";
import { createMemo } from "solid-js";
import { toast } from "@opentui-ui/toast/solid";
import { useDialog, useDialogState } from "@opentui-ui/dialog/solid";
import { getSshHosts, getHostDetails, deleteSshHost } from "@/utils/ssh";
import { outputFile, filterHosts } from "@/utils/helpers";
import { HostListStore } from "@/context/host-list-store";
import { blankHost, FormStore } from "@/context/form-store";
import { useSaveHost } from "@/hooks/use-save-host";
import { HostModal } from "@/components/host-modal";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { COLORS } from "../utils/colors";

export const useAppKeyboard = () => {
  const renderer = useRenderer();
  const [hostList, setHostList] = HostListStore.use();
  const [, setForm] = FormStore.use();
  const dialog = useDialog();
  const isDialogOpen = useDialogState((s) => s.isOpen);
  const saveHost = useSaveHost();

  const filteredHosts = createMemo(() =>
    filterHosts(hostList.hosts, hostList.searchQuery),
  );

  const resetForm = () => {
    setForm({
      host: blankHost,
      showOptions: false,
      isEditing: false,
      isDirty: false,
      editingAlias: undefined,
      focusedField: "alias",
    });
  };

  const openHostModal = (hostToEdit?: SelectOption) => {
    if (hostToEdit) {
      const details = getHostDetails(hostToEdit.name);
      if (!details) return;
      setForm({
        host: details,
        showOptions: !!details.port || !!details.identityFile,
        isEditing: true,
        isDirty: false,
        editingAlias: details.alias,
        focusedField: "alias",
      });
    } else {
      resetForm();
    }
    let id: ReturnType<typeof dialog.show>;
    id = dialog.show({
      content: () => <HostModal dialogId={id} saveHost={saveHost} />,
      unstyled: true,
      onClose: () => resetForm(),
    });
  };

  const handleSelectHost = (host: SelectOption) => {
    const hostValue = host.value || host.name;
    fs.writeFileSync(outputFile, hostValue);
    renderer.destroy();
    process.exit(0);
  };

  const handleDelete = async (host: SelectOption) => {
    const confirmed = await dialog.confirm({
      content: (ctx) => () => <DeleteConfirmModal ctx={ctx} host={host} />,
      unstyled: true,
      fallback: false,
    });

    if (confirmed && deleteSshHost(host.name)) {
      const newHosts = getSshHosts();
      setHostList("hosts", newHosts);
      const newFiltered = filterHosts(newHosts, hostList.searchQuery);
      setHostList(
        "selectedIndex",
        Math.min(hostList.selectedIndex, Math.max(0, newFiltered.length - 1)),
      );
      toast.success(`Deleted host '${host.name}'`);
    }
  };

  useKeyboard(async (key) => {
    if (isDialogOpen()) return;

    if (key.name === "n" && key.ctrl && !key.meta && !key.shift) {
      openHostModal();
      return;
    }

    if (key.name === "e" && key.ctrl && !key.meta && !key.shift) {
      key.stopPropagation();
      const hostsList = filteredHosts();
      if (hostsList.length > 0) {
        openHostModal(hostsList[hostList.selectedIndex]);
      }
      return;
    }

    if (key.name === "q" && key.ctrl && !key.meta && !key.shift) {
      renderer.destroy();
      process.exit(1);
    }
    if (key.name === "d" && key.ctrl && !key.meta && !key.shift) {
      key.stopPropagation();
      const hostsList = filteredHosts();
      if (hostsList.length > 0) {
        await handleDelete(hostsList[hostList.selectedIndex]);
      }
      return;
    }
    if (
      key.name === "up" ||
      (key.name === "k" && !hostList.isSearching && !key.ctrl && !key.meta)
    ) {
      key.stopPropagation();
      const total = filteredHosts().length;
      if (total > 0) {
        setHostList("selectedIndex", (prev) => (prev - 1 + total) % total);
      }
      return;
    }
    if (
      key.name === "down" ||
      (key.name === "j" && !hostList.isSearching && !key.ctrl && !key.meta)
    ) {
      key.stopPropagation();
      const total = filteredHosts().length;
      if (total > 0) {
        setHostList("selectedIndex", (prev) => (prev + 1) % total);
      }
      return;
    }
    if (key.name === "return") {
      key.stopPropagation();
      const hostsList = filteredHosts();
      if (hostsList.length > 0) {
        handleSelectHost(hostsList[hostList.selectedIndex]);
      }
      return;
    }
    if (key.ctrl && key.name === "u") {
      key.stopPropagation();
      setHostList("isSearching", false);
      setHostList("searchQuery", "");
      setHostList("selectedIndex", 0);
      return;
    }
    if (key.name === "/" && !hostList.isSearching && !key.ctrl && !key.meta) {
      key.stopPropagation();
      setHostList("isSearching", true);
      setHostList("searchQuery", "");
      setHostList("selectedIndex", 0);
      return;
    }
    if (
      hostList.isSearching &&
      key.name &&
      key.name.length === 1 &&
      !key.ctrl &&
      !key.meta
    ) {
      key.stopPropagation();
      setHostList("searchQuery", (prev) => prev + key.name);
      setHostList("selectedIndex", 0);
      return;
    }
    if (key.name === "backspace") {
      if (hostList.isSearching) {
        key.stopPropagation();
        const next = hostList.searchQuery.slice(0, -1);
        setHostList("searchQuery", next);
        if (next.length === 0) {
          setHostList("isSearching", false);
        }
        setHostList("selectedIndex", 0);
      }
      return;
    }
    if (key.name === "escape") {
      if (hostList.isSearching) {
        key.stopPropagation();
        setHostList("isSearching", false);
        setHostList("searchQuery", "");
        setHostList("selectedIndex", 0);
      }
      return;
    }
    if (key.name === "s" && key.ctrl && !key.meta && !key.shift) {
      key.stopPropagation();
      setHostList("showIPs", (prev) => !prev);
      return;
    }
  });
};
