import { useKeyboard } from "@opentui/solid";
import {
  useDialogKeyboard,
  type ConfirmContext,
} from "@opentui-ui/dialog/solid";
import { COLORS } from "@/utils/colors";
import type { SelectOption } from "@opentui/core";

interface DeleteConfirmModalProps {
  ctx: ConfirmContext;
  host: SelectOption;
}

export const DeleteConfirmModal = (props: DeleteConfirmModalProps) => {
  useDialogKeyboard((key) => {
    if (key.name === "return") {
      props.ctx.resolve(true);
      return;
    }
    if (key.name === "q" || key.name === 'escape') {
      props.ctx.resolve(false);
      return;
    }
  }, props.ctx.dialogId);

  return (
    <box
      width={40}
      height={6}
      border={true}
      borderColor={COLORS.border}
      title=" Confirm Delete "
      backgroundColor={COLORS.panelBg}
      flexDirection="column"
      gap={1}
    >
      <box height={1}>
        <text content={`delete '${props.host.name}'?`} fg={COLORS.title} />
      </box>
      <box
        flexDirection="row"
        width="100%"
        height={1}
        marginTop={1}
        justifyContent="space-between"
      >
        <text content="[enter] yes" fg={COLORS.muted} />
        <text content="[q] no" fg={COLORS.muted} />
      </box>
    </box>
  );
};
