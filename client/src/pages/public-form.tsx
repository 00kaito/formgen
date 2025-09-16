import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import FormFieldRenderer from "@/components/form-field-renderer";
import { Loader2 } from "lucide-react";
import type { FormField, FormTemplate } from "@shared/schema";

// Create dynamic form schema based on form fields
const createFormSchema = (fields: FormField[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case 'email':
        if (field.required) {
          fieldSchema = z.string().email("Please enter a valid email address").min(1, `${field.label} is required`);
        } else {
          fieldSchema = z.string().email('Invalid email').or(z.literal('')).optional();
        }
        break;
      case 'number':
        if (field.required) {
          fieldSchema = z.preprocess(
            (v) => v === '' || v == null ? undefined : typeof v === 'string' ? Number(v) : v,
            z.number({ 
              required_error: `${field.label} is required`, 
              invalid_type_error: 'Enter a valid number' 
            })
          );
        } else {
          fieldSchema = z.preprocess(
            (v) => v === '' || v == null ? undefined : typeof v === 'string' ? Number(v) : v,
            z.number({ invalid_type_error: 'Enter a valid number' }).optional()
          );
        }
        break;
      case 'date':
        if (field.required) {
          fieldSchema = z.string().min(1, "Please select a date");
        } else {
          fieldSchema = z.string().optional();
        }
        break;
      case 'checkbox':
        if (field.required) {
          fieldSchema = z.array(z.string()).min(1, `Select at least one option for ${field.label}`);
        } else {
          fieldSchema = z.array(z.string()).optional();
        }
        break;
      case 'select':
      case 'radio':
        if (field.required) {
          fieldSchema = z.string().min(1, `${field.label} is required`);
        } else {
          fieldSchema = z.string().optional();
        }
        break;
      default:
        if (field.required) {
          fieldSchema = z.string().min(1, `${field.label} is required`);
        } else {
          fieldSchema = z.string().optional();
        }
    }
    
    schemaFields[field.id] = fieldSchema;
  });
  
  return z.object(schemaFields);
};

// Form component that gets properly remounted when template changes
function PublicFormInner({ template, onSuccess }: { template: FormTemplate; onSuccess: () => void }) {
  const { toast } = useToast();
  const formSchema = createFormSchema(template.fields);
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("POST", "/api/form-responses", {
        formTemplateId: template.id,
        responses: data,
        isComplete: true,
      });
    },
    onSuccess: () => {
      onSuccess();
      toast({
        title: "Form submitted successfully!",
        description: "Thank you for your response.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to submit form",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Record<string, any>) => {
    submitMutation.mutate(data);
  };

  return (
    <Card>
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="form-public">
            {template.fields.map((field: FormField) => (
              <FormFieldRenderer
                key={field.id}
                field={field}
                isPublic={true}
                form={form}
                templateId={template.id}
              />
            ))}

            <div className="pt-6">
              <Button
                type="submit"
                className="w-full"
                disabled={submitMutation.isPending}
                data-testid="button-submit-form"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Form"
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4">
              <p>Your response will be kept confidential.</p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function PublicForm() {
  const { shareableLink } = useParams<{ shareableLink: string }>();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: formTemplate, isLoading, error } = useQuery<FormTemplate>({
    queryKey: ["/api/public-forms", shareableLink],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !formTemplate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Form Not Found</h1>
            <p className="text-muted-foreground">
              The form you're looking for doesn't exist or has been deactivated.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Thank You!</h1>
            <p className="text-muted-foreground">
              Your response has been submitted successfully.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Form Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-form-title">
            {formTemplate.title}
          </h1>
          {formTemplate.description && (
            <p className="text-lg text-muted-foreground" data-testid="text-form-description">
              {formTemplate.description}
            </p>
          )}
        </div>

        {/* Form */}
        <PublicFormInner key={formTemplate.id} template={formTemplate} onSuccess={() => setIsSubmitted(true)} />
      </div>
    </div>
  );
}