import { createSimpleContext } from "@/utils/create-simple-context"
import type { FocusField } from "@/types"

interface FormState {
  showModal: boolean
  showOptions: boolean
  focusedField: FocusField
  isEditing: boolean
  alias: string
  hostname: string
  user: string
  port: string
  identityFile: string
  originalAlias: string
  originalHostname: string
  originalUser: string
  originalPort: string
  originalIdentityFile: string
}

const init: FormState = {
  showModal: false,
  showOptions: false,
  focusedField: "alias",
  isEditing: false,
  alias: "",
  hostname: "",
  user: "",
  port: "",
  identityFile: "",
  originalAlias: "",
  originalHostname: "",
  originalUser: "",
  originalPort: "",
  originalIdentityFile: "",
}

export const FormStore = createSimpleContext<FormState>({
  name: "Form",
  init,
})
