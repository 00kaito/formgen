import { FormField as FormFieldType } from "@shared/schema";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface FormFieldRendererProps {
  field: FormFieldType;
  isSelected?: boolean;
  isPublic?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  form?: UseFormReturn<any>;
}

export default function FormFieldRenderer({ 
  field, 
  isSelected = false, 
  isPublic = false, 
  onClick, 
  onDelete,
  form 
}: FormFieldRendererProps) {
  const renderField = () => {
    if (isPublic && form) {
      return (
        <FormField
          control={form.control}
          name={field.id}
          render={({ field: formField }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-lg font-medium text-foreground">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}
              <FormControl>
                {renderInput(formField, true)}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        {field.helpText && (
          <p className="text-sm text-muted-foreground">{field.helpText}</p>
        )}
        {renderInput(null, false)}
      </div>
    );
  };

  const renderInput = (formField: any, isLive: boolean) => {
    const baseProps = isLive ? formField : {};
    
    switch (field.type) {
      case 'text':
        return (
          <Input
            {...baseProps}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className={isPublic ? "text-lg py-3" : undefined}
            data-testid={`input-${field.id}`}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            {...baseProps}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            rows={isPublic ? 6 : 4}
            className={`resize-none ${isPublic ? "text-lg py-3" : ""}`}
            data-testid={`textarea-${field.id}`}
          />
        );
      
      case 'email':
        return (
          <Input
            {...baseProps}
            type="email"
            placeholder={field.placeholder || "Enter your email address"}
            className={isPublic ? "text-lg py-3" : undefined}
            data-testid={`input-email-${field.id}`}
          />
        );
      
      case 'number':
        return (
          <Input
            {...baseProps}
            type="number"
            placeholder={field.placeholder || "Enter a number"}
            className={isPublic ? "text-lg py-3" : undefined}
            data-testid={`input-number-${field.id}`}
          />
        );
      
      case 'date':
        return (
          <Input
            {...baseProps}
            type="date"
            className={isPublic ? "text-lg py-3" : undefined}
            data-testid={`input-date-${field.id}`}
          />
        );
      
      case 'select':
        if (isLive) {
          return (
            <Select onValueChange={formField.onChange} value={formField.value}>
              <SelectTrigger className={isPublic ? "text-lg py-3" : undefined}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option} data-testid={`option-${field.id}-${index}`}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Select>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'radio':
        if (isLive) {
          return (
            <RadioGroup onValueChange={formField.onChange} value={formField.value}>
              {field.options?.map((option, index) => (
                <div key={index} className={`flex items-center space-x-3 ${isPublic ? "p-3 rounded-lg hover:bg-accent transition-colors" : "space-x-2"}`}>
                  <RadioGroupItem value={option} id={`${field.id}-${index}`} data-testid={`radio-${field.id}-${index}`} />
                  <label htmlFor={`${field.id}-${index}`} className="text-foreground cursor-pointer">
                    {option}
                  </label>
                </div>
              ))}
            </RadioGroup>
          );
        }
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="radio" name={field.id} className="text-primary focus:ring-primary" />
                <span className="text-sm text-foreground">{option}</span>
              </div>
            ))}
          </div>
        );
      
      case 'checkbox':
        if (isLive) {
          return (
            <div className={`space-y-3 ${isPublic ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}`}>
              {field.options?.map((option, index) => (
                <div key={index} className={`flex items-center space-x-3 ${isPublic ? "p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer" : ""}`}>
                  <Checkbox
                    checked={(formField.value || []).includes(option)}
                    onCheckedChange={(checked) => {
                      const current = formField.value || [];
                      if (checked) {
                        formField.onChange([...current, option]);
                      } else {
                        formField.onChange(current.filter((v: string) => v !== option));
                      }
                    }}
                    data-testid={`checkbox-${field.id}-${index}`}
                  />
                  <label className="text-foreground cursor-pointer">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox />
                <span className="text-sm text-foreground">{option}</span>
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <Input
            {...baseProps}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            data-testid={`input-default-${field.id}`}
          />
        );
    }
  };

  if (isPublic) {
    return <div className="space-y-4">{renderField()}</div>;
  }

  return (
    <div
      className={`group relative p-4 border-2 border-dashed transition-colors rounded-lg cursor-pointer ${
        isSelected 
          ? "border-primary bg-primary/5" 
          : "border-transparent hover:border-primary/50"
      }`}
      onClick={onClick}
      data-testid={`field-${field.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {renderField()}
        </div>
        <div className={`ml-4 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" data-testid={`button-edit-field-${field.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              data-testid={`button-delete-field-${field.id}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
