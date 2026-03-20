import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentReposTable = pgTable("agent_repos", {
  id:          serial("id").primaryKey(),
  url:         text("url").notNull(),
  owner:       text("owner").notNull(),
  repo:        text("repo").notNull(),
  description: text("description"),
  context:     text("context"),            /* concatenated file content for prompt injection */
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  deletedAt:   timestamp("deleted_at"),
});

export const agentJobsTable = pgTable("agent_jobs", {
  id:           serial("id").primaryKey(),
  title:        text("title").notNull(),
  task:         text("task").notNull(),
  model:        text("model").notNull().default("sonnet"),
  status:       text("status").notNull().default("running"),   /* running | complete | failed */
  output:       text("output"),
  outputTarget: text("output_target"),                        /* automations | campaigns | knowledge | dashboard */
  repoIds:      text("repo_ids"),                             /* JSON array of repo IDs used */
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentRepoSchema = createInsertSchema(agentReposTable).omit({ id: true, createdAt: true, deletedAt: true, context: true, owner: true, repo: true, description: true });
export const insertAgentJobSchema  = createInsertSchema(agentJobsTable).omit({ id: true, createdAt: true, updatedAt: true, status: true, output: true });

export type AgentRepo = typeof agentReposTable.$inferSelect;
export type AgentJob  = typeof agentJobsTable.$inferSelect;
export type InsertAgentRepo = z.infer<typeof insertAgentRepoSchema>;
export type InsertAgentJob  = z.infer<typeof insertAgentJobSchema>;
