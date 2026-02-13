export function formatEvidenceLabel(count: number): string {
  if (count === 0) return 'No evidence yet';
  return `${count} item${count !== 1 ? 's' : ''}`;
}
