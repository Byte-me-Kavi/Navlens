
import { RRWebEvent } from "@/components/SessionPlayer";

export function cleanRRWebEvents(events: RRWebEvent[]): RRWebEvent[] {
    if (!events || events.length === 0) return [];

    // 1. Sort by timestamp to ensure chronological order
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    const uniqueEvents: RRWebEvent[] = [];
    let hasSeenSnapshot = false;

    sorted.forEach((event) => {
        // Handle Full Snapshot (Type 2)
        if (event.type === 2) {
            // We ALWAYS strip out the `DocumentType` node from full snapshots.
            // Why?
            // 1. `rrweb` might try to insert a Doctype into an iframe that already has one (causing HierarchyRequestError).
            // 2. Subsequent/stitched snapshots definitely cause this if not stripped.
            // 3. Removing it puts the browser in a standard mode (usually) or quirks, but PREVENTS THE CRASH.
            //    Preserving the crash-free experience is more important than exact Doctype reconstruction.

            try {
                // Deep-ish clone for the data part we need to touch
                const newEvent = { ...event, data: { ...event.data } };
                const data = newEvent.data as any;

                if (data.node && Array.isArray(data.node.childNodes)) {
                    // Filter out the node with type === 1 (DocumentType)
                    // rrweb node types: 1 = DocumentType, 2 = Element, 3 = Text
                    const originalLength = data.node.childNodes.length;
                    data.node.childNodes = data.node.childNodes.filter((child: any) => child.type !== 1);

                    // If we removed something, it was likely the Doctype.
                }

                uniqueEvents.push(newEvent);
            } catch (e) {
                console.warn("Failed to patch snapshot:", e);
                uniqueEvents.push(event);
            }
            return;
        }

        // For all other events (Incremental updates, mouse moves, etc.)
        // Deduplicate EXACT adjacent events to reduce noise
        if (uniqueEvents.length > 0) {
            const last = uniqueEvents[uniqueEvents.length - 1];
            if (last.timestamp === event.timestamp && last.type === event.type) {
                if (JSON.stringify(last.data) === JSON.stringify(event.data)) {
                    return;
                }
            }
        }

        uniqueEvents.push(event);
    });

    return uniqueEvents;
}
