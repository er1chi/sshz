import { type SelectOption } from "@opentui/core";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { z } from "zod";

import type { SSH_Host } from "@/context/form-store";

const noControlChars = (v: string) => !/[\r\n\0]/.test(v);
const singleToken = (v: string) => /^\S+$/.test(v);

const sshHostSchema = z.object({
  alias: z.string().trim()
    .min(1, "Alias is required")
    .max(255, "Alias is too long")
    .refine(noControlChars, "Alias cannot contain newlines")
    .refine(singleToken, "Alias cannot contain whitespace")
    .refine((v) => !/[#*?]/.test(v), "Alias cannot contain #, * or ?"),
  hostname: z.string().trim()
    .min(1, "Host is required")
    .max(255, "Host is too long")
    .refine(noControlChars, "Host cannot contain newlines")
    .refine(singleToken, "Host cannot contain whitespace")
    .refine((v) => !v.includes("#"), "Host cannot contain #"),
  user: z.string().trim()
    .min(1, "User is required")
    .max(255, "User is too long")
    .refine(noControlChars, "User cannot contain newlines")
    .refine(singleToken, "User cannot contain whitespace")
    .refine((v) => !v.includes("#"), "User cannot contain #"),
  port: z.string().trim()
    .refine(noControlChars, "Port cannot contain newlines")
    .refine((v) => v === "" || /^\d+$/.test(v), "Port must be numeric")
    .refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 65535), "Port must be 1-65535"),
  identityFile: z.string().trim()
    .max(1024, "IdentityFile is too long")
    .refine(noControlChars, "IdentityFile cannot contain newlines")
    .refine((v) => v === "" || singleToken(v), "IdentityFile cannot contain whitespace")
    .refine((v) => !v.includes("#"), "IdentityFile cannot contain #"),
});

export function validateSshHost(host: SSH_Host) {
  return sshHostSchema.safeParse(host);
}

function parseAliases(hostLineValue: string): string[] {
  return hostLineValue.trim().split(/\s+/).filter(Boolean);
}

function normalizeConfigOutput(lines: string[]): string {
  let output = lines.join("\n").trimStart().trimEnd();
  output = output.replace(/\n{3,}/g, "\n\n");
  return output ? output + "\n" : "";
}

function buildHostBlock({ alias, hostname, user, port, identityFile }: SSH_Host): string[] {
  const block = [`Host ${alias}`, `  HostName ${hostname}`, `  User ${user}`];
  if (port) block.push(`  Port ${port}`);
  if (identityFile) block.push(`  IdentityFile ${identityFile}`);
  return block;
}

function findHostBlock(lines: string[], alias: string) {
  let start = -1;
  let aliases: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineWithoutComment = lines[i].split("#")[0].trim();
    const hostMatch = lineWithoutComment.match(/^Host\s+(.+)$/i);
    if (!hostMatch) continue;

    const currentAliases = parseAliases(hostMatch[1]);
    if (start !== -1) return { start, end: i, aliases };
    if (currentAliases.includes(alias)) {
      start = i;
      aliases = currentAliases;
    }
  }

  if (start === -1) return null;
  return { start, end: lines.length, aliases };
}

export function parseSshConfig(content: string): SelectOption[] {
  const options: SelectOption[] = [];
  const lines = content.split("\n");
  let currentAliases: string[] = [];
  let currentHostname: string | undefined;
  let currentUser: string | undefined;

  const flushHost = () => {
    for (const alias of currentAliases) {
      const desc = currentUser && currentHostname ? `${currentUser}@${currentHostname}` : currentHostname || alias;
      options.push({ name: alias, description: desc, value: alias });
    }
    currentAliases = [];
    currentHostname = undefined;
    currentUser = undefined;
  };

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const hostMatch = line.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      flushHost();
      currentAliases = parseAliases(hostMatch[1]).filter((a) => !a.includes("*") && !a.includes("?"));
      continue;
    }

    const kvMatch = line.match(/^(\w+)\s+(.+)$/);
    if (kvMatch && currentAliases.length > 0) {
      const key = kvMatch[1].toLowerCase();
      const val = kvMatch[2].trim();
      if (key === "hostname") currentHostname = val;
      if (key === "user") currentUser = val;
    }
  }

  flushHost();
  return options;
}

