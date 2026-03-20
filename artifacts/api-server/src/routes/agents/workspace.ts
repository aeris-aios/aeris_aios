import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { db } from "@workspace/db";
import { agentWorkspaceFilesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

/* ── List all workspace files ──────────────────────────────────── */
router.get("/workspace/files", async (_req: Request, res: Response) => {
  const files = await db
    .select()
    .from(agentWorkspaceFilesTable)
    .where(isNull(agentWorkspaceFilesTable.deletedAt))
    .orderBy(agentWorkspaceFilesTable.createdAt);
  res.json(files);
});

/* ── Request presigned upload URL ──────────────────────────────── */
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

/* ── Save file metadata after upload ───────────────────────────── */
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

/* ── Stream file content (text) ─────────────────────────────────── */
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

/* ── Soft-delete a workspace file ───────────────────────────────── */
router.delete("/workspace/files/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  await db
    .update(agentWorkspaceFilesTable)
    .set({ deletedAt: new Date() })
    .where(eq(agentWorkspaceFilesTable.id, id));
  res.status(204).end();
});

/* ── Load text content of multiple files (used by job runner) ───── */
export async function loadWorkspaceFileContexts(fileIds: number[]): Promise<string> {
  if (!fileIds.length) return "";

  const records = await db
    .select()
    .from(agentWorkspaceFilesTable)
    .where(isNull(agentWorkspaceFilesTable.deletedAt));

  const selected = records.filter(r => fileIds.includes(r.id));
  const chunks: string[] = [];

  await Promise.all(selected.map(async (record) => {
    try {
      const file = await storage.getObjectEntityFile(record.objectPath);
      const response = await storage.downloadObject(file, 0);
      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
        const chunks2: Buffer[] = [];
        for await (const chunk of nodeStream) chunks2.push(Buffer.from(chunk));
        const text = Buffer.concat(chunks2).toString("utf8").slice(0, 20_000);
        chunks.push(`### FILE: ${record.path}\n\`\`\`\n${text}\n\`\`\``);
      }
    } catch (err) {
      console.warn(`Could not load workspace file ${record.path}:`, err);
    }
  }));

  return chunks.join("\n\n");
}

export default router;
