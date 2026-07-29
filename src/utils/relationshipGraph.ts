import { DeveloperDetailResponse, PeopleStats } from '@/types/developers';
import { ProjectDetailResponse } from '@/types/projects';

export interface GraphNode {
  id: string;
  label: string;
  activity: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  reviewCount: number;
  commentCount: number;
  reviewPerPerson: number;
  reviewPerChange: number;
  commentPerPerson: number;
  commentPerChange: number;
  totalInteractions: number;
}

const getMetricStats = (metric: PeopleStats | null | undefined) => ({
  perPerson: metric?.stats?.per_person?.mean ?? 0,
  perChange: metric?.stats?.per_change?.mean ?? 0,
});

const getMetricCount = (metric: PeopleStats | null | undefined, username: string) => {
  return metric?.people.find((item) => item.username === username)?.count ?? 0;
};

export const buildDeveloperRelationshipGraph = (
  developerName: string,
  data: DeveloperDetailResponse,
): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const metrics = data.overall_performance;
  const peerNames = new Set<string>();

  [metrics.review_requests_sent, metrics.review_requests_received, metrics.comments_sent, metrics.comments_received].forEach((metric) => {
    metric?.people.forEach((item) => peerNames.add(item.username));
  });

  const peerList = Array.from(peerNames).sort();
  const nodes: GraphNode[] = [{ id: developerName, label: developerName, activity: 0 }];

  peerList.forEach((peer) => {
    nodes.push({ id: peer, label: peer, activity: 0 });
  });

  const edges: GraphEdge[] = peerList
    .map((peer) => {
      const reviewRequestsSent = getMetricCount(metrics.review_requests_sent, peer);
      const reviewRequestsReceived = getMetricCount(metrics.review_requests_received, peer);
      const commentsSent = getMetricCount(metrics.comments_sent, peer);
      const commentsReceived = getMetricCount(metrics.comments_received, peer);

      const reviewCount = reviewRequestsSent + reviewRequestsReceived;
      const commentCount = commentsSent + commentsReceived;
      const totalInteractions = reviewCount + commentCount;

      if (!totalInteractions) {
        return null;
      }

      const reviewStats = getMetricStats(metrics.review_requests_sent);
      const reviewReceivedStats = getMetricStats(metrics.review_requests_received);
      const commentStats = getMetricStats(metrics.comments_sent);
      const commentReceivedStats = getMetricStats(metrics.comments_received);

      return {
        id: `${developerName}-${peer}`,
        source: developerName,
        target: peer,
        weight: totalInteractions,
        reviewCount,
        commentCount,
        reviewPerPerson: (reviewStats.perPerson + reviewReceivedStats.perPerson) / 2,
        reviewPerChange: (reviewStats.perChange + reviewReceivedStats.perChange) / 2,
        commentPerPerson: (commentStats.perPerson + commentReceivedStats.perPerson) / 2,
        commentPerChange: (commentStats.perChange + commentReceivedStats.perChange) / 2,
        totalInteractions,
      } satisfies GraphEdge;
    })
    .filter((edge): edge is GraphEdge => Boolean(edge));

  const nodeActivity = new Map<string, number>();
  nodes.forEach((node) => nodeActivity.set(node.id, 0));

  edges.forEach((edge) => {
    nodeActivity.set(edge.source, (nodeActivity.get(edge.source) ?? 0) + edge.totalInteractions);
    nodeActivity.set(edge.target, (nodeActivity.get(edge.target) ?? 0) + edge.totalInteractions);
  });

  return {
    nodes: nodes.map((node) => ({ ...node, activity: nodeActivity.get(node.id) ?? 0 })),
    edges,
  };
};

export const buildProjectRelationshipGraph = (
  data: ProjectDetailResponse,
): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const developerNames = Object.keys(data.developers).sort();
  const nodes: GraphNode[] = developerNames.map((name) => ({ id: name, label: name, activity: 0 }));

  const edgeMap = new Map<string, GraphEdge>();

  developerNames.forEach((developerName) => {
    const metrics = data.developers[developerName];
    const peers = new Set<string>();

    [metrics.review_requests_sent, metrics.review_requests_received, metrics.comments_sent, metrics.comments_received].forEach((metric) => {
      metric?.people.forEach((item) => peers.add(item.username));
    });

    peers.forEach((peer) => {
      if (peer === developerName) {
        return;
      }

      const pairKey = [developerName, peer].sort().join('::');
      const existing = edgeMap.get(pairKey);

      const reviewRequestsSent = getMetricCount(metrics.review_requests_sent, peer);
      const reviewRequestsReceived = getMetricCount(metrics.review_requests_received, peer);
      const commentsSent = getMetricCount(metrics.comments_sent, peer);
      const commentsReceived = getMetricCount(metrics.comments_received, peer);

      const reviewCount = reviewRequestsSent + reviewRequestsReceived;
      const commentCount = commentsSent + commentsReceived;
      const totalInteractions = reviewCount + commentCount;

      if (!totalInteractions) {
        return;
      }

      const reviewStats = getMetricStats(metrics.review_requests_sent);
      const reviewReceivedStats = getMetricStats(metrics.review_requests_received);
      const commentStats = getMetricStats(metrics.comments_sent);
      const commentReceivedStats = getMetricStats(metrics.comments_received);

      const edge = existing ?? {
        id: pairKey,
        source: developerName,
        target: peer,
        weight: 0,
        reviewCount: 0,
        commentCount: 0,
        reviewPerPerson: 0,
        reviewPerChange: 0,
        commentPerPerson: 0,
        commentPerChange: 0,
        totalInteractions: 0,
      };

      edge.weight += totalInteractions;
      edge.reviewCount += reviewCount;
      edge.commentCount += commentCount;
      edge.totalInteractions += totalInteractions;
      edge.reviewPerPerson = (edge.reviewPerPerson + (reviewStats.perPerson + reviewReceivedStats.perPerson) / 2) / 2;
      edge.reviewPerChange = (edge.reviewPerChange + (reviewStats.perChange + reviewReceivedStats.perChange) / 2) / 2;
      edge.commentPerPerson = (edge.commentPerPerson + (commentStats.perPerson + commentReceivedStats.perPerson) / 2) / 2;
      edge.commentPerChange = (edge.commentPerChange + (commentStats.perChange + commentReceivedStats.perChange) / 2) / 2;

      edgeMap.set(pairKey, edge);
    });
  });

  const edges = Array.from(edgeMap.values()).filter((edge) => edge.totalInteractions > 0);
  const nodeActivity = new Map<string, number>();
  nodes.forEach((node) => nodeActivity.set(node.id, 0));

  edges.forEach((edge) => {
    nodeActivity.set(edge.source, (nodeActivity.get(edge.source) ?? 0) + edge.totalInteractions);
    nodeActivity.set(edge.target, (nodeActivity.get(edge.target) ?? 0) + edge.totalInteractions);
  });

  return {
    nodes: nodes.map((node) => ({ ...node, activity: nodeActivity.get(node.id) ?? 0 })),
    edges,
  };
};
