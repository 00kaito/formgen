import fs from "fs";
import path from "path";
import { type FormTemplate, type FormResponse } from "@shared/schema";

// Ensure FormData and Blob are available in Node.js environment
// Modern Node.js (18+) has these built-in, but ensure they're available
if (!globalThis.FormData) {
  console.warn('[WEBHOOK] FormData not available in global scope');
}
if (!globalThis.Blob) {
  console.warn('[WEBHOOK] Blob not available in global scope');
}
if (!globalThis.fetch) {
  console.warn('[WEBHOOK] fetch not available in global scope');
}

export class FormBackupUtils {
  private static backupDir = path.join(process.cwd(), "form-backups");

  /**
   * Ensures the backup directory structure exists for a given form template
   */
  private static async ensureBackupDirectory(formTemplateId: string): Promise<string> {
    const templateDir = path.join(this.backupDir, formTemplateId);
    try {
      await fs.promises.access(templateDir);
    } catch {
      await fs.promises.mkdir(templateDir, { recursive: true });
    }
    return templateDir;
  }

  /**
   * Formats a field value for display
   */
  private static formatFieldValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Escapes CSV values to handle commas, quotes, and newlines
   */
  private static escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Creates a TXT backup file with human-readable format
   */
  private static async createTXTBackup(templateDir: string, formTemplate: FormTemplate, formResponse: FormResponse): Promise<string> {
    const filename = `${formResponse.id}.txt`;
    const filepath = path.join(templateDir, filename);
    
    const content = [
      "=".repeat(60),
      `FORMULARZ: ${formTemplate.title}`,
      "=".repeat(60),
      "",
      `Data złożenia: ${new Date(formResponse.submittedAt).toLocaleString('pl-PL')}`,
      `ID odpowiedzi: ${formResponse.id}`,
      `Link do odpowiedzi: ${formResponse.shareableResponseLink}`,
      `Status: ${formResponse.isComplete ? 'Kompletna' : 'Niekompletna'}`,
      "",
      "OPIS FORMULARZA:",
      formTemplate.description || "(brak opisu)",
      "",
      "ODPOWIEDZI:",
      "-".repeat(40)
    ];

    // Add field responses
    formTemplate.fields.forEach((field, index) => {
      const value = formResponse.responses[field.id];
      const formattedValue = this.formatFieldValue(value);
      
      content.push("");
      content.push(`${index + 1}. ${field.label}`);
      if (field.helpText) {
        content.push(`   Pomoc: ${field.helpText}`);
      }
      content.push(`   Typ: ${field.type}`);
      content.push(`   Wymagane: ${field.required ? 'Tak' : 'Nie'}`);
      content.push(`   Odpowiedź: ${formattedValue || '(pusta)'}`);
    });

    content.push("");
    content.push("=".repeat(60));
    content.push(`Backup wygenerowany: ${new Date().toLocaleString('pl-PL')}`);

    await fs.promises.writeFile(filepath, content.join('\n'), 'utf8');
    return filepath;
  }

  /**
   * Creates a Markdown backup file with formatted headers and lists
   */
  private static async createMarkdownBackup(templateDir: string, formTemplate: FormTemplate, formResponse: FormResponse): Promise<string> {
    const filename = `${formResponse.id}.md`;
    const filepath = path.join(templateDir, filename);
    
    const content = [
      `# ${formTemplate.title}`,
      "",
      "## Informacje podstawowe",
      "",
      `- **Data złożenia:** ${new Date(formResponse.submittedAt).toLocaleString('pl-PL')}`,
      `- **ID odpowiedzi:** \`${formResponse.id}\``,
      `- **Link do odpowiedzi:** \`${formResponse.shareableResponseLink}\``,
      `- **Status:** ${formResponse.isComplete ? '✅ Kompletna' : '❌ Niekompletna'}`,
      ""
    ];

    if (formTemplate.description) {
      content.push("## Opis formularza");
      content.push("");
      content.push(formTemplate.description);
      content.push("");
    }

    content.push("## Odpowiedzi");
    content.push("");

    // Add field responses
    formTemplate.fields.forEach((field, index) => {
      const value = formResponse.responses[field.id];
      const formattedValue = this.formatFieldValue(value);
      
      content.push(`### ${index + 1}. ${field.label}`);
      content.push("");
      
      if (field.helpText) {
        content.push(`> ${field.helpText}`);
        content.push("");
      }
      
      content.push(`- **Typ pola:** ${field.type}`);
      content.push(`- **Wymagane:** ${field.required ? 'Tak' : 'Nie'}`);
      
      if (field.options && field.options.length > 0) {
        content.push(`- **Dostępne opcje:** ${field.options.join(', ')}`);
      }
      
      content.push(`- **Odpowiedź:** ${formattedValue || '_pusta_'}`);
      content.push("");
    });

    content.push("---");
    content.push("");
    content.push(`_Backup wygenerowany: ${new Date().toLocaleString('pl-PL')}_`);

    await fs.promises.writeFile(filepath, content.join('\n'), 'utf8');
    return filepath;
  }

