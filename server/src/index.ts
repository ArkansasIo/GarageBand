import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mysql, { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { z } from "zod";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be configured and at least 32 characters long.");
}
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "studiowave",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "studiowave",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "Z",
  enableKeepAlive: true
});
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(",").map((v) => v.trim()) ?? ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));

type AuthRequest = Request & { user?: { id: number; email: string } };
interface UserRow extends RowDataPacket { id: number; email: string; password_hash: string; }
interface ProjectRow extends RowDataPacket {
  id: number; user_id: number; name: string; bpm: number; project_data: unknown;
  created_at: Date; updated_at: Date;
}
const registerSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(12).max(128) });
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });
const projectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  bpm: z.number().int().min(30).max(300).default(120),
  projectData: z.record(z.unknown()).default({})
});
function validationError(res: Response, error: z.ZodError): void {
  res.status(400).json({ error: "Validation failed", details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
}
function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const payload = jwt.verify(token, jwtSecret!) as JwtPayload;
    if (typeof payload.sub !== "string" || !payload.email || !/^\d+$/.test(payload.sub)) {
      res.status(401).json({ error: "Invalid token" }); return;
    }
    req.user = { id: Number(payload.sub), email: String(payload.email) };
    next();
  } catch { res.status(401).json({ error: "Invalid or expired token" }); }
}
function issueToken(user: { id: number; email: string }): string {
  return jwt.sign({ email: user.email }, jwtSecret!, {
    subject: String(user.id),
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as NonNullable<jwt.SignOptions["expiresIn"]>
  });
}
app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ status: "ok", database: "connected", service: "StudioWave API" }); }
  catch { res.status(503).json({ status: "degraded", database: "unavailable" }); }
});
app.post("/api/auth/register", async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [result] = await pool.execute<ResultSetHeader>("INSERT INTO users (email, password_hash) VALUES (?, ?)", [email, passwordHash]);
    const user = { id: result.insertId, email };
    res.status(201).json({ user, token: issueToken(user) });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "An account with this email already exists" }); return;
    }
    next(error);
  }
});
app.post("/api/auth/login", async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const [rows] = await pool.execute<UserRow[]>("SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1", [parsed.data.email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" }); return;
    }
    res.json({ user: { id: user.id, email: user.email }, token: issueToken(user) });
  } catch (error) { next(error); }
});
app.get("/api/projects", authenticate, async (req: AuthRequest, res, next) => {
  try {
    const [rows] = await pool.execute<ProjectRow[]>(
      "SELECT id, user_id, name, bpm, project_data, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC", [req.user!.id]);
    res.json({ projects: rows.map((r) => ({ id: r.id, name: r.name, bpm: r.bpm, projectData: r.project_data, createdAt: r.created_at, updatedAt: r.updated_at })) });
  } catch (error) { next(error); }
});
app.post("/api/projects", authenticate, async (req: AuthRequest, res, next) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO projects (user_id, name, bpm, project_data) VALUES (?, ?, ?, ?)",
      [req.user!.id, parsed.data.name, parsed.data.bpm, JSON.stringify(parsed.data.projectData)]);
    res.status(201).json({ id: result.insertId, ...parsed.data });
  } catch (error) { next(error); }
});
app.get("/api/projects/:id", authenticate, async (req: AuthRequest, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Invalid project ID" }); return; }
  try {
    const [rows] = await pool.execute<ProjectRow[]>(
      "SELECT id, user_id, name, bpm, project_data, created_at, updated_at FROM projects WHERE id = ? AND user_id = ? LIMIT 1", [id, req.user!.id]);
    const p = rows[0];
    if (!p) { res.status(404).json({ error: "Project not found" }); return; }
    res.json({ id: p.id, name: p.name, bpm: p.bpm, projectData: p.project_data, createdAt: p.created_at, updatedAt: p.updated_at });
  } catch (error) { next(error); }
});
app.put("/api/projects/:id", authenticate, async (req: AuthRequest, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Invalid project ID" }); return; }
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE projects SET name = ?, bpm = ?, project_data = ? WHERE id = ? AND user_id = ?",
      [parsed.data.name, parsed.data.bpm, JSON.stringify(parsed.data.projectData), id, req.user!.id]);
    if (!result.affectedRows) { res.status(404).json({ error: "Project not found" }); return; }
    res.json({ id, ...parsed.data });
  } catch (error) { next(error); }
});
app.delete("/api/projects/:id", authenticate, async (req: AuthRequest, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: "Invalid project ID" }); return; }
  try {
    const [result] = await pool.execute<ResultSetHeader>("DELETE FROM projects WHERE id = ? AND user_id = ?", [id, req.user!.id]);
    if (!result.affectedRows) { res.status(404).json({ error: "Project not found" }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("API request failed:", err);
  res.status(500).json({ error: "Internal server error" });
});
const server = app.listen(port, () => console.log(`StudioWave API listening on port ${port}`));
async function shutdown(): Promise<void> { server.close(); await pool.end(); process.exit(0); }
process.on("SIGINT", () => { void shutdown(); });
process.on("SIGTERM", () => { void shutdown(); });
