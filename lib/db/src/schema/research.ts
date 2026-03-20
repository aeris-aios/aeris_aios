import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const researchJobsTable = pgTable("research_jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sourceType: text("source_type").notNull(),
  status: text("status").notNull().default("pending"),
  targets: text("targets").notNull(),
  scrapeTemplate: text("scrape_template"),
  summary: text("summary"),
  apifyRunId: text("apify_run_id"),
  campaignId: integer("campaign_id"),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const researchResultsTable = pgTable("research_results", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  url: text("url"),
  title: text("title"),
  content: text("content").notNull(),
  rawData: text("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResearchJobSchema = createInsertSchema(researchJobsTable).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export type InsertResearchJob = z.infer<typeof insertResearchJobSchema>;
export type ResearchJob = typeof researchJobsTable.$inferSelect;
export type ResearchResult = typeof researchResultsTable.$inferSelect;