  /**
   * Creates a CSV backup file with tabular format
   */
  private static async createCSVBackup(templateDir: string, formTemplate: FormTemplate, formResponse: FormResponse): Promise<string> {
    const filename = `${formResponse.id}.csv`;
    const filepath = path.join(templateDir, filename);
    
    // Create header row
    const headers = [
      'ID_Odpowiedzi',
      'Data_Zlozenia',
      'Status',
      'Link_Do_Odpowiedzi',
      'Tytul_Formularza'
    ];
    
    // Add field headers
    formTemplate.fields.forEach(field => {
      headers.push(`Pole_${field.id}_${field.label.replace(/[^a-zA-Z0-9]/g, '_')}`);
    });

    // Create data row
    const dataRow = [
      formResponse.id,
      new Date(formResponse.submittedAt).toLocaleString('pl-PL'),
      formResponse.isComplete ? 'Kompletna' : 'Niekompletna',
      formResponse.shareableResponseLink,
      formTemplate.title
    ];

    // Add field values
    formTemplate.fields.forEach(field => {
      const value = formResponse.responses[field.id];
      const formattedValue = this.formatFieldValue(value);
      dataRow.push(formattedValue);
    });

    // Create CSV content
    const csvContent = [
      headers.map(h => this.escapeCSVValue(h)).join(','),
      dataRow.map(d => this.escapeCSVValue(String(d))).join(',')
    ].join('\n');

    await fs.promises.writeFile(filepath, csvContent, 'utf8');
    return filepath;
  }

