import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import AdmZip from "adm-zip";
import { db } from "@workspace/db";
import { agentWorkspaceFilesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "../../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

/* ── Internal helper: upload a buffer directly to GCS ────────────── */
async function uploadBufferToStorage(content: Buffer, mimeType: string): Promise<string> {
  const privateDir = storage.getPrivateObjectDir();
  const objectId   = randomUUID();
  const fullPath   = `${privateDir}/uploads/${objectId}`;

  /* Parse bucket + object name from path like /bucket/dir/... */
  const parts      = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath;
  const slashIdx   = parts.indexOf("/");
  const bucketName = parts.slice(0, slashIdx);
  const objectName = parts.slice(slashIdx + 1);

  const bucket = objectStorageClient.bucket(bucketName);
  const file   = bucket.file(objectName);
  await file.save(content, { contentType: mimeType, resumable: false });

  return storage.normalizeObjectEntityPath(`https://storage.googleapis.com/${bucketName}/${objectName}`);
}

/* ── List all workspace files ──────────────────────────────────────── */
router.get("/workspace/files", async (_req: Request, res: Response) => {
  const files = await db
    .select()
    .from(agentWorkspaceFilesTable)
    .where(isNull(agentWorkspaceFilesTable.deletedAt))
    .orderBy(agentWorkspaceFilesTable.createdAt);
  res.json(files);
});

/* ── Request presigned upload URL (for non-zip files) ──────────────── */
router.post("/workspace/files/upload-request", async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body ?? {};
  if (!name || !contentType) {
    res.status(400).json({ error: "name and contentType are required" });
    return;
  }
  try {
    const uploadURL  = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    console.error("workspace upload-request error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/* ── Save file metadata after upload ──────────────────────────────── */
router.post("/workspace/files", async (req: Request, res: Response) => {
  const { name, path, objectPath, mimeType, fileSize } = req.body ?? {};
  if (!name || !path || !objectPath || !mimeType) {
    res.status(400).json({ error: "name, path, objectPath, mimeType are required" });
    return;
  }
  try {
    const [row] = await db
      .insert(agentWorkspaceFilesTable)
      .values({ name, path, objectPath, mimeType, fileSize: fileSize ?? null })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error("workspace save-file error:", err);
    res.status(500).json({ error: "Failed to save file record" });
  }
});

/* ── Server-side zip extraction ─────────────────────────────────────
 * Client uploads the .zip via presigned URL, then POSTs:
 *   { objectPath: "/objects/uploads/<uuid>", zipName: "project.zip" }
 * Server downloads the zip from storage, extracts entries with adm-zip,
 * uploads each file back to storage, creates DB records.
 * Returns the array of created WFile records.
 * ─────────────────────────────────────────────────────────────────── */
router.post("/workspace/files/extract-zip", async (req: Request, res: Response) => {
  const { objectPath, zipName } = req.body ?? {};
  if (!objectPath) {
    res.status(400).json({ error: "objectPath is required" });
    return;
  }

  try {
    /* 1. Download the zip bytes from storage */
    const zipFile   = await storage.getObjectEntityFile(objectPath);
    const response  = await storage.downloadObject(zipFile, 0);
    if (!response.body) {
      res.status(422).json({ error: "Empty zip file" });
      return;
    }
    const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream) chunks.push(Buffer.from(chunk));
    const zipBuffer = Buffer.concat(chunks);

    /* 2. Extract using adm-zip */
    const zip     = new AdmZip(zipBuffer);
    const entries = zip.getEntries().filter(e => !e.isDirectory && e.entryName.length > 0);

    if (entries.length === 0) {
      res.json([]);
      return;
    }

    /* 3. Upload each extracted file and save DB record */
    const created: typeof agentWorkspaceFilesTable.$inferSelect[] = [];
    await Promise.all(entries.map(async (entry) => {
      try {
        const content   = entry.getData();
        const entryPath = entry.entryName;                  /* e.g. "src/main.py" */
        const name      = entryPath.split("/").pop() ?? entryPath;
        const mimeType  = guessMimeType(name);

        const storedPath = await uploadBufferToStorage(content, mimeType);
        const [row] = await db
          .insert(agentWorkspaceFilesTable)
          .values({
            name,
            path:       entryPath,
            objectPath: storedPath,
            mimeType,
            fileSize:   content.length,
          })
          .returning();
        created.push(row);
      } catch (err) {
        console.warn(`Skipping zip entry ${entry.entryName}:`, err);
      }
    }));

    /* 4. Soft-delete the original zip record from storage (cleanup metadata if exists) */
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Zip file not found in storage" });
      return;
    }
    console.error("zip extract error:", err);
    res.status(500).json({ error: "Failed to extract zip" });
  }
});

/* ── Stream file content (text) ─────────────────────────────────────── */
router.get("/workspace/files/:id/content", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const [record] = await db
    .select()
    .from(agentWorkspaceFilesTable)
    .where(eq(agentWorkspaceFilesTable.id, id));

  if (!record || record.deletedAt) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const file = await storage.getObjectEntityFile(record.objectPath);
    const response = await storage.downloadObject(file, 0);
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      nodeStream.pipe(res);
    } else {
      res.end("");
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "File not found in storage" });
      return;
    }
    console.error("workspace file content error:", err);
    res.status(500).json({ error: "Failed to read file content" });
  }
});

