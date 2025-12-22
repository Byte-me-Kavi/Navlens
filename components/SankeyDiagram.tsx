"use client";

import React, { useMemo } from "react";
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from "recharts";

interface PathNode {
  source: string;
  target: string;
  value: number;
}

interface SankeyDiagramProps {
  links: PathNode[];
  width?: number;
  height?: number;
  getColor?: (name: string) => string;
}

const CustomNode = ({ x, y, width, height, index, payload, containerWidth, getColor }: any) => {
  if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) return null;

  const isOut = x + width + 6 > (containerWidth || 800);
  
  // Clean name for display and color lookup
  const rawName = payload.name;
  const name = rawName.includes('__') ? rawName.split('__')[1] : rawName;
  const displayName = name === '/' ? 'Homepage' : name;
  
  // Use provided getColor or fallback
  const color = getColor ? getColor(name) : '#3b82f6';

  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity="1"
        radius={[4, 4, 4, 4]}
      />
      <text
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isOut ? "end" : "start"}
        fontSize={12}
        fontWeight={500}
        fill="#374151"
        dy={4}
      >
        {displayName}
      </text>
      <text
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isOut ? "end" : "start"}
        fontSize={10}
        fill="#9CA3AF"
        dy={16}
      >
        {payload.value.toLocaleString()} sessions
      </text>
    </Layer>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  
  // Link tooltip
  if (data.payload.source && data.payload.target) {
    const sourceName = data.payload.source.name.includes('__') ? data.payload.source.name.split('__')[1] : data.payload.source.name;
    const targetName = data.payload.target.name.includes('__') ? data.payload.target.name.split('__')[1] : data.payload.target.name;
    
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl">
        <div className="text-sm text-gray-500 mb-1">Transition</div>
        <div className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-indigo-600">{sourceName === '/' ? 'Homepage' : sourceName}</span>
          <span>→</span>
          <span className="text-emerald-600">{targetName === '/' ? 'Homepage' : targetName}</span>
        </div>
        <div className="mt-2 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block">
          {data.value.toLocaleString()} users
        </div>
      </div>
    );
  }

  // Node tooltip
  const rawName = data.payload.name;
  const name = rawName.includes('__') ? rawName.split('__')[1] : rawName;
  
  return (
    <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl">
      <div className="font-semibold text-gray-900 mb-1">
        {name === '/' ? 'Homepage' : name}
      </div>
      <div className="text-sm text-gray-600">
        Total Volume: <span className="font-bold text-gray-900">{data.value.toLocaleString()}</span>
      </div>
    </div>
  );
};

export function SankeyDiagram({ 
  links, 
  width = 800, 
  height = 500,
  getColor
}: SankeyDiagramProps): React.ReactNode {
  
  const data = useMemo(() => {
    if (!links || links.length === 0) return { nodes: [], links: [] };

    const nodes = Array.from(
      new Set(links.flatMap((l) => [l.source, l.target]))
    ).map((name) => ({ name }));

    const nodeIndices = new Map(nodes.map((n, i) => [n.name, i]));

    const chartLinks = links.map((link) => ({
      source: nodeIndices.get(link.source) ?? 0,
      target: nodeIndices.get(link.target) ?? 0,
      value: link.value,
    }));

    return { nodes, links: chartLinks };
  }, [links]);

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
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          node={<CustomNode containerWidth={width} getColor={getColor} />}
          nodePadding={50}
          margin={{
            left: 20,
            right: 120, // Space for labels
            top: 20,
            bottom: 20,
          }}
          link={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
