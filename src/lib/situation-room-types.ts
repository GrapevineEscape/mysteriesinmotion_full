export type SituationReviewQuestion = {
  correct: boolean;
  explanation: string | null;
  gradingMethod?: string | null;
  gradingReason?: string | null;
  id: string;
  imageUrl: string | null;
  question: string;
  solution: string;
  userAnswer: string;
};

export type SituationRank = {
  minimumPercent: number;
  name: string;
};

export type SituationRankBand = SituationRank & {
  maximumPercent: number;
};

export const DEFAULT_SITUATION_RANK_BANDS: SituationRankBand[] = [
  { name: "Wannabe", minimumPercent: 0, maximumPercent: 14 },
  { name: "Rookie", minimumPercent: 15, maximumPercent: 29 },
  { name: "Gumshoe", minimumPercent: 30, maximumPercent: 49 },
  { name: "Sleuth", minimumPercent: 50, maximumPercent: 64 },
  { name: "Detective", minimumPercent: 65, maximumPercent: 79 },
  { name: "Master Detective", minimumPercent: 80, maximumPercent: 99 },
  { name: "Supreme Sergeant", minimumPercent: 100, maximumPercent: 100 },
];

export const DEFAULT_SITUATION_RANKS: SituationRank[] =
  DEFAULT_SITUATION_RANK_BANDS.map(({ name, minimumPercent }) => ({
    name,
    minimumPercent,
  }));

export function effectiveSituationRanks(ranks: SituationRank[]) {
  return (ranks.length ? ranks : DEFAULT_SITUATION_RANKS).toSorted(
    (left, right) => left.minimumPercent - right.minimumPercent,
  );
}

export function detectiveRankForScore(
  ranks: SituationRank[],
  scorePercent: number,
) {
  const effectiveRanks = effectiveSituationRanks(ranks);
  return (
    effectiveRanks
      .filter((rank) => scorePercent >= rank.minimumPercent)
      .at(-1)?.name ??
    effectiveRanks[0]?.name ??
    "Wannabe"
  );
}

export type SituationResult = {
  correctCount: number;
  earnedRank: string;
  maximumScore: number;
  questions: SituationReviewQuestion[];
  ranks: SituationRank[];
  score: number;
  scorePercent: number;
  totalQuestions: number;
};
