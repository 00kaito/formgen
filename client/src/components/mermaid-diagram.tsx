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

    const container = containerRef.current;
    let isCancelled = false;

    const renderDiagram = async () => {
      setIsRendering(true);
      setError(null);

      try {
        // Clear previous content safely
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        // Check if component was unmounted
        if (isCancelled) return;

        // Generate unique ID for this diagram
        const diagramId = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate and render the Mermaid code
        const { svg } = await mermaid.render(diagramId, code);
        
        // Check again if component was unmounted
        if (isCancelled || !container.parentNode) return;
        
        // Create temporary div to parse SVG
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svg;
        const svgElement = tempDiv.querySelector('svg');
        
        if (svgElement && container.parentNode) {
          container.appendChild(svgElement);
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
        setError(errorMessage);
        onError?.(errorMessage);
        
        // Show error message in container
        if (!isCancelled && container.parentNode) {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'flex items-center justify-center p-8 border-2 border-dashed border-red-300 rounded-lg bg-red-50';
          errorDiv.innerHTML = `
            <div class="text-center">
              <div class="text-red-600 font-medium">Diagram Rendering Error</div>
              <div class="text-red-500 text-sm mt-1">${errorMessage}</div>
            </div>
          `;
          container.appendChild(errorDiv);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    // Cleanup function
    return () => {
      isCancelled = true;
      // Clean up any DOM nodes safely
      if (container && container.parentNode) {
        try {
          // More defensive cleanup - just clear content
          container.textContent = '';
        } catch (e) {
          // Ignore cleanup errors during unmounting
          console.debug('Cleanup error (safe to ignore):', e);
        }
      }
    };
  }, [code, onError]);

  return (
    <div className={`mermaid-wrapper ${className}`}>
      <div 
        ref={containerRef} 
        className={`mermaid-container overflow-auto max-h-[600px] max-w-full border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 ${isRendering ? 'opacity-50' : ''}`}
        data-testid="mermaid-diagram"
        style={{
          cursor: 'grab',
          userSelect: 'none'
        }}
        onMouseDown={(e) => {
          if (e.button === 0) { // Left mouse button
            e.currentTarget.style.cursor = 'grabbing';
          }
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.cursor = 'grab';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.cursor = 'grab';
        }}
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
      {!isRendering && !error && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Użyj scroll lub przeciągnij, aby przesuwać diagram
        </div>
      )}
    </div>
  );
}