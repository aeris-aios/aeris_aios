import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import { execSync, execFileSync } from "child_process";

/* ─── Safety limits ────────────────────────────────────────── */
const MAX_ITERATIONS = 25;

const BLOCKED_COMMANDS: RegExp[] = [
  /rm\s+-rf\s+[/~]/,
  /:\(\)\s*\{\s*:\|:&\s*\};:/,
  /mkfs\./,
  /dd\s+if=/,
  />\s*\/dev\/sd/,
  /curl[^|]*\|\s*(bash|sh)/,
  /wget[^|]*\|\s*(bash|sh)/,
];

/* ─── Tool definitions ─────────────────────────────────────── */
const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the full contents of a file in the user's project.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative file path inside the project (e.g. src/App.tsx)" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file with the given content. Use for new files or complete rewrites.",
    input_schema: {
      type: "object" as const,
      properties: {
        path:    { type: "string", description: "Relative file path inside the project" },
        content: { type: "string", description: "Full content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Replace a specific string in a file. Prefer this over write_file for targeted edits.",
    input_schema: {
      type: "object" as const,
      properties: {
        path:     { type: "string", description: "Relative file path inside the project" },
        old_text: { type: "string", description: "Exact text to find and replace (must be unique in the file)" },
        new_text: { type: "string", description: "Replacement text" },
      },
      required: ["path", "old_text", "new_text"],
    },
  },
  {
    name: "list_files",
    description: "List files and directories recursively inside the project.",
    input_schema: {
      type: "object" as const,
      properties: {
        directory: { type: "string", description: "Relative directory path to list (use '.' for project root)" },
      },
      required: ["directory"],
    },
  },
  {
    name: "create_directory",
    description: "Create a directory and any missing parent directories.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative directory path to create" },
      },
      required: ["path"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file from the project.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative file path to delete" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description: "Search for a regex pattern across project files. Returns matching file paths.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern:   { type: "string", description: "Regex or plain-text search pattern" },
        directory: { type: "string", description: "Directory to search in (default: '.')" },
        file_glob: { type: "string", description: "Optional file-glob filter, e.g. '*.ts' or '*.py'" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description: "Run a shell command inside the project directory. Useful for npm install, tests, builds.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Shell command to run (e.g. 'npm test', 'ls -la')" },
      },
      required: ["command"],
    },
  },
];

/* ─── Path-traversal guard ─────────────────────────────────── */
function safePath(projectDir: string, relativePath: string): string {
  const root     = path.resolve(projectDir);
  const resolved = path.resolve(root, relativePath);
  const rel      = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }
  return resolved;
}

