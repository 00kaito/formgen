import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FormFieldRenderer from "@/components/form-field-renderer";
import { Loader2, Copy, CheckCircle, ExternalLink, Save, Sparkles } from "lucide-react";
import type { FormField, FormTemplate, FormResponse } from "@shared/schema";

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
function PublicFormInner({ 
  template, 
  onSuccess, 
  isDraft = false, 
  existingDraftData = null, 
  draftResponseLink = null 
}: { 
  template: FormTemplate; 
  onSuccess: (responseData: any, isDraft?: boolean) => void;
  isDraft?: boolean;
  existingDraftData?: Record<string, any> | null;
  draftResponseLink?: string | null;
}) {
  const { toast } = useToast();
  const formSchema = createFormSchema(template.fields);
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: existingDraftData || {},
  });

  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      let response;
      if (draftResponseLink) {
        // Update existing draft as complete
        response = await apiRequest("PUT", `/api/form-responses/draft/${draftResponseLink}`, {
          formTemplateId: template.id,
          responses: data,
          isComplete: true,
        });
      } else {
        // Create new complete response
        response = await apiRequest("POST", "/api/form-responses", {
          formTemplateId: template.id,
          responses: data,
          isComplete: true,
        });
      }
      return response.json();
    },
    onSuccess: (responseData) => {
      onSuccess(responseData, false);
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

  const saveDraftMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      let response;
      if (draftResponseLink) {
        // Update existing draft
        response = await apiRequest("PUT", `/api/form-responses/draft/${draftResponseLink}`, {
          formTemplateId: template.id,
          responses: data,
          isComplete: false,
        });
      } else {
        // Create new draft
        response = await apiRequest("POST", "/api/form-responses/draft", {
          formTemplateId: template.id,
          responses: data,
          isComplete: false,
        });
      }
      return response.json();
    },
    onSuccess: (responseData) => {
      onSuccess(responseData, true);
      toast({
        title: "Draft saved successfully!",
        description: "You can return to complete this form later.",
      });
      // Invalidate queries to refresh any draft data
      queryClient.invalidateQueries({ queryKey: ["/api/draft-responses"] });
    },
    onError: () => {
      toast({
        title: "Failed to save draft",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Record<string, any>) => {
    submitMutation.mutate(data);
  };

  const onSaveDraft = () => {
    const currentData = form.getValues();
    saveDraftMutation.mutate(currentData);
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

            <div className="pt-6 space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={submitMutation.isPending || saveDraftMutation.isPending}
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
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onSaveDraft}
                disabled={submitMutation.isPending || saveDraftMutation.isPending}
                data-testid="button-save-draft"
              >
                {saveDraftMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Draft...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4">
              <p>Your response will be kept confidential.</p>
              {(draftResponseLink) && (
                <p className="mt-2 text-blue-600">
                  💾 Draft mode: Your progress is automatically saved
                </p>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function PublicForm() {
  const { shareableLink } = useParams<{ shareableLink: string }>();
  const [location] = useLocation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [responseData, setResponseData] = useState<any>(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [checkingForAI, setCheckingForAI] = useState(false);
  const { toast } = useToast();
  
  // Detect if this is a draft scenario based on URL parameters
  // Use window.location.search instead of wouter location for query params
  const urlParams = new URLSearchParams(window.location.search);
  const isDraftMode = urlParams.has('draft');
  const draftResponseLink = urlParams.get('draftId');

  // Load form template
  const { data: formTemplate, isLoading, error } = useQuery<FormTemplate>({
    queryKey: ["/api/public-forms", shareableLink],
  });

  // Load existing draft data if available
  const { data: existingDraft, isLoading: draftLoading, error: draftError } = useQuery<FormResponse>({
    queryKey: ["/api/form-responses/by-link", draftResponseLink],
    enabled: !!draftResponseLink,
  });
  
  // Debug draft query
  console.log('DEBUG - Draft query enabled:', !!draftResponseLink);
  console.log('DEBUG - Draft loading:', draftLoading);
  console.log('DEBUG - Draft data:', existingDraft);
  console.log('DEBUG - Draft error:', draftError);

  if (isLoading || draftLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">
            {draftLoading ? "Loading draft..." : "Loading form..."}
          </p>
        </div>
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

  if (isDraftSaved && responseData) {
    const draftLink = `${window.location.origin}/form/${shareableLink}?draftId=${responseData.shareableResponseLink}`;
    
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(draftLink);
        toast({
          title: "Link copied!",
          description: "Draft link has been copied to clipboard.",
        });
      } catch (err) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = draftLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: "Link copied!",
          description: "Draft link has been copied to clipboard.",
        });
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Save className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="text-draft-saved-title">
                Draft Saved!
              </h1>
              <p className="text-lg text-muted-foreground mb-6" data-testid="text-draft-saved-description">
                Your progress has been saved. You can return to complete this form later.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                <ExternalLink className="w-5 h-5 mr-2" />
                Your Draft Link
              </h2>
              <p className="text-sm text-blue-700 mb-4">
                Save this link to continue editing your draft:
              </p>
              
              <div className="flex items-center space-x-2 p-3 bg-white border border-blue-300 rounded">
                <input 
                  type="text" 
                  value={draftLink} 
                  readOnly 
                  className="flex-1 text-sm bg-transparent border-none outline-none text-blue-800"
                  data-testid="input-draft-link"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  data-testid="button-copy-draft-link"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              
              <div className="mt-4 flex space-x-2">
                <Button
                  onClick={() => window.open(draftLink, '_blank')}
                  variant="default"
                  className="flex-1"
                  data-testid="button-continue-draft"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Continue Editing
                </Button>
                <Button
                  onClick={() => {
                    setIsDraftSaved(false);
                    setResponseData(null);
                  }}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-new-draft"
                >
                  Start New Draft
                </Button>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>💡 Tip: Bookmark this link to quickly return to your draft</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted && responseData) {
    const responseLink = `${window.location.origin}/response/${responseData.shareableResponseLink}`;
    const followupLink = responseData.aiGeneratedFields && responseData.aiGeneratedFields.length > 0 
      ? `${window.location.origin}/followup/${responseData.shareableResponseLink}` 
      : null;
    
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

            {/* AI Follow-up Notification */}
            {followupLink && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Additional Questions Generated
                </h2>
                <p className="text-sm text-blue-700 mb-4">
                  Based on your responses, we've generated some additional questions that will help us better understand your requirements.
                </p>
                
                <Button
                  onClick={() => window.open(followupLink, '_blank')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  data-testid="button-followup-questions"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Answer Follow-up Questions
                </Button>
                
                <p className="text-xs text-blue-600 mt-2 text-center">
                  ✨ These questions were intelligently generated based on your answers
                </p>
              </div>
            )}

            {/* AI Processing Indicator */}
            {checkingForAI && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Additional Questions...
                </h2>
                <p className="text-sm text-yellow-700">
                  Our AI is analyzing your responses to create personalized follow-up questions. This may take a few moments.
                </p>
              </div>
            )}
            
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
      <div className="w-full lg:w-2/5 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

        {/* Form status indicator */}
        {(isDraftMode || draftResponseLink || existingDraft) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Save className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-blue-900 font-medium">
                  {existingDraft ? "Editing Draft" : "Draft Mode"}
                </p>
                <p className="text-blue-700 text-sm">
                  {existingDraft 
                    ? "Continue from where you left off. Your changes will be saved automatically."
                    : "Your progress will be saved as a draft that you can return to later."
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <PublicFormInner 
          key={`${formTemplate.id}-${draftResponseLink || 'new'}`} 
          template={formTemplate} 
          isDraft={isDraftMode || !!draftResponseLink}
          existingDraftData={existingDraft?.responses || null}
          draftResponseLink={draftResponseLink}
          onSuccess={(data, isDraft) => {
            setResponseData(data);
            if (isDraft) {
              setIsDraftSaved(true);
            } else {
              setIsSubmitted(true);
              
              // Check for AI-generated fields after a delay for completed submissions
              if (data.isComplete) {
                setCheckingForAI(true);
                
                // Function to check for AI fields with retry mechanism
                const checkAIFields = async (attempt = 1, maxAttempts = 4) => {
                  try {
                    const updatedResponse = await apiRequest("GET", `/api/form-responses/by-link/${data.shareableResponseLink}`);
                    const updatedData = await updatedResponse.json();
                    
                    if (updatedData.aiGeneratedFields && updatedData.aiGeneratedFields.length > 0) {
                      setResponseData(updatedData);
                      setCheckingForAI(false);
                      toast({
                        title: "Additional questions generated!",
                        description: "AI has created follow-up questions based on your answers.",
                      });
                      return;
                    }
                    
                    // If no AI fields yet and we haven't exceeded max attempts, retry
                    if (attempt < maxAttempts) {
                      setTimeout(() => checkAIFields(attempt + 1, maxAttempts), 3000);
                    } else {
                      setCheckingForAI(false);
                    }
                  } catch (error) {
                    console.error('Failed to check for AI fields:', error);
                    if (attempt < maxAttempts) {
                      setTimeout(() => checkAIFields(attempt + 1, maxAttempts), 3000);
                    } else {
                      setCheckingForAI(false);
                    }
                  }
                };
                
                // Start checking after 5 seconds
                setTimeout(() => checkAIFields(), 5000);
              }
            }
          }} 
        />
      </div>
    </div>
  );
}