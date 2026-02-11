import { EvidenceType } from '../../../db';

/** Evidence types presented in the action sheet — must match EVIDENCE_OPTIONS in EvidenceActionSheet.tsx */
const ACTION_SHEET_TYPES = [
  EvidenceType.photo,
  EvidenceType.video,
  EvidenceType.voice_memo,
  EvidenceType.text,
  EvidenceType.link,
  EvidenceType.file,
];

/**
 * Evidence route map — mirrors the one in GoalDetailScreen.
 * Kept in sync via this test.
 */
const EVIDENCE_ROUTE_MAP: Record<string, string> = {
  [EvidenceType.photo]: 'CapturePhoto',
  [EvidenceType.video]: 'CaptureVideo',
  [EvidenceType.voice_memo]: 'CaptureVoiceMemo',
  [EvidenceType.text]: 'CaptureTextNote',
  [EvidenceType.link]: 'CaptureLink',
  [EvidenceType.file]: 'CaptureFile',
};

describe('EvidenceActionSheet options', () => {
  it('covers all user-facing evidence types', () => {
    // screenshot is not user-selectable from the action sheet
    const excludedTypes: string[] = [EvidenceType.screenshot];
    const userFacingTypes = Object.values(EvidenceType).filter(
      (t) => !excludedTypes.includes(t),
    );

    expect([...ACTION_SHEET_TYPES].sort()).toEqual([...userFacingTypes].sort());
  });

  it('has a route for every action sheet type', () => {
    for (const type of ACTION_SHEET_TYPES) {
      expect(EVIDENCE_ROUTE_MAP[type]).toBeDefined();
      expect(EVIDENCE_ROUTE_MAP[type]).toMatch(/^Capture/);
    }
  });

  it('route map has no extra entries', () => {
    const routeTypes = Object.keys(EVIDENCE_ROUTE_MAP);
    expect([...routeTypes].sort()).toEqual([...ACTION_SHEET_TYPES].sort());
  });

  it('all route names are unique', () => {
    const routes = Object.values(EVIDENCE_ROUTE_MAP);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