/* ─── Tool executor ────────────────────────────────────────── */
async function executeTool(
  toolName: string,
  input: Record<string, string>,
  projectDir: string,
): Promise<string> {
  switch (toolName) {

    case "read_file": {
      const fp = safePath(projectDir, input.path);
      const content = await fs.readFile(fp, "utf-8");
      return content.slice(0, 50_000);
    }

    case "write_file": {
      const fp = safePath(projectDir, input.path);
      await fs.mkdir(path.dirname(fp), { recursive: true });
      await fs.writeFile(fp, input.content, "utf-8");
      return `Wrote ${input.path} (${Buffer.byteLength(input.content, "utf-8")} bytes)`;
    }

    case "edit_file": {
      const fp = safePath(projectDir, input.path);
      const content = await fs.readFile(fp, "utf-8");
      if (!content.includes(input.old_text)) {
        return `Error: could not find the specified text in ${input.path} — check the exact match`;
      }
      const updated = content.replace(input.old_text, input.new_text);
      await fs.writeFile(fp, updated, "utf-8");
      return `Edited ${input.path}`;
    }

    case "list_files": {
      const dir = safePath(projectDir, input.directory || ".");
      const SKIP = new Set(["node_modules", ".git", ".DS_Store", "dist", ".next", "__pycache__"]);
      async function walk(d: string, prefix = ""): Promise<string[]> {
        const entries = await fs.readdir(d, { withFileTypes: true });
        const lines: string[] = [];
        for (const e of entries) {
          if (SKIP.has(e.name)) continue;
          const rel = prefix ? `${prefix}/${e.name}` : e.name;
          if (e.isDirectory()) {
            lines.push(`📁 ${rel}/`);
            lines.push(...(await walk(path.join(d, e.name), rel)));
          } else {
            lines.push(`📄 ${rel}`);
          }
        }
        return lines;
      }
      const lines = await walk(dir);
      return lines.slice(0, 500).join("\n") || "(empty directory)";
    }

    case "create_directory": {
      const fp = safePath(projectDir, input.path);
      await fs.mkdir(fp, { recursive: true });
      return `Created directory: ${input.path}`;
    }

    case "delete_file": {
      const fp = safePath(projectDir, input.path);
      await fs.unlink(fp);
      return `Deleted: ${input.path}`;
    }

    case "search_files": {
      const searchDir = safePath(projectDir, input.directory || ".");
      const args: string[] = ["-rn", "-l"];
      if (input.file_glob) args.push(`--include=${input.file_glob}`);
      args.push(input.pattern, ".");
      try {
        const result = execFileSync("grep", args, {
          cwd: searchDir,
          encoding: "utf-8",
          timeout: 10_000,
        });
        return result.trim() || "No matches found";
      } catch (err: unknown) {
        const e = err as { status?: number };
        if (e.status === 1) return "No matches found";
        return "Search failed";
      }
    }

    case "run_command": {
      if (process.env.NODE_ENV === "production") {
        return "run_command is disabled in production.";
      }
      for (const blocked of BLOCKED_COMMANDS) {
        if (blocked.test(input.command)) {
          return "Error: that command is blocked for security reasons.";
        }
      }
      try {
        const output = execSync(input.command, {
          cwd: projectDir,
          encoding: "utf-8",
          timeout: 60_000,
          maxBuffer: 2 * 1024 * 1024,
          env: { ...process.env, HOME: projectDir },
        });
        return (output || "(no output)").slice(0, 15_000);
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        return `Command failed:\n${(e.stdout ?? "").slice(0, 5_000)}\n${(e.stderr ?? e.message ?? "").slice(0, 5_000)}`.trim();
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

/* ─── In-memory conversation history ──────────────────────── */
const sessions = new Map<string, Anthropic.MessageParam[]>();

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export type SseEvent =
  | { type: "text"; text: string }
  | { type: "tool"; id: string; name: string; input: string; result?: string }
  | { type: "done" };

/* ─── Main agent loop ──────────────────────────────────────── */
export async function runCodeStudioAgent(opts: {
  apiKey: string;       /* user's own Anthropic API key */
  sessionId: string;
  projectId: string;
  projectDir: string;
  message: string;
  onEvent: (event: SseEvent) => void;
}): Promise<void> {
  const { apiKey, sessionId, projectId, projectDir, message, onEvent } = opts;

  /* Create a client using the user's own API key — billed to their account */
  const client = new Anthropic({ apiKey });

  const history: Anthropic.MessageParam[] = sessions.get(sessionId) ?? [];
  history.push({ role: "user", content: message });

  const systemPrompt = `You are AERIS Code Studio — an expert AI coding assistant embedded in a browser-based IDE.
You have direct access to the user's project files via tools. Use them proactively to understand context before answering.
Project ID: ${projectId}

Tool guidance:
- Use read_file before editing to understand existing code.
- Use edit_file for targeted changes; write_file only for new files or complete rewrites.
- Use create_directory before writing files in new directories.
- Run commands (tests, linters, builds) to verify your work when helpful.

Response style: Be direct and concise. Lead with the solution. Plain text only — no ## headers or **bold**.`;

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8096,
      system: systemPrompt,
      tools,
      messages: history,
    });

    const assistantContent = response.content;
    history.push({ role: "assistant", content: assistantContent });

    for (const block of assistantContent) {
      if (block.type === "text" && block.text) {
        onEvent({ type: "text", text: block.text });
      }
    }

    if (response.stop_reason === "end_turn") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of assistantContent) {
      if (block.type !== "tool_use") continue;

      const inputStr = JSON.stringify(block.input).slice(0, 120);
      onEvent({ type: "tool", id: block.id, name: block.name, input: inputStr });

      let result: string;
      try {
        result = await executeTool(
          block.name,
          block.input as Record<string, string>,
          projectDir,
        );
      } catch (err: unknown) {
        result = `Error: ${(err as Error).message}`;
      }

      onEvent({ type: "tool", id: block.id, name: block.name, input: inputStr, result: result.slice(0, 400) });

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.slice(0, 12_000),
      });
    }

    if (toolResults.length > 0) {
      history.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  sessions.set(sessionId, history.slice(-60));
  onEvent({ type: "done" });
}
