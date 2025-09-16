import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CheckCircle, Clock, ArrowLeft, FileText, Download } from "lucide-react";
import type { FormField, FormTemplate, FormResponse } from "@shared/schema";

interface ResponseViewData {
  response: FormResponse;
  template: FormTemplate;
}

export default function ResponseView() {
  const { shareableResponseLink } = useParams<{ shareableResponseLink: string }>();

  const { data, isLoading, error } = useQuery<ResponseViewData>({
    queryKey: ["/api/response", shareableResponseLink],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Ładowanie odpowiedzi...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-500">
            <FileText className="h-16 w-16 mx-auto mb-4" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Odpowiedź nie została znaleziona</h1>
          <p className="text-gray-600">
            Odpowiedź o podanym identyfikatorze nie istnieje lub została usunięta.
          </p>
          <Button onClick={() => window.history.back()} variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </div>
      </div>
    );
  }

  const { response, template } = data;

  const getFieldDisplayValue = (field: FormField, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Brak odpowiedzi</span>;
    }

    switch (field.type) {
      case 'checkbox':
        if (Array.isArray(value)) {
          return value.length > 0 ? (
            <div className="space-y-1">
              {value.map((item, index) => (
                <Badge key={index} variant="secondary" className="mr-2">
                  {item}
                </Badge>
              ))}
            </div>
          ) : <span className="text-gray-400 italic">Nie wybrano opcji</span>;
        }
        return value ? "Tak" : "Nie";
      
      case 'select':
      case 'radio':
        return <Badge variant="outline">{value}</Badge>;
      
      case 'date':
        try {
          const date = new Date(value);
          return format(date, 'dd MMMM yyyy', { locale: pl });
        } catch {
          return value;
        }
      
      case 'file':
        if (Array.isArray(value)) {
          return (
            <div className="space-y-2">
              {value.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <FileText className="h-4 w-4" />
                  <a 
                    href={file.path} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                    data-testid={`file-link-${index}`}
                  >
                    {file.originalname}
                  </a>
                  <span className="text-sm text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ))}
            </div>
          );
        } else if (value && typeof value === 'object') {
          return (
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
              <FileText className="h-4 w-4" />
              <a 
                href={value.path} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
                data-testid="file-link"
              >
                {value.originalname}
              </a>
              <span className="text-sm text-gray-500">
                ({(value.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          );
        }
        return value;
      
      case 'table':
        if (Array.isArray(value) && value.length > 0) {
          const columns = field.columns || [];
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((col, index) => (
                      <th 
                        key={index} 
                        className="px-4 py-2 text-left text-sm font-medium text-gray-900"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {value.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {columns.map((col, colIndex) => (
                        <td key={colIndex} className="px-4 py-2 text-sm text-gray-900">
                          {row[col] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <span className="text-gray-400 italic">Brak danych w tabeli</span>;
      
      case 'textarea':
        return (
          <div className="whitespace-pre-wrap p-3 bg-gray-50 rounded border">
            {value}
          </div>
        );
      
      default:
        return <span className="break-words">{String(value)}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold text-gray-900" data-testid="form-title">
                  {template.title}
                </CardTitle>
                {template.description && (
                  <p className="text-gray-600" data-testid="form-description">
                    {template.description}
                  </p>
                )}
              </div>
              <div className="text-right space-y-2">
                <Badge 
                  variant={response.isComplete ? "default" : "secondary"} 
                  className="text-sm"
                  data-testid="completion-status"
                >
                  {response.isComplete ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Ukończony
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-1" />
                      Nieukończony
                    </>
                  )}
                </Badge>
                <p className="text-sm text-gray-500" data-testid="submission-date">
                  Wypełniono: {format(new Date(response.submittedAt), 'dd MMMM yyyy, HH:mm', { locale: pl })}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {template.fields.map((field, index) => {
              // Skip separator fields in response view
              if (field.type === 'separator') {
                return (
                  <div key={field.id} className="my-6">
                    {field.label && field.label !== 'Belka dzieląca' && (
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {field.label}
                      </h3>
                    )}
                    {field.helpText && (
                      <p className="text-sm text-gray-600 mb-4">{field.helpText}</p>
                    )}
                    <Separator />
                  </div>
                );
              }

              const value = response.responses[field.id];

              return (
                <div key={field.id} className="space-y-3" data-testid={`field-${field.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-1" data-testid={`field-label-${field.id}`}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </h4>
                      {field.helpText && (
                        <p className="text-sm text-gray-500 mb-3" data-testid={`field-help-${field.id}`}>
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pl-4 border-l-4 border-blue-200" data-testid={`field-value-${field.id}`}>
                    {getFieldDisplayValue(field, value)}
                  </div>
                  
                  {index < template.fields.length - 1 && <Separator className="mt-6" />}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button 
            onClick={() => window.history.back()} 
            variant="outline" 
            className="mr-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
          
          <Button
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>${template.title} - Odpowiedź</title>
                      <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
                        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
                        .field { margin-bottom: 20px; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
                        .field-label { font-weight: bold; margin-bottom: 8px; }
                        .field-value { color: #555; }
                        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                        .complete { background: #dcfce7; color: #166534; }
                        .incomplete { background: #fef3c7; color: #92400e; }
                        .print-only { display: block; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <h1>${template.title}</h1>
                        ${template.description ? `<p>${template.description}</p>` : ''}
                        <p>
                          <span class="status ${response.isComplete ? 'complete' : 'incomplete'}">
                            ${response.isComplete ? 'Ukończony' : 'Nieukończony'}
                          </span>
                        </p>
                        <p>Wypełniono: ${format(new Date(response.submittedAt), 'dd MMMM yyyy, HH:mm', { locale: pl })}</p>
                      </div>
                      ${template.fields.filter(f => f.type !== 'separator').map(field => {
                        const value = response.responses[field.id];
                        return `
                          <div class="field">
                            <div class="field-label">${field.label}${field.required ? ' *' : ''}</div>
                            <div class="field-value">${value || 'Brak odpowiedzi'}</div>
                          </div>
                        `;
                      }).join('')}
                    </body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.print();
              }
            }}
            variant="default"
            data-testid="button-print"
          >
            <Download className="h-4 w-4 mr-2" />
            Drukuj odpowiedź
          </Button>
        </div>
      </div>
    </div>
  );
}