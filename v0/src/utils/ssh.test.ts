import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseSshConfig,
  getSshHosts,
  appendSshHost,
  getHostDetails,
  updateSshHost,
  deleteSshHost,
} from "./ssh";

const tmpDir = path.join(os.tmpdir(), "sshz-test-" + Date.now());

spyOn(os, "homedir").mockImplementation(() => tmpDir);

function getConfigPath() {
  return path.join(tmpDir, ".ssh", "config");
}

function writeConfig(content: string) {
  const sshDir = path.join(tmpDir, ".ssh");
  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(getConfigPath(), content, { mode: 0o600 });
}

function readConfig() {
  return fs.readFileSync(getConfigPath(), "utf-8");
}

beforeEach(() => {
  const sshDir = path.join(tmpDir, ".ssh");
  if (fs.existsSync(sshDir)) {
    fs.rmSync(sshDir, { recursive: true, force: true });
  }
});

afterEach(() => {
  const sshDir = path.join(tmpDir, ".ssh");
  if (fs.existsSync(sshDir)) {
    fs.rmSync(sshDir, { recursive: true, force: true });
  }
});

describe("parseSshConfig", () => {
  test("parses well-formatted config", () => {
    const config = `Host foo
    HostName foo.com
    User root

Host bar
    HostName bar.com
    User admin
`;
    const hosts = parseSshConfig(config);
    expect(hosts).toHaveLength(2);
    expect(hosts[0]).toEqual({
      name: "foo",
      description: "root@foo.com",
      value: "foo",
    });
    expect(hosts[1]).toEqual({
      name: "bar",
      description: "admin@bar.com",
      value: "bar",
    });
  });

  test("parses config with comments and extra whitespace", () => {
    const config = `
# This is a comment
Host foo
    HostName foo.com
    User root
    # inline comment

Host bar
    HostName bar.com
    User admin

`;
    const hosts = parseSshConfig(config);
    expect(hosts).toHaveLength(2);
    expect(hosts[0].name).toBe("foo");
    expect(hosts[1].name).toBe("bar");
  });

  test("skips wildcard aliases", () => {
    const config = `Host foo *
    HostName foo.com
    User root
`;
    const hosts = parseSshConfig(config);
    expect(hosts).toHaveLength(1);
    expect(hosts[0].name).toBe("foo");
  });

  test("handles missing HostName or User", () => {
    const config = `Host foo
    User root

Host bar
    HostName bar.com
`;
    const hosts = parseSshConfig(config);
    expect(hosts[0].description).toBe("foo");
    expect(hosts[1].description).toBe("bar.com");
  });

  test("handles multiple aliases on a Host line", () => {
    const config = `Host foo bar
    HostName foo.com
    User root
`;
    const hosts = parseSshConfig(config);
    expect(hosts).toHaveLength(2);
    expect(hosts[0].name).toBe("foo");
    expect(hosts[1].name).toBe("bar");
  });

  test("handles empty config", () => {
    expect(parseSshConfig("")).toEqual([]);
  });

  test("ignores properties before first Host block", () => {
    const config = `SomeRandomSetting value
Host foo
    HostName foo.com
    User root
`;
    const hosts = parseSshConfig(config);
    expect(hosts).toHaveLength(1);
    expect(hosts[0].name).toBe("foo");
  });
});

