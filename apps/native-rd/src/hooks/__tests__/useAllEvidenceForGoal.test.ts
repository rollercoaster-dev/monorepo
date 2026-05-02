import { renderHook } from "@testing-library/react-native";

const mockUseQuery = jest.fn();
jest.mock("@evolu/react", () => {
  const actual = jest.requireActual("@evolu/react");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

jest.mock("../../db", () => ({
  evidenceByGoalQuery: (id: string) => ({ __brand: "evidenceByGoal", id }),
  stepEvidenceByGoalQuery: (id: string) => ({
    __brand: "stepEvidenceByGoal",
    id,
  }),
  stepsByGoalQuery: (id: string) => ({ __brand: "stepsByGoal", id }),
  EvidenceType: {
    photo: "photo",
    text: "text",
    voice_memo: "voice_memo",
    video: "video",
    link: "link",
    file: "file",
  },
}));

import { useAllEvidenceForGoal } from "../useAllEvidenceForGoal";
import type { GoalId } from "../../db";

const goalId = "goal-1" as unknown as GoalId;

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * Configure mockUseQuery to dispatch on the query brand. Each call to
 * useQuery passes the result of one of the query factories above.
 */
function setupQueries(args: {
  steps: Array<{ id: string; title?: string; ordinal?: number | null }>;
  stepEvidence: Array<{
    id: string;
    stepId: string;
    type: string;
    description?: string | null;
    uri?: string | null;
    metadata?: string | null;
    stepTitle?: string;
  }>;
  goalEvidence: Array<{
    id: string;
    type: string;
    description?: string | null;
    uri?: string | null;
    metadata?: string | null;
  }>;
}) {
  mockUseQuery.mockImplementation((q: { __brand: string }) => {
    if (q.__brand === "stepsByGoal") return args.steps;
    if (q.__brand === "stepEvidenceByGoal") return args.stepEvidence;
    if (q.__brand === "evidenceByGoal") return args.goalEvidence;
    return [];
  });
}

describe("useAllEvidenceForGoal", () => {
  it("returns empty array when no evidence exists", () => {
    setupQueries({ steps: [], stepEvidence: [], goalEvidence: [] });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current).toEqual([]);
  });

  it("orders step evidence by step ordinal then preserves createdAt-desc within step", () => {
    setupQueries({
      steps: [
        { id: "step-a", title: "Step A", ordinal: 0 },
        { id: "step-b", title: "Step B", ordinal: 1 },
      ],
      // Query orders by createdAt desc, so newer items first
      stepEvidence: [
        { id: "ev-b2", stepId: "step-b", type: "photo", description: "B-new" },
        { id: "ev-b1", stepId: "step-b", type: "text", description: "B-old" },
        { id: "ev-a1", stepId: "step-a", type: "voice_memo", description: "A" },
      ],
      goalEvidence: [],
    });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current.map((e) => e.id)).toEqual([
      "ev-a1",
      "ev-b2",
      "ev-b1",
    ]);
  });

  it("places goal-level evidence after all step evidence", () => {
    setupQueries({
      steps: [{ id: "step-a", title: "Step A", ordinal: 0 }],
      stepEvidence: [
        { id: "ev-step", stepId: "step-a", type: "photo", description: "S" },
      ],
      goalEvidence: [
        { id: "ev-goal-2", type: "text", description: "Newer goal" },
        { id: "ev-goal-1", type: "link", description: "Older goal" },
      ],
    });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current.map((e) => e.id)).toEqual([
      "ev-step",
      "ev-goal-2",
      "ev-goal-1",
    ]);
  });

  it("annotates source and stepTitle for accessibility", () => {
    setupQueries({
      steps: [{ id: "step-a", title: "First Step", ordinal: 0 }],
      stepEvidence: [
        { id: "ev-1", stepId: "step-a", type: "photo", description: "Photo" },
      ],
      goalEvidence: [{ id: "ev-2", type: "text", description: "Goal note" }],
    });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current[0]).toMatchObject({
      id: "ev-1",
      source: "step",
      stepId: "step-a",
      stepTitle: "First Step",
    });
    expect(result.current[1]).toMatchObject({
      id: "ev-2",
      source: "goal",
      stepId: null,
      stepTitle: null,
    });
  });

  it("falls back to type when description is missing", () => {
    setupQueries({
      steps: [{ id: "step-a", title: "A", ordinal: 0 }],
      stepEvidence: [
        { id: "ev-1", stepId: "step-a", type: "photo", description: null },
      ],
      goalEvidence: [],
    });
    const { result } = renderHook(() => useAllEvidenceForGoal(goalId));
    expect(result.current[0]?.title).toBe("photo");
  });
});