  /**
   * Sends a webhook POST request with backup file
   */
  private static async sendWebhook(txtFilePath: string, formTitle: string): Promise<void> {
    console.log(`[WEBHOOK] Attempting to send webhook for file: ${path.basename(txtFilePath)}, form: ${formTitle}`);
    
    try {
      const webhookUrl = 'https://x.nxn.ovh/webhook/62159c6e-09ec-4d09-b451-db4eb234a31c';
      
      // Read the TXT file
      const fileBuffer = await fs.promises.readFile(txtFilePath);
      console.log(`[WEBHOOK] File read successfully, size: ${fileBuffer.length} bytes`);
      
      // Create FormData compatible with Node.js
      if (!globalThis.FormData || !globalThis.Blob) {
        throw new Error('FormData or Blob not available in current Node.js environment');
      }
      
      const formData = new FormData();
      
      // Create a Blob from the file buffer
      const fileBlob = new Blob([fileBuffer], { type: 'text/plain' });
      console.log(`[WEBHOOK] Created Blob with size: ${fileBuffer.length} bytes, type: text/plain`);
      
      // Add the file to FormData with filename
      formData.append('data', fileBlob, path.basename(txtFilePath));
      console.log(`[WEBHOOK] Added file to FormData: ${path.basename(txtFilePath)}`);
      
      // Add additional field with form title
      formData.append('additionalField', formTitle);
      
      console.log(`[WEBHOOK] FormData prepared, sending POST request to ${webhookUrl}`);

      // Send POST request
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => 'Unable to read response');
        console.warn(`[WEBHOOK] Request failed with status ${response.status}: ${response.statusText}`);
        console.warn(`[WEBHOOK] Response body: ${responseText}`);
      } else {
        const responseText = await response.text().catch(() => 'Success');
        console.log(`[WEBHOOK] Sent successfully! Response: ${responseText}`);
      }
    } catch (error) {
      console.error(`[WEBHOOK] Request failed with error:`, error);
      console.error(`[WEBHOOK] Error details: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(`[WEBHOOK] Stack trace:`, error.stack);
      }
    }
  }

  /**
   * Creates backup files in all three formats (TXT, Markdown, CSV)
   */
  public static async createBackups(formTemplate: FormTemplate, formResponse: FormResponse): Promise<{
    success: boolean;
    files: string[];
    errors: string[];
  }> {
    const result = {
      success: true,
      files: [] as string[],
      errors: [] as string[]
    };

    let txtFilePath: string | null = null;

    try {
      // Ensure backup directory exists
      const templateDir = await this.ensureBackupDirectory(formTemplate.id);
      
      // Create TXT backup
      try {
        txtFilePath = await this.createTXTBackup(templateDir, formTemplate, formResponse);
        result.files.push(txtFilePath);
        
        // Send webhook immediately after successful TXT file creation
        console.log(`[BACKUP] TXT backup created successfully: ${txtFilePath}`);
        console.log(`[BACKUP] Triggering webhook for form: ${formTemplate.title}`);
        
        // Use void and catch pattern to not block backup operations
        void this.sendWebhook(txtFilePath, formTemplate.title).catch((error) => {
          console.error(`[BACKUP] Webhook failed but continuing with other backup formats:`);
          console.error(`[BACKUP] Webhook error details:`, error);
        });
        
      } catch (error) {
        result.errors.push(`TXT backup failed: ${error instanceof Error ? error.message : String(error)}`);
        result.success = false;
        console.error(`[BACKUP] TXT backup creation failed:`, error);
      }

      // Create Markdown backup
      try {
        const mdFile = await this.createMarkdownBackup(templateDir, formTemplate, formResponse);
        result.files.push(mdFile);
      } catch (error) {
        result.errors.push(`Markdown backup failed: ${error instanceof Error ? error.message : String(error)}`);
        result.success = false;
      }

      // Create CSV backup
      try {
        const csvFile = await this.createCSVBackup(templateDir, formTemplate, formResponse);
        result.files.push(csvFile);
      } catch (error) {
        result.errors.push(`CSV backup failed: ${error instanceof Error ? error.message : String(error)}`);
        result.success = false;
      }

      // Webhook is now sent immediately after TXT file creation
      // This ensures webhook fires even if other backup formats fail

    } catch (error) {
      result.success = false;
      result.errors.push(`Backup directory creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Lists all backup files for a specific form template
   */
  public static async listBackups(formTemplateId: string): Promise<{
    txt: string[];
    md: string[];
    csv: string[];
  }> {
    const templateDir = path.join(this.backupDir, formTemplateId);
    const result = {
      txt: [] as string[],
      md: [] as string[],
      csv: [] as string[]
    };

    try {
      await fs.promises.access(templateDir);
    } catch {
      return result;
    }

    try {
      const files = await fs.promises.readdir(templateDir);
      
      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        const fullPath = path.join(templateDir, file);
        
        switch (ext) {
          case '.txt':
            result.txt.push(fullPath);
            break;
          case '.md':
            result.md.push(fullPath);
            break;
          case '.csv':
            result.csv.push(fullPath);
            break;
        }
      });
    } catch (error) {
      console.error(`Error listing backups for ${formTemplateId}:`, error);
    }

    return result;
  }

  /**
   * Deletes all backup files for a specific response
   */
  public static async deleteResponseBackups(formTemplateId: string, responseId: string): Promise<boolean> {
    const templateDir = path.join(this.backupDir, formTemplateId);
    
    try {
      await fs.promises.access(templateDir);
    } catch {
      return true; // No backups exist, consider as success
    }

    const extensions = ['.txt', '.md', '.csv'];
    let allDeleted = true;

    for (const ext of extensions) {
      const filepath = path.join(templateDir, `${responseId}${ext}`);
      try {
        await fs.promises.access(filepath);
        await fs.promises.unlink(filepath);
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          console.error(`Failed to delete backup file ${filepath}:`, error);
          allDeleted = false;
        }
      }
    }

    return allDeleted;
  }

  /**
   * Deletes all backup files for a specific form template
   */
  public static async deleteTemplateBackups(formTemplateId: string): Promise<boolean> {
    const templateDir = path.join(this.backupDir, formTemplateId);
    
    try {
      await fs.promises.access(templateDir);
    } catch {
      return true; // No backups exist, consider as success
    }

    try {
      await fs.promises.rm(templateDir, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error(`Failed to delete template backups for ${formTemplateId}:`, error);
      return false;
    }
  }
}