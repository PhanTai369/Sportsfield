/**
 * Centralized Payment Sync Service
 * Single source of truth for all payment status synchronization logic
 * Eliminates duplicate sync implementations across the application
 */

import { paymentService } from '../../services/payment.service';

export interface PaymentSyncResult {
  success: boolean;
  booking?: any;
  message: string;
  hasChanged?: boolean;
}

export class PaymentSyncService {
  private static syncInProgress = new Map<string, Promise<PaymentSyncResult>>();
  
  /**
   * Unified payment status sync - prevents duplicate concurrent syncs
   */
  static async syncBookingPaymentStatus(bookingId: string): Promise<PaymentSyncResult> {
    if (!bookingId) {
      return {
        success: false,
        message: 'Booking ID is required'
      };
    }

    // Prevent duplicate concurrent syncs for same booking
    if (this.syncInProgress.has(bookingId)) {
      console.log(`[PaymentSyncService] Sync already in progress for booking ${bookingId}, waiting...`);
      return await this.syncInProgress.get(bookingId)!;
    }

    console.log(`[PaymentSyncService] Starting payment sync for booking: ${bookingId}`);

    // Create sync promise
    const syncPromise = this.performSync(bookingId);
    this.syncInProgress.set(bookingId, syncPromise);

    try {
      const result = await syncPromise;
      return result;
    } finally {
      // Always cleanup
      this.syncInProgress.delete(bookingId);
    }
  }

  /**
   * Internal sync implementation
   */
  private static async performSync(bookingId: string): Promise<PaymentSyncResult> {
    try {
      const result = await paymentService.syncPaymentStatus(bookingId);
      
      if (result.success) {
        console.log(`[PaymentSyncService] Sync successful for booking ${bookingId}:`, result.message);
        return {
          success: true,
          booking: result.booking,
          message: result.message,
          hasChanged: !!result.booking
        };
      } else {
        console.warn(`[PaymentSyncService] Sync failed for booking ${bookingId}:`, result.message);
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error: any) {
      console.error(`[PaymentSyncService] Sync error for booking ${bookingId}:`, error);
      return {
        success: false,
        message: error.message || 'Failed to sync payment status'
      };
    }
  }

  /**
   * Check if sync is currently in progress for a booking
   */
  static isSyncInProgress(bookingId: string): boolean {
    return this.syncInProgress.has(bookingId);
  }

  /**
   * Get all currently syncing booking IDs
   */
  static getSyncingBookings(): string[] {
    return Array.from(this.syncInProgress.keys());
  }

  /**
   * Cancel sync for a booking (if possible)
   */
  static cancelSync(bookingId: string): boolean {
    if (this.syncInProgress.has(bookingId)) {
      console.log(`[PaymentSyncService] Canceling sync for booking ${bookingId}`);
      this.syncInProgress.delete(bookingId);
      return true;
    }
    return false;
  }

  /**
   * Batch sync multiple bookings (with rate limiting)
   */
  static async batchSyncPaymentStatus(bookingIds: string[], maxConcurrent: number = 3): Promise<Map<string, PaymentSyncResult>> {
    console.log(`[PaymentSyncService] Starting batch sync for ${bookingIds.length} bookings`);
    
    const results = new Map<string, PaymentSyncResult>();
    const batches = this.chunkArray(bookingIds, maxConcurrent);

    for (const batch of batches) {
      const batchPromises = batch.map(async (bookingId) => {
        const result = await this.syncBookingPaymentStatus(bookingId);
        results.set(bookingId, result);
        return result;
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches to prevent overwhelming the API
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[PaymentSyncService] Batch sync completed for ${bookingIds.length} bookings`);
    return results;
  }

  /**
   * Utility: chunk array into smaller arrays
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
