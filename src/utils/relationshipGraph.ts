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

  // Existing aggregate fields — keep these unchanged.
  reviewCount: number;
  commentCount: number;
  reviewPerPerson: number;
  reviewPerChange: number;
  commentPerPerson: number;
  commentPerChange: number;
  totalInteractions: number;

  // Directional fields.
  sourceReviewCount: number;
  targetReviewCount: number;
  sourceCommentCount: number;
  targetCommentCount: number;
  sourceInteractions: number;
  targetInteractions: number;
}

export type CollaborationMode = 'reviews' | 'comments' | 'combined';

const getMetricStats = (
  metric: PeopleStats | null | undefined,
) => ({
  perPerson: metric?.stats?.per_person?.mean ?? 0,
  perChange: metric?.stats?.per_change?.mean ?? 0,
});

const getMetricCount = (
  metric: PeopleStats | null | undefined,
  username: string,
) => {
  return (
    metric?.people.find((item) => item.username === username)?.count ?? 0
  );
};

const average = (a: number, b: number) => {
  if (a === 0) return b;
  if (b === 0) return a;
  return (a + b) / 2;
};

export const buildDeveloperRelationshipGraph = (
  developerName: string,
  data?: DeveloperDetailResponse | null,
  mode: CollaborationMode = 'combined',
): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const metrics = data?.overall_performance;

  if (!metrics) {
    return {
      nodes: [
        {
          id: developerName,
          label: developerName,
          activity: 0,
        },
      ],
      edges: [],
    };
  }

  const peerNames = new Set<string>();

  [
    metrics.review_requests_sent,
    metrics.review_requests_received,
    metrics.comments_sent,
    metrics.comments_received,
  ].forEach((metric) => {
    metric?.people.forEach((item) => {
      if (item.username && item.username !== developerName) {
        peerNames.add(item.username);
      }
    });
  });

  const nodes: GraphNode[] = [
    {
      id: developerName,
      label: developerName,
      activity: 0,
    },
  ];

  Array.from(peerNames)
    .sort()
    .forEach((peer) => {
      nodes.push({
        id: peer,
        label: peer,
        activity: 0,
      });
    });

  const reviewSentStats = getMetricStats(metrics.review_requests_sent);
  const reviewReceivedStats = getMetricStats(
    metrics.review_requests_received,
  );
  const commentSentStats = getMetricStats(metrics.comments_sent);
  const commentReceivedStats = getMetricStats(
    metrics.comments_received,
  );

  const edges: GraphEdge[] = [];

  Array.from(peerNames)
    .sort()
    .forEach((peer) => {
      /*
       * source = developerName
       * target = peer
       *
       * Therefore:
       *
       * sourceReviewCount = developer -> peer
       * targetReviewCount = peer -> developer
       *
       * sourceCommentCount = developer -> peer
       * targetCommentCount = peer -> developer
       */

      const sourceReviewCount = getMetricCount(
        metrics.review_requests_sent,
        peer,
      );

      const targetReviewCount = getMetricCount(
        metrics.review_requests_received,
        peer,
      );

      const sourceCommentCount = getMetricCount(
        metrics.comments_sent,
        peer,
      );

      const targetCommentCount = getMetricCount(
        metrics.comments_received,
        peer,
      );

      const sourceInteractions =
        sourceReviewCount + sourceCommentCount;

      const targetInteractions =
        targetReviewCount + targetCommentCount;

      const reviewCount =
        sourceReviewCount + targetReviewCount;

      const commentCount =
        sourceCommentCount + targetCommentCount;

      const totalInteractions =
        sourceInteractions + targetInteractions;

      const weight =
        mode === 'reviews'
          ? reviewCount
          : mode === 'comments'
            ? commentCount
            : totalInteractions;

      if (!weight) {
        return;
      }

      edges.push({
        id: `${developerName}-${peer}`,
        source: developerName,
        target: peer,
        weight,

        reviewCount,
        commentCount,

        reviewPerPerson: average(
          reviewSentStats.perPerson,
          reviewReceivedStats.perPerson,
        ),

        reviewPerChange: average(
          reviewSentStats.perChange,
          reviewReceivedStats.perChange,
        ),

        commentPerPerson: average(
          commentSentStats.perPerson,
          commentReceivedStats.perPerson,
        ),

        commentPerChange: average(
          commentSentStats.perChange,
          commentReceivedStats.perChange,
        ),

        totalInteractions,

        sourceReviewCount,
        targetReviewCount,
        sourceCommentCount,
        targetCommentCount,
        sourceInteractions,
        targetInteractions,
      });
    });

  const nodeActivity = new Map<string, number>();

  nodes.forEach((node) => {
    nodeActivity.set(node.id, 0);
  });

  edges.forEach((edge) => {
    nodeActivity.set(
      edge.source,
      (nodeActivity.get(edge.source) ?? 0) +
        edge.sourceInteractions,
    );

    nodeActivity.set(
      edge.target,
      (nodeActivity.get(edge.target) ?? 0) +
        edge.targetInteractions,
    );
  });

  return {
    nodes: nodes.map((node) => ({
      ...node,
      activity: nodeActivity.get(node.id) ?? 0,
    })),
    edges,
  };
};

