import { COLORS } from "@/utils/colors"
import { HostListStore } from "@/context/host-list-store"
import { FormStore } from "@/context/form-store"
import { useAppKeyboard } from "@/hooks/use-app-keyboard"
import { Header } from "@/components/header"
import { ListView } from "@/components/list-view"
import { StatusBar } from "@/components/status-bar"
import { DialogProvider } from "@opentui-ui/dialog/solid"
import { Toaster } from "@opentui-ui/toast/solid"

const AppContent = () => {
  useAppKeyboard()

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={COLORS.bg}>
      <Header />
      <ListView />
      <StatusBar />
    </box>
  )
}

export const App = () => (
  <HostListStore.provider>
    <FormStore.provider>
      <DialogProvider>
        <Toaster position="top-right" />
        <AppContent />
      </DialogProvider>
    </FormStore.provider>
  </HostListStore.provider>
)
