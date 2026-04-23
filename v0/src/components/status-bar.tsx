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
      padding={{ left: 1, right: 1 }}
    >
      <box flexDirection="row" gap={2}>
        <text content="[^n] new host" textColor={COLORS.accessory} />
        <text content="[^e] edit" textColor={COLORS.accessory} />
        <text content="[^d] delete" textColor={COLORS.accessory} />
        <text content="[^q] quit" textColor={COLORS.accessory} />
        <text content="[↵] connect" textColor={COLORS.accessory} />
        <text content={state.showIPs ? "[^s] hide ips" : "[^s] show ips"} textColor={COLORS.accessory} />
        <Show when={state.searchQuery.length > 1}>
          <text content="[esc] clear" textColor={COLORS.accessory} />
        </Show>
      </box>
      <box flexGrow={1} />
      <Show when={state.statusMessage}>
        <text content={state.statusMessage} textColor={COLORS.orange} />
      </Show>
      <Show when={!state.statusMessage && state.hosts.length > 0}>
        <text content={`${state.hosts.length} hosts`} textColor={COLORS.muted} />
      </Show>
    </box>
  )
}