export const buildProjectRelationshipGraph = (
  data: ProjectDetailResponse,
): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  const developerNames = Object.keys(data.developers).sort();

  const allPeople = new Set<string>(developerNames);

  developerNames.forEach((developerName) => {
    const metrics = data.developers[developerName];

    [
      metrics.review_requests_sent,
      metrics.review_requests_received,
      metrics.comments_sent,
      metrics.comments_received,
    ].forEach((metric) => {
      metric?.people.forEach((item) => {
        if (item.username) {
          allPeople.add(item.username);
        }
      });
    });
  });

  const nodes: GraphNode[] = Array.from(allPeople)
    .sort()
    .map((name) => ({
      id: name,
      label: name,
      activity: 0,
    }));

  const edgeMap = new Map<string, GraphEdge>();

  developerNames.forEach((developerName) => {
    const metrics = data.developers[developerName];

    const peers = new Set<string>();

    [
      metrics.review_requests_sent,
      metrics.review_requests_received,
      metrics.comments_sent,
      metrics.comments_received,
    ].forEach((metric) => {
      metric?.people.forEach((item) => {
        if (
          item.username &&
          item.username !== developerName
        ) {
          peers.add(item.username);
        }
      });
    });

    peers.forEach((peer) => {
      if (!allPeople.has(peer) || peer === developerName) {
        return;
      }

      /*
       * The edge itself remains normalized:
       *
       * source = alphabetically first person
       * target = alphabetically second person
       *
       * But the directional counters below always describe
       * source -> target and target -> source.
       */

      const [source, target] = [developerName, peer].sort();
      const pairKey = `${source}::${target}`;

      const sentReviews = getMetricCount(
        metrics.review_requests_sent,
        peer,
      );

      const receivedReviews = getMetricCount(
        metrics.review_requests_received,
        peer,
      );

      const sentComments = getMetricCount(
        metrics.comments_sent,
        peer,
      );

      const receivedComments = getMetricCount(
        metrics.comments_received,
        peer,
      );

      let sourceReviewCount = 0;
      let targetReviewCount = 0;
      let sourceCommentCount = 0;
      let targetCommentCount = 0;

      if (developerName === source) {
        sourceReviewCount = sentReviews;
        targetReviewCount = receivedReviews;
        sourceCommentCount = sentComments;
        targetCommentCount = receivedComments;
      } else {
        sourceReviewCount = receivedReviews;
        targetReviewCount = sentReviews;
        sourceCommentCount = receivedComments;
        targetCommentCount = sentComments;
      }

      const sourceInteractions =
        sourceReviewCount + sourceCommentCount;

      const targetInteractions =
        targetReviewCount + targetCommentCount;

      const reviewCount =
        sourceReviewCount + targetReviewCount;

      const commentCount =
        sourceCommentCount + targetCommentCount;

      const totalInteractions =
        sourceInteractions + targetInteractions;

      if (!totalInteractions) {
        return;
      }

      const reviewStats = getMetricStats(
        metrics.review_requests_sent,
      );

      const reviewReceivedStats = getMetricStats(
        metrics.review_requests_received,
      );

      const commentStats = getMetricStats(
        metrics.comments_sent,
      );

      const commentReceivedStats = getMetricStats(
        metrics.comments_received,
      );

      const existing = edgeMap.get(pairKey);

      if (!existing) {
        edgeMap.set(pairKey, {
          id: pairKey,
          source,
          target,
          weight: totalInteractions,

          reviewCount,
          commentCount,

          reviewPerPerson: average(
            reviewStats.perPerson,
            reviewReceivedStats.perPerson,
          ),

          reviewPerChange: average(
            reviewStats.perChange,
            reviewReceivedStats.perChange,
          ),

          commentPerPerson: average(
            commentStats.perPerson,
            commentReceivedStats.perPerson,
          ),

          commentPerChange: average(
            commentStats.perChange,
            commentReceivedStats.perChange,
          ),

          totalInteractions,

          sourceReviewCount,
          targetReviewCount,
          sourceCommentCount,
          targetCommentCount,
          sourceInteractions,
          targetInteractions,
        });

        return;
      }

      existing.weight += totalInteractions;
      existing.reviewCount += reviewCount;
      existing.commentCount += commentCount;
      existing.totalInteractions += totalInteractions;

      existing.sourceReviewCount += sourceReviewCount;
      existing.targetReviewCount += targetReviewCount;
      existing.sourceCommentCount += sourceCommentCount;
      existing.targetCommentCount += targetCommentCount;

      existing.sourceInteractions += sourceInteractions;
      existing.targetInteractions += targetInteractions;

      existing.reviewPerPerson = average(
        existing.reviewPerPerson,
        average(
          reviewStats.perPerson,
          reviewReceivedStats.perPerson,
        ),
      );

      existing.reviewPerChange = average(
        existing.reviewPerChange,
        average(
          reviewStats.perChange,
          reviewReceivedStats.perChange,
        ),
      );

      existing.commentPerPerson = average(
        existing.commentPerPerson,
        average(
          commentStats.perPerson,
          commentReceivedStats.perPerson,
        ),
      );

      existing.commentPerChange = average(
        existing.commentPerChange,
        average(
          commentStats.perChange,
          commentReceivedStats.perChange,
        ),
      );

      edgeMap.set(pairKey, existing);
    });
  });

  const edges = Array.from(edgeMap.values())
    .filter((edge) => edge.totalInteractions > 0)
    .sort(
      (a, b) =>
        b.totalInteractions - a.totalInteractions,
    );

  const nodeActivity = new Map<string, number>();

  nodes.forEach((node) => {
    nodeActivity.set(node.id, 0);
  });

  edges.forEach((edge) => {
    nodeActivity.set(
      edge.source,
      (nodeActivity.get(edge.source) ?? 0) +
        edge.sourceInteractions,
    );

    nodeActivity.set(
      edge.target,
      (nodeActivity.get(edge.target) ?? 0) +
        edge.targetInteractions,
    );
  });

  return {
    nodes: nodes
      .map((node) => ({
        ...node,
        activity: nodeActivity.get(node.id) ?? 0,
      }))
      .sort((a, b) => b.activity - a.activity),

    edges,
  };
};