describe("getSshHosts", () => {
  test("returns empty array when config does not exist", () => {
    expect(getSshHosts()).toEqual([]);
  });

  test("reads hosts from mocked config file", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root
`);
    const hosts = getSshHosts();
    expect(hosts).toHaveLength(1);
    expect(hosts[0].name).toBe("foo");
  });
});

describe("appendSshHost", () => {
  test("creates new file with first block at line 1", () => {
    appendSshHost({
      alias: "foo",
      hostname: "foo.com",
      user: "root",
      port: "",
      identityFile: "",
    });
    const content = readConfig();
    expect(content.startsWith("Host foo")).toBe(true);
    expect(content).toBe(`Host foo\n    HostName foo.com\n    User root\n`);
  });

  test("appends with exactly one blank line between blocks", () => {
    writeConfig(`Host foo\n    HostName foo.com\n    User root\n`);
    appendSshHost({
      alias: "bar",
      hostname: "bar.com",
      user: "admin",
      port: "",
      identityFile: "",
    });
    const content = readConfig();
    const expected = `Host foo\n    HostName foo.com\n    User root\n\nHost bar\n    HostName bar.com\n    User admin\n`;
    expect(content).toBe(expected);
  });

  test("normalizes file ending without newline before appending", () => {
    writeConfig(`Host foo\n    HostName foo.com\n    User root`);
    appendSshHost({
      alias: "bar",
      hostname: "bar.com",
      user: "admin",
      port: "",
      identityFile: "",
    });
    const content = readConfig();
    const expected = `Host foo\n    HostName foo.com\n    User root\n\nHost bar\n    HostName bar.com\n    User admin\n`;
    expect(content).toBe(expected);
  });

  test("does not add extra blank lines when appending to properly formatted file", () => {
    writeConfig(`Host foo\n    HostName foo.com\n    User root\n\n`);
    appendSshHost({
      alias: "bar",
      hostname: "bar.com",
      user: "admin",
      port: "",
      identityFile: "",
    });
    const content = readConfig();
    const expected = `Host foo\n    HostName foo.com\n    User root\n\nHost bar\n    HostName bar.com\n    User admin\n`;
    expect(content).toBe(expected);
  });

  test("includes port and identity file when provided", () => {
    appendSshHost({
      alias: "foo",
      hostname: "foo.com",
      user: "root",
      port: "2222",
      identityFile: "~/.ssh/foo",
    });
    const content = readConfig();
    expect(content).toBe(
      `Host foo\n    HostName foo.com\n    User root\n    Port 2222\n    IdentityFile ~/.ssh/foo\n`
    );
  });
});

describe("getHostDetails", () => {
  test("returns host details for existing alias", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root
    Port 2222
    IdentityFile ~/.ssh/foo
`);
    const details = getHostDetails("foo");
    expect(details).toEqual({
      alias: "foo",
      hostname: "foo.com",
      user: "root",
      port: "2222",
      identityFile: "~/.ssh/foo",
    });
  });

  test("returns null for missing alias", () => {
    writeConfig(`Host foo\n    HostName foo.com\n    User root\n`);
    expect(getHostDetails("bar")).toBeNull();
  });

  test("ignores comments", () => {
    writeConfig(`Host foo
    HostName foo.com
    # HostName ignored.com
    User root
`);
    const details = getHostDetails("foo");
    expect(details?.hostname).toBe("foo.com");
  });
});

