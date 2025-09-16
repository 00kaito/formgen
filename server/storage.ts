import { type FormTemplate, type InsertFormTemplate, type FormResponse, type InsertFormResponse, type FormField, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Form Templates
  getFormTemplate(id: string): Promise<FormTemplate | undefined>;
  getFormTemplateByShareableLink(shareableLink: string): Promise<FormTemplate | undefined>;
  getAllFormTemplates(): Promise<FormTemplate[]>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: string): Promise<boolean>;

  // Form Responses
  getFormResponse(id: string): Promise<FormResponse | undefined>;
  getAllFormResponses(): Promise<FormResponse[]>;
  getFormResponsesByTemplateId(templateId: string): Promise<FormResponse[]>;
  createFormResponse(response: InsertFormResponse): Promise<FormResponse>;
  deleteFormResponse(id: string): Promise<boolean>;

  // User Management
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Statistics
  getFormStats(templateId: string): Promise<{
    totalResponses: number;
    completionRate: number;
    lastResponseAt?: Date;
  }>;
  
  getDashboardStats(): Promise<{
    totalForms: number;
    totalResponses: number;
    activeLinks: number;
    completionRate: number;
  }>;

  getAnalytics(templateId?: string): Promise<{
    submissionTrends: { date: string; count: number }[];
    topForms: { formId: string; title: string; responses: number }[];
    completionRates: { formId: string; title: string; rate: number }[];
    recentActivity: { 
      formTitle: string; 
      responseId: string; 
      submittedAt: Date; 
      isComplete: boolean;
    }[];
    timeOfDayDistribution: { hour: number; count: number }[];
    averageCompletionTime?: number;
  }>;
}

export class MemStorage implements IStorage {
  private formTemplates: Map<string, FormTemplate>;
  private formResponses: Map<string, FormResponse>;
  private users: Map<string, User>;

  constructor() {
    this.formTemplates = new Map();
    this.formResponses = new Map();
    this.users = new Map();
    
    // Initialize with hardcoded admin user
    this.initializeAdminUser();
  }

