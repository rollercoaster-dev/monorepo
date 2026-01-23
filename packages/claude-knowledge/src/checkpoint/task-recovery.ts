/**
 * Task Recovery Module
 *
 * Recreates native tasks from checkpoint workflow state when resuming a session.
 * This enables task progress visualization to persist across sessions.
 *
 * Related to #579
 */

import { getDatabase } from "../db/sqlite";
import type {
  CheckpointData,
  MilestoneCheckpointData,
  RecoveredTask,
  RecoveredTaskStatus,
  RecoverableWorkflowType,
  TaskRecoveryPlan,
  WorkflowPhase,
  WorkflowStatus,
} from "../types";
import { workflow } from "./workflow";
import { milestone } from "./milestone";

// ============================================================================
// Phase to Task Status Mapping
// ============================================================================

/**
 * Gate definition for /work-on-issue workflow
 */
interface GateDefinition {
  index: number;
  subject: (n: number) => string;
  description: string;
  activeForm: (n: number) => string;
  phase: WorkflowPhase;
  gate?: number;
}

/**
 * Gates for /work-on-issue workflow.
 * Order matters - indices are used for blockedBy relationships.
 */
const WORK_ON_ISSUE_GATES: GateDefinition[] = [
  {
    index: 0,
    subject: (n) => `Gate 1: Review Issue #${n}`,
    description: "Review issue details, check blockers, validate requirements",
    activeForm: (n) => `Reviewing issue #${n}`,
    phase: "research",
    gate: 1,
  },
  {
    index: 1,
    subject: (n) => `Gate 2: Review Plan for #${n}`,
    description: "Review development plan, approve implementation approach",
    activeForm: () => "Reviewing plan",
    phase: "research",
    gate: 2,
  },
  {
    index: 2,
    subject: (n) => `Gate 3: Implement #${n}`,
    description: "Implement changes per plan, review each commit",
    activeForm: () => "Implementing changes",
    phase: "implement",
    gate: 3,
  },
  {
    index: 3,
    subject: (n) => `Gate 4: Pre-PR Review for #${n}`,
    description: "Run review agents, address critical findings",
    activeForm: () => "Running reviews",
    phase: "review",
    gate: 4,
  },
  {
    index: 4,
    subject: (n) => `Finalize: Create PR for #${n}`,
    description: "Push branch, create PR, update board",
    activeForm: () => "Finalizing PR",
    phase: "finalize",
  },
];

/**
 * Phases for /auto-issue workflow.
 * Order matters - indices are used for blockedBy relationships.
 */
const AUTO_ISSUE_PHASES: GateDefinition[] = [
  {
    index: 0,
    subject: (n) => `Setup: Initialize #${n}`,
    description: "Create branch, checkpoint, update board",
    activeForm: (n) => `Setting up issue #${n}`,
    phase: "research", // Setup completes before research starts
  },
  {
    index: 1,
    subject: (n) => `Research: Analyze #${n}`,
    description: "Analyze codebase, create development plan",
    activeForm: (n) => `Researching issue #${n}`,
    phase: "research",
  },
  {
    index: 2,
    subject: (n) => `Implement: Build #${n}`,
    description: "Implement changes with atomic commits",
    activeForm: (n) => `Implementing issue #${n}`,
    phase: "implement",
  },
  {
    index: 3,
    subject: (n) => `Review: Validate #${n}`,
    description: "Run review agents, auto-fix critical findings",
    activeForm: (n) => `Reviewing issue #${n}`,
    phase: "review",
  },
  {
    index: 4,
    subject: (n) => `Finalize: Create PR for #${n}`,
    description: "Push branch, create PR, update board",
    activeForm: (n) => `Finalizing issue #${n}`,
    phase: "finalize",
  },
];

// ============================================================================
// Core Recovery Functions
// ============================================================================

/**
 * Determine task status based on workflow phase and gate index.
 * Uses the phase order to determine which tasks are completed.
 */
function getWorkOnIssueTaskStatus(
  currentPhase: WorkflowPhase,
  currentStatus: WorkflowStatus,
  gateIndex: number,
): RecoveredTaskStatus {
  // If workflow completed, all tasks are completed
  if (currentStatus === "completed") {
    return "completed";
  }

  // If workflow failed, mark current task as completed (with error)
  // and subsequent tasks as pending
  if (currentStatus === "failed") {
    const phaseIndex = getPhaseIndex(currentPhase, "work-on-issue");
    if (gateIndex < phaseIndex) {
      return "completed";
    }
    if (gateIndex === phaseIndex) {
      return "completed"; // Current phase failed, mark as completed with error
    }
    return "pending";
  }

  // Map phases to gate completion
  // research: Gate 1 in progress or Gate 2 in progress
  // implement: Gate 3 in progress
  // review: Gate 4 in progress
  // finalize: Finalize in progress

  const phaseToGateMap: Record<WorkflowPhase, number> = {
    research: 0, // When in research, Gate 1 is in progress (default to first gate in phase)
    implement: 2, // When in implement, Gate 3 is in progress
    review: 3, // When in review, Gate 4 is in progress
    finalize: 4, // When in finalize, Finalize task is in progress
    // Milestone phases (not used for work-on-issue)
    planning: 0,
    execute: 0,
    merge: 0,
    cleanup: 0,
  };

  const currentGateIndex = phaseToGateMap[currentPhase];

  if (gateIndex < currentGateIndex) {
    return "completed";
  }
  if (gateIndex === currentGateIndex) {
    return "in_progress";
  }
  return "pending";
}

