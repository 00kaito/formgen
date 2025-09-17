import type { Response } from "express";

export interface SSEEvent {
  event?: string;
  data: any;
  id?: string;
}

export interface SSEConnection {
  response: Response;
  connectionId: string;
  connectedAt: Date;
}

/**
 * Event Bus for Server-Sent Events
 * Manages connections per shareableResponseLink and allows publishing events to subscribers
 */
export class EventBus {
  private connections: Map<string, Map<string, SSEConnection>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start heartbeat to keep connections alive
    this.startHeartbeat();
  }

  /**
   * Subscribe a client to events for a specific shareableResponseLink
   */
  subscribe(shareableResponseLink: string, response: Response): string {
    const connectionId = this.generateConnectionId();
    
    if (!this.connections.has(shareableResponseLink)) {
      this.connections.set(shareableResponseLink, new Map());
    }
    
    const linkConnections = this.connections.get(shareableResponseLink)!;
    linkConnections.set(connectionId, {
      response,
      connectionId,
      connectedAt: new Date()
    });

    console.log(`[EventBus] Client connected: ${connectionId} for response ${shareableResponseLink}`);
    console.log(`[EventBus] Total connections for ${shareableResponseLink}: ${linkConnections.size}`);

    // Set up cleanup when client disconnects
    response.on('close', () => {
      this.unsubscribe(shareableResponseLink, connectionId);
    });

    return connectionId;
  }

  /**
   * Unsubscribe a client from events
   */
  unsubscribe(shareableResponseLink: string, connectionId: string): void {
    const linkConnections = this.connections.get(shareableResponseLink);
    if (linkConnections) {
      const connection = linkConnections.get(connectionId);
      if (connection) {
        // Close the connection if it's still open
        if (!connection.response.destroyed && !connection.response.headersSent) {
          connection.response.end();
        }
        linkConnections.delete(connectionId);
        console.log(`[EventBus] Client disconnected: ${connectionId} for response ${shareableResponseLink}`);
        
        // Clean up empty maps
        if (linkConnections.size === 0) {
          this.connections.delete(shareableResponseLink);
          console.log(`[EventBus] Removed empty connection map for ${shareableResponseLink}`);
        }
      }
    }
  }

  /**
   * Publish an event to all subscribers of a shareableResponseLink
   */
  publish(shareableResponseLink: string, event: SSEEvent): void {
    const linkConnections = this.connections.get(shareableResponseLink);
    if (!linkConnections || linkConnections.size === 0) {
      console.log(`[EventBus] No connections to publish to for ${shareableResponseLink}`);
      return;
    }

    console.log(`[EventBus] Publishing event ${event.event || 'data'} to ${linkConnections.size} connections for ${shareableResponseLink}`);

    // Send event to all connections for this response link
    const deadConnections: string[] = [];
    
    linkConnections.forEach((connection, connectionId) => {
      try {
        if (connection.response.destroyed) {
          deadConnections.push(connectionId);
          return;
        }

        const eventData = this.formatSSEEvent(event);
        connection.response.write(eventData);
        
      } catch (error) {
        console.error(`[EventBus] Failed to send event to connection ${connectionId}:`, error);
        deadConnections.push(connectionId);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(connectionId => {
      this.unsubscribe(shareableResponseLink, connectionId);
    });
  }

  /**
   * Get connection count for a specific shareableResponseLink
   */
  getConnectionCount(shareableResponseLink: string): number {
    const linkConnections = this.connections.get(shareableResponseLink);
    return linkConnections ? linkConnections.size : 0;
  }

  /**
   * Get total connection count across all response links
   */
  getTotalConnections(): number {
    let total = 0;
    this.connections.forEach(linkConnections => {
      total += linkConnections.size;
    });
    return total;
  }

  /**
   * Send heartbeat to all connections to keep them alive
   */
  private sendHeartbeat(): void {
    const now = new Date();
    this.connections.forEach((linkConnections, shareableResponseLink) => {
      this.publish(shareableResponseLink, {
        event: 'heartbeat',
        data: { timestamp: now.toISOString() }
      });
    });
  }

  /**
   * Start periodic heartbeat
   */
  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      if (this.getTotalConnections() > 0) {
        this.sendHeartbeat();
      }
    }, 30000);
  }

  /**
   * Stop heartbeat (for cleanup)
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Format event data as SSE format
   */
  private formatSSEEvent(event: SSEEvent): string {
    let formatted = '';
    
    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }
    
    if (event.event) {
      formatted += `event: ${event.event}\n`;
    }
    
    // Handle data field - can be object or string
    const dataStr = typeof event.data === 'string' 
      ? event.data 
      : JSON.stringify(event.data);
    
    // Split multi-line data properly
    const dataLines = dataStr.split('\n');
    dataLines.forEach(line => {
      formatted += `data: ${line}\n`;
    });
    
    formatted += '\n'; // Empty line terminates the event
    return formatted;
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup method to close all connections
   */
  cleanup(): void {
    console.log(`[EventBus] Cleaning up ${this.getTotalConnections()} connections`);
    
    this.connections.forEach((linkConnections) => {
      linkConnections.forEach((connection) => {
        try {
          if (!connection.response.destroyed) {
            connection.response.end();
          }
        } catch (error) {
          console.error('Error closing connection:', error);
        }
      });
    });
    
    this.connections.clear();
    this.stopHeartbeat();
  }
}

// Create singleton event bus instance
export const eventBus = new EventBus();

// Cleanup on process exit
process.on('SIGTERM', () => {
  eventBus.cleanup();
});

process.on('SIGINT', () => {
  eventBus.cleanup();
});