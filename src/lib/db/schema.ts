import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  integer,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============ Enums ============

export const nodeTypeEnum = pgEnum("node_type", ["FOLDER", "FILE"]);
export const entityTypeEnum = pgEnum("entity_type", [
  "CHARACTER",
  "LOCATION",
  "ITEM",
]);

// ============ Tables ============

// Profiles table (extends Supabase Auth)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // References auth.users
  nickname: text("nickname").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Nodes table (recursive file tree)
export const nodes = pgTable("nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // Self-reference for tree structure
  type: nodeTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").default("").notNull(),
  outline: text("outline").default("").notNull(),
  summary: text("summary").default("").notNull(),
  order: text("order").notNull(), // Fractional index for sorting
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Entities table (world building)
export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: entityTypeEnum("type").notNull(),
  name: text("name").notNull(),
  aliases: text("aliases").array().default([]).notNull(),
  description: text("description").default("").notNull(),
  attributes: jsonb("attributes").default({}).notNull(),
  avatarUrl: text("avatar_url"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Mentions table (entity references in nodes)
export const mentions = pgTable("mentions", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  frequency: integer("frequency").default(0).notNull(),
});

// Node versions table (version history)
export const nodeVersions = pgTable("node_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  wordCount: integer("word_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============ Relations ============

export const profilesRelations = relations(profiles, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(profiles, {
    fields: [projects.userId],
    references: [profiles.id],
  }),
  nodes: many(nodes),
  entities: many(entities),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  project: one(projects, {
    fields: [nodes.projectId],
    references: [projects.id],
  }),
  parent: one(nodes, {
    fields: [nodes.parentId],
    references: [nodes.id],
    relationName: "parentChild",
  }),
  children: many(nodes, { relationName: "parentChild" }),
  mentions: many(mentions),
  versions: many(nodeVersions),
}));

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  project: one(projects, {
    fields: [entities.projectId],
    references: [projects.id],
  }),
  mentions: many(mentions),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  node: one(nodes, {
    fields: [mentions.nodeId],
    references: [nodes.id],
  }),
  entity: one(entities, {
    fields: [mentions.entityId],
    references: [entities.id],
  }),
}));

export const nodeVersionsRelations = relations(nodeVersions, ({ one }) => ({
  node: one(nodes, {
    fields: [nodeVersions.nodeId],
    references: [nodes.id],
  }),
}));

// ============ Type Exports ============

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;

export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;

export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;

export type NodeVersion = typeof nodeVersions.$inferSelect;
export type NewNodeVersion = typeof nodeVersions.$inferInsert;