/**
 * Determine task status for /auto-issue workflow.
 */
function getAutoIssueTaskStatus(
  currentPhase: WorkflowPhase,
  currentStatus: WorkflowStatus,
  taskIndex: number,
): RecoveredTaskStatus {
  // If workflow completed, all tasks are completed
  if (currentStatus === "completed") {
    return "completed";
  }

  // Map phases to task indices
  const phaseToIndexMap: Record<WorkflowPhase, number> = {
    research: 1, // During research, setup is done, research is in progress
    implement: 2,
    review: 3,
    finalize: 4,
    // Milestone phases
    planning: 0,
    execute: 1,
    merge: 3,
    cleanup: 4,
  };

  const currentTaskIndex = phaseToIndexMap[currentPhase];

  // Setup task (index 0) is always completed once we have a checkpoint
  if (taskIndex === 0) {
    return "completed";
  }

  if (taskIndex < currentTaskIndex) {
    return "completed";
  }
  if (taskIndex === currentTaskIndex) {
    return currentStatus === "failed" ? "completed" : "in_progress";
  }
  return "pending";
}

/**
 * Get phase index for ordering.
 */
function getPhaseIndex(
  phase: WorkflowPhase,
  workflowType: RecoverableWorkflowType,
): number {
  if (workflowType === "auto-milestone") {
    const milestonePhases: WorkflowPhase[] = [
      "planning",
      "execute",
      "review",
      "merge",
      "cleanup",
    ];
    return milestonePhases.indexOf(phase);
  }

  const issuePhases: WorkflowPhase[] = [
    "research",
    "implement",
    "review",
    "finalize",
  ];
  return issuePhases.indexOf(phase);
}

// ============================================================================
// Recovery Plan Generators
// ============================================================================

/**
 * Generate task recovery plan for /work-on-issue workflow.
 */
