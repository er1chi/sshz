import { COLORS } from "@/utils/colors"

export const Header = () => (
  <box flexDirection="column" width="100%">
    <box flexDirection="row" alignItems="center" height={1}>
      <text content="sshz" fg={COLORS.title} />
      <text content=" — SSH Host Manager" fg={COLORS.muted} />
    </box>
    <box height={1} width="100%" backgroundColor={COLORS.separator} marginTop={1} />
  </box>
)
