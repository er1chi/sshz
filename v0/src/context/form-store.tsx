import { createSimpleContext } from "@/utils/create-simple-context";
import type { FocusField } from "@/types";

interface SSH_Host {
  alias: string;
  hostname: string;
  user: string;
  port: string;
  identityFile: string;
}
interface FormState {
  showModal: boolean;
  showOptions: boolean;
  focusedField: FocusField;
  isEditing: boolean;
  host: SSH_Host;
  original: SSH_Host;
}

export const blankHost = {
  alias: "",
  hostname: "",
  user: "",
  port: "",
  identityFile: "",
};

const init: FormState = {
  showModal: false,
  showOptions: false,
  focusedField: "alias",
  isEditing: false,
  host: blankHost,
  original: blankHost,
};

export const FormStore = createSimpleContext<FormState>({
  name: "Form",
  init,
});

