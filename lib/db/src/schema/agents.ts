import { pgTable, serial, text, timestamp, integer, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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

export const agentWorkspaceFilesTable = pgTable("agent_workspace_files", {
  id:         serial("id").primaryKey(),
  name:       text("name").notNull(),          /* original filename, e.g. "main.py" */
  path:       text("path").notNull(),          /* relative path inside workspace, e.g. "src/main.py" */
  objectPath: text("object_path").notNull(),   /* storage path, e.g. /objects/uploads/<uuid> */
  mimeType:   text("mime_type").notNull(),
  fileSize:   integer("file_size"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  deletedAt:  timestamp("deleted_at"),
});

export const agentSkillsTable = pgTable("agent_skills", {
  id:          varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name:        text("name").notNull(),
  category:    text("category").notNull(),
  summary:     text("summary").notNull(),
  description: text("description"),
  keyConcepts: text("key_concepts"),   /* JSON array of strings */
  codeExample: text("code_example"),
  useCases:    text("use_cases"),      /* JSON array of strings */
  complexity:  text("complexity").notNull().default("intermediate"), /* beginner | intermediate | advanced */
  sourceRepo:  text("source_repo"),
  trainedAt:   timestamp("trained_at").defaultNow().notNull(),
  deletedAt:   timestamp("deleted_at"),
});

export const contentItemsTable = pgTable("content_items", {
  id:            varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt:        text("prompt").notNull(),
  platforms:     text("platforms").notNull(),    /* JSON array of platform IDs */
  tone:          text("tone").notNull().default("professional"),
  brandVoice:    text("brand_voice").default(""),
  skillsUsed:    text("skills_used").default("[]"),   /* JSON array of {skill_name, reason} */
  content:       text("content").default("[]"),        /* JSON array of platform content objects */
  strategyNotes: text("strategy_notes").default(""),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  deletedAt:     timestamp("deleted_at"),
});

export const insertAgentRepoSchema    = createInsertSchema(agentReposTable).omit({ id: true, createdAt: true, deletedAt: true, context: true, owner: true, repo: true, description: true });
export const insertAgentJobSchema     = createInsertSchema(agentJobsTable).omit({ id: true, createdAt: true, updatedAt: true, status: true, output: true });
export const insertAgentSkillSchema   = createInsertSchema(agentSkillsTable).omit({ id: true, trainedAt: true, deletedAt: true });
export const insertContentItemSchema  = createInsertSchema(contentItemsTable).omit({ id: true, createdAt: true, deletedAt: true });

export type AgentRepo          = typeof agentReposTable.$inferSelect;
export type AgentJob           = typeof agentJobsTable.$inferSelect;
export type AgentWorkspaceFile = typeof agentWorkspaceFilesTable.$inferSelect;
export type AgentSkill         = typeof agentSkillsTable.$inferSelect;
export type ContentItem        = typeof contentItemsTable.$inferSelect;
export type InsertAgentRepo    = z.infer<typeof insertAgentRepoSchema>;
export type InsertAgentJob     = z.infer<typeof insertAgentJobSchema>;
export type InsertAgentSkill   = z.infer<typeof insertAgentSkillSchema>;
export type InsertContentItem  = z.infer<typeof insertContentItemSchema>;
