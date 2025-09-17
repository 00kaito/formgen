import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FormFieldRenderer from "@/components/form-field-renderer";
import { Loader2, CheckCircle, ArrowLeft, Sparkles } from "lucide-react";
import type { FormField, FormResponse } from "@shared/schema";

// Create dynamic form schema based on AI-generated fields
const createAIFormSchema = (fields: FormField[]) => {
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

export default function AIFollowUpForm() {
  const { shareableResponseLink } = useParams<{ shareableResponseLink: string }>();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch the original form response with AI-generated fields
  const { data: formResponse, isLoading, error } = useQuery<FormResponse>({
    queryKey: ["/api/form-responses/by-link", shareableResponseLink],
  });

  const aiFields = formResponse?.aiGeneratedFields || [];
  const formSchema = createAIFormSchema(aiFields);
  
  // Create proper default values to avoid controlled/uncontrolled input warning
  const defaultValues = useMemo(() => {
    const values: Record<string, any> = {};
    aiFields.forEach(field => {
      if (field.type === 'checkbox') {
        values[field.id] = [];
      } else {
        values[field.id] = '';
      }
    });
    return values;
  }, [aiFields]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      // Update the existing response with additional answers and mark as complete
      const response = await apiRequest("PUT", `/api/form-responses/draft/${shareableResponseLink}`, {
        formTemplateId: formResponse?.formTemplateId,
        responses: {
          // Include original responses
          ...(formResponse?.responses || {}),
          // Add AI follow-up responses
          ...data
        },
        isComplete: true, // Mark as complete after follow-up
      });
      return response.json();
    },
    onSuccess: (responseData) => {
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/form-responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/form-responses/by-link", shareableResponseLink] });
      toast({
        title: "Follow-up form submitted successfully!",
        description: "Thank you for providing additional information.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to submit follow-up form",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Record<string, any>) => {
    submitMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !formResponse || !aiFields || aiFields.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">No Follow-up Questions</h1>
            <p className="text-muted-foreground mb-4">
              {error 
                ? "The follow-up form couldn't be loaded." 
                : "No additional questions were generated for this form."}
            </p>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              data-testid="button-go-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-success-title">
                All Done!
              </h1>
              <p className="text-lg text-muted-foreground mb-6" data-testid="text-success-description">
                Your follow-up information has been successfully submitted. 
                Your complete response is now ready for review.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Process Complete
                </h2>
                <p className="text-sm text-blue-700">
                  Thank you for providing the additional details. Your comprehensive response 
                  will help ensure the best possible outcome for your requirements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full lg:w-2/5 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-foreground" data-testid="text-form-title">
              Follow-up Questions
            </h1>
          </div>
          <p className="text-lg text-muted-foreground" data-testid="text-form-description">
            Based on your initial response, we've generated some additional questions 
            to help us better understand your requirements.
          </p>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              ✨ These questions were intelligently generated based on your previous answers 
              to gather more specific details for implementation.
            </p>
          </div>
        </div>

        {/* AI Follow-up Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="form-ai-followup">
                {aiFields.map((field: FormField) => (
                  <FormFieldRenderer
                    key={field.id}
                    field={field}
                    isPublic={true}
                    form={form}
                    templateId={formResponse.formTemplateId}
                  />
                ))}

                <div className="pt-6 space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-followup"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Complete Submission
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => window.history.back()}
                    disabled={submitMutation.isPending}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground pt-4">
                  <p>Your responses will be added to your original submission.</p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}