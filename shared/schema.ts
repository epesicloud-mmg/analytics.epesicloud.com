import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organizations (workspaces)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  description: text("description"),
  ownerId: varchar("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization memberships
export const organizationMemberships = pgTable("organization_memberships", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"), // owner, admin, member
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#4F46E5"), // hex color
  organizationId: integer("organization_id").notNull(),
  createdById: varchar("created_by_id").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, archived, completed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboards
export const dashboards = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  projectId: integer("project_id").notNull(),
  createdById: varchar("created_by_id").notNull(),
  config: jsonb("config").default("{}"), // Dashboard layout and component config
  isPublic: boolean("is_public").default(false),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data Sources
export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // csv, json, database, api
  config: jsonb("config").notNull().default("{}"), // Connection/file details
  organizationId: integer("organization_id").notNull(),
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard Components (blocks)
export const dashboardComponents = pgTable("dashboard_components", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // chart, table, metric, text
  config: jsonb("config").notNull().default("{}"), // Component-specific configuration
  position: jsonb("position").notNull().default("{}"), // Grid position and size
  dataSourceId: integer("data_source_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blocks for AI-first dashboard builder
export const blocks = pgTable("blocks", {
  id: varchar("id").primaryKey(),
  dashboardId: integer("dashboard_id").references(() => dashboards.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull().default("ai"), // ai, chart, table, text, metric
  size: integer("size").notNull().default(4), // 1-12 grid columns
  content: jsonb("content").default({}),
  position: integer("position").notNull().default(0),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Block Chat History Table
export const blockChatHistory = pgTable("block_chat_history", {
  id: varchar("id").primaryKey(),
  blockId: varchar("block_id").notNull().references(() => blocks.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  chartData: jsonb("chart_data"),
  generatedAt: timestamp("generated_at").defaultNow(),
});

// Epesi Agent Conversations Table
export const epesiConversations = pgTable("epesi_conversations", {
  id: varchar("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Epesi Agent Messages Table
export const epesiMessages = pgTable("epesi_messages", {
  id: serial("id").primaryKey(),
  conversationId: varchar("conversation_id").notNull().references(() => epesiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedOrganizations: many(organizations),
  memberships: many(organizationMemberships),
  projects: many(projects),
  dashboards: many(dashboards),
  dataSources: many(dataSources),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  memberships: many(organizationMemberships),
  projects: many(projects),
  dataSources: many(dataSources),
}));

export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMemberships.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  dashboards: many(dashboards),
}));

export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
  project: one(projects, {
    fields: [dashboards.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [dashboards.createdById],
    references: [users.id],
  }),
  components: many(dashboardComponents),
  blocks: many(blocks),
}));

export const dataSourcesRelations = relations(dataSources, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [dataSources.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [dataSources.createdById],
    references: [users.id],
  }),
  components: many(dashboardComponents),
}));

export const dashboardComponentsRelations = relations(dashboardComponents, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [dashboardComponents.dashboardId],
    references: [dashboards.id],
  }),
  dataSource: one(dataSources, {
    fields: [dashboardComponents.dataSourceId],
    references: [dataSources.id],
  }),
}));

export const blocksRelations = relations(blocks, ({ one, many }) => ({
  dashboard: one(dashboards, {
    fields: [blocks.dashboardId],
    references: [dashboards.id],
  }),
  createdBy: one(users, {
    fields: [blocks.createdById],
    references: [users.id],
  }),
  chatHistory: many(blockChatHistory),
}));

export const blockChatHistoryRelations = relations(blockChatHistory, ({ one }) => ({
  block: one(blocks, {
    fields: [blockChatHistory.blockId],
    references: [blocks.id],
  }),
}));

export const epesiConversationsRelations = relations(epesiConversations, ({ one, many }) => ({
  dashboard: one(dashboards, {
    fields: [epesiConversations.dashboardId],
    references: [dashboards.id],
  }),
  createdBy: one(users, {
    fields: [epesiConversations.createdById],
    references: [users.id],
  }),
  messages: many(epesiMessages),
}));

export const epesiMessagesRelations = relations(epesiMessages, ({ one }) => ({
  conversation: one(epesiConversations, {
    fields: [epesiMessages.conversationId],
    references: [epesiConversations.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDashboardSchema = createInsertSchema(dashboards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDashboardComponentSchema = createInsertSchema(dashboardComponents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertBlockChatHistorySchema = createInsertSchema(blockChatHistory).omit({
  generatedAt: true,
});

export const insertEpesiConversationSchema = createInsertSchema(epesiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEpesiMessageSchema = createInsertSchema(epesiMessages).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Dashboard = typeof dashboards.$inferSelect;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;
export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DashboardComponent = typeof dashboardComponents.$inferSelect;
export type InsertDashboardComponent = z.infer<typeof insertDashboardComponentSchema>;
export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type BlockChatHistory = typeof blockChatHistory.$inferSelect;
export type InsertBlockChatHistory = z.infer<typeof insertBlockChatHistorySchema>;
export type EpesiConversation = typeof epesiConversations.$inferSelect;
export type InsertEpesiConversation = z.infer<typeof insertEpesiConversationSchema>;
export type EpesiMessage = typeof epesiMessages.$inferSelect;
export type InsertEpesiMessage = z.infer<typeof insertEpesiMessageSchema>;
