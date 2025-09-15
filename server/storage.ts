import { type FormTemplate, type InsertFormTemplate, type FormResponse, type InsertFormResponse, type FormField } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private formTemplates: Map<string, FormTemplate>;
  private formResponses: Map<string, FormResponse>;

  constructor() {
    this.formTemplates = new Map();
    this.formResponses = new Map();
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
}

export const storage = new MemStorage();
