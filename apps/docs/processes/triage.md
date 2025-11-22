# Triage & Linking Process

A lightweight 5-step process for managing ideas, decisions, and work items in the Rollercoaster.dev living docs system.

## The 5-Step Process

### 1. Capture
**Goal**: Never lose an idea or decision
**Where**: Capture ideas wherever they naturally occur
- Slack messages, meeting notes, code comments
- GitHub issues, PR discussions, design reviews
- User feedback, support requests, bug reports
- Research findings, competitive analysis, technical discoveries

**Tools**:
- Quick notes in Obsidian daily notes
- Voice memos transcribed later
- Screenshots with annotations
- Email forwarding to documentation inbox

### 2. Triage
**Goal**: Process captured items within 24 hours
**Process**: Decide where each item belongs in the documentation system

**Decision Tree**:
- **Vision/Strategy change** → Update [`/vision/now-next-later.md`](../vision/now-next-later.md)
- **Technical/architectural decision** → Create new ADR in [`/decisions/`](../decisions/)
- **Product feature/requirement** → Create PRD in [`/product/`](../product/)
- **Process improvement** → Update relevant process doc
- **Bug/issue** → Link to existing docs or create new ones
- **Research finding** → Add to research section or relevant ADR

**Triage Questions**:
- Does this change our technical approach? → ADR needed
- Does this affect user experience? → Update vision or create PRD
- Is this a process we'll repeat? → Document in processes
- Does this contradict existing decisions? → Update or supersede ADR

### 3. Create ADR (If Needed)
**Goal**: Document significant decisions with context and consequences
**Trigger**: Any change to scope, technical approach, or architectural direction

**ADR Creation Process**:
1. Copy [`/templates/ADR-template.md`](../templates/ADR-template.md)
2. Number sequentially (ADR-0001, ADR-0002, etc.)
3. Fill in all sections: Context, Decision, Consequences, Alternatives
4. Link to related architecture docs and vision
5. Set status: Proposed → Accepted → Superseded
6. Get review from relevant stakeholders

**ADR Quality Checklist**:
- [ ] Context explains why decision is needed
- [ ] Decision is crisp and actionable
- [ ] Consequences include both positive and negative impacts
- [ ] Alternatives considered with pros/cons
- [ ] Links to related docs and external sources
- [ ] Status and owner clearly identified

### 4. Link PRs ↔ Documentation
**Goal**: Maintain bidirectional traceability between code and docs
**Process**: Every PR should link to relevant documentation

**From Code to Docs**:
- PR descriptions link to relevant ADRs, architecture docs, or PRDs
- Code comments reference decision documents for context
- README files link to architectural overviews
- API documentation references design decisions

**From Docs to Code**:
- ADRs link to implementing PRs and issues
- Architecture docs link to example implementations
- Process docs link to automation and tooling
- Vision docs link to feature implementations

**Linking Best Practices**:
- Use relative links within the repository
- Update links when documents are moved or renamed
- Include brief context when linking (not just bare URLs)
- Link to specific sections when relevant

### 5. Weekly Review Cycle
**Goal**: Keep documentation current and actionable
**Schedule**: Every Monday morning (10-15 minutes)

**Weekly Review Checklist**:
- [ ] Review [`/vision/now-next-later.md`](../vision/now-next-later.md) — still aligned with current work?
- [ ] Update [`/status/weekly-YYYY-WW.md`](../status/weekly-template.md) — progress, blockers, next steps
- [ ] Check [`/roadmap/2025-Q3.md`](../roadmap/2025-Q3.md) — on track for quarterly goals?
- [ ] Scan open ADRs in [`/decisions/`](../decisions/) — any need status updates?
- [ ] Review recent PRs — are documentation links current?
- [ ] Check for broken internal links or outdated references

**Monthly Deep Review** (first Monday of month):
- [ ] Audit all ADR statuses — update superseded or rejected decisions
- [ ] Review architecture docs for accuracy with current implementation
- [ ] Update vision and roadmap based on learnings and changes
- [ ] Clean up outdated or redundant documentation
- [ ] Identify documentation gaps or improvement opportunities

## Tools & Automation

**Obsidian Workflow**:
- Use daily notes for initial capture
- Tag items with `#triage` for processing
- Use templates for consistent ADR and PRD creation
- Leverage graph view to identify missing connections

**GitHub Integration**:
- Use issue templates that prompt for documentation links
- PR templates include documentation update checklist
- Automated checks for ADR references in architectural PRs
- Link validation in CI/CD pipeline

**Quality Gates**:
- No architectural PR merges without ADR reference
- Weekly documentation review blocks deployment if overdue
- Broken link detection in build process
- Documentation coverage metrics for major features

## Common Patterns & Examples

**Example: New Feature Request**
1. **Capture**: User requests badge sharing via social media
2. **Triage**: This is a product feature → Create PRD
3. **ADR**: Sharing mechanism affects privacy → Create ADR-0004
4. **Link**: Implementation PR links to PRD and ADR
5. **Review**: Weekly check confirms feature aligns with vision

**Example: Technical Debt**
1. **Capture**: Developer notes performance issue in badge loading
2. **Triage**: This affects architecture → Update architecture doc
3. **ADR**: Solution requires database schema change → Create ADR-0005
4. **Link**: Refactoring PR references architecture and ADR
5. **Review**: Confirm performance improvement meets goals

**Example: User Feedback**
1. **Capture**: Support ticket about confusing badge creation flow
2. **Triage**: UX issue affects neurodivergent-first principle → Update vision
3. **ADR**: Not needed (UX improvement, not architectural change)
4. **Link**: UX improvement PR references vision and user feedback
5. **Review**: Validate improvement against accessibility principles

## Success Metrics

**Process Health**:
- 90%+ of captured items triaged within 24 hours
- 100% of architectural PRs link to relevant ADRs
- Weekly review completed 90%+ of weeks
- <5% broken internal links at any time

**Documentation Quality**:
- All ADRs have clear status and recent review dates
- Architecture docs reflect current implementation
- Vision and roadmap updated monthly with learnings
- New team members can onboard using documentation alone

> **Remember**: Keep friction low. Done is better than perfect. The goal is to maintain context and decisions, not create bureaucracy.
