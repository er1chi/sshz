import { type SelectOption } from "@opentui/core"
import * as os from "node:os"
import * as path from "node:path"

export function redactIPs(text: string): string {
  return text.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "***.***.***.***")
}

export function getDisplayDescription(host: SelectOption, showIPs: boolean): string {
  if (!host.description) return ""
  if (showIPs) return host.description
  return redactIPs(host.description)
}

export function filterHosts(hosts: SelectOption[], query: string): SelectOption[] {
  const q = query.toLowerCase().trim()
  if (!q) return hosts
  return hosts.filter(h =>
    h.name.toLowerCase().includes(q) ||
    (h.description && h.description.toLowerCase().includes(q))
  )
}

export const outputFile = process.env.SSHZ_OUTPUT || path.join(os.tmpdir(), `sshz-${process.pid}.out`)
