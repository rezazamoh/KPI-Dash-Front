import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphEdge, GraphNode } from '@/utils/relationshipGraph';

interface RelationshipGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title: string;
  subtitle?: string;
  centerNodeId?: string;
}

interface GraphPoint {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  nodes,
  edges,
  title,
  subtitle,
  centerNodeId,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(centerNodeId ?? nodes[0]?.id ?? null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, GraphPoint>>({});
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const nodeDragRef = useRef<{ nodeId: string; pointerWorldX: number; pointerWorldY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (!nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(centerNodeId ?? nodes[0]?.id ?? null);
    }
  }, [centerNodeId, nodes, selectedNodeId]);

  const basePositions = useMemo(() => {
    const result: Record<string, GraphPoint> = {};

    if (!nodes.length) {
      return result;
    }

    const centerNode = centerNodeId ? nodes.find((node) => node.id === centerNodeId) : null;
    const nonCenterNodes = nodes.filter((node) => node.id !== centerNode?.id);

    if (centerNode) {
      result[centerNode.id] = { x: 0, y: 0 };
    }

    if (nonCenterNodes.length === 0) {
      return result;
    }

    const radius = Math.max(120, 70 + nonCenterNodes.length * 24);
    nonCenterNodes.forEach((node, index) => {
      const angle = (index / Math.max(1, nonCenterNodes.length)) * Math.PI * 2;
      result[node.id] = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });

    if (!centerNode && nodes.length > 1) {
      nodes.forEach((node, index) => {
        const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2;
        result[node.id] = {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        };
      });
    }

    return result;
  }, [centerNodeId, nodes]);

  useEffect(() => {
    setNodePositions(basePositions);
  }, [basePositions]);

  useEffect(() => {
    if (!nodes.length) {
      return;
    }

    setNodePositions((current) => {
      const next: Record<string, GraphPoint> = { ...current };
      nodes.forEach((node) => {
        if (!next[node.id]) {
          next[node.id] = basePositions[node.id] ?? { x: 0, y: 0 };
        }
      });
      return next;
    });
  }, [basePositions, nodes]);