  private async initializeAdminUser() {
    const adminUser: User = {
      id: "admin-user-id",
      username: "admin",
      password: "Procesy123", // In production, this should be hashed
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
  }

  async getFormTemplate(id: string): Promise<FormTemplate | undefined> {
    return this.formTemplates.get(id);
  }

  async getFormTemplateByShareableLink(shareableLink: string): Promise<FormTemplate | undefined> {
    return Array.from(this.formTemplates.values()).find(
      (template) => template.shareableLink === shareableLink
    );
  }

  async getAllFormTemplates(): Promise<FormTemplate[]> {
    return Array.from(this.formTemplates.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createFormTemplate(insertTemplate: InsertFormTemplate): Promise<FormTemplate> {
    const id = randomUUID();
    const shareableLink = randomUUID();
    const now = new Date();
    
    const template: FormTemplate = {
      ...insertTemplate,
      id,
      shareableLink,
      description: insertTemplate.description || null,
      fields: insertTemplate.fields as FormField[],
      isActive: insertTemplate.isActive !== undefined ? insertTemplate.isActive : true,
      createdAt: now,
      updatedAt: now,
    };
    
    this.formTemplates.set(id, template);
    return template;
  }

  async updateFormTemplate(id: string, updateData: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    const existing = this.formTemplates.get(id);
    if (!existing) return undefined;

    const updated: FormTemplate = {
      ...existing,
      ...updateData,
      description: updateData.description !== undefined ? updateData.description || null : existing.description,
      fields: updateData.fields ? updateData.fields as FormField[] : existing.fields,
      updatedAt: new Date(),
    };

    this.formTemplates.set(id, updated);
    return updated;
  }

  async deleteFormTemplate(id: string): Promise<boolean> {
    // Also delete associated responses
    const responses = Array.from(this.formResponses.values()).filter(
      response => response.formTemplateId === id
    );
    responses.forEach(response => this.formResponses.delete(response.id));
    
    return this.formTemplates.delete(id);
  }

  async getFormResponse(id: string): Promise<FormResponse | undefined> {
    return this.formResponses.get(id);
  }

  async getAllFormResponses(): Promise<FormResponse[]> {
    return Array.from(this.formResponses.values())
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  async getFormResponsesByTemplateId(templateId: string): Promise<FormResponse[]> {
    return Array.from(this.formResponses.values())
      .filter(response => response.formTemplateId === templateId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  async createFormResponse(insertResponse: InsertFormResponse): Promise<FormResponse> {
    const id = randomUUID();
    
    const response: FormResponse = {
      ...insertResponse,
      id,
      isComplete: insertResponse.isComplete || false,
      submittedAt: new Date(),
    };
    
    this.formResponses.set(id, response);
    return response;
  }

  async deleteFormResponse(id: string): Promise<boolean> {
    return this.formResponses.delete(id);
  }

  // User Management Methods
  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;

    const updated: User = {
      ...existing,
      ...updateData,
    };

    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getFormStats(templateId: string): Promise<{
    totalResponses: number;
    completionRate: number;
    lastResponseAt?: Date;
  }> {
    const responses = await this.getFormResponsesByTemplateId(templateId);
    const completeResponses = responses.filter(r => r.isComplete);
    
    return {
      totalResponses: responses.length,
      completionRate: responses.length > 0 ? Math.round((completeResponses.length / responses.length) * 100) : 0,
      lastResponseAt: responses.length > 0 ? responses[0].submittedAt : undefined,
    };
  }

  async getDashboardStats(): Promise<{
    totalForms: number;
    totalResponses: number;
    activeLinks: number;
    completionRate: number;
  }> {
    const templates = Array.from(this.formTemplates.values());
    const responses = Array.from(this.formResponses.values());
    const completeResponses = responses.filter(r => r.isComplete);
    const activeTemplates = templates.filter(t => t.isActive);
    
    return {
      totalForms: templates.length,
      totalResponses: responses.length,
      activeLinks: activeTemplates.length,
      completionRate: responses.length > 0 ? Math.round((completeResponses.length / responses.length) * 100) : 0,
    };
  }

  async getAnalytics(templateId?: string): Promise<{
    submissionTrends: { date: string; count: number }[];
    topForms: { formId: string; title: string; responses: number }[];
    completionRates: { formId: string; title: string; rate: number }[];
    recentActivity: { 
      formTitle: string; 
      responseId: string; 
      submittedAt: Date; 
      isComplete: boolean;
    }[];
    timeOfDayDistribution: { hour: number; count: number }[];
    averageCompletionTime?: number;
  }> {
    const templates = Array.from(this.formTemplates.values());
    let responses = Array.from(this.formResponses.values());
    
    // Filter by templateId if provided
    if (templateId) {
      responses = responses.filter(r => r.formTemplateId === templateId);
    }

    // Submission trends (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const trendsMap = new Map<string, number>();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      trendsMap.set(dateStr, 0);
    }
    
    responses.forEach(response => {
      const dateStr = new Date(response.submittedAt).toISOString().split('T')[0];
      if (trendsMap.has(dateStr)) {
        trendsMap.set(dateStr, trendsMap.get(dateStr)! + 1);
      }
    });
    
    const submissionTrends = Array.from(trendsMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

    // Top forms by response count
    const formResponseCounts = new Map<string, number>();
    responses.forEach(response => {
      const count = formResponseCounts.get(response.formTemplateId) || 0;
      formResponseCounts.set(response.formTemplateId, count + 1);
    });
    
    const topForms = Array.from(formResponseCounts.entries())
      .map(([formId, responseCount]) => {
        const template = templates.find(t => t.id === formId);
        return {
          formId,
          title: template?.title || 'Unknown Form',
          responses: responseCount
        };
      })
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 10);

    // Completion rates by form
    const completionRates = templates.map(template => {
      const templateResponses = responses.filter(r => r.formTemplateId === template.id);
      const completeResponses = templateResponses.filter(r => r.isComplete);
      const rate = templateResponses.length > 0 
        ? Math.round((completeResponses.length / templateResponses.length) * 100) 
        : 0;
      
      return {
        formId: template.id,
        title: template.title,
        rate
      };
    }).sort((a, b) => b.rate - a.rate);

    // Recent activity (last 20 responses)
    const recentActivity = responses
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 20)
      .map(response => {
        const template = templates.find(t => t.id === response.formTemplateId);
        return {
          formTitle: template?.title || 'Unknown Form',
          responseId: response.id,
          submittedAt: response.submittedAt,
          isComplete: response.isComplete
        };
      });

    // Time of day distribution
    const hourCounts = new Array(24).fill(0);
    responses.forEach(response => {
      const hour = new Date(response.submittedAt).getHours();
      hourCounts[hour]++;
    });
    
    const timeOfDayDistribution = hourCounts.map((count, hour) => ({
      hour,
      count
    }));

    return {
      submissionTrends,
      topForms,
      completionRates,
      recentActivity,
      timeOfDayDistribution,
    };
  }
}

export const storage = new MemStorage();
