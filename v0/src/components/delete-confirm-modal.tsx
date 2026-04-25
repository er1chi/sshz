import { Show } from "solid-js"
import { COLORS } from "@/utils/colors"
import { DeleteStore } from "@/context/delete-store"

export const DeleteConfirmModal = () => {
  const [state] = DeleteStore.use()

  return (
    <Show when={state.showDeleteConfirm}>
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
          backgroundColor={COLORS.panelBg}
          zIndex={21}
          flexDirection="column"
          gap={1}
        >
          <box height={1}>
            <text content={`delete '${state.hostToDelete?.name || ""}'?`} fg={COLORS.title} />
          </box>
          <box flexDirection="row" width="100%" height={1} marginTop={1} justifyContent="space-between">
            <text content="[enter] yes" fg={COLORS.muted} />
            <text content="[q] no" fg={COLORS.muted} />
          </box>
        </box>
      </box>
    </Show>
  )
}
