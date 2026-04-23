import { COLORS } from "@/utils/colors"

export const Header = () => (
  <box flexDirection="column" width="100%" padding={{ left: 2, right: 2, top: 1, bottom: 0 }}>
    <box flexDirection="row" alignItems="center" height={1}>
      <text content="sshz" textColor={COLORS.title} />
      <text content=" — SSH Host Manager" textColor={COLORS.muted} />
    </box>
    <box height={1} width="100%" backgroundColor={COLORS.separator} marginTop={1} />
  </box>
)
