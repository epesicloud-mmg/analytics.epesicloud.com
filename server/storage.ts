import {
  users,
  organizations,
  organizationMemberships,
  projects,
  dashboards,
  dataSources,
  dashboardComponents,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Project,
  type InsertProject,
  type Dashboard,
  type InsertDashboard,
  type DataSource,
  type InsertDataSource,
  type DashboardComponent,
  type InsertDashboardComponent,
  blocks,
  type Block,
  type InsertBlock,
  blockChatHistory,
  type BlockChatHistory,
  type InsertBlockChatHistory,
  epesiConversations,
  type EpesiConversation,
  type InsertEpesiConversation,
  epesiMessages,
  type EpesiMessage,
  type InsertEpesiMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<Organization[]>;
  addUserToOrganization(organizationId: number, userId: string, role: string): Promise<void>;

  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByOrganization(organizationId: number): Promise<Project[]>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  // Dashboard operations
  createDashboard(dashboard: InsertDashboard): Promise<Dashboard>;
  getDashboard(id: number): Promise<Dashboard | undefined>;
  getDashboardsByProject(projectId: number): Promise<Dashboard[]>;
  updateDashboard(id: number, updates: Partial<InsertDashboard>): Promise<Dashboard | undefined>;
  deleteDashboard(id: number): Promise<void>;

  // Data source operations
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  getDataSourcesByOrganization(organizationId: number): Promise<DataSource[]>;
  updateDataSource(id: number, updates: Partial<InsertDataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: number): Promise<void>;

  // Dashboard component operations
  createDashboardComponent(component: InsertDashboardComponent): Promise<DashboardComponent>;
  getDashboardComponents(dashboardId: number): Promise<DashboardComponent[]>;
  updateDashboardComponent(id: number, updates: Partial<InsertDashboardComponent>): Promise<DashboardComponent | undefined>;
  deleteDashboardComponent(id: number): Promise<void>;

  // Block operations for AI-first dashboard builder
  createBlock(block: InsertBlock): Promise<Block>;
  getBlock(id: string): Promise<Block | undefined>;
  getBlocksByDashboard(dashboardId: number): Promise<Block[]>;
  updateBlock(id: string, updates: Partial<InsertBlock>): Promise<Block | undefined>;
  deleteBlock(id: string): Promise<void>;
  reorderBlocks(dashboardId: number, blockOrder: string[]): Promise<void>;

  // Block chat history operations
  createBlockChatHistory(chatHistory: InsertBlockChatHistory): Promise<BlockChatHistory>;
  getBlockChatHistory(blockId: string): Promise<BlockChatHistory[]>;
  deleteBlockChatHistory(id: string): Promise<void>;

  // Epesi conversation operations
  createEpesiConversation(conversation: InsertEpesiConversation): Promise<EpesiConversation>;
  getEpesiConversation(id: string): Promise<EpesiConversation | undefined>;
  getEpesiConversations(dashboardId: number): Promise<EpesiConversation[]>;
  updateEpesiConversation(id: string, updates: Partial<InsertEpesiConversation>): Promise<EpesiConversation | undefined>;
  deleteEpesiConversation(id: string): Promise<void>;

  // Epesi message operations
  createEpesiMessage(message: InsertEpesiMessage): Promise<EpesiMessage>;
  getEpesiMessages(conversationId: string): Promise<EpesiMessage[]>;
  deleteEpesiMessage(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [organization] = await db
      .insert(organizations)
      .values(org)
      .returning();
    return organization;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return organization;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    return organization;
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const result = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        domain: organizations.domain,
        description: organizations.description,
        ownerId: organizations.ownerId,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .innerJoin(organizationMemberships, eq(organizations.id, organizationMemberships.organizationId))
      .where(eq(organizationMemberships.userId, userId));
    return result;
  }

  async addUserToOrganization(organizationId: number, userId: string, role: string): Promise<void> {
    await db
      .insert(organizationMemberships)
      .values({
        organizationId,
        userId,
        role,
      });
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getProjectsByOrganization(organizationId: number): Promise<Project[]> {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, organizationId))
      .orderBy(desc(projects.updatedAt));
    return result;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Dashboard operations
  async createDashboard(dashboard: InsertDashboard): Promise<Dashboard> {
    const [newDashboard] = await db
      .insert(dashboards)
      .values(dashboard)
      .returning();
    return newDashboard;
  }

  async getDashboard(id: number): Promise<Dashboard | undefined> {
    console.log("DatabaseStorage.getDashboard called with id:", id, "type:", typeof id);
    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id));
    console.log("DatabaseStorage.getDashboard result:", dashboard);
    return dashboard;
  }

  async getDashboardsByProject(projectId: number): Promise<Dashboard[]> {
    const result = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.projectId, projectId))
      .orderBy(desc(dashboards.updatedAt));
    return result;
  }

  async updateDashboard(id: number, updates: Partial<InsertDashboard>): Promise<Dashboard | undefined> {
    const [updatedDashboard] = await db
      .update(dashboards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dashboards.id, id))
      .returning();
    return updatedDashboard;
  }

  async deleteDashboard(id: number): Promise<void> {
    await db.delete(dashboards).where(eq(dashboards.id, id));
  }

  // Data source operations
  async createDataSource(dataSource: InsertDataSource): Promise<DataSource> {
    const [newDataSource] = await db
      .insert(dataSources)
      .values(dataSource)
      .returning();
    return newDataSource;
  }

  async getDataSource(id: number): Promise<DataSource | undefined> {
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, id));
    return dataSource;
  }

  async getDataSourcesByOrganization(organizationId: number): Promise<DataSource[]> {
    const result = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.organizationId, organizationId))
      .orderBy(desc(dataSources.createdAt));
    return result;
  }

  async updateDataSource(id: number, updates: Partial<InsertDataSource>): Promise<DataSource | undefined> {
    const [updatedDataSource] = await db
      .update(dataSources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dataSources.id, id))
      .returning();
    return updatedDataSource;
  }

  async deleteDataSource(id: number): Promise<void> {
    await db.delete(dataSources).where(eq(dataSources.id, id));
  }

  // Dashboard component operations
  async createDashboardComponent(component: InsertDashboardComponent): Promise<DashboardComponent> {
    const [newComponent] = await db
      .insert(dashboardComponents)
      .values(component)
      .returning();
    return newComponent;
  }

  async getDashboardComponents(dashboardId: number): Promise<DashboardComponent[]> {
    const result = await db
      .select()
      .from(dashboardComponents)
      .where(eq(dashboardComponents.dashboardId, dashboardId));
    return result;
  }

  async updateDashboardComponent(id: number, updates: Partial<InsertDashboardComponent>): Promise<DashboardComponent | undefined> {
    const [updatedComponent] = await db
      .update(dashboardComponents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dashboardComponents.id, id))
      .returning();
    return updatedComponent;
  }

  async deleteDashboardComponent(id: number): Promise<void> {
    await db.delete(dashboardComponents).where(eq(dashboardComponents.id, id));
  }

  // Block operations for AI-first dashboard builder
  async createBlock(block: InsertBlock): Promise<Block> {
    const [createdBlock] = await db
      .insert(blocks)
      .values(block)
      .returning();
    return createdBlock;
  }

  async getBlock(id: string): Promise<Block | undefined> {
    const [block] = await db.select().from(blocks).where(eq(blocks.id, id));
    return block;
  }

  async getBlocksByDashboard(dashboardId: number): Promise<Block[]> {
    return await db
      .select()
      .from(blocks)
      .where(eq(blocks.dashboardId, dashboardId))
      .orderBy(asc(blocks.position));
  }

  async updateBlock(id: string, updates: Partial<InsertBlock>): Promise<Block | undefined> {
    const [updatedBlock] = await db
      .update(blocks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blocks.id, id))
      .returning();
    return updatedBlock;
  }

  async deleteBlock(id: string): Promise<void> {
    await db.delete(blocks).where(eq(blocks.id, id));
  }

  async reorderBlocks(dashboardId: number, blockOrder: string[]): Promise<void> {
    for (let i = 0; i < blockOrder.length; i++) {
      await db
        .update(blocks)
        .set({ position: i })
        .where(and(eq(blocks.id, blockOrder[i]), eq(blocks.dashboardId, dashboardId)));
    }
  }

  // Block chat history operations
  async createBlockChatHistory(chatHistory: InsertBlockChatHistory): Promise<BlockChatHistory> {
    const [newChatHistory] = await db
      .insert(blockChatHistory)
      .values(chatHistory)
      .returning();
    return newChatHistory;
  }

  async getBlockChatHistory(blockId: string): Promise<BlockChatHistory[]> {
    return await db
      .select()
      .from(blockChatHistory)
      .where(eq(blockChatHistory.blockId, blockId))
      .orderBy(desc(blockChatHistory.generatedAt));
  }

  async deleteBlockChatHistory(id: string): Promise<void> {
    await db.delete(blockChatHistory).where(eq(blockChatHistory.id, id));
  }

  // Epesi conversation operations
  async createEpesiConversation(conversation: InsertEpesiConversation): Promise<EpesiConversation> {
    const [newConversation] = await db
      .insert(epesiConversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getEpesiConversation(id: string): Promise<EpesiConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(epesiConversations)
      .where(eq(epesiConversations.id, id));
    return conversation;
  }

  async getEpesiConversations(dashboardId: number): Promise<EpesiConversation[]> {
    const result = await db
      .select()
      .from(epesiConversations)
      .where(eq(epesiConversations.dashboardId, dashboardId))
      .orderBy(desc(epesiConversations.updatedAt));
    return result;
  }

  async updateEpesiConversation(id: string, updates: Partial<InsertEpesiConversation>): Promise<EpesiConversation | undefined> {
    const [updatedConversation] = await db
      .update(epesiConversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(epesiConversations.id, id))
      .returning();
    return updatedConversation;
  }

  async deleteEpesiConversation(id: string): Promise<void> {
    await db.delete(epesiConversations).where(eq(epesiConversations.id, id));
  }

  // Epesi message operations
  async createEpesiMessage(message: InsertEpesiMessage): Promise<EpesiMessage> {
    const [newMessage] = await db
      .insert(epesiMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getEpesiMessages(conversationId: string): Promise<EpesiMessage[]> {
    const result = await db
      .select()
      .from(epesiMessages)
      .where(eq(epesiMessages.conversationId, conversationId))
      .orderBy(asc(epesiMessages.createdAt));
    return result;
  }

  async deleteEpesiMessage(id: string): Promise<void> {
    await db.delete(epesiMessages).where(eq(epesiMessages.id, id));
  }
}

export const storage = new DatabaseStorage();
