import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentAssetsTable = pgTable("content_assets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  platform: text("platform"),
  tone: text("tone"),
  audience: text("audience"),
  campaignId: integer("campaign_id"),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const insertContentAssetSchema = createInsertSchema(contentAssetsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertContentAsset = z.infer<typeof insertContentAssetSchema>;
export type ContentAsset = typeof contentAssetsTable.$inferSelect;
