'use client';

import { Graph, NodeData } from '@antv/g6';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { contributorsStore, type Contributor } from '../store/contributorsStore';

type NodeItem = any;

const getNodeSize = (value: number, minValue: number, maxValue: number): number => {
  const range = maxValue - minValue;
  const normalized = (value - minValue) / range;
  return 30 + normalized * 50;
};

export default function ContributorsGraph() {
  const { contributors = [], loading } = useSnapshot(contributorsStore);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current || loading || contributors.length === 0) return;
    const graphNodes = contributors as Contributor[];

    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const width = containerRef.current.clientWidth;
    const height = Math.max(containerRef.current.clientHeight, 800);

    const minValue: number = Math.min(...graphNodes.map(c => c.pull_requests));
    const maxValue: number = Math.max(...graphNodes.map(c => c.pull_requests));

    const graph = new Graph({
      container: containerRef.current,
      width,
      height,
      data: {
        nodes: graphNodes.map(item => ({
          ...item,
          id: item.login + item.id,
        })) as unknown as NodeData[],
      },
      layout: {
        type: 'd3-force',
        collide: {
          radius: d => getNodeSize(d.pull_requests, minValue, maxValue) / 2 + 20,
          strength: 0.8,
        },
        manyBody: {
          strength: 1,
        },
      },
      node: {
        type: 'circle',
        style: {
          size: (d: NodeItem) => getNodeSize(d.pull_requests, minValue, maxValue),
          stroke: '#fff',
          iconSrc: (d: NodeItem) => d.avatar_url,
          iconWidth: (d: NodeItem) => getNodeSize(d.pull_requests, minValue, maxValue),
          iconHeight: (d: NodeItem) => getNodeSize(d.pull_requests, minValue, maxValue),
          iconRadius: (d: NodeItem) => getNodeSize(d.pull_requests, minValue, maxValue) / 2,
          radius: (d: NodeItem) => getNodeSize(d.pull_requests, minValue, maxValue) / 2,
          labelText: (d: NodeItem) => d.login,
          fill: '#02C9C9',
          shadowBlur: 10,
          shadowColor: '#02C9C9',
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          lineWidth: 1,
        },
      },
      behaviors: ['drag-canvas', 'hover-activate'],
    });

    graph.render();
    graphRef.current = graph;

    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, [contributors, loading]);

  if (!contributors || contributors.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        className="flex justify-between NodeItems-center mb-4"
        style={{
          borderBottom: '1px solid #eee',
          paddingBottom: '8px',
        }}
      >
        <h3 className="text-lg font-medium">贡献者图可视化</h3>
      </div>
      <div ref={containerRef} className="graph-container" />
    </div>
  );
}
