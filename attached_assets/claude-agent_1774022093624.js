const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs/promises");
const path = require("path");
const { execSync } = require("child_process");

// Tools Claude can use against the user's project
const TOOLS = [
  {
    name: "read_file",
    description: "Read a file from the project. Returns the full file contents.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Relative path to the file" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file in the project.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Relative path to the file" },
        content: { type: "string", description: "Full file content to write" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Replace a specific string in a file. Use for targeted edits instead of rewriting the whole file.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Relative path to the file" },
        old_text: { type: "string", description: "Exact text to find and replace" },
        new_text: { type: "string", description: "Replacement text" },
      },
      required: ["file_path", "old_text", "new_text"],
    },
  },
  {
    name: "list_directory",
    description: "List files and folders in a directory.",
    input_schema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Relative directory path. Use '.' for project root.",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "search_files",
    description: "Search for a text pattern across all project files using grep.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Search pattern (basic regex)" },
        file_glob: {
          type: "string",
          description: "Optional file glob filter, e.g. '*.py' or '*.js'",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description:
      "Run a shell command in the project directory. Use for: installing packages, running tests, build scripts, git commands, etc.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to run" },
      },
      required: ["command"],
    },
  },
  {
    name: "create_directory",
    description: "Create a directory (and any parent directories).",
    input_schema: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Relative directory path to create" },
      },
      required: ["directory"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file from the project.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Relative path to the file to delete" },
      },
      required: ["file_path"],
    },
  },
];

// Blocked commands for security
const BLOCKED_COMMANDS = [
  /rm\s+-rf\s+[/~]/,
  /:(){ :\|:& };:/,
  /mkfs\./,
  /dd\s+if=/,
  />\s*\/dev\/sd/,
  /curl.*\|\s*(bash|sh)/,
  /wget.*\|\s*(bash|sh)/,
];

function safePath(projectDir, relativePath) {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const resolved = path.resolve(projectDir, normalized);
  if (!resolved.startsWith(path.resolve(projectDir))) {
    throw new Error("Access denied: path outside project directory");
  }
  return resolved;
}

async function executeTool(toolName, input, projectDir) {
  switch (toolName) {
    case "read_file": {
      const p = safePath(projectDir, input.file_path);
      return await fs.readFile(p, "utf-8");
    }

    case "write_file": {
      const p = safePath(projectDir, input.file_path);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, input.content);
      return `File written: ${input.file_path}`;
    }

    case "edit_file": {
      const p = safePath(projectDir, input.file_path);
      const content = await fs.readFile(p, "utf-8");
      if (!content.includes(input.old_text)) {
        return `Error: Could not find the specified text in ${input.file_path}`;
      }
      const updated = content.replace(input.old_text, input.new_text);
      await fs.writeFile(p, updated);
      return `File edited: ${input.file_path}`;
    }

    case "list_directory": {
      const p = safePath(projectDir, input.directory);
      const entries = await fs.readdir(p, { withFileTypes: true });
      return entries
        .map((e) => `${e.isDirectory() ? "[dir]  " : "[file] "}${e.name}`)
        .join("\n");
    }

    case "search_files": {
      const glob = input.file_glob ? `--include='${input.file_glob}'` : "";
      const escaped = input.pattern.replace(/'/g, "'\\''");
      try {
        const result = execSync(
          `grep -rn '${escaped}' . ${glob} --include='*' -l 2>/dev/null | head -50`,
          { cwd: projectDir, encoding: "utf-8", timeout: 15000 }
        );
        return result || "No matches found.";
      } catch {
        return "No matches found.";
      }
    }

    case "run_command": {
      // Security check
      for (const blocked of BLOCKED_COMMANDS) {
        if (blocked.test(input.command)) {
          return "Error: This command is blocked for security reasons.";
        }
      }
      try {
        const result = execSync(input.command, {
          cwd: projectDir,
          encoding: "utf-8",
          timeout: 60000,
          maxBuffer: 1024 * 1024,
          env: { ...process.env, HOME: projectDir },
        });
        return result.slice(0, 15000) || "(no output)";
      } catch (err) {
        return `Command failed:\n${(err.stdout || "").slice(0, 5000)}\n${(err.stderr || "").slice(0, 5000)}`;
      }
    }

    case "create_directory": {
      const p = safePath(projectDir, input.directory);
      await fs.mkdir(p, { recursive: true });
      return `Directory created: ${input.directory}`;
    }

    case "delete_file": {
      const p = safePath(projectDir, input.file_path);
      await fs.unlink(p);
      return `Deleted: ${input.file_path}`;
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

const SYSTEM_PROMPT = `You are ATREYU, an elite AI coding assistant embedded in the ATREYU AIOS IDE.

You have full access to the user's project through tools: you can read, write, edit, search files, list directories, and run shell commands.

Guidelines:
- Be direct and concise. Lead with the solution, not the explanation.
- When you modify files, briefly describe what you changed and why.
- Use read_file before editing to understand existing code.
- Use edit_file for targeted changes; write_file for new files or complete rewrites.
- When asked to build something, write the actual code — don't just describe it.
- Run commands (tests, linters, builds) proactively to verify your work.
- If a task requires multiple steps, work through them methodically using tools.
- Format responses with markdown for readability.`;

/**
 * Runs the agentic Claude loop with tool use.
 * @param {string} apiKey - User's Anthropic API key
 * @param {string} userMessage - The user's message
 * @param {string} projectDir - Path to the project directory
 * @param {Array} conversationHistory - Previous messages
 * @param {Function} onEvent - Callback for streaming events to the client
 * @returns {Array} Updated conversation history
 */
async function runAgent(apiKey, userMessage, projectDir, conversationHistory, onEvent) {
  const client = new Anthropic({ apiKey });

  conversationHistory.push({ role: "user", content: userMessage });

  let iterations = 0;
  const MAX_ITERATIONS = 25; // Safety limit

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: conversationHistory,
    });

    conversationHistory.push({ role: "assistant", content: response.content });

    // Stream text to client
    for (const block of response.content) {
      if (block.type === "text") {
        onEvent({ type: "text", text: block.text });
      }
    }

    // If Claude is done (no more tool calls), break
    if (response.stop_reason === "end_turn") break;

    // Execute tool calls
    const toolResults = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        onEvent({
          type: "tool_use",
          tool: block.name,
          input: block.input,
        });

        try {
          const result = await executeTool(block.name, block.input, projectDir);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
          onEvent({
            type: "tool_result",
            tool: block.name,
            result: result.slice(0, 500) + (result.length > 500 ? "..." : ""),
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: ${err.message}`,
            is_error: true,
          });
          onEvent({
            type: "tool_error",
            tool: block.name,
            error: err.message,
          });
        }
      }
    }

    if (toolResults.length > 0) {
      conversationHistory.push({ role: "user", content: toolResults });
    } else {
      break;
    }
  }

  return conversationHistory;
}

module.exports = { runAgent };
