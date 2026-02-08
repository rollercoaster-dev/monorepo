import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { StepList, type Step } from './StepList';

const meta: Meta<typeof StepList> = {
  title: 'StepList',
  component: StepList,
};

export default meta;

type Story = StoryObj<typeof StepList>;

const initialSteps: Step[] = [
  { id: '1', title: 'Set up project structure', completed: true },
  { id: '2', title: 'Install dependencies', completed: true },
  { id: '3', title: 'Create component files', completed: false },
  { id: '4', title: 'Write Storybook stories', completed: false },
  { id: '5', title: 'Add accessibility labels', completed: false },
];

function InteractiveStepList() {
  const [steps, setSteps] = useState(initialSteps);

  function handleToggle(id: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  }

  return <StepList steps={steps} onToggleStep={handleToggle} />;
}

export const Interactive: Story = {
  render: () => <InteractiveStepList />,
};

export const AllCompleted: Story = {
  render: () => (
    <StepList
      steps={initialSteps.map((s) => ({ ...s, completed: true }))}
      onToggleStep={() => {}}
    />
  ),
};
