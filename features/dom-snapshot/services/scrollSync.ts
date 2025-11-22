/**
 * Scroll Sync Service
 * 
 * Synchronizes scroll position between iframe and overlay layers
 */

export class ScrollSync {
  private iframe: HTMLIFrameElement | null = null;
  private overlays: HTMLElement[] = [];
  private scrollHandler: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private animationFrameId: number | null = null;

  /**
   * Initialize scroll synchronization
   */
  initialize(iframe: HTMLIFrameElement, overlays: HTMLElement[]): void {
    this.iframe = iframe;
    this.overlays = overlays;

    this.scrollHandler = () => {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = requestAnimationFrame(() => this.syncScroll());
    };

    this.resizeHandler = () => this.syncScroll();

    // Listen to iframe scroll
    iframe.contentWindow?.addEventListener('scroll', this.scrollHandler, { passive: true });
    iframe.contentDocument?.addEventListener('scroll', this.scrollHandler, { passive: true });
    
    // Listen to resize for dynamic content changes
    iframe.contentWindow?.addEventListener('resize', this.resizeHandler);

    // Initial sync
    this.syncScroll();

    console.log('✓ Scroll sync initialized with', overlays.length, 'overlays');
  }

  /**
   * Sync scroll position across all layers
   */
  private syncScroll(): void {
    if (!this.iframe || !this.iframe.contentDocument) return;

    const doc = this.iframe.contentDocument;
    const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop || 0;
    const scrollLeft = doc.documentElement.scrollLeft || doc.body.scrollLeft || 0;

    // Use translate3d for hardware acceleration
    const transformValue = `translate3d(${-scrollLeft}px, ${-scrollTop}px, 0)`;

    // Apply transform to all overlay layers with will-change hint
    this.overlays.forEach((overlay) => {
      if (overlay) {
        overlay.style.transform = transformValue;
        overlay.style.willChange = 'transform';
      }
    });
  }

  /**
   * Cleanup scroll listeners
   */
  cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.iframe) {
      if (this.scrollHandler) {
        this.iframe.contentWindow?.removeEventListener('scroll', this.scrollHandler);
        this.iframe.contentDocument?.removeEventListener('scroll', this.scrollHandler);
      }
      if (this.resizeHandler) {
        this.iframe.contentWindow?.removeEventListener('resize', this.resizeHandler);
      }
    }

    this.iframe = null;
    this.overlays = [];
    this.scrollHandler = null;
    this.resizeHandler = null;

    console.log('✓ Scroll sync cleaned up');
  }
}
