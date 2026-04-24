import { Show, createMemo } from "solid-js"
import { COLORS } from "@/utils/colors"
import { getDisplayDescription, filterHosts } from "@/utils/helpers"
import { HostListStore } from "@/context/host-list-store"

const visibleCount = 10

export const ListView = () => {
  const [state] = HostListStore.use()

  const filteredHosts = createMemo(() => filterHosts(state.hosts, state.searchQuery))

  const scrollOffset = createMemo(() => {
    const idx = state.selectedIndex
    const total = filteredHosts().length
    if (total <= visibleCount) return 0
    if (idx < visibleCount - 1) return 0
    if (idx > total - visibleCount) return total - visibleCount
    return idx - Math.floor(visibleCount / 2)
  })

  const visibleHosts = createMemo(() => {
    const offset = scrollOffset()
    return filteredHosts().slice(offset, offset + visibleCount)
  })

  return (
    <box flexGrow={1} flexDirection="column" width="100%" padding={{ left: 2, right: 2, top: 1, bottom: 1 }}>
      <Show
        when={state.hosts.length > 0}
        fallback={
          <box flexGrow={1} alignItems="center" justifyContent="center" flexDirection="column" gap={1}>
            <text content="No configured SSH hosts found" textColor={COLORS.muted} />
            <text content="Press [^n] to add your first host" textColor={COLORS.accessory} />
          </box>
        }
      >
        <box flexDirection="row" height={1} marginBottom={1}>
          <text content="> " textColor={COLORS.orange} />
          <Show when={state.isSearching || state.searchQuery} fallback={
            <text content="/ to search..." textColor={COLORS.placeholder} />
          }>
            <text content={state.searchQuery} textColor={COLORS.title} />
            <text content="_" textColor={COLORS.orange} />
          </Show>
        </box>

        <box height={1} marginBottom={0} marginTop={1}>
          <text content="Configured Hosts" textColor={COLORS.orange} />
        </box>

        <box flexDirection="column" width="100%" gap={0}>
          <Show when={filteredHosts().length === 0}>
            <box height={1} marginTop={1}>
              <text content="No hosts match your search" textColor={COLORS.muted} />
            </box>
          </Show>

          {visibleHosts().map((host, i) => {
            const actualIndex = scrollOffset() + i
            const isSelected = actualIndex === state.selectedIndex
            return (
              <box
                flexDirection="row"
                width="100%"
                height={1}
                backgroundColor={isSelected ? COLORS.selectedBg : undefined}
              >
                <text
                  content={isSelected ? "›" : " "}
                  width={1}
                  textColor={isSelected ? COLORS.selectedText : COLORS.muted}
                />
                <text
                  content={host.name}
                  textColor={isSelected ? COLORS.selectedText : COLORS.title}
                />
                <box flexGrow={1} />
                <text
                  content={getDisplayDescription(host, state.showIPs)}
                  textColor={isSelected ? COLORS.selectedText : COLORS.accessory}
                />
              </box>
            )
          })}

          <Show when={filteredHosts().length > visibleCount}>
            <box height={1} marginTop={1} flexDirection="row">
              <text
                content={` ${scrollOffset() + visibleHosts().length} / ${filteredHosts().length} `}
                textColor={COLORS.muted}
              />
            </box>
          </Show>
        </box>
      </Show>
    </box>
  )
}
