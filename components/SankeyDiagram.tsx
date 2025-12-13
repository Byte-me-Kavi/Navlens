"use client";

import React, { useEffect, useRef, useMemo } from "react";

interface PathNode {
  source: string;
  target: string;
  value: number;
}

interface SankeyDiagramProps {
  links: PathNode[];
  width?: number;
  height?: number;
}

export function SankeyDiagram({ 
  links, 
  width = 800, 
  height = 500 
}: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Process data for visualization
  const processedData = useMemo(() => {
    if (!links || links.length === 0) return null;

    // Build unique nodes
    const nodeSet = new Set<string>();
    links.forEach((link) => {
      nodeSet.add(link.source);
      nodeSet.add(link.target);
    });

    const nodes = Array.from(nodeSet).map((name) => ({ name }));
    const nodeIndex = new Map(nodes.map((n, i) => [n.name, i]));

    // Build links with node indices
    const sankeyLinks = links.map((link) => ({
      source: nodeIndex.get(link.source)!,
      target: nodeIndex.get(link.target)!,
      value: link.value,
    }));

    return { nodes, links: sankeyLinks };
  }, [links]);

  useEffect(() => {
    const loadD3AndRender = async () => {
      if (!svgRef.current || !processedData) return;

      try {
        const d3 = await import("d3");
        const { sankey, sankeyLinkHorizontal } = await import("d3-sankey");

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 20, right: 120, bottom: 20, left: 120 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create sankey generator - use any to avoid complex type issues
        const sankeyGenerator = sankey()
          .nodeWidth(20)
          .nodePadding(15)
          .extent([[0, 0], [innerWidth, innerHeight]]);

        // Generate layout
        const layout = sankeyGenerator({
          nodes: processedData.nodes.map((d) => ({ ...d })) as any,
          links: processedData.links.map((d) => ({ ...d })) as any,
        });

        const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // Draw links
        g.append("g")
          .attr("fill", "none")
          .selectAll("path")
          .data(layout.links)
          .join("path")
          .attr("d", sankeyLinkHorizontal() as any)
          .attr("stroke", (d: any) => colorScale((d.source as any).name))
          .attr("stroke-opacity", 0.4)
          .attr("stroke-width", (d: any) => Math.max(1, d.width || 1));

        // Draw nodes
        g.append("g")
          .selectAll("rect")
          .data(layout.nodes)
          .join("rect")
          .attr("x", (d: any) => d.x0)
          .attr("y", (d: any) => d.y0)
          .attr("height", (d: any) => Math.max(1, d.y1 - d.y0))
          .attr("width", (d: any) => d.x1 - d.x0)
          .attr("fill", (d: any) => colorScale(d.name))
          .attr("stroke", "#333")
          .attr("stroke-width", 0.5)
          .attr("rx", 3);

        // Add labels
        g.append("g")
          .style("font-size", "11px")
          .style("font-family", "Inter, sans-serif")
          .selectAll("text")
          .data(layout.nodes)
          .join("text")
          .attr("x", (d: any) => (d.x0 < innerWidth / 2 ? d.x1 + 6 : d.x0 - 6))
          .attr("y", (d: any) => (d.y1 + d.y0) / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", (d: any) => (d.x0 < innerWidth / 2 ? "start" : "end"))
          .attr("fill", "#374151")
          .text((d: any) => {
            const name = d.name;
            if (name === "/" || name === "") return "Homepage";
            if (name.length > 20) return "..." + name.slice(-17);
            return name;
          });
      } catch (error) {
        console.error("[SankeyDiagram] Failed to render:", error);
      }
    };

    loadD3AndRender();
  }, [processedData, width, height]);

  if (!links || links.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-center text-gray-500">
          <p className="font-medium">No flow data available</p>
          <p className="text-sm">User journeys will appear here once collected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-white rounded-xl"
      />
    </div>
  );
}
