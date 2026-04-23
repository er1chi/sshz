import { Show } from "solid-js"
import { COLORS } from "@/utils/colors"
import type { SelectOption } from "@opentui/core"
import type { Accessor } from "solid-js"

interface DeleteConfirmModalProps {
  showDeleteConfirm: Accessor<boolean>
  hostToDelete: Accessor<SelectOption | null>
}

export const DeleteConfirmModal = (props: DeleteConfirmModalProps) => (
  <Show when={props.showDeleteConfirm()}>
    <box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      backgroundColor="#000000"
      opacity={0.85}
      zIndex={20}
      alignItems="center"
      justifyContent="center"
    >
      <box
        width={40}
        height={6}
        border={true}
        borderColor={COLORS.border}
        title=" Confirm Delete "
        titleColor={COLORS.orange}
        backgroundColor={COLORS.panelBg}
        zIndex={21}
        flexDirection="column"
        padding={{ left: 2, right: 2, top: 1, bottom: 1 }}
        gap={1}
      >
        <box height={1}>
          <text content={`delete '${props.hostToDelete()?.name || ""}'?`} textColor={COLORS.title} />
        </box>
        <box flexDirection="row" width="100%" height={1} marginTop={1} justifyContent="space-between">
          <text content="[enter] yes" textColor={COLORS.muted} />
          <text content="[q] no" textColor={COLORS.muted} />
        </box>
      </box>
    </box>
  </Show>
)
