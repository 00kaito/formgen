import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot, Edit, Save, Eye } from 'lucide-react';
import MermaidDiagram from './mermaid-diagram';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { apiRequest } from '@/lib/queryClient';
import type { FormResponse } from '@shared/schema';

interface ProcessFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: FormResponse;
  onFlowUpdated?: (flowChart: string) => void;
}

export default function ProcessFlowModal({ 
  isOpen, 
  onClose, 
  response, 
  onFlowUpdated 
}: ProcessFlowModalProps) {
  const [mermaidCode, setMermaidCode] = useState(response.processFlowChart || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/form-responses/${response.id}/process-flow`),
    onSuccess: async (response) => {
      const data = await response.json();
      setMermaidCode(data.processFlowChart);
      onFlowUpdated?.(data.processFlowChart);
      toast({
        title: "Process flow generated!",
        description: "AI has created a process flow chart based on the form response.",
      });
    },
    onError: (error) => {
      console.error('Generate process flow error:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate process flow chart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (processFlowChart: string) => 
      apiRequest("PUT", `/api/form-responses/${response.id}/process-flow`, { processFlowChart }),
    onSuccess: () => {
      onFlowUpdated?.(mermaidCode);
      setIsEditing(false);
      toast({
        title: "Process flow saved!",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Save process flow error:', error);
      toast({
        title: "Save failed",
        description: "Failed to save process flow chart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleSave = () => {
    if (mermaidCode.trim()) {
      saveMutation.mutate(mermaidCode);
    }
  };

  const handleCodeChange = (value: string) => {
    setMermaidCode(value);
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <span>Process Flow Analysis</span>
          </DialogTitle>
          <DialogDescription>
            AI-generated process flow chart for form response #{response.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">
          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {!mermaidCode && (
                <Button 
                  onClick={handleGenerate} 
                  disabled={generateMutation.isPending}
                  data-testid="button-generate-flow"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4 mr-2" />
                  )}
                  Generate Flow Chart
                </Button>
              )}
              
              {mermaidCode && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={toggleEdit}
                    data-testid="button-toggle-edit"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isEditing ? 'View Mode' : 'Edit Mode'}
                  </Button>
                  
                  {isEditing && (
                    <Button 
                      onClick={handleSave} 
                      disabled={saveMutation.isPending}
                      data-testid="button-save-flow"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    onClick={togglePreview}
                    data-testid="button-toggle-preview"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Content Area */}
          {mermaidCode ? (
            <div className="flex-1 flex space-x-4 min-h-0">
              {/* Editor */}
              {isEditing && (
                <div className="flex-1 flex flex-col">
                  <h3 className="font-medium mb-2">Mermaid Editor</h3>
                  <div className="flex-1 border rounded-md overflow-hidden">
                    <Textarea
                      value={mermaidCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      className="h-full resize-none font-mono text-sm"
                      placeholder="Enter your Mermaid diagram code here..."
                      data-testid="textarea-mermaid-editor"
                    />
                  </div>
                </div>
              )}

              {/* Code View (read-only) */}
              {!isEditing && (
                <div className="flex-1 flex flex-col">
                  <h3 className="font-medium mb-2">Mermaid Code</h3>
                  <div className="flex-1 border rounded-md overflow-auto">
                    <SyntaxHighlighter
                      language="mermaid"
                      style={oneLight}
                      customStyle={{
                        margin: 0,
                        height: '100%',
                        fontSize: '14px',
                      }}
                    >
                      {mermaidCode}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}

              {/* Preview */}
              {showPreview && (
                <div className="flex-1 flex flex-col">
                  <h3 className="font-medium mb-2">Live Preview</h3>
                  <div className="flex-1 border rounded-md overflow-auto bg-white p-4">
                    <MermaidDiagram 
                      code={mermaidCode} 
                      className="w-full h-full"
                      onError={(error) => {
                        toast({
                          title: "Diagram Error",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Empty state
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Process Flow Chart</h3>
                <p className="text-gray-500 mb-4">
                  Generate an AI-powered process flow chart based on this form response.
                </p>
                <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4 mr-2" />
                  )}
                  Generate Flow Chart
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}