describe("updateSshHost", () => {
  test("updates existing block preserving surrounding blocks", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root

Host bar
    HostName bar.com
    User admin
`);
    const result = updateSshHost(
      {
        alias: "foo2",
        hostname: "foo2.com",
        user: "root2",
        port: "2222",
        identityFile: "",
      },
      "foo"
    );
    expect(result).toBe(true);
    const content = readConfig();
    expect(content).toBe(
      `Host foo2\n    HostName foo2.com\n    User root2\n    Port 2222\n\nHost bar\n    HostName bar.com\n    User admin\n`
    );
  });

  test("keeps first block at line 1 when updating first block", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root

Host bar
    HostName bar.com
    User admin
`);
    updateSshHost(
      {
        alias: "foo2",
        hostname: "foo2.com",
        user: "root2",
        port: "",
        identityFile: "",
      },
      "foo"
    );
    const content = readConfig();
    expect(content.startsWith("Host foo2")).toBe(true);
  });

  test("maintains exactly one blank line between blocks after update", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root



Host bar
    HostName bar.com
    User admin
`);
    updateSshHost(
      {
        alias: "foo2",
        hostname: "foo2.com",
        user: "root2",
        port: "",
        identityFile: "",
      },
      "foo"
    );
    const content = readConfig();
    expect(content).not.toContain("\n\n\n");
    expect(content).toBe(
      `Host foo2\n    HostName foo2.com\n    User root2\n\nHost bar\n    HostName bar.com\n    User admin\n`
    );
  });

  test("returns false when alias not found", () => {
    writeConfig(`Host foo\n    HostName foo.com\n    User root\n`);
    const result = updateSshHost(
      {
        alias: "bar",
        hostname: "bar.com",
        user: "admin",
        port: "",
        identityFile: "",
      },
      "missing"
    );
    expect(result).toBe(false);
  });
});

describe("deleteSshHost", () => {
  test("deletes block and leaves proper spacing", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root

Host bar
    HostName bar.com
    User admin
`);
    const result = deleteSshHost("foo");
    expect(result).toBe(true);
    const content = readConfig();
    expect(content).toBe(`Host bar\n    HostName bar.com\n    User admin\n`);
  });

  test("keeps first block at line 1 when deleting later block", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root

Host bar
    HostName bar.com
    User admin
`);
    deleteSshHost("bar");
    const content = readConfig();
    expect(content).toBe(`Host foo\n    HostName foo.com\n    User root\n`);
  });

  test("maintains exactly one blank line between remaining blocks", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root



Host bar
    HostName bar.com
    User admin



Host baz
    HostName baz.com
    User root
`);
    deleteSshHost("bar");
    const content = readConfig();
    expect(content).not.toContain("\n\n\n");
    expect(content).toBe(
      `Host foo\n    HostName foo.com\n    User root\n\nHost baz\n    HostName baz.com\n    User root\n`
    );
  });

  test("returns false when alias not found", () => {
    writeConfig(`Host foo\n    HostName foo.com\n    User root\n`);
    expect(deleteSshHost("missing")).toBe(false);
  });
});

describe("malformed config handling", () => {
  test("handles file with multiple blank lines between blocks", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root



Host bar
    HostName bar.com
    User admin
`);
    const hosts = getSshHosts();
    expect(hosts).toHaveLength(2);
  });

  test("handles file with no blank lines between blocks", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root
Host bar
    HostName bar.com
    User admin
`);
    const hosts = getSshHosts();
    expect(hosts).toHaveLength(2);
  });

  test("handles file with leading blank lines", () => {
    writeConfig(`


Host foo
    HostName foo.com
    User root
`);
    const hosts = getSshHosts();
    expect(hosts).toHaveLength(1);
  });

  test("update normalizes spacing in malformed file", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root



Host bar
    HostName bar.com
    User admin
`);
    updateSshHost(
      {
        alias: "foo2",
        hostname: "foo2.com",
        user: "root2",
        port: "",
        identityFile: "",
      },
      "foo"
    );
    const content = readConfig();
    expect(content).toBe(
      `Host foo2\n    HostName foo2.com\n    User root2\n\nHost bar\n    HostName bar.com\n    User admin\n`
    );
  });

  test("delete normalizes spacing in malformed file", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root



Host bar
    HostName bar.com
    User admin
`);
    deleteSshHost("foo");
    const content = readConfig();
    expect(content).toBe(`Host bar\n    HostName bar.com\n    User admin\n`);
  });

  test("append normalizes spacing in malformed file", () => {
    writeConfig(`Host foo
    HostName foo.com
    User root



`);
    appendSshHost({
      alias: "bar",
      hostname: "bar.com",
      user: "admin",
      port: "",
      identityFile: "",
    });
    const content = readConfig();
    expect(content).toBe(
      `Host foo\n    HostName foo.com\n    User root\n\nHost bar\n    HostName bar.com\n    User admin\n`
    );
  });
});
