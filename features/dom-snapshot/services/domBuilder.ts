/**
 * DOM Builder Service
 * 
 * Handles DOM reconstruction from rrweb snapshots
 */

import * as rrwebSnapshot from 'rrweb-snapshot';

export interface DomBuilderOptions {
  snapshot: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  styles: Array<{ type: string; content?: string; href?: string }>;
  origin: string;
}

export class DomBuilder {
  /**
   * Build DOM from snapshot data
   */
  static buildDOM(iframe: HTMLIFrameElement, options: DomBuilderOptions): void {
    const doc = iframe.contentDocument;
    if (!doc) {
      console.warn('⚠️ Iframe document not available yet');
      return;
    }

    console.log('✓ Iframe document available, building DOM...');

    try {
      doc.open();
      doc.write('<!DOCTYPE html>');
      doc.close();

      const mirror = new rrwebSnapshot.Mirror();
      const cache = {
        stylesWithHoverClass: new Map(),
        cssRulesWithHoverClass: new Set(),
      };

      const rebuiltNode = rrwebSnapshot.rebuild(options.snapshot, {
        doc,
        mirror,
        cache,
      });

      if (rebuiltNode) {
        // Check if rebuiltNode is a Document node
        if (rebuiltNode.nodeType === Node.DOCUMENT_NODE) {
          // If it's a document node, we need to extract its documentElement
          const docNode = rebuiltNode as Document;
          if (docNode.documentElement) {
            const clonedHtml = docNode.documentElement.cloneNode(true);
            doc.replaceChild(clonedHtml, doc.documentElement);
          }
        } else {
          // It's an element node
          const tagName = (rebuiltNode as Element).tagName?.toLowerCase();
          if (tagName === 'html') {
            const clonedHtml = (rebuiltNode as Element).cloneNode(true);
            doc.replaceChild(clonedHtml, doc.documentElement);
          } else {
            const clonedNode = (rebuiltNode as Element).cloneNode(true);
            if (doc.body) {
              doc.body.appendChild(clonedNode);
            } else {
              doc.documentElement.appendChild(clonedNode);
            }
          }
        }
      }

      // Cleanup Scripts
      const scripts = doc.querySelectorAll('script');
      scripts.forEach((s) => s.remove());
      const noscripts = doc.querySelectorAll('noscript');
      noscripts.forEach((n) => n.remove());
      const preloads = doc.querySelectorAll(
        'link[rel="preload"], link[rel="modulepreload"]'
      );
      preloads.forEach((l) => l.remove());

      // Inject Base HREF
      let head = doc.head;
      if (!head) {
        head = doc.createElement('head');
        doc.documentElement.insertBefore(head, doc.body);
      }
      const base = doc.createElement('base');
      base.href = options.origin || window.location.origin;
      head.insertBefore(base, head.firstChild);

      // Inject Custom Styles
      if (options.styles && Array.isArray(options.styles)) {
        options.styles.forEach((styleObj: { type: string; content?: string; href?: string }) => {
          if (styleObj.type === 'inline' && styleObj.content) {
            const s = doc.createElement('style');
            s.textContent = styleObj.content;
            head!.appendChild(s);
          } else if (styleObj.type === 'link' && styleObj.href) {
            const l = doc.createElement('link');
            l.rel = 'stylesheet';
            l.href = styleObj.href;
            head!.appendChild(l);
          }
        });
      }

      // UI Cleanup Styles
      const style = doc.createElement('style');
      style.textContent = `
        html, body { min-height: 100%; margin: 0; height: auto; overflow: auto; }
        a, button, input, select { pointer-events: none !important; cursor: default !important; }
        [data-aos] { opacity: 1 !important; transform: none !important; animation: none !important; }
        .aos-animate { opacity: 1 !important; transform: none !important; }
        .wow { opacity: 1 !important; animation: none !important; }
        img:not([src]) { visibility: hidden !important; }
      `;
      head.appendChild(style);

      // Force-remove hiding attributes
      doc.querySelectorAll('[style]').forEach((el) => {
        const styleAttr = el.getAttribute('style') || '';
        if (
          styleAttr.includes('display') ||
          styleAttr.includes('visibility') ||
          styleAttr.includes('opacity')
        ) {
          const cleaned = styleAttr
            .replace(/display\s*:\s*none/gi, 'display: block')
            .replace(/visibility\s*:\s*hidden/gi, 'visibility: visible')
            .replace(/opacity\s*:\s*0/gi, 'opacity: 1');
          el.setAttribute('style', cleaned);
        }
      });

      console.log('✓ DOM reconstructed successfully');
    } catch (error) {
      console.error('❌ Error rebuilding DOM:', error);
      throw error;
    }
  }

  /**
   * Get content dimensions from iframe document
   */
  static getContentDimensions(iframe: HTMLIFrameElement): { width: number; height: number } {
    const doc = iframe.contentDocument;
    if (!doc || !doc.documentElement) {
      console.warn('⚠️ Cannot get content dimensions - document not available');
      return { width: 0, height: 0 };
    }

    const height = Math.max(
      doc.body?.scrollHeight || 0,
      doc.documentElement.scrollHeight,
      doc.getElementById('__next')?.scrollHeight || 0,
      doc.getElementById('root')?.scrollHeight || 0
    );

    const width = doc.documentElement.scrollWidth;

    return { width, height };
  }
}
