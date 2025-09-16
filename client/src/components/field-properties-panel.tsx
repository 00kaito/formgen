import { useState, useEffect } from "react";
import { FormField } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

interface FieldPropertiesPanelProps {
  selectedField: FormField | null;
  onUpdateField: (field: FormField) => void;
}

export default function FieldPropertiesPanel({ selectedField, onUpdateField }: FieldPropertiesPanelProps) {
  const [localField, setLocalField] = useState<FormField | null>(null);

  useEffect(() => {
    setLocalField(selectedField);
  }, [selectedField]);

  if (!localField) {
    return (
      <div className="w-80 bg-card border-l border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Field Properties</h3>
        <p className="text-muted-foreground text-sm">Select a field to edit its properties</p>
      </div>
    );
  }

  const updateField = (updates: Partial<FormField>) => {
    const updatedField = { ...localField, ...updates };
    setLocalField(updatedField);
    onUpdateField(updatedField);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(localField.options || [])];
    newOptions[index] = value;
    updateField({ options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(localField.options || []), `Option ${(localField.options?.length || 0) + 1}`];
    updateField({ options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = localField.options?.filter((_, i) => i !== index) || [];
    updateField({ options: newOptions });
  };

  const hasOptions = ['select', 'radio', 'checkbox'].includes(localField.type);
  const isFileField = localField.type === 'file';
  const isTableField = localField.type === 'table';
  const isSeparatorField = localField.type === 'separator';

  const updateFileType = (index: number, value: string) => {
    const newTypes = [...(localField.acceptedFileTypes || [])];
    newTypes[index] = value;
    updateField({ acceptedFileTypes: newTypes });
  };

  const addFileType = () => {
    const newTypes = [...(localField.acceptedFileTypes || []), '.pdf'];
    updateField({ acceptedFileTypes: newTypes });
  };

  const removeFileType = (index: number) => {
    const newTypes = localField.acceptedFileTypes?.filter((_, i) => i !== index) || [];
    updateField({ acceptedFileTypes: newTypes });
  };

  const updateColumn = (index: number, value: string) => {
    const newColumns = [...(localField.columns || [])];
    newColumns[index] = value;
    updateField({ columns: newColumns });
  };

  const addColumn = () => {
    const newColumns = [...(localField.columns || []), `Kolumna ${(localField.columns?.length || 0) + 1}`];
    updateField({ columns: newColumns });
  };

  const removeColumn = (index: number) => {
    const newColumns = localField.columns?.filter((_, i) => i !== index) || [];
    updateField({ columns: newColumns });
  };

  return (
    <div className="w-80 bg-card border-l border-border p-6 overflow-y-auto">
      <h3 className="text-lg font-semibold text-foreground mb-4">Field Properties</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Field Label</label>
          <Input
            value={localField.label}
            onChange={(e) => updateField({ label: e.target.value })}
            placeholder="Enter field label"
            data-testid="input-field-label"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Help Text</label>
          <Textarea
            value={localField.helpText || ''}
            onChange={(e) => updateField({ helpText: e.target.value })}
            placeholder="Optional help text"
            rows={2}
            className="resize-none"
            data-testid="textarea-help-text"
          />
        </div>

        {(localField.type === 'text' || localField.type === 'textarea' || localField.type === 'email' || localField.type === 'number') && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Placeholder</label>
            <Input
              value={localField.placeholder || ''}
              onChange={(e) => updateField({ placeholder: e.target.value })}
              placeholder="Enter placeholder text"
              data-testid="input-placeholder"
            />
          </div>
        )}
        
        {!isSeparatorField && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={localField.required}
              onCheckedChange={(checked) => updateField({ required: !!checked })}
              data-testid="checkbox-required"
            />
            <label htmlFor="required" className="text-sm font-medium text-foreground">
              Required field
            </label>
          </div>
        )}
        
        {isSeparatorField && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Belka dzieląca</strong> to element wizualny - nie zbiera danych z formularza.
            Możesz dostosować etykietę i tekst pomocniczy, aby dodać nagłówek lub opis sekcji.
          </div>
        )}
        
        {hasOptions && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Options</label>
            <div className="space-y-2">
              {localField.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                    data-testid={`input-option-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    disabled={(localField.options?.length || 0) <= 1}
                    data-testid={`button-remove-option-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
                data-testid="button-add-option"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>
          </div>
        )}
        
        {isTableField && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Kolumny tabeli</label>
            <div className="space-y-2">
              {localField.columns?.map((column, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={column}
                    onChange={(e) => updateColumn(index, e.target.value)}
                    placeholder={`Kolumna ${index + 1}`}
                    className="flex-1"
                    data-testid={`input-column-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeColumn(index)}
                    disabled={(localField.columns?.length || 0) <= 1}
                    data-testid={`button-remove-column-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addColumn}
                className="w-full"
                data-testid="button-add-column"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj kolumnę
              </Button>
            </div>
          </div>
        )}
        
        {isFileField && (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Accepted File Types</label>
              <div className="space-y-2">
                {localField.acceptedFileTypes?.map((fileType, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={fileType}
                      onChange={(e) => updateFileType(index, e.target.value)}
                      placeholder=".pdf"
                      className="flex-1"
                      data-testid={`input-file-type-${index}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFileType(index)}
                      disabled={(localField.acceptedFileTypes?.length || 0) <= 1}
                      data-testid={`button-remove-file-type-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFileType}
                  className="w-full"
                  data-testid="button-add-file-type"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add File Type
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Max File Size (MB)</label>
              <Input
                type="number"
                value={localField.maxFileSize || 10}
                onChange={(e) => updateField({ maxFileSize: parseInt(e.target.value) || 10 })}
                placeholder="10"
                min="1"
                max="100"
                data-testid="input-max-file-size"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="multiple"
                checked={localField.multiple || false}
                onCheckedChange={(checked) => updateField({ multiple: !!checked })}
                data-testid="checkbox-multiple"
              />
              <label htmlFor="multiple" className="text-sm font-medium text-foreground">
                Allow multiple files
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