export function getSshHosts(): SelectOption[] {
  try {
    const configPath = path.join(os.homedir(), ".ssh", "config");
    if (!fs.existsSync(configPath)) return [];
    return parseSshConfig(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return [];
  }
}

export function appendSshHost(host: SSH_Host) {
  const parsed = sshHostSchema.parse(host);
  const sshDir = path.join(os.homedir(), ".ssh");
  const configPath = path.join(sshDir, "config");

  if (!fs.existsSync(sshDir)) fs.mkdirSync(sshDir, { mode: 0o700 });

  const block = buildHostBlock(parsed).join("\n");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, block + "\n", { mode: 0o600 });
    return;
  }

  const existing = fs.readFileSync(configPath, "utf-8").trimEnd();
  fs.writeFileSync(configPath, existing ? `${existing}\n\n${block}\n` : `${block}\n`, { mode: 0o600 });
}

export function getHostDetails(alias: string): SSH_Host | null {
  const configPath = path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(configPath)) return null;

  const lines = fs.readFileSync(configPath, "utf-8").split("\n");
  const block = findHostBlock(lines, alias);
  if (!block) return null;

  let hostname = "";
  let user = "";
  let port = "";
  let identityFile = "";

  for (const rawLine of lines.slice(block.start + 1, block.end)) {
    const lineWithoutComment = rawLine.split("#")[0].trim();
    if (!lineWithoutComment) continue;
    const kvMatch = lineWithoutComment.match(/^(\w+)\s+(.+)$/);
    if (!kvMatch) continue;
    const key = kvMatch[1].toLowerCase();
    const val = kvMatch[2].trim();
    if (key === "hostname") hostname = val;
    if (key === "user") user = val;
    if (key === "port") port = val;
    if (key === "identityfile") identityFile = val;
  }

  return { alias, hostname, user, port, identityFile };
}

export function updateSshHost(host: SSH_Host, oldAlias: string): boolean {
  const parsed = sshHostSchema.parse(host);
  const configPath = path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(configPath)) return false;

  const lines = fs.readFileSync(configPath, "utf-8").split("\n");
  const block = findHostBlock(lines, oldAlias);
  if (!block) return false;

  const newBlock = [...lines.slice(block.start, block.end)];
  const aliases = block.aliases.map((a) => (a === oldAlias ? parsed.alias : a));
  newBlock[0] = `Host ${aliases.join(" ")}`;

  const desired: Record<string, string> = {
    hostname: `  HostName ${parsed.hostname}`,
    user: `  User ${parsed.user}`,
    port: parsed.port ? `  Port ${parsed.port}` : "",
    identityfile: parsed.identityFile ? `  IdentityFile ${parsed.identityFile}` : "",
  };
  const seen = new Set<string>();

  for (let i = 1; i < newBlock.length; i++) {
    const match = newBlock[i].split("#")[0].trim().match(/^(\w+)\b/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    if (!(key in desired)) continue;
    seen.add(key);
    if (desired[key]) newBlock[i] = desired[key];
    else newBlock.splice(i--, 1);
  }

  const insertAt = Math.min(newBlock.length, 3);
  for (const key of ["hostname", "user", "port", "identityfile"]) {
    if (!seen.has(key) && desired[key]) newBlock.splice(insertAt, 0, desired[key]);
  }

  const output = normalizeConfigOutput([...lines.slice(0, block.start), ...newBlock, ...lines.slice(block.end)]);
  fs.writeFileSync(configPath, output, { mode: 0o600 });
  return true;
}

export function deleteSshHost(alias: string): boolean {
  const configPath = path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(configPath)) return false;

  const lines = fs.readFileSync(configPath, "utf-8").split("\n");
  const block = findHostBlock(lines, alias);
  if (!block) return false;

  let nextLines: string[];
  if (block.aliases.length > 1) {
    const updatedBlock = [...lines.slice(block.start, block.end)];
    updatedBlock[0] = `Host ${block.aliases.filter((a) => a !== alias).join(" ")}`;
    nextLines = [...lines.slice(0, block.start), ...updatedBlock, ...lines.slice(block.end)];
  } else {
    nextLines = [...lines.slice(0, block.start), ...lines.slice(block.end)];
  }

  fs.writeFileSync(configPath, normalizeConfigOutput(nextLines), { mode: 0o600 });
  return true;
}
