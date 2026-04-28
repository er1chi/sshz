import { Show } from "solid-js"
import { COLORS } from "@/utils/colors"
import { HostListStore } from "@/context/host-list-store"

export const StatusBar = () => {
  const [state] = HostListStore.use()

  return (
    <box
      height={1}
      backgroundColor={COLORS.panelBg}
      flexDirection="row"
      alignItems="center"
      width="100%"
    >
      <box flexDirection="row" gap={2}>
        <text content="[^n] new host" fg={COLORS.accessory} />
        <text content="[^e] edit" fg={COLORS.accessory} />
        <text content="[^d] delete" fg={COLORS.accessory} />
        <text content="[^q] quit" fg={COLORS.accessory} />
        <text content="[↵] connect" fg={COLORS.accessory} />
        <text content={state.showIPs ? "[^s] hide ips" : "[^s] show ips"} fg={COLORS.accessory} />
        <text content="[/] search" fg={COLORS.accessory} />
        <Show when={state.isSearching}>
          <text content="[esc] clear" fg={COLORS.accessory} />
        </Show>
      </box>
      <box flexGrow={1} />
      <Show when={state.hosts.length > 0}>
        <text content={`${state.hosts.length} hosts`} fg={COLORS.muted} />
      </Show>
    </box>
  )
}
