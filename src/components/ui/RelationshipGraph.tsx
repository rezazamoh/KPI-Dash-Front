import {
  Box,
  Checkbox,
  Divider,
  List,
  Link,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CenterFocusStrong,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphEdge, GraphNode } from '@/utils/relationshipGraph';

type GraphInteractionMode = 'reviews' | 'comments' | 'combined';
type GraphLayoutMode = 'circle' | 'previous';

interface RelationshipGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  title: string;
  subtitle?: string;
  directionNote?: string;
  centerNodeId?: string;
  nodeLinkHref?: (node: GraphNode) => string;
  interactionMode?: GraphInteractionMode;
}

interface GraphPoint {
  x: number;
  y: number;
}

const clamp = (
  value: number,
  min: number,
  max: number,
) => Math.min(max, Math.max(min, value));

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 360;
const GRAPH_VIEW_MARGIN = 80;

const getGraphBounds = (
  nodes: GraphNode[],
  positions: Record<string, GraphPoint>,
) => {
  const xs = nodes.map(
    (node) => positions[node.id]?.x ?? 0,
  );

  const ys = nodes.map(
    (node) => positions[node.id]?.y ?? 0,
  );

  if (!xs.length || !ys.length) {
    return {
      minX: -80,
      maxX: 80,
      minY: -80,
      maxY: 80,
    };
  }

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

const buildForceLayout = (
  visibleNodes: GraphNode[],
  visibleEdges: GraphEdge[],
  centeredId?: string,
  layoutMode: GraphLayoutMode = 'circle',
): Record<string, GraphPoint> => {
  const positions: Record<string, GraphPoint> = {};

  const focusId =
    centeredId ??
    visibleNodes[0]?.id ??
    null;

  if (!visibleNodes.length) {
    return positions;
  }

  const nonFocusNodes =
    visibleNodes.filter(
      (node) => node.id !== focusId,
    );

  if (focusId) {
    positions[focusId] = {
      x: 0,
      y: 0,
    };
  }

  if (nonFocusNodes.length === 0) {
    return positions;
  }

  if (nonFocusNodes.length === 1) {
    positions[nonFocusNodes[0].id] = {
      x: 180,
      y: 0,
    };

    return positions;
  }

  if (nonFocusNodes.length === 2) {
    positions[nonFocusNodes[0].id] = {
      x: -160,
      y: 0,
    };

    positions[nonFocusNodes[1].id] = {
      x: 160,
      y: 0,
    };

    return positions;
  }

  const minimumNodeSpacing = 86;
  const minimumRingRadius = 120;
  const desiredRing = Math.max(
    minimumRingRadius,
    (nonFocusNodes.length * minimumNodeSpacing) /
      (Math.PI * 2),
  );

  nonFocusNodes.forEach(
    (node, index) => {
      const angle =
        layoutMode === 'circle'
          ? (index / nonFocusNodes.length) *
              Math.PI *
              2 -
            Math.PI / 2
          : (index / nonFocusNodes.length) *
              Math.PI *
              2 +
            (index % 2 === 0 ? 0.25 : -0.25);

      const radius =
        layoutMode === 'circle'
          ? desiredRing
          : Math.min(220, 90 + nonFocusNodes.length * 16) +
            (index % 4) * 18 +
            (node.activity
              ? Math.min(node.activity, 20) * 0.5
              : 0);

      positions[node.id] = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    },
  );

  return positions;
};

const getEdgeMetricValue = (
  edge: GraphEdge,
  mode: GraphInteractionMode,
  sourceToTarget: boolean,
) => {
  const reviewCount = sourceToTarget
    ? edge.sourceReviewCount
    : edge.targetReviewCount;

  const commentCount = sourceToTarget
    ? edge.sourceCommentCount
    : edge.targetCommentCount;

  const total = sourceToTarget
    ? edge.sourceInteractions
    : edge.targetInteractions;

  if (mode === 'reviews') {
    return reviewCount;
  }

  if (mode === 'comments') {
    return commentCount;
  }

  return total;
};

const getEdgeWeight = (
  edge: GraphEdge,
  mode: GraphInteractionMode,
) => {
  if (mode === 'reviews') {
    return edge.reviewCount;
  }

  if (mode === 'comments') {
    return edge.commentCount;
  }

  return edge.totalInteractions;
};

const formatInteractionBreakdown = (
  edge: GraphEdge,
  sourceToTarget: boolean,
  mode: GraphInteractionMode,
) => {
  const reviewCount = sourceToTarget
    ? edge.sourceReviewCount
    : edge.targetReviewCount;

  const commentCount = sourceToTarget
    ? edge.sourceCommentCount
    : edge.targetCommentCount;

  const total = sourceToTarget
    ? edge.sourceInteractions
    : edge.targetInteractions;

  const selectedValue =
    mode === 'reviews'
      ? reviewCount
      : mode === 'comments'
        ? commentCount
        : total;

  return {
    reviewCount,
    commentCount,
    total,
    selectedValue,
  };
};

const getNodeActivity = (
  nodeId: string,
  edges: GraphEdge[],
  mode: GraphInteractionMode,
) => {
  return edges.reduce((total, edge) => {
    if (edge.source === nodeId) {
      return total + getEdgeMetricValue(edge, mode, true);
    }

    if (edge.target === nodeId) {
      return total + getEdgeMetricValue(edge, mode, false);
    }

    return total;
  }, 0);
};

const getActivityLabel = (mode: GraphInteractionMode) => {
  switch (mode) {
    case 'reviews':
      return 'Reviews sent';
    case 'comments':
      return 'Comments sent';
    default:
      return 'Reviews + comments sent';
  }
};

const RelationshipGraph: React.FC<
  RelationshipGraphProps
> = ({
  nodes,
  edges,
  title,
  subtitle,
  directionNote,
  centerNodeId,
  nodeLinkHref,
  interactionMode = 'combined',
}) => {
  const [activeInteractionMode, setActiveInteractionMode] =
    useState<GraphInteractionMode>(interactionMode);

  const [layoutMode, setLayoutMode] =
    useState<GraphLayoutMode>('circle');

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] = useState<string | null>(
    centerNodeId ??
      nodes[0]?.id ??
      null,
  );

  const [
    hoveredNodeId,
    setHoveredNodeId,
  ] = useState<string | null>(null);

  const [
    hoveredEdgeId,
    setHoveredEdgeId,
  ] = useState<string | null>(null);

  const [
    selectedEdgeId,
    setSelectedEdgeId,
  ] = useState<string | null>(null);

  const [zoom, setZoom] =
    useState(1);

  const [pan, setPan] = useState({
    x: 0,
    y: 0,
  });

  const [dragging, setDragging] =
    useState(false);

  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(
    () => new Set(nodes.map((node) => node.id)),
  );

  const svgRef =
    useRef<SVGSVGElement | null>(
      null,
    );

  const dragRef =
    useRef<{
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    } | null>(null);

  const toggleNodeVisibility = (
    nodeId: string,
  ) => {
    setVisibleNodeIds((previous) => {
      const next = new Set(previous);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      if (!next.size) {
        nodes.forEach((node) => next.add(node.id));
      }

      return next;
    });
  };

  useEffect(() => {
    setActiveInteractionMode(interactionMode);
  }, [interactionMode]);

  useEffect(() => {
    if (!nodes.length) {
      setVisibleNodeIds(new Set());
      setSelectedNodeId(null);
      return;
    }

    setVisibleNodeIds(new Set(nodes.map((node) => node.id)));

    if (
      selectedNodeId &&
      !nodes.some(
        (node) =>
          node.id === selectedNodeId,
      )
    ) {
      setSelectedNodeId(
        centerNodeId ??
          nodes[0]?.id ??
          null,
      );
    }
  }, [
    centerNodeId,
    nodes,
  ]);

  useEffect(() => {
    if (
      selectedNodeId &&
      !visibleNodeIds.has(selectedNodeId)
    ) {
      const firstVisible = nodes.find(
        (node) => visibleNodeIds.has(node.id),
      )?.id;
      setSelectedNodeId(firstVisible ?? null);
    }
  }, [selectedNodeId, visibleNodeIds, nodes]);

  const filteredNodes = useMemo(
    () =>
      nodes.filter((node) =>
        visibleNodeIds.has(node.id),
      ),
    [nodes, visibleNodeIds],
  );

  const filteredEdges = useMemo(
    () =>
      edges
        .filter(
          (edge) =>
            visibleNodeIds.has(edge.source) &&
            visibleNodeIds.has(edge.target),
        )
        .filter(
          (edge) => getEdgeWeight(edge, activeInteractionMode) > 0,
        ),
    [edges, activeInteractionMode, visibleNodeIds],
  );

  const visibleGraph = useMemo(() => {
    if (!filteredNodes.length) {
      return {
        nodes: [] as GraphNode[],
        edges: [] as GraphEdge[],
      };
    }

    const rankedNodes = [...filteredNodes].sort(
      (a, b) =>
        b.activity - a.activity,
    );

    const focusId =
      centerNodeId ??
      rankedNodes[0]?.id ??
      null;

    const edgePool = [...filteredEdges].sort(
      (left, right) =>
        right.weight - left.weight,
    );

    const topEdges =
      edgePool.slice(
        0,
        Math.min(24, edgePool.length),
      );

    const nodeSet =
      new Set<string>();

    topEdges.forEach((edge) => {
      nodeSet.add(edge.source);
      nodeSet.add(edge.target);
    });

    if (focusId) {
      nodeSet.add(focusId);
    }

    if (nodeSet.size === 0) {
      rankedNodes.forEach((node) =>
        nodeSet.add(node.id),
      );
    }

    const isSmallNetwork =
      rankedNodes.length <= 12;

    const visibleNodes =
      rankedNodes.filter((node) => {
        const isStronglyConnected =
          nodeSet.has(node.id);

        const isCenter =
          node.id === focusId;

        return (
          isStronglyConnected ||
          isCenter ||
          isSmallNetwork
        );
      });

    const finalEdges =
      topEdges.length
        ? topEdges
        : edgePool.slice(
            0,
            Math.min(12, edgePool.length),
          );

    return {
      nodes: visibleNodes.length
        ? visibleNodes
        : rankedNodes,
      edges: finalEdges,
    };
  }, [
    centerNodeId,
    filteredEdges,
    filteredNodes,
  ]);

  const positions = useMemo(() => {
    const studyNodes =
      visibleGraph.nodes.length
        ? visibleGraph.nodes
        : filteredNodes;

    const studyEdges =
      visibleGraph.edges.length
        ? visibleGraph.edges
        : filteredEdges;

    if (!studyNodes.length) {
      return {} as Record<
        string,
        GraphPoint
      >;
    }

    return buildForceLayout(
      studyNodes,
      studyEdges,
      centerNodeId ??
        studyNodes[0]?.id,
      layoutMode,
    );
  }, [
    centerNodeId,
    filteredEdges,
    layoutMode,
    nodes,
    visibleGraph,
  ]);

  const selectedNode =
    visibleGraph.nodes.find(
      (node) =>
        node.id === selectedNodeId,
    ) ??
    nodes[0] ??
    null;

  const activeNodeId =
    hoveredNodeId ??
    selectedNodeId;

  const edgeMaxWeight =
    Math.max(
      1,
      ...visibleGraph.edges.map(
        (edge) => getEdgeWeight(edge, activeInteractionMode),
      ),
    );

  const nodeMaxActivity =
    Math.max(
      1,
      ...visibleGraph.nodes.map(
        (node) => node.activity,
      ),
    );

  const nodeActivityByMode = useMemo(() => {
    const activityMap = new Map<string, number>();

    nodes.forEach((node) => {
      activityMap.set(node.id, getNodeActivity(node.id, edges, activeInteractionMode));
    });

    return activityMap;
  }, [activeInteractionMode, edges, nodes]);

  useEffect(() => {
    if (
      !visibleGraph.nodes.length
    ) {
      return;
    }

    const bounds =
      getGraphBounds(
        visibleGraph.nodes,
        positions,
      );

    const contentWidth =
      Math.max(
        bounds.maxX -
          bounds.minX,
        1,
      );

    const contentHeight =
      Math.max(
        bounds.maxY -
          bounds.minY,
        1,
      );

    const fitZoom = clamp(
      Math.min(
        (VIEWBOX_WIDTH - GRAPH_VIEW_MARGIN) /
          contentWidth,
        (VIEWBOX_HEIGHT - GRAPH_VIEW_MARGIN) /
          contentHeight,
      ),
      0.7,
      1.5,
    );

    const centerX =
      (bounds.minX +
        bounds.maxX) /
      2;

    const centerY =
      (bounds.minY +
        bounds.maxY) /
      2;

    setZoom(fitZoom);

    setPan({
      x: -centerX * fitZoom,
      y: -centerY * fitZoom,
    });
  }, [
    positions,
    visibleGraph.nodes,
  ]);

  const handleWheel = (
    event: React.WheelEvent<SVGSVGElement>,
  ) => {
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey
    ) {
      return;
    }

    event.preventDefault();

    const delta =
      event.deltaY < 0
        ? 0.1
        : -0.1;

    setZoom((previous) =>
      clamp(
        previous + delta,
        0.7,
        2.2,
      ),
    );
  };

  const handleSvgMouseDown = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    const target = event.target as Element;

    if (!target.closest('[data-graph-surface]')) {
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

  const handleSvgMouseMove = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (
      !dragging ||
      !dragRef.current
    ) {
      return;
    }

    const deltaX =
      event.clientX -
      dragRef.current.startX;

    const deltaY =
      event.clientY -
      dragRef.current.startY;

    setPan({
      x:
        dragRef.current
          .originX +
        deltaX,

      y:
        dragRef.current
          .originY +
        deltaY,
    });
  };

  const handleSvgMouseUp = () => {
    setDragging(false);
    dragRef.current = null;
  };

  const handleSvgClick = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    // Click on empty background clears edge selection
    if (event.target === event.currentTarget) {
      setSelectedEdgeId(null);
    }
  };

  useEffect(() => {
    // If user hovers another edge, clear persistent selection
    if (
      hoveredEdgeId &&
      selectedEdgeId &&
      hoveredEdgeId !== selectedEdgeId
    ) {
      setSelectedEdgeId(null);
    }
  }, [hoveredEdgeId, selectedEdgeId]);

  if (!nodes.length) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor:
            'rgba(255,255,255,0.02)',
        }}
      >
        <Typography color="text.secondary">
          No collaboration data
          available for this
          selection.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor:
          'rgba(255,255,255,0.02)',
        boxShadow:
          '0 20px 45px rgba(12, 16, 32, 0.28)',
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="subtitle1">
              {title}
            </Typography>

            {subtitle ? (
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {subtitle}
              </Typography>
            ) : null}

            {directionNote ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {directionNote}
              </Typography>
            ) : null}
          </Box>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={activeInteractionMode}
            onChange={(_, next) => {
              if (next) {
                setActiveInteractionMode(next as GraphInteractionMode);
              }
            }}
            color="primary"
          >
            <ToggleButton value="combined">All sent</ToggleButton>
            <ToggleButton value="reviews">Reviews sent</ToggleButton>
            <ToggleButton value="comments">Comments sent</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={layoutMode}
            onChange={(_, next) => {
              if (next) {
                setLayoutMode(next as GraphLayoutMode);
              }
            }}
            color="secondary"
          >
            <ToggleButton value="circle">Circle</ToggleButton>
            <ToggleButton value="previous">Organic</ToggleButton>
          </ToggleButtonGroup>

          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Zoom out">
              <IconButton
                size="small"
                aria-label="Zoom out"
                onClick={() =>
                  setZoom((previous) =>
                    clamp(previous - 0.1, 0.35, 2.2),
                  )
                }
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>

            <Tooltip title="Reset graph view">
              <IconButton
                size="small"
                aria-label="Reset graph view"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>

            <Tooltip title="Zoom in">
              <IconButton
                size="small"
                aria-label="Zoom in"
                onClick={() =>
                  setZoom((previous) =>
                    clamp(previous + 0.1, 0.35, 2.2),
                  )
                }
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Box
          sx={{
            border:
              '1px solid rgba(255,255,255,0.14)',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          <Box
            sx={{
              width: 240,
              minWidth: 240,
              maxHeight: 512,
              overflowY: 'auto',
              borderRight:
                '1px solid rgba(255,255,255,0.08)',
              bgcolor:
                'rgba(15,23,42,0.98)',
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Nodes
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Toggle visibility or click to select.
              </Typography>
            </Box>
            <List dense disablePadding sx={{
              scrollbarColor: 'rgba(139, 92, 246, 0.8) rgba(15, 23, 42, 0.9)',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'linear-gradient(180deg, rgba(139,92,246,0.9), rgba(34,211,238,0.9))',
                borderRadius: '999px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(15, 23, 42, 0.8)',
              },
            }}>
              {nodes
                .slice()
                .sort((a, b) =>
                  (nodeActivityByMode.get(b.id) ?? 0) - (nodeActivityByMode.get(a.id) ?? 0) ||
                  a.label.localeCompare(b.label),
                )
                .map((node) => {
                  const isSelected =
                    selectedNodeId === node.id;
                  const isVisible =
                    visibleNodeIds.has(node.id);
                  const activityValue = nodeActivityByMode.get(node.id) ?? 0;

                  return (
                    <ListItemButton
                      key={node.id}
                      selected={isSelected}
                      onClick={() => {
                        setVisibleNodeIds((previous) => {
                          const next = new Set(previous);
                          next.add(node.id);
                          return next;
                        });
                        setSelectedNodeId(node.id);
                      }}
                      sx={{
                        px: 1,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34 }}>
                        <Checkbox
                          edge="start"
                          checked={isVisible}
                          tabIndex={-1}
                          disableRipple
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleNodeVisibility(node.id);
                          }}
                          sx={{
                            color: 'primary.main',
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          nodeLinkHref ? (
                            <Link
                              component={RouterLink}
                              to={nodeLinkHref(node)}
                              underline="hover"
                              color="inherit"
                              sx={{
                                display: 'inline-block',
                                width: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {node.label}
                            </Link>
                          ) : (
                            node.label
                          )
                        }
                        secondary={`${getActivityLabel(activeInteractionMode)}: ${activityValue}`}
                        primaryTypographyProps={{
                          variant: 'body2',
                          noWrap: true,
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          noWrap: true,
                          color: 'text.secondary',
                        }}
                      />
                    </ListItemButton>
                  );
                })}
            </List>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              backgroundColor: 'rgba(9,12,24,0.98)',
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px),
                linear-gradient(135deg, rgba(17,23,38,0.95), rgba(9,12,24,0.98))
              `,
              backgroundSize: '32px 32px, 32px 32px, 100% 100%',
              backgroundPosition: '0 0, 0 0, 0 0',
            }}
            data-graph-surface="true"
          >
            <svg
              ref={svgRef}
              width="100%"
              height="480"
              viewBox="-320 -180 640 360"
              onWheel={handleWheel}
              onMouseDown={
                handleSvgMouseDown
              }
              onMouseMove={
                handleSvgMouseMove
              }
              onMouseUp={
                handleSvgMouseUp
              }
              onClick={handleSvgClick}
              onMouseLeave={
                handleSvgMouseUp
              }
              style={{
                cursor: dragging
                  ? 'grabbing'
                  : 'grab',
                touchAction: 'none',
              }}
            >
            <defs>
              <linearGradient
                id="graphBackground"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="rgba(17,23,38,0.95)"
                />
                <stop
                  offset="100%"
                  stopColor="rgba(9,12,24,0.98)"
                />
              </linearGradient>

              <pattern
                id="graphGrid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              </pattern>

              <linearGradient
                id="edgeGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="#8b5cf6"
                />
                <stop
                  offset="100%"
                  stopColor="#22d3ee"
                />
              </linearGradient>

              <linearGradient
                id="edgeGradientActive"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="#fbbf24"
                />
                <stop
                  offset="100%"
                  stopColor="#34d399"
                />
              </linearGradient>

              <marker
                id="arrowNormal"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  fill="#67e8f9"
                />
              </marker>

              <marker
                id="arrowActive"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  fill="#fbbf24"
                />
              </marker>
            </defs>

            <g
              transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
            >
              {visibleGraph.edges.map(
                (edge) => {
                  const source =
                    positions[
                      edge.source
                    ];

                  const target =
                    positions[
                      edge.target
                    ];

                  if (
                    !source ||
                    !target
                  ) {
                    return null;
                  }

                  const isHighlighted =
                    hoveredEdgeId ===
                      edge.id ||
                    activeNodeId ===
                      edge.source ||
                    activeNodeId ===
                      edge.target ||
                    selectedNode?.id ===
                      edge.source ||
                    selectedNode?.id ===
                      edge.target;

                  const sourceWeight =
                    getEdgeMetricValue(
                      edge,
                      activeInteractionMode,
                      true,
                    );

                  const targetWeight =
                    getEdgeMetricValue(
                      edge,
                      activeInteractionMode,
                      false,
                    );

                  const maxDirectional =
                    Math.max(
                      1,
                      sourceWeight,
                      targetWeight,
                    );

                  const sourceWidth =
                    1.5 +
                    (sourceWeight /
                      maxDirectional) *
                      6;

                  const targetWidth =
                    1.5 +
                    (targetWeight /
                      maxDirectional) *
                      6;

                  /*
                   * Draw a single, undirected curve between the
                   * two nodes. Use the aggregate `edge.weight` to
                   * determine stroke thickness and show both
                   * directional counts in the hover tooltip.
                   */
                  const dx = target.x - source.x;
                  const dy = target.y - source.y;
                  const length = Math.sqrt(dx * dx + dy * dy) || 1;

                  const nx = -dy / length;
                  const ny = dx / length;

                  const curvature = 20;

                  const controlX = (source.x + target.x) / 2 + nx * curvature;
                  const controlY = (source.y + target.y) / 2 + ny * curvature;

                  const path = `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;

                  const combinedWidth = 1.5 + (getEdgeWeight(edge, activeInteractionMode) / edgeMaxWeight) * 8;

                  return (
                    <g
                      key={edge.id}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                    >
                      {/* Invisible wide path to capture hover / click */}
                      <path
                        d={path}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={Math.max(24, combinedWidth + 18)}
                        strokeLinecap="round"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedEdgeId(edge.id)}
                      />

                      {/* subtle backdrop for visibility when hovered/selected */}
                      <path
                        d={path}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={Math.max(10, combinedWidth + 12)}
                        strokeLinecap="round"
                        opacity={isHighlighted || selectedEdgeId === edge.id ? 0.16 : 0.06}
                      />

                      <Tooltip
                        title={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {edge.source} ↔ {edge.target}
                            </Typography>

                            <Typography variant="body2">
                              {activeInteractionMode === 'reviews'
                                ? 'Reviews sent across pair'
                                : activeInteractionMode === 'comments'
                                  ? 'Comments sent across pair'
                                  : 'All interactions sent across pair'}
                              : {getEdgeWeight(edge, activeInteractionMode)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              Each endpoint&apos;s sent value is that developer&apos;s activity toward the other endpoint.
                            </Typography>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              {edge.source} sent reviews: {edge.sourceReviewCount}
                            </Typography>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {edge.source} sent comments: {edge.sourceCommentCount}
                            </Typography>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              {edge.target} sent reviews: {edge.targetReviewCount}
                            </Typography>

                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {edge.target} sent comments: {edge.targetCommentCount}
                            </Typography>

                          </Box>
                        }
                        placement="top"
                        arrow
                        open={hoveredEdgeId === edge.id || selectedEdgeId === edge.id}
                      >
                        <path
                          d={path}
                          fill="none"
                          stroke={isHighlighted ? 'url(#edgeGradientActive)' : 'url(#edgeGradient)'}
                          strokeWidth={isHighlighted ? Math.max(2, combinedWidth) : Math.max(1, combinedWidth * 0.9)}
                          strokeLinecap="round"
                          opacity={isHighlighted ? 1 : 0.88}
                        />
                      </Tooltip>

                      {/* Relationship-level hover area (center) */}
                      <circle
                        cx={(source.x + target.x) / 2}
                        cy={(source.y + target.y) / 2}
                        r={18}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedEdgeId(edge.id)}
                      />
                    </g>
                  );
                },
              )}

              {visibleGraph.nodes.map(
                (node) => {
                  const position =
                    positions[node.id];

                  if (!position) {
                    return null;
                  }

                  const isSelected =
                    selectedNodeId ===
                    node.id;

                  const isHighlighted =
                    hoveredNodeId ===
                      node.id ||
                    activeNodeId ===
                      node.id;

                  const radius =
                    node.id ===
                    centerNodeId
                      ? 16 +
                        (node.activity /
                          nodeMaxActivity) *
                          16
                      : 9 +
                        (node.activity /
                          nodeMaxActivity) *
                          13;

                  const fill =
                    node.id ===
                    centerNodeId
                      ? '#8b5cf6'
                      : isSelected
                        ? '#fbbf24'
                        : isHighlighted
                          ? '#2dd4bf'
                          : '#7dd3fc';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${position.x} ${position.y})`}
                      onMouseEnter={() =>
                        setHoveredNodeId(
                          node.id,
                        )
                      }
                      onMouseLeave={() =>
                        setHoveredNodeId(
                          null,
                        )
                      }
                      onClick={() =>
                        setSelectedNodeId(
                          node.id,
                        )
                      }
                      style={{
                        cursor:
                          'pointer',
                      }}
                    >
                      <circle
                        r={
                          radius +
                          (isSelected
                            ? 6
                            : 0)
                        }
                        fill={fill}
                        opacity={
                          isSelected ||
                          isHighlighted
                            ? 1
                            : 0.82
                        }
                        stroke={
                          node.id ===
                          centerNodeId
                            ? '#f8fafc'
                            : '#e2e8f0'
                        }
                        strokeWidth={
                          node.id ===
                          centerNodeId
                            ? 2.5
                            : 1.4
                        }
                      />

                      <circle
                        r={Math.max(
                          4,
                          radius *
                            0.45,
                        )}
                        fill="rgba(15,23,42,0.92)"
                      />

                      <text
                        x={radius + 12}
                        y={4}
                        fill={
                          node.id ===
                          centerNodeId
                            ? '#f8fafc'
                            : '#e2e8f0'
                        }
                        fontSize={11}
                        fontWeight={
                          node.id ===
                          centerNodeId
                            ? 700
                            : 500
                        }
                      >
                        {node.label}
                      </text>

                      <Tooltip
                        title={`${node.label} · ${node.activity} sent`}
                      >
                        <circle
                          r={
                            radius +
                            18
                          }
                          fill="transparent"
                        />
                      </Tooltip>
                    </g>
                  );
                },
              )}
            </g>
          </svg>
        </Box>
      </Box>
      </Stack>
    </Paper>
  );
};

export default RelationshipGraph;