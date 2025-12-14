/**
 * Request Queue
 * 
 * Client-side queue to limit concurrent API requests.
 * Prevents browser from making too many parallel requests.
 * 
 * @example
 * const data = await requestQueue.add(() => apiClient.post('/endpoint', params));
 */

type QueueItem<T> = {
    fn: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
};

class RequestQueue {
    private queue: QueueItem<unknown>[] = [];
    private activeCount = 0;
    private maxConcurrency: number;

    constructor(maxConcurrency = 3) {
        this.maxConcurrency = maxConcurrency;
    }

    /**
     * Add a request to the queue
     */
    add<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({
                fn,
                resolve: resolve as (value: unknown) => void,
                reject,
            });
            this.processQueue();
        });
    }

    /**
     * Process queued requests
     */
    private async processQueue(): Promise<void> {
        if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
            return;
        }

        const item = this.queue.shift();
        if (!item) return;

        this.activeCount++;

        try {
            const result = await item.fn();
            item.resolve(result);
        } catch (error) {
            item.reject(error as Error);
        } finally {
            this.activeCount--;
            this.processQueue();
        }
    }

    /**
     * Get queue stats
     */
    getStats() {
        return {
            queued: this.queue.length,
            active: this.activeCount,
            maxConcurrency: this.maxConcurrency,
        };
    }

    /**
     * Clear the queue (cancel pending requests)
     */
    clear() {
        const canceled = this.queue.length;
        this.queue.forEach(item => {
            item.reject(new Error('Request canceled'));
        });
        this.queue = [];
        return canceled;
    }
}

// Export singleton instance
export const requestQueue = new RequestQueue(3);

// Export class for custom instances
export { RequestQueue };
