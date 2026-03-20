import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const codestudioSessionsTable = pgTable("codestudio_sessions", {
  sessionToken: text("session_token").primaryKey(),
  apiKey:       text("api_key").notNull(),
  keyHint:      text("key_hint").notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export type CodestudioSession = typeof codestudioSessionsTable.$inferSelect;
