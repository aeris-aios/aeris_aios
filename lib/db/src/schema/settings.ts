import { pgTable, serial, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  key: text("key").notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Setting = typeof settingsTable.$inferSelect;
