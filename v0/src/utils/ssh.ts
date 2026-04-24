import { type SelectOption } from "@opentui/core";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { SSH_Host } from "@/context/form-store";

export function parseSshConfig(content: string): SelectOption[] {
  const options: SelectOption[] = [];
  const lines = content.split("\n");
  let currentAliases: string[] = [];
  let currentHostname: string | undefined;
  let currentUser: string | undefined;

  const flushHost = () => {
    if (currentAliases.length > 0) {
      for (const alias of currentAliases) {
        const desc =
          currentUser && currentHostname
            ? `${currentUser}@${currentHostname}`
            : currentHostname || alias;
        options.push({
          name: alias,
          description: desc,
          value: alias,
        });
      }
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
      const aliases = hostMatch[1]
        .trim()
        .split(/\s+/)
        .filter((a) => !a.includes("*") && !a.includes("?"));
      currentAliases = aliases;
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
    const content = fs.readFileSync(configPath, "utf-8");
    return parseSshConfig(content);
  } catch {
    return [];
  }
}

export function appendSshHost(
  alias: string,
  hostname: string,
  user: string,
  port?: string,
  identityFile?: string,
) {
  const sshDir = path.join(os.homedir(), ".ssh");
  const configPath = path.join(sshDir, "config");

  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, { mode: 0o700 });
  }

  let block = `\nHost ${alias}\n    HostName ${hostname}\n    User ${user}`;
  if (port) block += `\n    Port ${port}`;
  if (identityFile) block += `\n    IdentityFile ${identityFile}`;
  block += "\n";

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, block, { mode: 0o600 });
  } else {
    let existing = fs.readFileSync(configPath, "utf-8");
    if (existing.length > 0 && !existing.endsWith("\n")) {
      block = "\n" + block;
    }
    fs.appendFileSync(configPath, block);
  }
}

export function getHostDetails(alias: string): {
  alias: string;
  hostname: string;
  user: string;
  port: string;
  identityFile: string;
} | null {
  const configPath = path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(configPath)) return null;

  const content = fs.readFileSync(configPath, "utf-8");
  const lines = content.split("\n");

  let inBlock = false;
  let hostname = "";
  let user = "";
  let port = "";
  let identityFile = "";

  for (const rawLine of lines) {
    const lineWithoutComment = rawLine.split("#")[0].trim();
    if (!lineWithoutComment) continue;

    const hostMatch = lineWithoutComment.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      if (inBlock) break;
      const aliases = hostMatch[1].trim().split(/\s+/);
      if (aliases.includes(alias)) {
        inBlock = true;
      }
      continue;
    }

    if (inBlock) {
      const kvMatch = lineWithoutComment.match(/^(\w+)\s+(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase();
        const val = kvMatch[2].trim();
        if (key === "hostname") hostname = val;
        if (key === "user") user = val;
        if (key === "port") port = val;
        if (key === "identityfile") identityFile = val;
      }
    }
  }

  if (!inBlock) return null;
  return { alias, hostname, user, port, identityFile };
}

export function updateSshHost(
  oldAlias: string,
  alias: string,
  hostname: string,
  user: string,
  port?: string,
  identityFile?: string,
): boolean {
  const configPath = path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(configPath)) return false;

  const content = fs.readFileSync(configPath, "utf-8");
  const lines = content.split("\n");

  let inTargetBlock = false;
  let blockStart = -1;
  let blockEnd = -1;
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineWithoutComment = rawLine.split("#")[0].trim();

    const hostMatch = lineWithoutComment.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      if (inTargetBlock) {
        blockEnd = i;
        break;
      }
      const aliases = hostMatch[1].trim().split(/\s+/);
      if (aliases.includes(oldAlias)) {
        found = true;
        inTargetBlock = true;
        blockStart = i;
      }
    }
  }

  if (!found) return false;
  if (blockEnd === -1) blockEnd = lines.length;

  let newBlock = `Host ${alias}\n    HostName ${hostname}\n    User ${user}`;
  if (port) newBlock += `\n    Port ${port}`;
  if (identityFile) newBlock += `\n    IdentityFile ${identityFile}`;

  const result = [
    ...lines.slice(0, blockStart),
    newBlock,
    ...lines.slice(blockEnd),
  ];

  let output = result.join("\n");
  while (output.endsWith("\n\n")) {
    output = output.slice(0, -1);
  }

  fs.writeFileSync(configPath, output, { mode: 0o600 });
  return true;
}

export function deleteSshHost(alias: string): boolean {
  const configPath = path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(configPath)) return false;

  const content = fs.readFileSync(configPath, "utf-8");
  const lines = content.split("\n");

  let inTargetBlock = false;
  let found = false;
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineWithoutComment = rawLine.split("#")[0].trim();

    const hostMatch = lineWithoutComment.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      const aliases = hostMatch[1].trim().split(/\s+/);
      inTargetBlock = aliases.includes(alias);
      if (inTargetBlock) {
        found = true;
        continue;
      }
    }

    if (!inTargetBlock) {
      result.push(rawLine);
    }
  }

  if (!found) return false;

  let output = result.join("\n");
  while (output.endsWith("\n\n")) {
    output = output.slice(0, -1);
  }

  fs.writeFileSync(configPath, output, { mode: 0o600 });
  return true;
}
