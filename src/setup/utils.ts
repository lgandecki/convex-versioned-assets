/**
 * Setup utility functions for convex-versioned-assets CLI.
 */
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as crypto from "crypto";

// ANSI color codes for terminal output
export const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

export function log(message: string): void {
  console.log(message);
}

export function logSuccess(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

export function logWarning(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

export function logError(message: string): void {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

export function logStep(
  step: number,
  totalSteps: number,
  message: string,
): void {
  console.log(
    `\n${colors.cyan}[${step}/${totalSteps}]${colors.reset} ${colors.bright}${message}${colors.reset}`,
  );
}

export function logInfo(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Prompt user for input
 */
export async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user for yes/no confirmation
 */
export async function confirm(
  question: string,
  defaultYes = true,
): Promise<boolean> {
  const suffix = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await prompt(`${question} ${suffix} `);

  if (answer === "") {
    return defaultYes;
  }

  return answer.toLowerCase().startsWith("y");
}

/**
 * Check if current directory is a git repository
 */
export function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --git-dir", { encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if git working tree is clean
 */
export function isGitClean(): boolean {
  try {
    const result = execSync("git status --porcelain", { encoding: "utf8" });
    return result.trim() === "";
  } catch {
    // Not a git repo, which is fine
    return true;
  }
}

/**
 * Check if a directory exists
 */
export function directoryExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Read a file's contents
 */
export function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Write content to a file
 */
export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

/**
 * Detect which package manager is being used
 */
export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export function detectPackageManager(): PackageManager {
  const cwd = process.cwd();

  // Check for bun (both old .lockb and new .lock format)
  if (
    fileExists(path.join(cwd, "bun.lock")) ||
    fileExists(path.join(cwd, "bun.lockb"))
  ) {
    return "bun";
  }
  if (fileExists(path.join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (fileExists(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}

/**
 * Get the install command for a package manager
 */
export function getInstallCommand(
  pm: PackageManager,
  packages: string[],
): string {
  const pkgList = packages.join(" ");
  switch (pm) {
    case "bun":
      return `bun add ${pkgList}`;
    case "pnpm":
      return `pnpm add ${pkgList}`;
    case "yarn":
      return `yarn add ${pkgList}`;
    case "npm":
    default:
      return `npm install ${pkgList}`;
  }
}

/**
 * Run a shell command and return success status
 */
export function runCommand(
  command: string,
  options?: { silent?: boolean },
): boolean {
  try {
    execSync(command, {
      stdio: options?.silent ? "pipe" : "inherit",
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a shell command and return output
 */
export function runCommandOutput(command: string): string | null {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/**
 * Check if a package is installed in package.json
 */
export function isPackageInstalled(packageName: string): boolean {
  const pkgPath = path.join(process.cwd(), "package.json");
  const content = readFile(pkgPath);
  if (!content) return false;

  try {
    const pkg = JSON.parse(content);
    return !!(
      pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName]
    );
  } catch {
    return false;
  }
}

/**
 * Parse a single env line, handling quotes and inline comments.
 * Returns null if the line is not a valid key=value pair.
 */
function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return null;

  const key = trimmed.slice(0, eqIndex).trim();
  const rest = trimmed.slice(eqIndex + 1);

  // Parse value, respecting quotes
  let value: string;
  if (rest.startsWith('"')) {
    // Find closing quote
    const closeQuote = rest.indexOf('"', 1);
    if (closeQuote !== -1) {
      value = rest.slice(1, closeQuote);
    } else {
      value = rest.slice(1); // Unclosed quote, take rest
    }
  } else if (rest.startsWith("'")) {
    const closeQuote = rest.indexOf("'", 1);
    if (closeQuote !== -1) {
      value = rest.slice(1, closeQuote);
    } else {
      value = rest.slice(1);
    }
  } else {
    // Unquoted: stop at # (inline comment) or whitespace before #
    const hashIndex = rest.indexOf(" #");
    if (hashIndex !== -1) {
      value = rest.slice(0, hashIndex).trim();
    } else {
      // Also check for # without space
      const directHash = rest.indexOf("#");
      if (directHash !== -1) {
        value = rest.slice(0, directHash).trim();
      } else {
        value = rest.trim();
      }
    }
  }

  return { key, value };
}

/**
 * Read .env.local file and parse into key-value pairs.
 * Handles quoted values and inline comments correctly.
 */
export function readEnvFile(filePath: string): Map<string, string> {
  const envMap = new Map<string, string>();
  const content = readFile(filePath);
  if (!content) return envMap;

  for (const line of content.split("\n")) {
    const parsed = parseEnvLine(line);
    if (parsed) {
      envMap.set(parsed.key, parsed.value);
    }
  }

  return envMap;
}

/**
 * Add or update a value in .env.local file.
 * Preserves existing lines, comments, and formatting.
 */
export function upsertEnvValue(
  filePath: string,
  key: string,
  value: string,
): void {
  const content = readFile(filePath) || "";
  const lines = content.split("\n");

  // Format the new value (quote if needed)
  const formattedValue =
    value.includes(" ") || value.includes("=") || value.includes("#")
      ? `"${value}"`
      : value;
  const newLine = `${key}=${formattedValue}`;

  // Find existing line with this key
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseEnvLine(lines[i]);
    if (parsed && parsed.key === key) {
      lines[i] = newLine;
      found = true;
      break;
    }
  }

  // If not found, append
  if (!found) {
    // Remove trailing empty lines before appending
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
    lines.push(newLine);
  }

  writeFile(filePath, lines.join("\n") + "\n");
}

/**
 * Generate a cryptographically secure random string for admin key.
 * Uses base64url encoding for URL-safe characters.
 */
export function generateAdminKey(): string {
  // Generate 32 random bytes and encode as base64url
  const bytes = crypto.randomBytes(32);
  return bytes.toString("base64url");
}

/**
 * Push environment variable to Convex.
 * Uses spawnSync with array args to avoid shell escaping issues.
 */
export function pushEnvToConvex(
  key: string,
  value: string,
): { success: boolean; error?: string } {
  try {
    // Use spawnSync with array args to avoid shell escaping issues with special characters
    // Use "--" to prevent values starting with "-" being parsed as options
    const result = spawnSync(
      "npx",
      ["convex", "env", "set", "--", key, value],
      {
        stdio: ["pipe", "pipe", "pipe"],
        encoding: "utf8",
      },
    );

    if (result.status === 0) {
      return { success: true };
    }

    const errorOutput =
      result.stderr?.trim() || result.stdout?.trim() || "Unknown error";
    return { success: false, error: errorOutput };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if Convex CLI is available
 */
export function isConvexCliAvailable(): boolean {
  const result = spawnSync("npx", ["convex", "--version"], {
    stdio: "pipe",
    encoding: "utf8",
  });
  return result.status === 0;
}

/**
 * Get the project root directory (where package.json is)
 */
export function getProjectRoot(): string {
  return process.cwd();
}

/**
 * Get the convex directory path
 */
export function getConvexDir(): string {
  return path.join(getProjectRoot(), "convex");
}
