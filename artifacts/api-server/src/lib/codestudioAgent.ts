import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import fs from "fs/promises";
import path from "path";
import { execSync, execFileSync } from "child_process";

/* ─── Tool definitions ─────────────────────────────────────── */
const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file in the user's project. Returns the file as a string.",
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
    description: "Write or overwrite a file in the user's project. Creates parent directories as needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative file path inside the project" },
        content: { type: "string", description: "Full content to write to the file" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_files",
    description: "List files and directories inside the project. Returns a tree-style listing.",
    input_schema: {
      type: "object" as const,
      properties: {
        directory: { type: "string", description: "Relative directory path to list (use '.' for project root)" },
      },
      required: ["directory"],
    },
  },
  {
    name: "search_files",
    description: "Search for a regex pattern across project files. Returns file paths that contain matches.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string", description: "Regex or plain-text search pattern" },
        directory: { type: "string", description: "Directory to search in (default: '.')" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description: "Run a shell command inside the project directory. Useful for npm install, tests, builds. Returns stdout.",
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
  /* reject if relative path escapes root or is absolute */
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

    case "search_files": {
      const searchDir = safePath(projectDir, input.directory || ".");
      try {
        /* Use execFile (not execSync shell) to prevent command injection.
           Arguments are passed as an array — no shell expansion occurs.   */
        const result = execFileSync(
          "grep",
          ["-rn", "--include=*", "-l", input.pattern, "."],
          { cwd: searchDir, encoding: "utf-8", timeout: 10_000 },
        );
        return result.trim() || "No matches found";
      } catch (err: unknown) {
        const e = err as { status?: number; stdout?: string };
        /* grep exits with status 1 when no matches — not an error */
        if (e.status === 1) return "No matches found";
        return "Search failed";
      }
    }

    case "run_command": {
      if (process.env.NODE_ENV === "production") {
        return "run_command is disabled in production for security reasons.";
      }
      try {
        const output = execSync(input.command, {
          cwd: projectDir,
          encoding: "utf-8",
          timeout: 30_000,
        });
        return output.slice(0, 10_000);
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        return `Error: ${(e.stderr || e.stdout || e.message || "unknown error").slice(0, 5_000)}`;
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

/* ─── In-memory conversation history ─────────────────────────
   Key = sessionId; value = Anthropic message history array.  */
const sessions = new Map<string, Anthropic.MessageParam[]>();

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export type SseEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; input: string; result?: string }
  | { type: "done" };

/* ─── Main agent loop ──────────────────────────────────────── */
export async function runCodeStudioAgent(opts: {
  sessionId: string;
  projectId: string;
  projectDir: string;
  message: string;
  onEvent: (event: SseEvent) => void;
}): Promise<void> {
  const { sessionId, projectId, projectDir, message, onEvent } = opts;

  const history: Anthropic.MessageParam[] = sessions.get(sessionId) ?? [];
  history.push({ role: "user", content: message });

  const systemPrompt = `You are ATREYU Code Studio — an expert AI coding assistant embedded in a browser-based IDE.
You have direct access to the user's project files via tools. Use them proactively to understand context before answering.
Project ID: ${projectId}
Project directory is loaded and you can read, write, search files, and run commands.
Always be concise and direct. When editing files, show what changed and why.
Do not use markdown headers (##) or bold text (**) in your responses — plain text only.`;

  /* agentic loop: keep going until Claude stops using tools */
  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8096,
      system: systemPrompt,
      tools,
      messages: history,
    });

    const assistantContent = response.content;
    history.push({ role: "assistant", content: assistantContent });

    /* stream text blocks immediately */
    for (const block of assistantContent) {
      if (block.type === "text" && block.text) {
        onEvent({ type: "text", text: block.text });
      }
    }

    if (response.stop_reason === "end_turn") break;

    /* execute tool calls */
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of assistantContent) {
      if (block.type !== "tool_use") continue;

      const inputStr = JSON.stringify(block.input).slice(0, 120);
      onEvent({ type: "tool", name: block.name, input: inputStr });

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

      onEvent({ type: "tool", name: block.name, input: inputStr, result: result.slice(0, 300) });

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.slice(0, 10_000),
      });
    }

    if (toolResults.length > 0) {
      history.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  sessions.set(sessionId, history);
  onEvent({ type: "done" });
}
