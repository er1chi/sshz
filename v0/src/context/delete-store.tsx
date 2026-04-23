import type { SelectOption } from "@opentui/core"
import { createSimpleContext } from "@/utils/create-simple-context"

interface DeleteState {
  showDeleteConfirm: boolean
  hostToDelete: SelectOption | null
}

const init: DeleteState = {
  showDeleteConfirm: false,
  hostToDelete: null,
}

export const DeleteStore = createSimpleContext<DeleteState>({
  name: "Delete",
  init,
})
