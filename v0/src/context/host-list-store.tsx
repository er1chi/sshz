import type { SelectOption } from "@opentui/core"
import { getSshHosts } from "@/utils/ssh"
import { createSimpleContext } from "@/utils/create-simple-context"

interface HostListState {
  hosts: SelectOption[]
  selectedIndex: number
  searchQuery: string
  isSearching: boolean
  showIPs: boolean
}

const init: HostListState = {
  hosts: getSshHosts(),
  selectedIndex: 0,
  searchQuery: "",
  isSearching: false,
  showIPs: false,
}

export const HostListStore = createSimpleContext<HostListState>({
  name: "HostList",
  init,
})
