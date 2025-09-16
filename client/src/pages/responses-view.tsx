import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Download, Share, Eye, Trash2, Search, Filter, Loader2, FileText, FileSpreadsheet, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FormResponse, FormTemplate } from "@shared/schema";
import { useState } from "react";
import ShareFormModal from "@/components/share-form-modal";

export default function ResponsesView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: formTemplate, isLoading: templateLoading } = useQuery<FormTemplate>({
    queryKey: ["/api/form-templates", id],
  });

  const { data: responses = [], isLoading: responsesLoading } = useQuery<FormResponse[]>({
    queryKey: ["/api/form-templates", id, "responses"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalResponses: number;
    completionRate: number;
    lastResponseAt?: Date;
  }>({
    queryKey: ["/api/form-templates", id, "stats"],
  });

  const deleteMutation = useMutation({
    mutationFn: (responseId: string) => apiRequest("DELETE", `/api/form-responses/${responseId}`),
    onSuccess: () => {
      toast({
        title: "Response deleted",
        description: "Form response has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates", id, "responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates", id, "stats"] });
    },
    onError: () => {
      toast({
        title: "Failed to delete response",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (responseId: string) => {
    if (confirm("Are you sure you want to delete this response?")) {
      deleteMutation.mutate(responseId);
    }
  };

  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'excel') => {
      const response = await fetch(`/api/form-templates/${id}/export?format=${format}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }
      return { response, format };
    },
    onSuccess: async ({ response, format }) => {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formTemplate?.title || "form"}-responses.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Responses have been exported as ${format.toUpperCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExport = (format: 'csv' | 'excel') => {
    if (responses.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no responses to export",
        variant: "destructive",
      });
      return;
    }

    exportMutation.mutate(format);
  };

  const filteredResponses = responses.filter((response: FormResponse) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(response.responses).some(value => 
      String(value).toLowerCase().includes(searchLower)
    ) || response.id.toLowerCase().includes(searchLower);
  });

  if (templateLoading || responsesLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!formTemplate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Form Not Found</h1>
          <Button onClick={() => setLocation("/")}>
            Back to Dashboard
          </Button>
        </div>
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
                <h1 className="text-xl font-bold text-foreground">Form Responses</h1>
                <span className="text-muted-foreground">•</span>
                <span className="text-lg font-semibold text-foreground">{formTemplate.title}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={exportMutation.isPending}
                    data-testid="button-export"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {exportMutation.isPending ? "Exporting..." : "Export"}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleExport('csv')}
                    data-testid="export-csv"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleExport('excel')}
                    data-testid="export-excel"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setShareModalOpen(true)} data-testid="button-share">
                <Share className="w-4 h-4 mr-2" />
                Share Form
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalResponses || 0}</p>
                </div>
                <Eye className="text-primary text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.completionRate || 0}%</p>
                </div>
                <span className="text-green-600 text-xl font-bold">%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fields</p>
                  <p className="text-2xl font-bold text-foreground">{formTemplate.fields.length}</p>
                </div>
                <span className="text-blue-600 text-xl">#</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Response</p>
                  <p className="text-lg font-bold text-foreground">
                    {stats?.lastResponseAt 
                      ? new Date(stats.lastResponseAt).toLocaleDateString()
                      : "Never"
                    }
                  </p>
                </div>
                <span className="text-purple-600 text-xl">📅</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search responses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Responses</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responses */}
        {filteredResponses.length > 0 ? (
          <div className="space-y-4">
            {filteredResponses.map((response: FormResponse) => (
              <Card key={response.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-mono text-foreground">#{response.id.slice(0, 8)}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        response.isComplete
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {response.isComplete ? "Complete" : "Incomplete"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(response.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(response.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-response-${response.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(response.responses).map(([fieldId, value]) => {
                      const field = formTemplate.fields.find((f: any) => f.id === fieldId);
                      return (
                        <div key={fieldId} className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {field?.label || fieldId}
                          </p>
                          <div className="text-sm text-muted-foreground">
                            {field?.type === 'file' ? (
                              <div className="space-y-1">
                                {Array.isArray(value) ? (
                                  value.map((file: any, index: number) => (
                                    <div key={index} className="flex items-center space-x-2">
                                      <FileText className="w-4 h-4" />
                                      <a 
                                        href={file.path} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                        data-testid={`link-file-${fieldId}-${index}`}
                                      >
                                        {file.originalname || file.filename}
                                      </a>
                                      <ExternalLink className="w-3 h-3" />
                                    </div>
                                  ))
                                ) : value && typeof value === 'object' && value.path ? (
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4" />
                                    <a 
                                      href={value.path} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                      data-testid={`link-file-${fieldId}`}
                                    >
                                      {value.originalname || value.filename}
                                    </a>
                                    <ExternalLink className="w-3 h-3" />
                                  </div>
                                ) : (
                                  <span>{String(value)}</span>
                                )}
                              </div>
                            ) : (
                              <span>{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No responses yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No responses match your search" : "Share your form to start collecting responses"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShareModalOpen(true)}>
                  <Share className="w-4 h-4 mr-2" />
                  Share Form
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <ShareFormModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        template={formTemplate}
      />
    </div>
  );
}
