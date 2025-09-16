import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Eye, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FormField, FormTemplate, InsertFormTemplate } from "@shared/schema";
import FormFieldPalette from "@/components/form-field-palette";
import FormFieldRenderer from "@/components/form-field-renderer";
import FieldPropertiesPanel from "@/components/field-properties-panel";
import MarkdownFormConverter from "@/components/markdown-form-converter";
import { MarkdownFormParser } from "@/lib/markdownParser";
import { LayersIcon } from "lucide-react";

export default function FormBuilder() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const { toast } = useToast();
  
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [isActive, setIsActive] = useState(true);

  // Fetch existing form if editing
  const { data: existingForm, isLoading } = useQuery<FormTemplate>({
    queryKey: ["/api/form-templates", id],
    enabled: !!id,
  });

  // Load existing form data
  useEffect(() => {
    if (existingForm) {
      setFormTitle(existingForm.title);
      setFormDescription(existingForm.description || "");
      setFormFields(existingForm.fields);
      setIsActive(existingForm.isActive);
    }
  }, [existingForm]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: InsertFormTemplate) => {
      if (id) {
        return apiRequest("PUT", `/api/form-templates/${id}`, data);
      } else {
        return apiRequest("POST", "/api/form-templates", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Form saved successfully!",
        description: id ? "Form template updated" : "New form template created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      if (!id) {
        setLocation("/");
      }
    },
    onError: () => {
      toast({
        title: "Failed to save form",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a form title",
        variant: "destructive",
      });
      return;
    }

    if (formFields.length === 0) {
      toast({
        title: "Fields required",
        description: "Please add at least one field to your form",
        variant: "destructive",
      });
      return;
    }

    const formData: InsertFormTemplate = {
      title: formTitle,
      description: formDescription,
      fields: formFields,
      isActive,
    };

    saveMutation.mutate(formData);
  };

  const handleAddField = (field: FormField) => {
    setFormFields([...formFields, field]);
  };

  const handleMarkdownFields = (fields: FormField[]) => {
    setFormFields([...formFields, ...fields]);
  };

  const handleUpdateField = (updatedField: FormField) => {
    setFormFields(formFields.map(field => 
      field.id === updatedField.id ? updatedField : field
    ));
    setSelectedField(updatedField);
  };

  const handleDeleteField = (fieldId: string) => {
    setFormFields(formFields.filter(field => field.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const handlePreview = () => {
    if (id && existingForm) {
      window.open(`/form/${existingForm.shareableLink}`, '_blank');
    } else {
      toast({
        title: "Save form first",
        description: "Please save your form before previewing",
        variant: "destructive",
      });
    }
  };

  const handleExportMarkdown = () => {
    if (formFields.length === 0) {
      toast({
        title: "Brak pól do eksportu",
        description: "Dodaj pola do formularza przed eksportem do markdown",
        variant: "destructive",
      });
      return;
    }

    try {
      // Run fidelity validation before export
      const validation = MarkdownFormParser.validateExportFidelity(
        formFields,
        formTitle || undefined,
        formDescription || undefined
      );
      
      // Show validation results to user
      if (!validation.isValid) {
        let errorMessage = `Znaleziono ${validation.errors.length} błędów podczas walidacji eksportu:\n`;
        validation.errors.slice(0, 3).forEach(error => {
          errorMessage += `• ${error.fieldLabel}: ${error.error}\n`;
        });
        if (validation.errors.length > 3) {
          errorMessage += `... i ${validation.errors.length - 3} więcej błędów`;
        }
        
        const shouldContinue = confirm(
          `${errorMessage}\n\nCzy chcesz kontynuować eksport mimo błędów? Markdown może nie być kompatybilny z importem.`
        );
        
        if (!shouldContinue) {
          return;
        }
      }
      
      // Show warnings if any
      if (validation.warnings.length > 0) {
        let warningMessage = `Ostrzeżenia walidacji:\n`;
        validation.warnings.slice(0, 2).forEach(warning => {
          warningMessage += `• ${warning.fieldLabel}: ${warning.message}\n`;
        });
        if (validation.warnings.length > 2) {
          warningMessage += `... i ${validation.warnings.length - 2} więcej ostrzeżeń`;
        }
        
        toast({
          title: "Ostrzeżenia eksportu",
          description: warningMessage,
          variant: "default",
        });
      }

      const markdown = MarkdownFormParser.exportToMarkdown(
        formFields,
        formTitle || undefined,
        formDescription || undefined
      );
      
      // Create and download file
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formTitle || 'formularz'}.md`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Success message with validation info
      const successTitle = validation.isValid ? 
        "Eksport zakończony pomyślnie!" : 
        "Eksport zakończony z ostrzeżeniami";
      const successDescription = validation.isValid ?
        "Plik markdown został pobrany i przeszedł walidację kompatybilności" :
        `Plik markdown został pobrany. Ostrzeżeń: ${validation.warnings.length}`;
      
      toast({
        title: successTitle,
        description: successDescription,
      });
    } catch (error) {
      toast({
        title: "Błąd eksportu",
        description: "Nie udało się wyeksportować formularza do markdown",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <LayersIcon className="text-primary text-xl" />
                <h1 className="text-xl font-bold text-foreground">Form Builder</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MarkdownFormConverter onFieldsConverted={handleMarkdownFields} />
              <Button 
                variant="outline" 
                onClick={handleExportMarkdown}
                disabled={formFields.length === 0}
                data-testid="button-export-markdown"
              >
                <Download className="w-4 h-4 mr-2" />
                Eksportuj MD
              </Button>
              <Button variant="outline" onClick={handlePreview} data-testid="button-preview">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {id ? "Update Form" : "Save Form"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Form Builder Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Field Palette */}
        <FormFieldPalette onAddField={handleAddField} />

        {/* Form Canvas */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Form Header */}
            <div className="mb-8">
              <Input
                placeholder="Form Title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="text-3xl font-bold bg-transparent border-none text-foreground placeholder-muted-foreground mb-4 p-0 h-auto"
                data-testid="input-form-title"
              />
              <Textarea
                placeholder="Form description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-muted-foreground bg-transparent border-none resize-none p-0 h-auto"
                rows={2}
                data-testid="textarea-form-description"
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-6" data-testid="form-fields-container">
              {formFields.map((field) => (
                <FormFieldRenderer
                  key={field.id}
                  field={field}
                  isSelected={selectedField?.id === field.id}
                  onClick={() => setSelectedField(field)}
                  onDelete={() => handleDeleteField(field.id)}
                />
              ))}

              {/* Drop Zone */}
              {formFields.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors">
                  <LayersIcon className="w-8 h-8 mx-auto mb-2" />
                  <p>Add form fields from the palette on the left</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Field Properties Panel */}
        <FieldPropertiesPanel
          selectedField={selectedField}
          onUpdateField={handleUpdateField}
        />
      </div>
    </div>
  );
}