export function recoverWorkOnIssueTasks(
  checkpointData: CheckpointData,
): TaskRecoveryPlan {
  const { workflow: wf } = checkpointData;
  const issueNumber = wf.issueNumber;

  const tasks: RecoveredTask[] = WORK_ON_ISSUE_GATES.map((gate) => {
    const status = getWorkOnIssueTaskStatus(wf.phase, wf.status, gate.index);

    return {
      subject: gate.subject(issueNumber),
      description: gate.description,
      activeForm: gate.activeForm(issueNumber),
      status,
      blockedByIndices: gate.index > 0 ? [gate.index - 1] : [],
      metadata: {
        issueNumber,
        workflowId: wf.id,
        phase: gate.phase,
        ...(gate.gate && { gate: gate.gate }),
      },
    };
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressTask = tasks.find((t) => t.status === "in_progress");

  return {
    workflowType: "work-on-issue",
    issueNumber,
    workflowId: wf.id,
    currentPhase: wf.phase,
    currentStatus: wf.status,
    tasks,
    summary: `Recovering /work-on-issue #${issueNumber}: ${completedCount}/${tasks.length} gates completed${inProgressTask ? `, currently at: ${inProgressTask.subject}` : ""}`,
  };
}

/**
 * Generate task recovery plan for /auto-issue workflow.
 */
export function recoverAutoIssueTasks(
  checkpointData: CheckpointData,
): TaskRecoveryPlan {
  const { workflow: wf } = checkpointData;
  const issueNumber = wf.issueNumber;

  const tasks: RecoveredTask[] = AUTO_ISSUE_PHASES.map((phase) => {
    const status = getAutoIssueTaskStatus(wf.phase, wf.status, phase.index);

    return {
      subject: phase.subject(issueNumber),
      description: phase.description,
      activeForm: phase.activeForm(issueNumber),
      status,
      blockedByIndices: phase.index > 0 ? [phase.index - 1] : [],
      metadata: {
        issueNumber,
        workflowId: wf.id,
        phase: phase.phase,
      },
    };
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressTask = tasks.find((t) => t.status === "in_progress");

  return {
    workflowType: "auto-issue",
    issueNumber,
    workflowId: wf.id,
    currentPhase: wf.phase,
    currentStatus: wf.status,
    tasks,
    summary: `Recovering /auto-issue #${issueNumber}: ${completedCount}/${tasks.length} phases completed${inProgressTask ? `, currently at: ${inProgressTask.subject}` : ""}`,
  };
}

/**
 * Generate task recovery plan for /auto-milestone workflow.
 * Creates wave-based task structure with dependencies.
 */
export function recoverAutoMilestoneTasks(
  milestoneData: MilestoneCheckpointData,
): TaskRecoveryPlan {
  const { milestone: ms, workflows } = milestoneData;
  const db = getDatabase();

  // Get wave assignments for each workflow
  type WaveRow = { workflow_id: string; wave_number: number | null };
  const waveRows = db
    .query<WaveRow, [string]>(
      `
      SELECT workflow_id, wave_number
      FROM milestone_workflows
      WHERE milestone_id = ?
      ORDER BY wave_number ASC, workflow_id ASC
    `,
    )
    .all(ms.id);

  // Build wave map
  const waveMap = new Map<string, number>();
  for (const row of waveRows) {
    waveMap.set(row.workflow_id, row.wave_number ?? 1);
  }

  // Group workflows by wave
  const waveGroups = new Map<number, typeof workflows>();
  for (const wf of workflows) {
    const wave = waveMap.get(wf.id) ?? 1;
    if (!waveGroups.has(wave)) {
      waveGroups.set(wave, []);
    }
    waveGroups.get(wave)!.push(wf);
  }

  // Sort waves
  const sortedWaves = Array.from(waveGroups.keys()).sort((a, b) => a - b);

  // Build tasks with wave-based dependencies
  const tasks: RecoveredTask[] = [];
  const waveStartIndices = new Map<number, number>();

  for (const waveNum of sortedWaves) {
    const waveWorkflows = waveGroups.get(waveNum)!;
    waveStartIndices.set(waveNum, tasks.length);

    // Get indices of previous wave tasks for blockedBy
    const prevWave = waveNum - 1;
    const blockedByIndices: number[] = [];
    if (prevWave > 0 && waveStartIndices.has(prevWave)) {
      const prevStart = waveStartIndices.get(prevWave)!;
      const prevEnd =
        waveNum > 1 ? waveStartIndices.get(waveNum)! : tasks.length;
      for (let i = prevStart; i < prevEnd; i++) {
        blockedByIndices.push(i);
      }
    }

    for (const wf of waveWorkflows) {
      // Determine task status based on workflow status
      let status: RecoveredTaskStatus;
      if (wf.status === "completed") {
        status = "completed";
      } else if (wf.status === "running") {
        status = "in_progress";
      } else {
        status = "pending";
      }

      tasks.push({
        subject: `Issue #${wf.issueNumber}: Wave ${waveNum}`,
        description: `Branch: ${wf.branch}`,
        activeForm: `Working on issue #${wf.issueNumber}`,
        status,
        blockedByIndices: [...blockedByIndices],
        metadata: {
          issueNumber: wf.issueNumber,
          workflowId: wf.id,
          waveNumber: waveNum,
          milestoneId: ms.id,
          milestoneName: ms.name,
        },
      });
    }
  }

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "in_progress",
  ).length;

  return {
    workflowType: "auto-milestone",
    milestoneName: ms.name,
    workflowId: ms.id,
    currentPhase: ms.phase,
    currentStatus: ms.status,
    tasks,
    summary: `Recovering /auto-milestone "${ms.name}": ${completedCount}/${tasks.length} issues completed, ${inProgressCount} in progress`,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Recover tasks for a single-issue workflow (either /work-on-issue or /auto-issue).
 *
 * @param issueNumber - GitHub issue number
 * @param workflowType - Type of workflow (defaults to auto-detection based on actions)
 * @returns Task recovery plan or null if no workflow found
 */
export function recoverTasksByIssue(
  issueNumber: number,
  workflowType?: "work-on-issue" | "auto-issue",
): TaskRecoveryPlan | null {
  const checkpointData = workflow.findByIssue(issueNumber);
  if (!checkpointData) {
    return null;
  }

  // Auto-detect workflow type if not specified
  // /work-on-issue has gate actions, /auto-issue has phase actions
  if (!workflowType) {
    const hasGateActions = checkpointData.actions.some(
      (a) =>
        a.action.includes("gate-") ||
        a.action.includes("Gate") ||
        a.action === "gate_passage",
    );
    workflowType = hasGateActions ? "work-on-issue" : "auto-issue";
  }

  return workflowType === "work-on-issue"
    ? recoverWorkOnIssueTasks(checkpointData)
    : recoverAutoIssueTasks(checkpointData);
}

/**
 * Recover tasks for a milestone workflow.
 *
 * @param milestoneName - Name of the milestone
 * @returns Task recovery plan or null if no milestone found
 */
export function recoverTasksByMilestone(
  milestoneName: string,
): TaskRecoveryPlan | null {
  const milestoneData = milestone.findMilestoneByName(milestoneName);
  if (!milestoneData) {
    return null;
  }

  return recoverAutoMilestoneTasks(milestoneData);
}

/**
 * Export for checkpoint module integration
 */
export const taskRecovery = {
  recoverTasksByIssue,
  recoverTasksByMilestone,
  recoverWorkOnIssueTasks,
  recoverAutoIssueTasks,
  recoverAutoMilestoneTasks,
};
