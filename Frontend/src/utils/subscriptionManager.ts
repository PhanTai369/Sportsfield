// Global subscription manager to prevent duplicate subscriptions
class SubscriptionManager {
  private activeSubscriptions = new Set<string>();
  private subscriptionCallbacks = new Map<string, Array<(data: any) => void>>();
  private socket: any = null;

  setSocket(socket: any) {
    this.socket = socket;
  }

  subscribe(bookingId: string, callback?: (data: any) => void) {
    const key = `booking_${bookingId}`;
    
    // If already subscribed, just add callback
    if (this.activeSubscriptions.has(key)) {
      console.log(`[SubscriptionManager] Already subscribed to ${bookingId}, adding callback`);
      if (callback) {
        const callbacks = this.subscriptionCallbacks.get(key) || [];
        callbacks.push(callback);
        this.subscriptionCallbacks.set(key, callbacks);
      }
      return false; // Already subscribed
    }

    console.log(`[SubscriptionManager] New subscription to ${bookingId}`);
    this.activeSubscriptions.add(key);
    
    if (callback) {
      this.subscriptionCallbacks.set(key, [callback]);
    }

    // Actually subscribe to socket
    if (this.socket) {
      this.socket.emit('subscribe_booking', { bookingId });
    }

    return true; // New subscription
  }

  unsubscribe(bookingId: string, callback?: (data: any) => void) {
    const key = `booking_${bookingId}`;
    
    if (!this.activeSubscriptions.has(key)) {
      console.log(`[SubscriptionManager] Not subscribed to ${bookingId}, ignoring unsubscribe`);
      return false;
    }

    // Remove specific callback if provided
    if (callback) {
      const callbacks = this.subscriptionCallbacks.get(key) || [];
      const filteredCallbacks = callbacks.filter(cb => cb !== callback);
      
      if (filteredCallbacks.length > 0) {
        this.subscriptionCallbacks.set(key, filteredCallbacks);
        console.log(`[SubscriptionManager] Removed callback for ${bookingId}, ${filteredCallbacks.length} callbacks remaining`);
        return false; // Still has other callbacks
      }
    }

    // No more callbacks, actually unsubscribe
    console.log(`[SubscriptionManager] Unsubscribing from ${bookingId}`);
    this.activeSubscriptions.delete(key);
    this.subscriptionCallbacks.delete(key);

    // Actually unsubscribe from socket
    if (this.socket) {
      this.socket.emit('unsubscribe_booking', { bookingId });
    }

    return true; // Actually unsubscribed
  }

  isSubscribed(bookingId: string): boolean {
    return this.activeSubscriptions.has(`booking_${bookingId}`);
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions);
  }

  clear() {
    this.activeSubscriptions.clear();
    this.subscriptionCallbacks.clear();
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();
