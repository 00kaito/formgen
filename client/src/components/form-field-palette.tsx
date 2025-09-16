import { FormField, FormFieldType } from "@shared/schema";
import { Type, AlignLeft, ChevronDown, Circle, CheckSquare, Mail, Hash, Calendar, Upload, Table, Minus } from "lucide-react";

interface FormFieldPaletteProps {
  onAddField: (field: FormField) => void;
}

export default function FormFieldPalette({ onAddField }: FormFieldPaletteProps) {
  const fieldTypes: Array<{
    type: FormFieldType;
    icon: React.ReactNode;
    label: string;
    description: string;
  }> = [
    {
      type: 'text',
      icon: <Type className="text-primary" />,
      label: 'Text Input',
      description: 'Single line text field'
    },
    {
      type: 'textarea',
      icon: <AlignLeft className="text-primary" />,
      label: 'Textarea',
      description: 'Multi-line text field'
    },
    {
      type: 'email',
      icon: <Mail className="text-primary" />,
      label: 'Email',
      description: 'Email validation'
    },
    {
      type: 'number',
      icon: <Hash className="text-primary" />,
      label: 'Number',
      description: 'Numeric input'
    },
    {
      type: 'date',
      icon: <Calendar className="text-primary" />,
      label: 'Date',
      description: 'Date picker'
    },
    {
      type: 'select',
      icon: <ChevronDown className="text-primary" />,
      label: 'Dropdown',
      description: 'Select from options'
    },
    {
      type: 'radio',
      icon: <Circle className="text-primary" />,
      label: 'Radio Buttons',
      description: 'Single choice'
    },
    {
      type: 'checkbox',
      icon: <CheckSquare className="text-primary" />,
      label: 'Checkboxes',
      description: 'Multiple choice'
    },
    {
      type: 'file',
      icon: <Upload className="text-primary" />,
      label: 'File Upload',
      description: 'Upload documents or images'
    },
    {
      type: 'table',
      icon: <Table className="text-primary" />,
      label: 'Tabela',
      description: 'Interaktywna tabela z kolumnami'
    },
    {
      type: 'separator',
      icon: <Minus className="text-primary" />,
      label: 'Belka dzieląca',
      description: 'Wizualny separator/linia podziału'
    }
  ];

  const createField = (type: FormFieldType): FormField => {
    const baseField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: '',
      required: false,
    };

    switch (type) {
      case 'text':
        return { ...baseField, label: 'Text Field', placeholder: 'Enter text here' };
      case 'textarea':
        return { ...baseField, label: 'Message', placeholder: 'Enter your message here' };
      case 'email':
        return { ...baseField, label: 'Email Address', placeholder: 'Enter your email' };
      case 'number':
        return { ...baseField, label: 'Number', placeholder: 'Enter a number' };
      case 'date':
        return { ...baseField, label: 'Date' };
      case 'select':
        return { ...baseField, label: 'Choose Option', options: ['Option 1', 'Option 2', 'Option 3'] };
      case 'radio':
        return { ...baseField, label: 'Select One', options: ['Option A', 'Option B', 'Option C'] };
      case 'checkbox':
        return { ...baseField, label: 'Select All That Apply', options: ['Choice 1', 'Choice 2', 'Choice 3'] };
      case 'file':
        return { 
          ...baseField, 
          label: 'Upload File', 
          acceptedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
          maxFileSize: 10,
          multiple: false
        };
      case 'table':
        return {
          ...baseField,
          label: 'Tabela danych',
          columns: ['Kolumna 1', 'Kolumna 2', 'Kolumna 3']
        };
      case 'separator':
        return {
          ...baseField,
          label: 'Belka dzieląca',
          required: false
        };
      default:
        return baseField;
    }
  };

  const handleAddField = (type: FormFieldType) => {
    const field = createField(type);
    onAddField(field);
  };

  return (
    <div className="w-80 bg-card border-r border-border p-6 overflow-y-auto">
      <h3 className="text-lg font-semibold text-foreground mb-4">Form Fields</h3>
      
      <div className="space-y-2">
        {fieldTypes.map((fieldType) => (
          <div
            key={fieldType.type}
            className="p-3 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors"
            onClick={() => handleAddField(fieldType.type)}
            data-testid={`palette-${fieldType.type}`}
          >
            <div className="flex items-center space-x-3">
              {fieldType.icon}
              <div>
                <div className="font-medium text-foreground">{fieldType.label}</div>
                <div className="text-xs text-muted-foreground">{fieldType.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
