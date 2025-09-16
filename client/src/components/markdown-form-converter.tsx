import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Import, AlertCircle, CheckCircle, Book } from "lucide-react";
import { FormField } from "@shared/schema";
import { MarkdownFormParser } from "@/lib/markdownParser";
import { useToast } from "@/hooks/use-toast";

interface MarkdownFormConverterProps {
  onFieldsConverted: (fields: FormField[]) => void;
}

export default function MarkdownFormConverter({ onFieldsConverted }: MarkdownFormConverterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [previewFields, setPreviewFields] = useState<FormField[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const handlePreview = () => {
    setIsConverting(true);
    setErrors([]);
    
    try {
      const result = MarkdownFormParser.parseMarkdown(markdown);
      setPreviewFields(result.fields);
      
      // Set detailed errors with section information
      if (result.errors.length > 0) {
        const errorMessages = result.errors.map(({ section, error }) => 
          `Sekcja "${section}": ${error}`
        );
        setErrors(errorMessages);
      } else if (result.fields.length === 0) {
        setErrors(["Nie znaleziono poprawnych pól w markdown. Sprawdź składnię."]);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Nie udało się przetworzyć markdown"]);
      setPreviewFields([]);
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvert = () => {
    if (previewFields.length === 0) {
      toast({
        title: "Brak pól do konwersji",
        description: "Najpierw wyświetl podgląd markdown, aby wygenerować pola",
        variant: "destructive",
      });
      return;
    }

    onFieldsConverted(previewFields);
    setIsOpen(false);
    setMarkdown("");
    setPreviewFields([]);
    setErrors([]);
    
    toast({
      title: "Pola zostały pomyślnie zaimportowane!",
      description: `${previewFields.length} ${previewFields.length === 1 ? 'pole zostało dodane' : previewFields.length < 5 ? 'pola zostały dodane' : 'pól zostało dodanych'} do formularza`,
    });
  };

  const loadExample = () => {
    const exampleMarkdown = `## Imię i Nazwisko
[text] (required) {"placeholder": "Wprowadź swoje pełne imię i nazwisko"}
Proszę podać swoje pełne imię i nazwisko

## Adres Email
[email] (required) {"placeholder": "twoj.email@example.com"}
Użyjemy tego adresu do kontaktu z Tobą

## Preferowany Sposób Kontaktu
[radio] {"options": ["Email", "Telefon", "SMS"]}
W jaki sposób chciałbyś, abyśmy się z Tobą kontaktowali?

## Zainteresowania
[checkbox] {"options": ["Technologia", "Sport", "Muzyka", "Podróże"]}
Zaznacz wszystkie, które dotyczą Ciebie

## Przesyłanie CV
[file] (required) {"acceptedFileTypes": [".pdf", ".doc", ".docx"], "maxFileSize": 5}
Prześlij swoje CV (plik PDF lub Word)`;

    setMarkdown(exampleMarkdown);
    handlePreview();
  };

  const examples = MarkdownFormParser.generateExamples();
  const documentation = MarkdownFormParser.getSyntaxDocumentation();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2" data-testid="button-markdown-converter">
          <FileText className="w-4 h-4" />
          <span>Importuj z Markdown</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>Konwerter Formularzy Markdown</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="convert" className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="convert" data-testid="tab-convert">Konwertuj Markdown</TabsTrigger>
            <TabsTrigger value="docs" data-testid="tab-docs">
              <Book className="w-4 h-4 mr-2" />
              Dokumentacja
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-4 h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Input Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Wejście Markdown</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadExample}
                    data-testid="button-load-example"
                  >
                    Załaduj Przykład
                  </Button>
                </div>
                
                <Textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Wprowadź pola formularza w formacie markdown..."
                  className="h-64 resize-none font-mono text-sm"
                  data-testid="textarea-markdown-input"
                />
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handlePreview} 
                    disabled={!markdown.trim() || isConverting}
                    className="flex-1"
                    data-testid="button-preview"
                  >
                    {isConverting ? "Przetwarzanie..." : "Podgląd Pól"}
                  </Button>
                  <Button 
                    onClick={handleConvert}
                    disabled={previewFields.length === 0}
                    variant="default"
                    className="flex items-center space-x-2"
                    data-testid="button-convert"
                  >
                    <Import className="w-4 h-4" />
                    <span>Dodaj do Formularza</span>
                  </Button>
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Podgląd</h3>
                
                <ScrollArea className="h-64 border rounded-lg p-4">
                  {errors.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {errors.map((error, index) => (
                        <Alert key={index} variant="destructive" data-testid={`error-${index}`}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {previewFields.length > 0 && (
                    <div className="space-y-4">
                      <Alert data-testid="success-alert">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Pomyślnie przetworzono {previewFields.length} {previewFields.length === 1 ? 'pole' : previewFields.length < 5 ? 'pola' : 'pól'}
                        </AlertDescription>
                      </Alert>
                      
                      {previewFields.map((field, index) => (
                        <div 
                          key={field.id} 
                          className="border rounded-lg p-3 space-y-2"
                          data-testid={`preview-field-${index}`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">
                              {field.label}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </h4>
                            <span className="text-xs bg-secondary px-2 py-1 rounded">
                              {field.type}
                            </span>
                          </div>
                          
                          {field.helpText && (
                            <p className="text-xs text-muted-foreground">{field.helpText}</p>
                          )}
                          
                          {field.placeholder && (
                            <p className="text-xs text-muted-foreground">
                              Symbol zastępczy: "{field.placeholder}"
                            </p>
                          )}
                          
                          {field.options && (
                            <p className="text-xs text-muted-foreground">
                              Opcje: {field.options.join(', ')}
                            </p>
                          )}
                          
                          {field.acceptedFileTypes && (
                            <p className="text-xs text-muted-foreground">
                              Typy plików: {field.acceptedFileTypes.join(', ')}
                              {field.maxFileSize && ` (maks: ${field.maxFileSize}MB)`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {markdown.trim() && previewFields.length === 0 && errors.length === 0 && !isConverting && (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      Kliknij "Podgląd Pól", aby przetworzyć markdown
                    </p>
                  )}

                  {!markdown.trim() && (
                    <p className="text-muted-foreground text-sm text-center py-8">
                      Wprowadź markdown powyżej lub kliknij "Załaduj Przykład", aby rozpocząć
                    </p>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4 h-[calc(90vh-120px)]">
            <ScrollArea className="h-full">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="space-y-6">
                  {/* Quick Examples */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Szybkie Przykłady</h3>
                    <div className="grid gap-4">
                      {Object.entries(examples).map(([fieldType, example]) => (
                        <div key={fieldType} className="border rounded-lg p-3">
                          <h4 className="font-medium mb-2 capitalize">Pole {fieldType}</h4>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            <code>{example}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full Documentation */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Kompletny Przewodnik Składni</h3>
                    <div className="prose prose-sm dark:prose-invert">
                      <pre className="whitespace-pre-wrap text-sm">
                        {documentation}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}