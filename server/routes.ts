import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFormTemplateSchema, insertFormResponseSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Form Templates Routes
  app.get("/api/form-templates", async (req, res) => {
    try {
      const templates = await storage.getAllFormTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form templates" });
    }
  });

  app.get("/api/form-templates/:id", async (req, res) => {
    try {
      const template = await storage.getFormTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form template" });
    }
  });

  app.get("/api/public-forms/:shareableLink", async (req, res) => {
    try {
      const template = await storage.getFormTemplateByShareableLink(req.params.shareableLink);
      if (!template || !template.isActive) {
        return res.status(404).json({ message: "Form not found or inactive" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.post("/api/form-templates", async (req, res) => {
    try {
      const validatedData = insertFormTemplateSchema.parse(req.body);
      const template = await storage.createFormTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create form template" });
    }
  });

  app.put("/api/form-templates/:id", async (req, res) => {
    try {
      const validatedData = insertFormTemplateSchema.partial().parse(req.body);
      const template = await storage.updateFormTemplate(req.params.id, validatedData);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update form template" });
    }
  });

  app.delete("/api/form-templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFormTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete form template" });
    }
  });

  // Form Responses Routes
  app.get("/api/form-templates/:id/responses", async (req, res) => {
    try {
      const responses = await storage.getFormResponsesByTemplateId(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  app.get("/api/form-responses", async (req, res) => {
    try {
      const { formTemplateId } = req.query;
      if (formTemplateId && typeof formTemplateId === 'string') {
        const responses = await storage.getFormResponsesByTemplateId(formTemplateId);
        res.json(responses);
      } else {
        const responses = await storage.getAllFormResponses();
        res.json(responses);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  app.post("/api/form-responses", async (req, res) => {
    try {
      const validatedData = insertFormResponseSchema.parse(req.body);
      const response = await storage.createFormResponse(validatedData);
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit form response" });
    }
  });

  app.delete("/api/form-responses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteFormResponse(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Form response not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete form response" });
    }
  });

  // Statistics Routes
  app.get("/api/form-templates/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getFormStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form stats" });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    try {
      const { templateId } = req.query;
      const analytics = await storage.getAnalytics(typeof templateId === 'string' ? templateId : undefined);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Export Routes
  app.get("/api/form-templates/:id/export", async (req, res) => {
    try {
      const { format = 'csv' } = req.query;
      const formTemplate = await storage.getFormTemplate(req.params.id);
      const responses = await storage.getFormResponsesByTemplateId(req.params.id);
      
      if (!formTemplate) {
        return res.status(404).json({ message: "Form template not found" });
      }

      if (responses.length === 0) {
        return res.status(400).json({ message: "No responses to export" });
      }

      if (format === 'excel') {
        // Excel export using exceljs
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Form Responses');

        // Headers
        const headers = ['Response ID', 'Submitted At', 'Status'];
        formTemplate.fields.forEach(field => {
          headers.push(field.label);
        });
        worksheet.addRow(headers);

        // Style headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6E6' }
        };

        // Add data rows
        responses.forEach(response => {
          const row = [
            response.id,
            new Date(response.submittedAt).toLocaleDateString(),
            response.isComplete ? 'Complete' : 'Incomplete'
          ];
          
          formTemplate.fields.forEach(field => {
            const value = response.responses[field.id];
            if (Array.isArray(value)) {
              row.push(value.join('; '));
            } else {
              row.push(value || '');
            }
          });
          
          worksheet.addRow(row);
        });

        // Auto-fit columns
        worksheet.columns.forEach((column: any) => {
          column.width = Math.max(column.width || 0, 15);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${formTemplate.title}-responses.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
      } else {
        // CSV export
        const headers = ['Response ID', 'Submitted At', 'Status'];
        formTemplate.fields.forEach(field => {
          headers.push(field.label);
        });

        const csvRows = [headers.join(',')];
        
        responses.forEach(response => {
          const row = [
            `"${response.id}"`,
            `"${new Date(response.submittedAt).toLocaleDateString()}"`,
            `"${response.isComplete ? 'Complete' : 'Incomplete'}"`
          ];
          
          formTemplate.fields.forEach(field => {
            const value = response.responses[field.id];
            if (Array.isArray(value)) {
              row.push(`"${value.join('; ')}"`);
            } else {
              row.push(`"${value || ''}"`);
            }
          });
          
          csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${formTemplate.title}-responses.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: "Failed to export responses" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
