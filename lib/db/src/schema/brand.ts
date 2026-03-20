import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandProfilesTable = pgTable("brand_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  voiceDescription: text("voice_description"),
  primaryAudience: text("primary_audience"),
  usps: text("usps"),
  competitors: text("competitors"),
  styleNotes: text("style_notes"),
  colorPalette: jsonb("color_palette").$type<{ primary?: string; secondary?: string; accent?: string; background?: string; extras?: string[] }>(),
  websiteUrl: text("website_url"),
  industry: text("industry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brandAssetsTable = pgTable("brand_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  objectPath: text("object_path").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  metadata: jsonb("metadata").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const styleExamplesTable = pgTable("style_examples", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fileType: text("file_type").notNull(),
  objectPath: text("object_path").notNull(),
  mimeType: text("mime_type"),
  analysisResult: text("analysis_result"),
  tags: text("tags"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const insertBrandProfileSchema = createInsertSchema(brandProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBrandProfile = z.infer<typeof insertBrandProfileSchema>;
export type BrandProfile = typeof brandProfilesTable.$inferSelect;

export const insertBrandAssetSchema = createInsertSchema(brandAssetsTable).omit({ id: true, createdAt: true, deletedAt: true });
export type InsertBrandAsset = z.infer<typeof insertBrandAssetSchema>;
export type BrandAsset = typeof brandAssetsTable.$inferSelect;

export const insertStyleExampleSchema = createInsertSchema(styleExamplesTable).omit({ id: true, createdAt: true, deletedAt: true });
export type InsertStyleExample = z.infer<typeof insertStyleExampleSchema>;
export type StyleExample = typeof styleExamplesTable.$inferSelect;
