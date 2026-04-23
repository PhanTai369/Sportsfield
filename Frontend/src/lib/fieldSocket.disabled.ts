import { io, Socket } from "socket.io-client";

interface TimeSlotUpdate {
  id: string;
  subFieldId: string;
  subFieldName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "available" | "booked" | "maintenance";
  maintenanceReason?: string;
  maintenanceUntil?: string;
}

interface MaintenanceUpdateData {
  type: "maintenance-added" | "maintenance-removed";
  fieldId: string;
  affectedSlots: TimeSlotUpdate[];
  timestamp: string;
}

interface SocketError {
  type: string;
  message: string;
}

class FieldSocketManager {
  private socket: Socket | null = null;
  private currentFieldId: string | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private isDestroyed: boolean = false;

  constructor() {
    // COMPLETELY DISABLE socket to stop error spam
    console.log("🚫 FieldSocketManager initialized in DISABLED mode - no socket connection will be made");
    this.isDestroyed = true; // Mark as destroyed to prevent any initialization
  }

  private initializeSocket() {
    // COMPLETELY DISABLED
    console.log("🚫 Socket initialization DISABLED");
  }

  public joinField(fieldId: string) {
    // COMPLETELY DISABLED
    console.log(`🚫 Socket DISABLED - would join field: ${fieldId}`);
  }

  public leaveField(fieldId?: string) {
    // COMPLETELY DISABLED
    console.log(`🚫 Socket DISABLED - would leave field: ${fieldId || this.currentFieldId}`);
  }

  public requestMaintenanceToggle(
    slotId: string,
    fieldId: string,
    reason?: string,
    estimatedCompletion?: string
  ) {
    // COMPLETELY DISABLED
    console.log("🚫 Socket DISABLED - would send maintenance toggle request");
  }

  private handleMaintenanceUpdate(data: MaintenanceUpdateData) {
    // COMPLETELY DISABLED
    console.log("🚫 Socket DISABLED - would handle maintenance update");
  }

  public on(event: string, callback: Function) {
    // COMPLETELY DISABLED - but still allow registration for compatibility
    console.log(`🚫 Socket DISABLED - registered listener for ${event}`);
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: Function) {
    // COMPLETELY DISABLED - but still allow cleanup for compatibility
    console.log(`🚫 Socket DISABLED - removed listener for ${event}`);
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.set(event, []);
    }
  }

  private emit(event: string, data: any) {
    // COMPLETELY DISABLED
    console.log(`🚫 Socket DISABLED - would emit ${event}`);
  }

  public enableSocket() {
    console.log("🚫 Socket permanently DISABLED - cannot enable");
  }

  public disableSocket() {
    console.log("🚫 Socket already DISABLED");
  }

  public reset() {
    console.log("🚫 Socket DISABLED - cannot reset");
  }

  public disconnect() {
    console.log("🚫 Socket DISABLED - already disconnected");
    this.listeners.clear();
  }

  public isConnected(): boolean {
    return false; // Always false since socket is disabled
  }
}

// Create a singleton instance
export const fieldSocketManager = new FieldSocketManager();

// Export types for use in components
export type { TimeSlotUpdate, MaintenanceUpdateData, SocketError };
