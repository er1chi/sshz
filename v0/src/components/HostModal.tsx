import { Show } from "solid-js"
import { COLORS } from "@/utils/colors"
import type { FocusField } from "@/types"
import type { Accessor } from "solid-js"

interface HostModalProps {
  showModal: Accessor<boolean>
  showOptions: Accessor<boolean>
  focusedField: Accessor<FocusField>
  alias: Accessor<string>
  hostname: Accessor<string>
  user: Accessor<string>
  port: Accessor<string>
  identityFile: Accessor<string>
  isEditing: Accessor<boolean>
  hasChanges: Accessor<boolean>
  setShowOptions: (show: boolean) => void
  setAlias: (v: string) => void
  setHostname: (v: string) => void
  setUser: (v: string) => void
  setPort: (v: string) => void
  setIdentityFile: (v: string) => void
  nextField: () => void
  saveHost: () => void
}

export const HostModal = (props: HostModalProps) => (
  <Show when={props.showModal()}>
    <box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      backgroundColor="#000000"
      opacity={0.85}
      zIndex={10}
      alignItems="center"
      justifyContent="center"
    >
      <box
        width={56}
        height={props.showOptions() ? 20 : 14}
        border={true}
        borderColor={COLORS.border}
        title={props.isEditing() ? " Edit Host " : " New Host "}
        titleColor={COLORS.orange}
        backgroundColor={COLORS.panelBg}
        zIndex={11}
        flexDirection="column"
        padding={{ left: 2, right: 2, top: 1, bottom: 1 }}
      >
        <box flexDirection="column" gap={1} flexGrow={1}>
          <box flexDirection="row" width="100%" height={1}>
            <text content="Alias" width={12} textColor={COLORS.accessory} />
            <input
              value={props.alias()}
              onChange={props.setAlias}
              onSubmit={() => props.nextField()}
              placeholder="production"
              width={40}
              focused={props.focusedField() === "alias"}
              backgroundColor={props.focusedField() === "alias" ? COLORS.inputBg : undefined}
              textColor={COLORS.title}
              placeholderColor={COLORS.placeholder}
            />
          </box>

          <box flexDirection="row" width="100%" height={1}>
            <text content="Host" width={12} textColor={COLORS.accessory} />
            <input
              value={props.hostname()}
              onChange={props.setHostname}
              onSubmit={() => props.nextField()}
              placeholder="prod.example.com"
              width={40}
              focused={props.focusedField() === "hostname"}
              backgroundColor={props.focusedField() === "hostname" ? COLORS.inputBg : undefined}
              textColor={COLORS.title}
              placeholderColor={COLORS.placeholder}
            />
          </box>

          <box flexDirection="row" width="100%" height={1}>
            <text content="User" width={12} textColor={COLORS.accessory} />
            <input
              value={props.user()}
              onChange={props.setUser}
              onSubmit={() => props.nextField()}
              placeholder="deploy"
              width={40}
              focused={props.focusedField() === "user"}
              backgroundColor={props.focusedField() === "user" ? COLORS.inputBg : undefined}
              textColor={COLORS.title}
              placeholderColor={COLORS.placeholder}
            />
          </box>

          <box
            flexDirection="row"
            width="100%"
            height={1}
            focusable={true}
            focused={props.focusedField() === "options"}
            backgroundColor={props.focusedField() === "options" ? COLORS.inputBg : undefined}
            onKeyDown={(key: { name: string }) => {
              if (key.name === "return") {
                props.setShowOptions(!props.showOptions())
              }
            }}
          >
            <text
              content={props.showOptions() ? "▲ Fewer options" : "▼ More options"}
              textColor={props.focusedField() === "options" ? COLORS.orange : COLORS.accessory}
            />
          </box>

          <Show when={props.showOptions()}>
            <box flexDirection="row" width="100%" height={1}>
              <text content="Port" width={12} textColor={COLORS.accessory} />
              <input
                value={props.port()}
                onChange={props.setPort}
                onSubmit={() => props.nextField()}
                placeholder="22"
                width={40}
                focused={props.focusedField() === "port"}
                backgroundColor={props.focusedField() === "port" ? COLORS.inputBg : undefined}
                textColor={COLORS.title}
                placeholderColor={COLORS.placeholder}
              />
            </box>

            <box flexDirection="row" width="100%" height={1}>
              <text content="Key" width={12} textColor={COLORS.accessory} />
              <input
                value={props.identityFile()}
                onChange={props.setIdentityFile}
                onSubmit={props.saveHost}
                placeholder="~/.ssh/id_rsa"
                width={40}
                focused={props.focusedField() === "identityFile"}
                backgroundColor={props.focusedField() === "identityFile" ? COLORS.inputBg : undefined}
                textColor={COLORS.title}
                placeholderColor={COLORS.placeholder}
              />
            </box>
          </Show>
        </box>

        <box flexDirection="row" width="100%" height={1} marginTop={1} justifyContent="space-between">
          <Show when={props.isEditing() && !props.hasChanges()} fallback={
            <text content="[enter] next / save" textColor={COLORS.muted} />
          }>
            <text content="[enter] next" textColor={COLORS.muted} />
          </Show>
          <text content="[esc] cancel" textColor={COLORS.muted} />
        </box>
      </box>
    </box>
  </Show>
)
