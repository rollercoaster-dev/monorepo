# Overall Project Plan & Summary

The conversation refined your idea into a focused, fundable plan: a neuro-inclusive platform where users draft their own Open Badges, get AI/peer verification, and visualise progress in a skill-tree “wallet.” Architecture keeps the public openbadges-modular-server pristine while all workflow logic lives in the monolith. A tight MVP slice, a freeze-then-iterate approach, and a staged funding roadmap (quick rolling grants → Prototype Fund next year) de-risk both time and money.

## 1 · Product concept & architecture
	•	Self-authored badges: learner = issuer; drafts live locally until verified.
	•	Verification pipeline: moderation → LLM rubric → peer queue; only successful badges hit the OB server.
	•	Skill-tree wallet: earned = solid, in-progress = glow, planned = ghost.
	•	IDE-style UI: VS Code layout with YAML/form editor centre, explorer left, preview right.
	•	Clean separation: monolith stores drafts/reviews; calls public OB server only on verification, adding extra metadata via spec-compliant extensions  ￼ ￼.

## 2 · MVP freeze & timeline

Sprint (2 w)	Deliverable
1	IDE shell + local drafts
2	Auth bridge → OB server CRUD
3	AI check micro-service (stub)
4	Peer review queue
5	Skill-tree wallet (graph)
6	Accessibility polish & closed beta

Freezing this scope prevents creep and gives funders a crisp six-month objective.

## 3 · Funding roadmap

Stage	Source	Ticket	Speed
Bridge 2024	NLnet NGI Zero rolling grants (€5–50 k, 2-month decisions)  ￼ ￼ + Mozilla MOSS (10–30 k)	keeps lights on after quitting job	
Pilot income	Paid trial with ND org / uni lab (5–15 k)	contract in ~1 mo	
Community	GitHub Sponsors/OpenCollective (~1-2 k €/mo)  ￼	immediate	
Scale 2025	Prototype Fund (€95 k / 6 m)  ￼ ￼ (next call Oct 2025)		
Optional seed	Angels + INVEST bonus, then HTGF (€800 k)	post-traction	

No double-funding clashes—rolling grants run this year, PF next.

## 4 · Six-month quit-job plan (dated)
	1.	May 2025 – publish repo & sponsors page; draft NLnet proposal.
	2.	Jun – shift to 4-day week; secure LOI from ND partner.
	3.	Jul – submit Mozilla MOSS; launch alpha for testimonials.
	4.	Aug – NLnet decision; resign if funded.
	5.	Sep – start paid pilot; hire part-time UX.
	6.	Oct – public beta metrics → include in Prototype Fund application.

## 5 · Immediate next actions
	1.	Freeze the MVP backlog exactly as above.
	2.	Write NLnet 2-pager (problem, OSS solution, budget).
	3.	Record 2-minute demo GIF for grant reviewers.
	4.	Draft LOI template; send to ND org & uni inclusion lab.
	5.	Open GitHub Sponsors and tweet/LinkedIn to ND communities.

This staged, scope-locked plan gets you off the day-job treadmill within four months while keeping the long-term Prototype Fund track open and the Open Badges server clean.