/* ── Soft-delete a workspace file ────────────────────────────────────── */
router.delete("/workspace/files/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  await db
    .update(agentWorkspaceFilesTable)
    .set({ deletedAt: new Date() })
    .where(eq(agentWorkspaceFilesTable.id, id));
  res.status(204).end();
});

/* ── Load text content of multiple files (used by job runner) ────────── */
export async function loadWorkspaceFileContexts(fileIds: number[]): Promise<string> {
  if (!fileIds.length) return "";

  const records = await db
    .select()
    .from(agentWorkspaceFilesTable)
    .where(isNull(agentWorkspaceFilesTable.deletedAt));

  /* Preserve selection order (by fileIds order), sort secondarily by path for ties */
  const selected = records
    .filter(r => fileIds.includes(r.id))
    .sort((a, b) => fileIds.indexOf(a.id) - fileIds.indexOf(b.id) || a.path.localeCompare(b.path));

  /* Fetch contents sequentially to guarantee deterministic output order */
  const chunks: string[] = [];
  for (const record of selected) {
    try {
      const file = await storage.getObjectEntityFile(record.objectPath);
      const response = await storage.downloadObject(file, 0);
      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
        const parts: Buffer[] = [];
        for await (const chunk of nodeStream) parts.push(Buffer.from(chunk));
        /* Truncate at 20 KB per file for context safety; files are still stored at full size */
        const text = Buffer.concat(parts).toString("utf8").slice(0, 20_000);
        chunks.push(`### FILE: ${record.path}\n\`\`\`\n${text}\n\`\`\``);
      }
    } catch (err) {
      console.warn(`Could not load workspace file ${record.path}:`, err);
    }
  }

  return chunks.join("\n\n");
}

/* ── Mime type guesser ───────────────────────────────────────────────── */
function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "text/javascript", ts: "text/typescript", tsx: "text/typescript",
    jsx: "text/javascript", py: "text/x-python", go: "text/x-go",
    rs: "text/x-rust", java: "text/x-java", c: "text/x-c", cpp: "text/x-c++",
    cs: "text/x-csharp", rb: "text/x-ruby", php: "text/x-php",
    sh: "text/x-sh", bash: "text/x-sh", zsh: "text/x-sh",
    json: "application/json", yaml: "text/yaml", yml: "text/yaml",
    toml: "text/x-toml", env: "text/plain", md: "text/markdown",
    txt: "text/plain", html: "text/html", css: "text/css",
    xml: "text/xml", sql: "text/x-sql", graphql: "text/x-graphql",
    swift: "text/x-swift", kt: "text/x-kotlin", r: "text/x-r",
    lua: "text/x-lua", dockerfile: "text/plain",
  };
  return map[ext] ?? "text/plain";
}

export default router;
