import { Show } from "solid-js"
import { COLORS } from "@/utils/colors"
import type { SelectOption } from "@opentui/core"
import type { Accessor } from "solid-js"

interface StatusBarProps {
  showIPs: Accessor<boolean>
  searchQuery: Accessor<string>
  statusMessage: Accessor<string>
  hosts: Accessor<SelectOption[]>
}

export const StatusBar = (props: StatusBarProps) => (
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
      <text content={props.showIPs() ? "[^s] hide ips" : "[^s] show ips"} textColor={COLORS.accessory} />
      <Show when={props.searchQuery().length > 1}>
        <text content="[esc] clear" textColor={COLORS.accessory} />
      </Show>
    </box>
    <box flexGrow={1} />
    <Show when={props.statusMessage()}>
      <text content={props.statusMessage()} textColor={COLORS.orange} />
    </Show>
    <Show when={!props.statusMessage() && props.hosts().length > 0}>
      <text content={`${props.hosts().length} hosts`} textColor={COLORS.muted} />
    </Show>
  </box>
)
