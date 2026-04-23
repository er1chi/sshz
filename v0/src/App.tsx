import { COLORS } from "@/utils/colors"
import { HostListStore } from "@/context/host-list-store"
import { FormStore } from "@/context/form-store"
import { DeleteStore } from "@/context/delete-store"
import { useAppKeyboard } from "@/hooks/use-app-keyboard"
import { useSaveHost } from "@/hooks/use-save-host"
import { Header } from "@/components/header"
import { ListView } from "@/components/list-view"
import { StatusBar } from "@/components/status-bar"
import { HostModal } from "@/components/host-modal"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"

const AppContent = () => {
  const { nextField } = useAppKeyboard()
  const saveHost = useSaveHost()

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={COLORS.bg}>
      <Header />
      <ListView />
      <StatusBar />
      <HostModal
        nextField={nextField}
        saveHost={saveHost}
      />
      <DeleteConfirmModal />
    </box>
  )
}

export const App = () => (
  <HostListStore.provider>
    <FormStore.provider>
      <DeleteStore.provider>
        <AppContent />
      </DeleteStore.provider>
    </FormStore.provider>
  </HostListStore.provider>
)
