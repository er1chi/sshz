import { Show, createMemo } from "solid-js"
import { COLORS } from "@/utils/colors"
import { FormStore } from "@/context/form-store"

interface HostModalProps {
  nextField: () => void
  saveHost: () => void
}

export const HostModal = (props: HostModalProps) => {
  const [form, setForm] = FormStore.use()

  const hasChanges = createMemo(() => {
    if (!form.isEditing) return true
    return (
      form.host.alias !== form.original.alias ||
      form.host.hostname !== form.original.hostname ||
      form.host.user !== form.original.user ||
      form.host.port !== form.original.port ||
      form.host.identityFile !== form.original.identityFile
    )
  })

  return (
    <Show when={form.showModal}>
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
          height={form.showOptions ? 20 : 14}
          border={true}
          borderColor={COLORS.border}
          title={form.isEditing ? " Edit Host " : " New Host "}
          // titleColor={COLORS.orange}
          backgroundColor={COLORS.panelBg}
          zIndex={11}
          flexDirection="column"
          padding={1}
          // padding={{ left: 2, right: 2, top: 1, bottom: 1 }}
        >
          <box flexDirection="column" gap={1} flexGrow={1}>
            <box flexDirection="row" width="100%" height={1}>
              <text content="Alias" width={12} />
              <input
                value={form.host.alias}
                onChange={(v: string) => setForm("host", { alias: v })}
                onSubmit={() => props.nextField()}
                placeholder="production"
                width={40}
                focused={form.focusedField === "alias"}
                backgroundColor={form.focusedField === "alias" ? COLORS.inputBg : undefined}
                textColor={COLORS.title}
                placeholderColor={COLORS.placeholder}
              />
            </box>

            <box flexDirection="row" width="100%" height={1}>
              <text content="Host" width={12} fg={COLORS.accessory} />
              <input
                value={form.host.hostname}
                onChange={(v: string) => setForm("host", { hostname: v })}
                onSubmit={() => props.nextField()}
                placeholder="prod.example.com"
                width={40}
                focused={form.focusedField === "hostname"}
                backgroundColor={form.focusedField === "hostname" ? COLORS.inputBg : undefined}
                textColor={COLORS.title}
                placeholderColor={COLORS.placeholder}
              />
            </box>

            <box flexDirection="row" width="100%" height={1}>
              <text content="User" width={12} fg={COLORS.accessory} />
              <input
                value={form.host.user}
                onChange={(v: string) => setForm("host", { user: v })}
                onSubmit={() => props.nextField()}
                placeholder="deploy"
                width={40}
                focused={form.focusedField === "user"}
                backgroundColor={form.focusedField === "user" ? COLORS.inputBg : undefined}
                textColor={COLORS.title}
                placeholderColor={COLORS.placeholder}
              />
            </box>

            <box
              flexDirection="row"
              width="100%"
              height={1}
              focusable={true}
              focused={form.focusedField === "options"}
              backgroundColor={form.focusedField === "options" ? COLORS.inputBg : undefined}
              onKeyDown={(key: { name: string }) => {
                if (key.name === "return") {
                  setForm("showOptions", (prev) => !prev)
                }
              }}
            >
              <text
                content={form.showOptions ? "▲ Fewer options" : "▼ More options"}
                fg={form.focusedField === "options" ? COLORS.orange : COLORS.accessory}
              />
            </box>

            <Show when={form.showOptions}>
              <box flexDirection="row" width="100%" height={1}>
                <text content="Port" width={12} fg={COLORS.accessory} />
                <input
                  value={form.host.port}
                  onChange={(v: string) => setForm("host", { port: v })}
                  onSubmit={() => props.nextField()}
                  placeholder="22"
                  width={40}
                  focused={form.focusedField === "port"}
                  backgroundColor={form.focusedField === "port" ? COLORS.inputBg : undefined}
                  textColor={COLORS.title}
                  placeholderColor={COLORS.placeholder}
                />
              </box>

              <box flexDirection="row" width="100%" height={1}>
                <text content="Key" width={12} fg={COLORS.accessory} />
                <input
                  value={form.host.identityFile}
                  onChange={(v: string) => setForm("host", { identityFile: v })}
                  onSubmit={props.saveHost}
                  placeholder="~/.ssh/id_rsa"
                  width={40}
                  focused={form.focusedField === "identityFile"}
                  backgroundColor={form.focusedField === "identityFile" ? COLORS.inputBg : undefined}
                  textColor={COLORS.title}
                  placeholderColor={COLORS.placeholder}
                />
              </box>
            </Show>
          </box>

          <box flexDirection="row" width="100%" height={1} marginTop={1} justifyContent="space-between">
            <Show when={form.isEditing && !hasChanges()} fallback={
              <text content="[enter] next / save" fg={COLORS.muted} />
            }>
              <text content="[enter] next" fg={COLORS.muted} />
            </Show>
            <text content="[esc] cancel" fg={COLORS.muted} />
          </box>
        </box>
      </box>
    </Show>
  )
}
