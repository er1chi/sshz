import { type SelectOption } from "@opentui/core"
import * as fs from "node:fs"
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

function safeOutputFile(): string {
  const fallback = path.join(os.tmpdir(), `sshz-${process.pid}.out`)
  const provided = process.env.SSHZ_OUTPUT
  if (!provided) return fallback

  const resolved = path.resolve(provided)
  const tmpDir = path.resolve(os.tmpdir())
  if (resolved === tmpDir || !resolved.startsWith(tmpDir + path.sep)) return fallback

  try {
    const stat = fs.statSync(resolved)
    if (!stat.isFile()) return fallback
    if ((stat.mode & 0o077) !== 0) fs.chmodSync(resolved, 0o600)
    return resolved
  } catch {
    return fallback
  }
}

export const outputFile = safeOutputFile()
