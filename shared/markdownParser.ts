import { FormField, FormFieldType } from "./schema";

interface ParsedField {
  label: string;
  type: FormFieldType;
  required: boolean;
  properties: Record<string, any>;
  helpText: string;
}

interface ParseResult {
  fields: FormField[];
  errors: Array<{ section: string; error: string }>;
}

export class MarkdownFormParser {
  /**
   * Export form responses to markdown format with proper table formatting
   * Creates a markdown document with form metadata and response data in tables
   */
  static exportResponsesToMarkdown(
    formTemplate: { title: string; description?: string; fields: any[] },
    responses: Array<{ id: string; responses: Record<string, any>; submittedAt: Date | string }>,
    includeFormDefinition: boolean = true
  ): string {
    let markdown = '';
    
    // Add form metadata
    markdown += `# Odpowiedzi Formularza: ${formTemplate.title}\n\n`;
    
    if (formTemplate.description) {
      markdown += `${formTemplate.description}\n\n`;
    }
    
    markdown += `**Data eksportu:** ${new Date().toLocaleString('pl-PL')}\n`;
    markdown += `**Liczba odpowiedzi:** ${responses.length}\n\n`;
    
    // Include form definition if requested
    if (includeFormDefinition && formTemplate.fields.length > 0) {
      markdown += `## Definicja Formularza\n\n`;
      
      // Convert FormFields to markdown format
      formTemplate.fields.forEach(field => {
        if (field.type === 'separator') {
          if (field.label && field.label !== 'Belka dzieląca') {
            markdown += `<!-- ${field.label} -->\n`;
          }
          if (field.helpText) {
            markdown += `<!-- ${field.helpText} -->\n`;
          }
          markdown += '---\n\n';
          return;
        }
        
        markdown += `### ${field.label}\n`;
        
        let fieldLine = `**Typ:** \`${field.type}\``;
        if (field.required) {
          fieldLine += ' *(wymagane)*';
        }
        markdown += `${fieldLine}\n\n`;
        
        if (field.helpText) {
          markdown += `**Opis:** ${field.helpText}\n\n`;
        }
        
        if (field.options && field.options.length > 0) {
          markdown += `**Opcje:** ${field.options.join(', ')}\n\n`;
        }
        
        if (field.placeholder) {
          markdown += `**Symbol zastępczy:** "${field.placeholder}"\n\n`;
        }
      });
      
      markdown += '\n';
    }
    
    // Add responses section
    if (responses.length === 0) {
      markdown += `## Odpowiedzi\n\nBrak odpowiedzi.\n`;
      return markdown;
    }
    
    markdown += `## Odpowiedzi (${responses.length})\n\n`;
    
    // Get all response fields for table headers
    const allFieldLabels = new Set<string>();
    const fieldIdToLabel = new Map<string, string>();
    
    // Map field IDs to labels from form template
    formTemplate.fields.forEach(field => {
      if (field.type !== 'separator') {
        fieldIdToLabel.set(field.id, field.label);
        allFieldLabels.add(field.label);
      }
    });
    
    // Also collect any fields from responses that might not be in template
    responses.forEach(response => {
      Object.keys(response.responses).forEach(fieldId => {
        if (!fieldIdToLabel.has(fieldId)) {
          fieldIdToLabel.set(fieldId, fieldId); // Use field ID as label if not found
          allFieldLabels.add(fieldId);
        }
      });
    });
    
    const headers = ['Data wysłania', ...Array.from(allFieldLabels)];
    
    // Create markdown table
    markdown += '| ' + headers.join(' | ') + ' |\n';
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    // Add response rows
    responses.forEach(response => {
      const submittedDate = new Date(response.submittedAt).toLocaleString('pl-PL');
      const row = [submittedDate];
      
      // Add response values in order of headers
      Array.from(allFieldLabels).forEach(label => {
        // Find field ID for this label
        let fieldId = '';
        for (const [id, lbl] of Array.from(fieldIdToLabel.entries())) {
          if (lbl === label) {
            fieldId = id;
            break;
          }
        }
        
        let cellValue = response.responses[fieldId] || '';
        
        // Format cell value based on type
        if (Array.isArray(cellValue)) {
          // Handle table data (array of row objects) vs simple array values
          if (cellValue.length > 0 && typeof cellValue[0] === 'object' && cellValue[0] !== null) {
            // Table field format - array of row objects like [{Name: 'John', Email: 'john@example.com'}]
            const tableRows = cellValue.map((row: Record<string, any>) => 
              Object.values(row).join(' | ')
            ).join('; ');
            cellValue = tableRows;
          } else {
            // Simple array like checkbox selections
            cellValue = cellValue.join(', ');
          }
        } else if (typeof cellValue === 'object' && cellValue !== null) {
          cellValue = JSON.stringify(cellValue);
        } else {
          cellValue = String(cellValue);
        }
        
        // Escape pipe characters and clean up cell content for markdown table
        cellValue = cellValue.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
        if (!cellValue) {
          cellValue = '-';
        }
        
        row.push(cellValue);
      });
      
      markdown += '| ' + row.join(' | ') + ' |\n';
    });
    
    markdown += '\n';
    
    // Add summary statistics
    markdown += `## Podsumowanie\n\n`;
    markdown += `- **Łączna liczba odpowiedzi:** ${responses.length}\n`;
    
    if (responses.length > 0) {
      const firstResponse = new Date(responses[responses.length - 1].submittedAt);
      const lastResponse = new Date(responses[0].submittedAt);
      markdown += `- **Pierwsza odpowiedź:** ${firstResponse.toLocaleString('pl-PL')}\n`;
      markdown += `- **Ostatnia odpowiedź:** ${lastResponse.toLocaleString('pl-PL')}\n`;
    }
    
    return markdown;
  }
  /**
   * Parse markdown text into FormField objects
   * Syntax: 
   * ## Field Label
   * [field-type] (required?) {property: value, property2: value2}
   * help text
   */
  static parseMarkdown(markdown: string): ParseResult {
    const fields: FormField[] = [];
    const errors: Array<{ section: string; error: string }> = [];
    const sections = this.splitIntoSections(markdown);

    for (const section of sections) {
      try {
        const field = this.parseSection(section);
        if (field) {
          fields.push(field);
        }
      } catch (error) {
        // Extract section label for better error reporting
        const sectionLines = section.split('\n');
        const headerLine = sectionLines.find(line => line.trim().startsWith('##'));
        const sectionLabel = headerLine ? headerLine.replace(/^##\s*/, '').trim() : 'Nieznana sekcja';
        
        const errorMessage = error instanceof Error ? error.message : "Nie udało się przetworzyć sekcji";
        errors.push({ 
          section: sectionLabel, 
          error: errorMessage 
        });
      }
    }

    return { fields, errors };
  }

  /**
   * Legacy method for backward compatibility - returns only fields
   */
  static parseMarkdownFields(markdown: string): FormField[] {
    const result = this.parseMarkdown(markdown);
    return result.fields;
  }

  /**
   * Export FormFields back to markdown format
   * This is the inverse of parseMarkdown - converts form fields to markdown syntax
   */
  static exportToMarkdown(fields: FormField[], formTitle?: string, formDescription?: string): string {
    let markdown = '';

    // Add form title and description if provided
    if (formTitle) {
      markdown += `# ${formTitle}\n\n`;
    }
    if (formDescription) {
      markdown += `${formDescription}\n\n`;
    }

    // Convert each field to markdown format
    fields.forEach(field => {
      // Special handling for separator fields - export as simple horizontal rule
      if (field.type === 'separator') {
        // If separator has a custom label (not default), add it as comment
        if (field.label && field.label !== 'Belka dzieląca') {
          markdown += `<!-- ${field.label} -->\n`;
        }
        // If separator has help text, add it as comment
        if (field.helpText) {
          markdown += `<!-- ${field.helpText} -->\n`;
        }
        markdown += '---\n\n';
        return;
      }

      // Field label as header
      markdown += `## ${field.label}\n`;

      // Field type and required status
      let fieldLine = `[${field.type}]`;
      if (field.required) {
        fieldLine += ' (required)';
      }

      // Add properties if they exist
      const properties: Record<string, any> = {};
      
      if (field.placeholder) {
        properties.placeholder = field.placeholder;
      }
      
      // Handle options for select/radio/checkbox fields - these MUST have options for re-import compatibility
      if (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') {
        if (field.options && field.options.length > 0) {
          properties.options = field.options;
        } else {
          // Ensure compatibility - add empty options array with warning comment
          properties.options = [];
          console.warn(`Field '${field.label}' of type '${field.type}' has no options. Added empty array for re-import compatibility.`);
        }
      } else if (field.options && field.options.length > 0) {
        // For non-option fields that somehow have options, still include them
        properties.options = field.options;
      }
      
      if (field.acceptedFileTypes && field.acceptedFileTypes.length > 0) {
        properties.acceptedFileTypes = field.acceptedFileTypes;
      }
      if (field.maxFileSize) {
        properties.maxFileSize = field.maxFileSize;
      }
      if (field.multiple) {
        properties.multiple = field.multiple;
      }
      
      // Handle columns for table fields - these MUST have columns for re-import compatibility
      if (field.type === 'table') {
        if (field.columns && field.columns.length > 0) {
          properties.columns = field.columns;
        } else {
          // Ensure compatibility - add default columns with warning
          properties.columns = ['Kolumna 1', 'Kolumna 2'];
          console.warn(`Field '${field.label}' of type 'table' has no columns. Added default columns for re-import compatibility.`);
        }
      } else if (field.columns && field.columns.length > 0) {
        // For non-table fields that somehow have columns, still include them
        properties.columns = field.columns;
      }

      // Add properties to field line if any exist
      if (Object.keys(properties).length > 0) {
        fieldLine += ` ${JSON.stringify(properties)}`;
      }

      markdown += `${fieldLine}\n`;

      // Add help text if it exists
      if (field.helpText) {
        markdown += `${field.helpText}\n`;
      }

      markdown += '\n'; // Add extra line between fields
    });

    return markdown.trim();
  }

  /**
   * Split markdown into sections, each starting with ##
   */
  private static splitIntoSections(markdown: string): string[] {
    const lines = markdown.split('\n');
    const sections: string[] = [];
    let currentSection: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Handle standard field headers
      if (trimmedLine.startsWith('##')) {
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
        }
        currentSection = [line];
      }
      // Handle horizontal rule separator syntax (---)
      else if (trimmedLine === '---' || trimmedLine.match(/^-{3,}$/)) {
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
        }
        // Convert --- to separator field format
        currentSection = ['## Belka dzieląca', '[separator]'];
      } 
      else if (currentSection.length > 0) {
        currentSection.push(line);
      }
    }

    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }

    return sections.filter(section => section.trim().length > 0);
  }

  /**
   * Parse a single field section
   */
  private static parseSection(section: string): FormField | null {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return null;

    // Extract label from header (## Label)
    const headerLine = lines[0];
    if (!headerLine.startsWith('##')) {
      throw new Error('Pole musi rozpoczynać się od nagłówka ##');
    }
    
    const label = headerLine.replace(/^##\s*/, '').trim();
    if (!label) {
      throw new Error('Etykieta pola nie może być pusta');
    }

    // Find configuration line [type] (required?) {properties}
    let configLine = '';
    let helpTextLines: string[] = [];
    let foundConfig = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!foundConfig && this.isConfigLine(line)) {
        configLine = line;
        foundConfig = true;
      } else if (foundConfig) {
        helpTextLines.push(line);
      } else {
        // Text before config line is part of help text
        helpTextLines.unshift(line);
      }
    }

    // Parse configuration
    const config = this.parseConfigLine(configLine);
    
    // Generate unique ID
    const id = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create base field
    const field: FormField = {
      id,
      type: config.type,
      label,
      required: config.required,
      helpText: helpTextLines.join(' ').trim() || undefined,
    };

    // Apply properties based on field type
    this.applyFieldProperties(field, config.properties);

    return field;
  }

  /**
   * Check if a line contains field configuration
   * Must match pattern: [type] with possible whitespace and additional content
   */
  private static isConfigLine(line: string): boolean {
    // Match lines that start with optional whitespace, then [word], then anything else
    return /^\s*\[[a-z]+\]/.test(line.trim());
  }

  /**
   * Parse configuration line: [type] (required?) {properties}
   */
  private static parseConfigLine(line: string): { type: FormFieldType; required: boolean; properties: Record<string, any> } {
    // Extract field type [type]
    const typeMatch = line.match(/\[([^\]]+)\]/);
    if (!typeMatch) {
      throw new Error('Typ pola jest wymagany w nawiasach kwadratowych [typ]');
    }
    
    const typeStr = typeMatch[1].trim();
    if (!this.isValidFieldType(typeStr)) {
      throw new Error(`Nieprawidłowy typ pola: ${typeStr}. Dostępne typy: text, textarea, email, number, date, select, radio, checkbox, file`);
    }
    
    const type = typeStr as FormFieldType;

    // Check if required (required) or (required?)
    const required = /\(\s*required\s*\?\s*\)|\(\s*required\s*\)/i.test(line);

    // Extract properties {property: value, property2: value2}
    let properties: Record<string, any> = {};
    const propertiesMatch = line.match(/\{([^}]+)\}/);
    if (propertiesMatch) {
      try {
        properties = this.parseProperties(propertiesMatch[1]);
      } catch (error) {
        throw new Error(`Nieprawidłowa składnia właściwości: ${error}`);
      }
    }

    return { type, required, properties };
  }

  /**
   * Parse properties string into object
   * Only accepts strict JSON format: "key": "value", "key2": ["array"]
   */
  private static parseProperties(propertiesStr: string): Record<string, any> {
    // Handle empty properties
    if (!propertiesStr.trim()) {
      return {};
    }

    try {
      // Require strict JSON format
      const jsonStr = `{${propertiesStr}}`;
      const properties = JSON.parse(jsonStr);
      
      // Validate that we got an object
      if (typeof properties !== 'object' || Array.isArray(properties) || properties === null) {
        throw new Error('Właściwości muszą być obiektem');
      }
      
      return properties;
    } catch (error) {
      throw new Error(`Nieprawidłowe właściwości JSON: ${error instanceof Error ? error.message : 'Błąd składni'}. Użyj formatu: "klucz": "wartość", "tablica": ["element1", "element2"]`);
    }
  }


  /**
   * Apply parsed properties to field based on its type
   */
  private static applyFieldProperties(field: FormField, properties: Record<string, any>): void {
    // Common properties for all fields
    if (properties.placeholder) {
      field.placeholder = String(properties.placeholder);
    }

    // Type-specific properties
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'number':
        // These types support placeholder (already handled above)
        break;

      case 'select':
      case 'radio':
      case 'checkbox':
        if (properties.options) {
          if (Array.isArray(properties.options)) {
            field.options = properties.options.map(String);
            // Allow empty arrays but warn about them for better UX
            if (field.options.length === 0) {
              console.warn(`Field '${field.label}' of type '${field.type}' has empty options array. Consider adding options for better user experience.`);
            }
          } else {
            throw new Error('Opcje muszą być tablicą');
          }
        } else {
          throw new Error(`Typ pola '${field.type}' wymaga właściwości tablicy "options". Przykład: {"options": ["Opcja 1", "Opcja 2"]}`);
        }
        break;

      case 'file':
        if (properties.acceptedFileTypes) {
          if (Array.isArray(properties.acceptedFileTypes)) {
            field.acceptedFileTypes = properties.acceptedFileTypes.map(String);
          } else {
            throw new Error('acceptedFileTypes musi być tablicą');
          }
        }
        
        if (properties.maxFileSize !== undefined) {
          const size = Number(properties.maxFileSize);
          if (isNaN(size) || size <= 0) {
            throw new Error('maxFileSize musi być liczbą dodatnią');
          }
          field.maxFileSize = size;
        }
        
        if (properties.multiple !== undefined) {
          field.multiple = Boolean(properties.multiple);
        }
        break;

      case 'date':
        // Date fields don't have additional properties currently
        break;
      
      case 'table':
        if (properties.columns) {
          if (Array.isArray(properties.columns)) {
            field.columns = properties.columns.map(String);
            // Require at least one column
            if (field.columns.length === 0) {
              throw new Error('Tabela musi zawierać co najmniej jedną kolumnę');
            }
          } else {
            throw new Error('Kolumny tabeli muszą być tablicą');
          }
        } else {
          throw new Error('Typ pola "table" wymaga właściwości tablicy "columns". Przykład: {"columns": ["Kolumna 1", "Kolumna 2"]}');
        }
        break;
      
      case 'separator':
        // Separators are purely visual - no additional properties needed
        // They only need label and optional helpText which are already handled
        break;
    }

    // Handle any additional unknown properties (for future extensibility)
    const knownProperties = ['placeholder', 'options', 'acceptedFileTypes', 'maxFileSize', 'multiple', 'columns'];
    for (const [key, value] of Object.entries(properties)) {
      if (!knownProperties.includes(key)) {
        console.warn(`Nieznana właściwość '${key}' dla typu pola '${field.type}'`);
      }
    }
  }

  /**
   * Validate field type
   */
  private static isValidFieldType(type: string): type is FormFieldType {
    const validTypes: FormFieldType[] = ['text', 'textarea', 'email', 'number', 'date', 'select', 'radio', 'checkbox', 'file', 'table', 'separator'];
    return validTypes.includes(type as FormFieldType);
  }

  /**
   * Generate example markdown for documentation
   */
  static generateExamples(): Record<FormFieldType, string> {
    return {
      text: `## Imię i Nazwisko
[text] (required) {"placeholder": "Wprowadź swoje pełne imię i nazwisko"}
Proszę podać swoje pełne imię i nazwisko`,

      textarea: `## Wiadomość
[textarea] {"placeholder": "Wprowadź swoją wiadomość tutaj"}
Opowiedz nam o swoim zapytaniu`,

      email: `## Adres Email
[email] (required) {"placeholder": "twoj.email@example.com"}
Użyjemy tego adresu do kontaktu z Tobą`,

      number: `## Wiek
[number] {"placeholder": "25"}
Podaj swój wiek w latach`,

      date: `## Data Urodzenia
[date] (required)
Wybierz swoją datę urodzenia`,

      select: `## Kraj
[select] (required) {"options": ["Polska", "Niemcy", "Wielka Brytania", "Francja"]}
Wybierz swój kraj`,

      radio: `## Preferowany Sposób Kontaktu
[radio] {"options": ["Email", "Telefon", "SMS"]}
W jaki sposób chciałbyś, abyśmy się z Tobą kontaktowali?`,

      checkbox: `## Zainteresowania
[checkbox] {"options": ["Technologia", "Sport", "Muzyka", "Podróże", "Jedzenie"]}
Zaznacz wszystkie, które dotyczą Ciebie`,

      file: `## Przesyłanie CV
[file] (required) {"acceptedFileTypes": [".pdf", ".doc", ".docx"], "maxFileSize": 5, "multiple": false}
Prześlij swoje CV (plik PDF lub Word)`,

      table: `## Dane Uczestników
[table] (required) {"columns": ["Imię", "Nazwisko", "Email", "Telefon"]}
Dodaj informacje o wszystkich uczestnikach`,

      separator: `## Sekcja
[separator]
Ten tekst będzie wyświetlany nad belką dzielącą`
    };
  }

  /**
   * Validate export fidelity by testing roundtrip compatibility
   * Exports fields to markdown and re-imports to ensure data integrity
   */
  static validateExportFidelity(fields: FormField[], formTitle?: string, formDescription?: string): {
    isValid: boolean;
    errors: Array<{ fieldId: string; fieldLabel: string; property: string; original: any; reimported: any; error: string }>;
    warnings: Array<{ fieldId: string; fieldLabel: string; message: string }>;
  } {
    const errors: Array<{ fieldId: string; fieldLabel: string; property: string; original: any; reimported: any; error: string }> = [];
    const warnings: Array<{ fieldId: string; fieldLabel: string; message: string }> = [];
    
    try {
      // Export to markdown
      const exportedMarkdown = this.exportToMarkdown(fields, formTitle, formDescription);
      
      // Re-import from markdown
      const parseResult = this.parseMarkdown(exportedMarkdown);
      const reimportedFields = parseResult.fields;
      
      // Check for parser errors during re-import
      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(error => {
          warnings.push({
            fieldId: 'unknown',
            fieldLabel: error.section,
            message: `Parse error in section '${error.section}': ${error.error}`
          });
        });
      }
      
      // Compare field counts
      if (fields.length !== reimportedFields.length) {
        errors.push({
          fieldId: 'all',
          fieldLabel: 'Form Structure',
          property: 'field_count',
          original: fields.length,
          reimported: reimportedFields.length,
          error: `Field count mismatch: expected ${fields.length}, got ${reimportedFields.length}`
        });
      }
      
      // Compare individual fields
      const minLength = Math.min(fields.length, reimportedFields.length);
      for (let i = 0; i < minLength; i++) {
        const original = fields[i];
        const reimported = reimportedFields[i];
        
        // Compare basic properties
        if (original.label !== reimported.label) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'label',
            original: original.label,
            reimported: reimported.label,
            error: 'Label mismatch'
          });
        }
        
        if (original.type !== reimported.type) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'type',
            original: original.type,
            reimported: reimported.type,
            error: 'Type mismatch'
          });
        }
        
        if (original.required !== reimported.required) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'required',
            original: original.required,
            reimported: reimported.required,
            error: 'Required status mismatch'
          });
        }
        
        if (original.helpText !== reimported.helpText) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'helpText',
            original: original.helpText,
            reimported: reimported.helpText,
            error: 'Help text mismatch'
          });
        }
        
        // Compare type-specific properties
        if (original.placeholder !== reimported.placeholder) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'placeholder',
            original: original.placeholder,
            reimported: reimported.placeholder,
            error: 'Placeholder mismatch'
          });
        }
        
        // Compare options arrays
        if (!this.arraysEqual(original.options, reimported.options)) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'options',
            original: original.options,
            reimported: reimported.options,
            error: 'Options array mismatch'
          });
        }
        
        // Compare columns arrays
        if (!this.arraysEqual(original.columns, reimported.columns)) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'columns',
            original: original.columns,
            reimported: reimported.columns,
            error: 'Columns array mismatch'
          });
        }
        
        // Compare file-specific properties
        if (!this.arraysEqual(original.acceptedFileTypes, reimported.acceptedFileTypes)) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'acceptedFileTypes',
            original: original.acceptedFileTypes,
            reimported: reimported.acceptedFileTypes,
            error: 'Accepted file types mismatch'
          });
        }
        
        if (original.maxFileSize !== reimported.maxFileSize) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'maxFileSize',
            original: original.maxFileSize,
            reimported: reimported.maxFileSize,
            error: 'Max file size mismatch'
          });
        }
        
        if (original.multiple !== reimported.multiple) {
          errors.push({
            fieldId: original.id,
            fieldLabel: original.label,
            property: 'multiple',
            original: original.multiple,
            reimported: reimported.multiple,
            error: 'Multiple files flag mismatch'
          });
        }
      }
      
    } catch (error) {
      errors.push({
        fieldId: 'all',
        fieldLabel: 'Export/Import Process',
        property: 'process',
        original: 'successful',
        reimported: 'failed',
        error: `Export/import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Helper method to compare arrays for equality
   */
  private static arraysEqual(arr1: any[] | undefined, arr2: any[] | undefined): boolean {
    // Handle undefined cases
    if (arr1 === undefined && arr2 === undefined) return true;
    if (arr1 === undefined || arr2 === undefined) return false;
    
    // Compare lengths
    if (arr1.length !== arr2.length) return false;
    
    // Compare elements
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    
    return true;
  }

  /**
   * Get syntax documentation for markdown form fields
   */
  static getSyntaxDocumentation(): {
    overview: string;
    examples: Record<FormFieldType, string>;
    rules: string[];
    tips: string[];
  } {
    return {
      overview: `
        Składnia Markdown dla formularzy pozwala na definiowanie pól w prosty i czytelny sposób.
        Każde pole składa się z nagłówka (##), typu w nawiasach kwadratowych, opcjonalnych właściwości i tekstu pomocy.
      `,
      examples: this.generateExamples(),
      rules: [
        'Każde pole musi rozpoczynać się nagłówkiem ## z nazwą pola',
        'Typ pola musi być w nawiasach kwadratowych [typ]',
        'Aby pole było wymagane, dodaj (required) po typie',
        'Właściwości pola definiuj w JSON: {"klucz": "wartość"}',
        'Tekst pomocy umieść w nowej linii po definicji pola',
        'Dozwolone typy: text, textarea, email, number, date, select, radio, checkbox, file, table, separator',
        'Pola select, radio, checkbox wymagają tablicy "options"',
        'Pola table wymagają tablicy "columns"',
        'Separatory (---) są automatycznie konwertowane na pola separator'
      ],
      tips: [
        'Używaj opisowych nazw pól dla lepszej czytelności',
        'Dodawaj tekst pomocy, aby wyjaśnić przeznaczenie pola',
        'Testuj swój markdown przed importem używając podglądu',
        'Używaj spójnych konwencji nazewniczych w całym formularzu',
        'Sprawdzaj eksport i reimport aby upewnić się o zgodności danych'
      ]
    };
  }
}