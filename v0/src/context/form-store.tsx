import { createSimpleContext } from "@/utils/create-simple-context";
import type { FocusField } from "@/types";

export interface SSH_Host {
  alias: string;
  hostname: string;
  user: string;
  port: string;
  identityFile: string;
}

interface FormState {
  showOptions: boolean;
  focusedField: FocusField;
  isEditing: boolean;
  isDirty: boolean;
  editingAlias: string | undefined;
  host: SSH_Host;
}

export const blankHost = {
  alias: "",
  hostname: "",
  user: "",
  port: "",
  identityFile: "",
};

const init: FormState = {
  showOptions: false,
  focusedField: "alias",
  isEditing: false,
  isDirty: false,
  editingAlias: undefined,
  host: blankHost,
};

export const FormStore = createSimpleContext<FormState>({
  name: "Form",
  init,
});
