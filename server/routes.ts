import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { insertFormTemplateSchema, insertFormResponseSchema, formResponses } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
// Import MarkdownFormParser for markdown export functionality
import { MarkdownFormParser } from "@shared/markdownParser";
// Import FormBackupUtils for disk backup functionality
import { FormBackupUtils } from "./backup-utils";
import multer from "multer";
import path from "path";
import fs from "fs";
import slugify from "slugify";
import passport from "passport";
import { requireAuth, isAuthenticated } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Multer configuration for file uploads
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      // Generate unique filename with timestamp and random string
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      
      // Sanitize the original filename using slugify
      const fileExtension = path.extname(file.originalname);
      const filenameWithoutExt = path.basename(file.originalname, fileExtension);
      const sanitizedName = slugify(filenameWithoutExt, { 
        lower: true, 
        strict: true, 
        remove: /[*+~.()'"!:@]/g 
      });
      
      // Fallback to 'file' if sanitization results in empty string
      const safeName = sanitizedName || 'file';
      
      cb(null, file.fieldname + '-' + uniqueSuffix + '-' + safeName + fileExtension);
    }
  });

  const upload = multer({ 
    storage: storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: function (req, file, cb) {
      // Accept all file types for now
      cb(null, true);
    }
  });

  // Define globally safe MIME types for additional security
  const SAFE_MIME_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    'application/zip', 'application/x-zip-compressed',
    // Audio/Video (common safe formats)
    'audio/mpeg', 'audio/wav', 'video/mp4', 'video/mpeg'
  ]);

  // File Upload Route with security validation
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { templateId, fieldId } = req.body;
      
      // Validate required parameters
      if (!templateId || !fieldId) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: "Template ID and Field ID are required for file uploads" 
        });
      }

      // Get form template and field configuration
      const template = await dbStorage.getFormTemplate(templateId);
      if (!template) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Form template not found" });
      }

      const field = template.fields.find(f => f.id === fieldId);
      if (!field || field.type !== 'file') {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Invalid file field" });
      }

      // Global security check - validate against safe MIME types
      if (!SAFE_MIME_TYPES.has(req.file.mimetype)) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: `File type ${req.file.mimetype} is not allowed for security reasons` 
        });
      }

      // Server-side file size validation
      if (field.maxFileSize && req.file.size > field.maxFileSize * 1024 * 1024) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: `File size exceeds maximum allowed size of ${field.maxFileSize}MB` 
        });
      }

      // Server-side MIME type validation against field constraints
      if (field.acceptedFileTypes && field.acceptedFileTypes.length > 0) {
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        const isAccepted = field.acceptedFileTypes.some(type => {
          // Handle both extension formats (.pdf, pdf) and MIME types
          if (type.startsWith('.')) {
            return fileExtension === type.toLowerCase();
          } else if (type.includes('/')) {
            return req.file!.mimetype === type;
          } else {
            return fileExtension === `.${type.toLowerCase()}`;
          }
        });

        if (!isAccepted) {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ 
            message: `File type not accepted. Allowed types: ${field.acceptedFileTypes.join(', ')}` 
          });
        }
      }

      const fileInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`
      };

      res.json(fileInfo);
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded file:', cleanupError);
        }
      }
      console.error('File upload error:', error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Serve uploaded files with security headers
  app.use('/uploads', (req, res, next) => {
    // Set security headers for file serving
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Use express.static to serve the file
    express.static(uploadsDir)(req, res, next);
  });

  // Authentication Routes
  app.post("/api/auth/login", (req, res, next) => {
    return passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Błąd serwera" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Nieprawidłowe dane uwierzytelniające" });
      }
      req.logIn(user, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Błąd logowania" });
        }
        return res.json({ 
          message: "Zalogowano pomyślnie", 
          user: {
            id: user.id,
            username: user.username
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Błąd wylogowania" });
      }
      res.json({ message: "Wylogowano pomyślnie" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ 
        authenticated: true, 
        user: {
          id: req.user.id,
          username: req.user.username
        }
      });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  // Form Templates Routes (Protected)
  app.get("/api/form-templates", async (req, res) => {
    try {
      const templates = await dbStorage.getAllFormTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form templates" });
    }
  });

  app.get("/api/form-templates/:id", async (req, res) => {
    try {
      const template = await dbStorage.getFormTemplate(req.params.id);
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
      const template = await dbStorage.getFormTemplateByShareableLink(req.params.shareableLink);
      if (!template || !template.isActive) {
        return res.status(404).json({ message: "Form not found or inactive" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.get("/api/response/:shareableResponseLink", async (req, res) => {
    try {
      const response = await dbStorage.getFormResponseByShareableLink(req.params.shareableResponseLink);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      // Also fetch the form template to get field definitions
      const template = await dbStorage.getFormTemplate(response.formTemplateId);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      res.json({
        response,
        template
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  app.post("/api/form-templates", async (req, res) => {
    try {
      const validatedData = insertFormTemplateSchema.parse(req.body);
      const template = await dbStorage.createFormTemplate(validatedData);
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
      const template = await dbStorage.updateFormTemplate(req.params.id, validatedData);
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
      const deleted = await dbStorage.deleteFormTemplate(req.params.id);
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
      const responses = await dbStorage.getFormResponsesByTemplateId(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  app.get("/api/form-responses", async (req, res) => {
    try {
      const { formTemplateId } = req.query;
      if (formTemplateId && typeof formTemplateId === 'string') {
        const responses = await dbStorage.getFormResponsesByTemplateId(formTemplateId);
        res.json(responses);
      } else {
        const responses = await dbStorage.getAllFormResponses();
        res.json(responses);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  app.post("/api/form-responses", async (req, res) => {
    try {
      const validatedData = insertFormResponseSchema.parse(req.body);
      const response = await dbStorage.createFormResponse(validatedData);
      
      // Return response immediately to avoid blocking user
      res.status(201).json(response);
      
      // Create backup files asynchronously (non-blocking) only for completed responses
      if (response.isComplete) {
        setImmediate(async () => {
          try {
            const formTemplate = await dbStorage.getFormTemplate(response.formTemplateId);
            if (formTemplate) {
              const backupResult = await FormBackupUtils.createBackups(formTemplate, response);
              if (!backupResult.success) {
                console.warn('Async backup creation failed:', backupResult.errors);
              } else {
                console.log('Async backup files created successfully:', backupResult.files);
              }
            }
          } catch (backupError) {
            // Log async backup errors
            console.error('Async backup creation error:', backupError);
          }
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit form response" });
    }
  });

  // Save draft response (isComplete: false)
  app.post("/api/form-responses/draft", async (req, res) => {
    try {
      const validatedData = insertFormResponseSchema.parse({
        ...req.body,
        isComplete: false, // Force draft status
      });
      const response = await dbStorage.createFormResponse(validatedData);
      
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  // Update draft response
  app.put("/api/form-responses/draft/:shareableResponseLink", async (req, res) => {
    try {
      const existingResponse = await dbStorage.getFormResponseByShareableLink(req.params.shareableResponseLink);
      if (!existingResponse) {
        return res.status(404).json({ message: "Draft not found" });
      }

      // Only allow updating incomplete responses
      if (existingResponse.isComplete) {
        return res.status(400).json({ message: "Cannot update completed response" });
      }

      const validatedData = insertFormResponseSchema.parse({
        ...req.body,
        isComplete: req.body.isComplete || false, // Allow setting to complete
      });

      // Delete old response and create new one with same shareable link
      await dbStorage.deleteFormResponse(existingResponse.id);
      
      const updatedResponse = await dbStorage.createFormResponse({
        ...validatedData,
        formTemplateId: existingResponse.formTemplateId, // Keep same template
      });

      // Update the shareable link to match the original
      const storage = dbStorage as any;
      if (storage.db) {
        // PostgreSQL update
        await storage.db.update(formResponses)
          .set({ shareableResponseLink: req.params.shareableResponseLink })
          .where(eq(formResponses.id, updatedResponse.id));
        
        // Re-fetch the updated response
        const finalResponse = await dbStorage.getFormResponseByShareableLink(req.params.shareableResponseLink);
        res.json(finalResponse);
      } else {
        // In-memory storage update
        updatedResponse.shareableResponseLink = req.params.shareableResponseLink;
        res.json(updatedResponse);
      }

      // Create backup files if response is now complete
      if (validatedData.isComplete) {
        setImmediate(async () => {
          try {
            const formTemplate = await dbStorage.getFormTemplate(existingResponse.formTemplateId);
            if (formTemplate) {
              const finalResponse = await dbStorage.getFormResponseByShareableLink(req.params.shareableResponseLink);
              if (finalResponse) {
                const backupResult = await FormBackupUtils.createBackups(formTemplate, finalResponse);
                if (!backupResult.success) {
                  console.warn('Async backup creation failed:', backupResult.errors);
                } else {
                  console.log('Async backup files created successfully:', backupResult.files);
                }
              }
            }
          } catch (backupError) {
            console.error('Async backup creation error:', backupError);
          }
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid response data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update draft" });
    }
  });

  // Get draft response by shareable link
  app.get("/api/draft-responses/:shareableResponseLink", async (req, res) => {
    try {
      const response = await dbStorage.getFormResponseByShareableLink(req.params.shareableResponseLink);
      if (!response) {
        return res.status(404).json({ message: "Draft not found" });
      }
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch draft" });
    }
  });

  app.delete("/api/form-responses/:id", async (req, res) => {
    try {
      const deleted = await dbStorage.deleteFormResponse(req.params.id);
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
      const stats = await dbStorage.getFormStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch form stats" });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await dbStorage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    try {
      const { templateId } = req.query;
      const analytics = await dbStorage.getAnalytics(typeof templateId === 'string' ? templateId : undefined);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Export Routes
  app.get("/api/form-templates/:id/export", async (req, res) => {
    try {
      const { format = 'csv' } = req.query;
      const formTemplate = await dbStorage.getFormTemplate(req.params.id);
      const responses = await dbStorage.getFormResponsesByTemplateId(req.params.id);
      
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
      } else if (format === 'markdown') {
        // Markdown export
        const markdownContent = MarkdownFormParser.exportResponsesToMarkdown(
          {
            title: formTemplate.title,
            description: formTemplate.description || undefined,
            fields: formTemplate.fields
          },
          responses.map(response => ({
            id: response.id,
            responses: response.responses,
            submittedAt: response.submittedAt
          })),
          true // Include form definition
        );
        
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${formTemplate.title}-responses.md"`);
        res.send(markdownContent);
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
