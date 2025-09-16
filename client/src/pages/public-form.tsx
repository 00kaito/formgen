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
import { Loader2, Copy, CheckCircle, ExternalLink } from "lucide-react";
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
      case 'table':
        if (field.required) {
          fieldSchema = z.array(z.record(z.string())).min(1, `${field.label} is required`);
        } else {
          fieldSchema = z.array(z.record(z.string())).optional();
        }
        break;
      case 'separator':
        // Separators don't need validation as they don't collect data
        fieldSchema = z.any().optional();
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
function PublicFormInner({ template, onSuccess }: { template: FormTemplate; onSuccess: (responseData: any) => void }) {
  const { toast } = useToast();
  const formSchema = createFormSchema(template.fields);
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest("POST", "/api/form-responses", {
        formTemplateId: template.id,
        responses: data,
        isComplete: true,
      });
      return response.json();
    },
    onSuccess: (responseData) => {
      onSuccess(responseData);
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
  const [responseData, setResponseData] = useState<any>(null);
  const { toast } = useToast();

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

  if (isSubmitted && responseData) {
    const responseLink = `${window.location.origin}/response/${responseData.shareableResponseLink}`;
    
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(responseLink);
        toast({
          title: "Link copied!",
          description: "Response link has been copied to clipboard.",
        });
      } catch (err) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = responseLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: "Link copied!",
          description: "Response link has been copied to clipboard.",
        });
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-success-title">
                Thank you!
              </h1>
              <p className="text-lg text-muted-foreground mb-6" data-testid="text-success-description">
                Your response has been successfully submitted.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                <ExternalLink className="w-5 h-5 mr-2" />
                Your Response Link
              </h2>
              <p className="text-sm text-blue-700 mb-4">
                Save this link to view your response in the future:
              </p>
              
              <div className="flex items-center space-x-2 p-3 bg-white border border-blue-300 rounded">
                <input 
                  type="text" 
                  value={responseLink} 
                  readOnly 
                  className="flex-1 text-sm bg-transparent border-none outline-none text-blue-800"
                  data-testid="input-response-link"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  data-testid="button-copy-link"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              
              <div className="mt-4">
                <Button
                  onClick={() => window.open(responseLink, '_blank')}
                  variant="default"
                  className="w-full"
                  data-testid="button-view-response"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Response
                </Button>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>💡 Tip: Bookmark this link to quickly return to your response</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
        <PublicFormInner 
          key={formTemplate.id} 
          template={formTemplate} 
          onSuccess={(data) => {
            setResponseData(data);
            setIsSubmitted(true);
          }} 
        />
      </div>
    </div>
  );
}