  const positions = useMemo(() => {
    const result = new Map<string, GraphPoint>();
    nodes.forEach((node) => {
      const position = nodePositions[node.id] ?? basePositions[node.id] ?? { x: 0, y: 0 };
      result.set(node.id, position);
    });
    return result;
  }, [basePositions, nodePositions, nodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0] ?? null;
  const activityMax = Math.max(1, ...nodes.map((node) => node.activity));
  const weightMax = Math.max(1, ...edges.map((edge) => edge.weight));
  const activeNodeId = hoveredNodeId ?? selectedNodeId;

  const screenToWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }

    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => clamp(prev + delta, 0.7, 2.4));
  };

  const handleSvgMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    setDragging(true);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  };

  const handleSvgMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !dragRef.current) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.originX + deltaX, y: dragRef.current.originY + deltaY });
  };

  const handleSvgMouseUp = () => {
    setDragging(false);
    dragRef.current = null;
  };

  const handleNodeMouseDown = (event: React.MouseEvent<SVGGElement>, node: GraphNode) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNodeId(node.id);
    setHoveredNodeId(node.id);
    setDraggingNodeId(node.id);

    const worldPoint = screenToWorld(event.clientX, event.clientY);
    const currentPosition = positions.get(node.id) ?? basePositions[node.id] ?? { x: 0, y: 0 };

    nodeDragRef.current = {
      nodeId: node.id,
      pointerWorldX: worldPoint.x,
      pointerWorldY: worldPoint.y,
      originX: currentPosition.x,
      originY: currentPosition.y,
    };
  };

  const handleNodeMouseMove = (event: React.MouseEvent<SVGGElement>, node: GraphNode) => {
    if (!nodeDragRef.current || nodeDragRef.current.nodeId !== node.id) {
      return;
    }

    const worldPoint = screenToWorld(event.clientX, event.clientY);
    const dragState = nodeDragRef.current;

    setNodePositions((current) => ({
      ...current,
      [node.id]: {
        x: dragState.originX + (worldPoint.x - dragState.pointerWorldX),
        y: dragState.originY + (worldPoint.y - dragState.pointerWorldY),
      },
    }));
  };

  const handleNodeMouseUp = () => {
    setDraggingNodeId(null);
    nodeDragRef.current = null;
  };

  if (!nodes.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Typography color="text.secondary">No collaboration data available for this selection.</Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', boxShadow: '0 20px 45px rgba(12, 16, 32, 0.28)' }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1">{title}</Typography>
          {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
        </Box>

        <Box sx={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 2, overflow: 'hidden', bgcolor: 'linear-gradient(135deg, rgba(10,16,36,0.95), rgba(20,28,54,0.9))' }}>
          <svg
            ref={svgRef}
            width="100%"
            height="360"
            viewBox="-320 -180 640 360"
            onWheel={handleWheel}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
            style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          >
            <style>{`
              @keyframes graphPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.06); }
              }
              @keyframes graphFloat {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-3px); }
              }
            `}</style>
            <defs>
              <linearGradient id="graphBackground" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(26,34,62,0.95)" />
                <stop offset="100%" stopColor="rgba(8,12,24,0.96)" />
              </linearGradient>
              <pattern id="graphGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
              </pattern>
              <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c4dff" />
                <stop offset="100%" stopColor="#00bcd4" />
              </linearGradient>
              <linearGradient id="edgeGradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#5eead4" />
              </linearGradient>
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect x="-320" y="-180" width="640" height="360" rx="24" fill="url(#graphBackground)" />
            <rect x="-320" y="-180" width="640" height="360" rx="24" fill="url(#graphGrid)" />
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {edges.map((edge) => {
                const source = positions.get(edge.source);
                const target = positions.get(edge.target);

                if (!source || !target) {
                  return null;
                }

                const strokeWidth = 1 + (edge.totalInteractions / weightMax) * 8;
                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2;
                const isHighlighted = hoveredEdgeId === edge.id || activeNodeId === edge.source || activeNodeId === edge.target || selectedNode?.id === edge.source || selectedNode?.id === edge.target;

                return (
                  <g key={edge.id} onMouseEnter={() => setHoveredEdgeId(edge.id)} onMouseLeave={() => setHoveredEdgeId(null)}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth={strokeWidth + 5}
                      strokeLinecap="round"
                    />
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isHighlighted ? 'url(#edgeGradientActive)' : 'url(#edgeGradient)'}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={isHighlighted ? '0' : '6 6'}
                      opacity={isHighlighted ? 1 : 0.7}
                    >
                      {!isHighlighted ? <animate attributeName="stroke-dashoffset" values="0;-20" dur="2.2s" repeatCount="indefinite" /> : null}
                    </line>
                    <Tooltip
                      title={
                        <Stack spacing={0.5}>
                          <Typography variant="caption" fontWeight={600}>{edge.source} → {edge.target}</Typography>
                          <Typography variant="caption">Total interactions: {edge.totalInteractions}</Typography>
                          <Typography variant="caption">Reviews: {edge.reviewCount}</Typography>
                          <Typography variant="caption">Comments: {edge.commentCount}</Typography>
                        </Stack>
                      }
                    >
                      <circle cx={midX} cy={midY} r={5 + edge.totalInteractions / 4} fill="transparent" />
                    </Tooltip>
                  </g>
                );
              })}

              {nodes.map((node) => {
                const position = positions.get(node.id);
                if (!position) {
                  return null;
                }

                const radius = 10 + (node.activity / activityMax) * 20;
                const isSelected = node.id === selectedNode?.id;
                const isHovered = node.id === hoveredNodeId;
                const isActive = isSelected || isHovered;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onMouseDown={(event) => handleNodeMouseDown(event, node)}
                    onMouseMove={(event) => handleNodeMouseMove(event, node)}
                    onMouseUp={handleNodeMouseUp}
                    onMouseLeaveCapture={handleNodeMouseUp}
                  >
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={radius + (isSelected ? 5 : 0)}
                      fill={isSelected ? '#7c4dff' : isHovered ? '#5eead4' : '#00bcd4'}
                      stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.75)'}
                      strokeWidth={isSelected ? 2.4 : 1.25}
                      filter="url(#nodeGlow)"
                      style={{ cursor: draggingNodeId === node.id ? 'grabbing' : 'pointer', animation: isActive ? 'graphPulse 1.9s ease-in-out infinite' : 'graphFloat 2.4s ease-in-out infinite' }}
                    />
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={Math.max(5, radius - 4)}
                      fill="rgba(255,255,255,0.15)"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth={1}
                    />
                    <text
                      x={position.x}
                      y={position.y + radius + 16}
                      textAnchor="middle"
                      fill="#f5f7ff"
                      fontSize="11"
                      fontWeight={isSelected ? 700 : 500}
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="subtitle2" gutterBottom>
              {selectedNode ? `Selected: ${selectedNode.label}` : 'No selection'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total activity: {selectedNode?.activity ?? 0}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Drag nodes to reshape the layout, or drag the canvas to pan. Scroll to zoom.
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="subtitle2" gutterBottom>Interaction summary</Typography>
            <Typography variant="body2" color="text.secondary">
              Nodes: {nodes.length} · Edges: {edges.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Zoom: {zoom.toFixed(2)}x · Pan: {pan.x.toFixed(0)}, {pan.y.toFixed(0)}
            </Typography>
          </Paper>
        </Box>
      </Stack>
    </Paper>
  );
};

export default RelationshipGraph;
