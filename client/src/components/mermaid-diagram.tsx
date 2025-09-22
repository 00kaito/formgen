import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize Mermaid with configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'Arial',
});

interface MermaidDiagramProps {
  code: string;
  className?: string;
  onError?: (error: string) => void;
}

export default function MermaidDiagram({ code, className = '', onError }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    const renderDiagram = async () => {
      setIsRendering(true);
      setError(null);

      try {
        // Clear previous content
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Generate unique ID for this diagram
        const diagramId = `mermaid-diagram-${Date.now()}`;
        
        // Validate and render the Mermaid code
        const { svg } = await mermaid.render(diagramId, code);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
        setError(errorMessage);
        onError?.(errorMessage);
        
        // Show error message in container
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="flex items-center justify-center p-8 border-2 border-dashed border-red-300 rounded-lg bg-red-50">
              <div class="text-center">
                <div class="text-red-600 font-medium">Diagram Rendering Error</div>
                <div class="text-red-500 text-sm mt-1">${errorMessage}</div>
              </div>
            </div>
          `;
        }
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [code, onError]);

  return (
    <div 
      ref={containerRef} 
      className={`mermaid-container ${className} ${isRendering ? 'opacity-50' : ''}`}
      data-testid="mermaid-diagram"
    >
      {isRendering && (
        <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-gray-600">Rendering diagram...</div>
          </div>
        </div>
      )}
    </div>
  );
}