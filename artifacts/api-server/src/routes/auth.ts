import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../middleware/auth";

const router: IRouter = Router();

/* ── Simple password hashing (SHA-256 + salt) ── */
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(`${s}:${password}`).digest("hex");
  return { hash: `${s}:${hash}`, salt: s };
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt] = stored.split(":");
  if (!salt) return false;
  const { hash } = hashPassword(password, salt);
  return hash === stored;
}

/* ═══════════════════════════════════════════════
   POST /api/auth/signup
═══════════════════════════════════════════════ */
router.post("/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  /* Check if user already exists */
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  try {
    const { hash } = hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash: hash,
        name: name.trim(),
        role: "user",
        onboardingComplete: false,
      })
      .returning();

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingComplete: user.onboardingComplete,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Signup failed" });
  }
});

/* ═══════════════════════════════════════════════
   POST /api/auth/login
═══════════════════════════════════════════════ */
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
    },
  });
});

/* ═══════════════════════════════════════════════
   GET /api/auth/me — get current user from token
═══════════════════════════════════════════════ */
router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    onboardingComplete: user.onboardingComplete,
  });
});

/* ═══════════════════════════════════════════════
   PUT /api/auth/me — update current user profile
═══════════════════════════════════════════════ */
router.put("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { name, avatarUrl, onboardingComplete } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (onboardingComplete !== undefined) updates.onboardingComplete = onboardingComplete;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    onboardingComplete: user.onboardingComplete,
  });
});

export default router;
