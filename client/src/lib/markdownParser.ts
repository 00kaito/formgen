import { FormField, FormFieldType } from "@shared/schema";

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
   * Split markdown into sections, each starting with ##
   */
  private static splitIntoSections(markdown: string): string[] {
    const lines = markdown.split('\n');
    const sections: string[] = [];
    let currentSection: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('##')) {
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
        }
        currentSection = [line];
      } else if (currentSection.length > 0) {
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
    }

    // Handle any additional unknown properties (for future extensibility)
    const knownProperties = ['placeholder', 'options', 'acceptedFileTypes', 'maxFileSize', 'multiple'];
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
    const validTypes: FormFieldType[] = ['text', 'textarea', 'email', 'number', 'date', 'select', 'radio', 'checkbox', 'file'];
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
Prześlij swoje CV (plik PDF lub Word)`
    };
  }

  /**
   * Generate comprehensive syntax documentation
   */
  static getSyntaxDocumentation(): string {
    return `# Składnia Formularza Markdown

## Podstawowa Struktura
Każde pole ma następujący wzorzec:
\`\`\`
## Etykieta Pola
[typ-pola] (required?) {"właściwość": "wartość", "właściwość2": "wartość2"}
Opcjonalny tekst pomocy, który wyjaśnia pole
\`\`\`

## Typy Pól
- **text**: Jednowierszowe pole tekstowe
- **textarea**: Wielowierszowe pole tekstowe  
- **email**: Pole email z walidacją
- **number**: Pole numeryczne
- **date**: Selektor daty
- **select**: Lista rozwijana (wymaga opcji)
- **radio**: Wybór jednej opcji (wymaga opcji)
- **checkbox**: Wybór wielu opcji (wymaga opcji)
- **file**: Przesyłanie plików

## Format Właściwości
Właściwości muszą używać ścisłego formatu JSON z cudzysłowami:
\`\`\`
{"właściwość": "wartość", "tablica": ["element1", "element2"], "liczba": 5, "boolean": true}
\`\`\`

## Właściwości według Typu Pola

### Pola Tekstowe (text, textarea, email, number)
- \`"placeholder"\`: Tekst zastępczy wyświetlany w polu

### Pola Wyboru (select, radio, checkbox) - WYMAGANE
- \`"options"\`: Tablica opcji jak \`["Opcja 1", "Opcja 2"]\` (WYMAGANE)

### Pola Przesyłania Plików
- \`"acceptedFileTypes"\`: Tablica dozwolonych rozszerzeń jak \`[".pdf", ".jpg"]\`
- \`"maxFileSize"\`: Maksymalny rozmiar pliku w MB (np. \`5\`)
- \`"multiple"\`: Pozwól na wiele plików (\`true\` lub \`false\`)

## Przykłady

### Proste pole tekstowe:
\`\`\`
## Imię i Nazwisko
[text] (required)
Wprowadź swoje pełne imię i nazwisko
\`\`\`

### Email z symbolem zastępczym:
\`\`\`
## Email Kontaktowy
[email] (required) {"placeholder": "uzytkownik@example.com"}
Wyślemy aktualizacje na ten adres
\`\`\`

### Lista rozwijana z opcjami:
\`\`\`
## Ulubiony Kolor
[select] {"options": ["Czerwony", "Niebieski", "Zielony", "Żółty"]}
Wybierz swój ulubiony kolor
\`\`\`

### Przesyłanie plików z ograniczeniami:
\`\`\`
## Zdjęcie Profilowe
[file] {"acceptedFileTypes": [".jpg", ".png", ".gif"], "maxFileSize": 2}
Prześlij zdjęcie profilowe (maks 2MB)
\`\`\`

### Wiele pól wyboru:
\`\`\`
## Umiejętności
[checkbox] {"options": ["JavaScript", "Python", "React", "Node.js"]}
Zaznacz wszystkie umiejętności programistyczne, które posiadasz
\`\`\`

## Ważne Uwagi
- Użyj \`(required)\` lub \`(required?)\`, aby oznaczyć pola jako obowiązkowe
- Właściwości muszą używać ścisłego formatu JSON z cudzysłowami
- Pola wyboru (select, radio, checkbox) MUSZĄ zawierać tablicę "options"
- Tekst pomocy może obejmować wiele linii po linii konfiguracyjnej
- Etykiety pól powinny być jasne i opisowe`;
  }
}