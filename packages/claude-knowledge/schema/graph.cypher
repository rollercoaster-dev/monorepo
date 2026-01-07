// Neo4j Knowledge Graph Schema (Phase 2)
//
// This file defines the graph schema for cross-session learning.
// Implementation deferred to Phase 2.

// Node Constraints (run once on setup)
// CREATE CONSTRAINT learning_id IF NOT EXISTS FOR (l:Learning) REQUIRE l.id IS UNIQUE;
// CREATE CONSTRAINT code_area_name IF NOT EXISTS FOR (a:CodeArea) REQUIRE a.name IS UNIQUE;
// CREATE CONSTRAINT file_path IF NOT EXISTS FOR (f:File) REQUIRE f.path IS UNIQUE;
// CREATE CONSTRAINT pattern_id IF NOT EXISTS FOR (p:Pattern) REQUIRE p.id IS UNIQUE;
// CREATE CONSTRAINT mistake_id IF NOT EXISTS FOR (m:Mistake) REQUIRE m.id IS UNIQUE;

// Example Node Structures:
// (:Learning {id, content, source_issue, created_at})
// (:CodeArea {name})  // auth, badges, api, verification
// (:File {path})
// (:Pattern {id, name, description})
// (:Mistake {id, description, how_fixed})

// Example Relationships:
// (:Learning)-[:ABOUT]->(:CodeArea)
// (:Learning)-[:IN_FILE]->(:File)
// (:Mistake)-[:LED_TO]->(:Learning)
// (:Pattern)-[:APPLIES_TO]->(:CodeArea)

// Example Queries:
//
// "What do I know about badge verification?"
// MATCH (l:Learning)-[:ABOUT]->(a:CodeArea {name: 'badges'})
// RETURN l.content, l.source_issue
//
// "What mistakes have been made in this file?"
// MATCH (m:Mistake)-[:IN_FILE]->(f:File {path: $filepath})
// RETURN m.description, m.how_fixed
//
// "What patterns work for auth?"
// MATCH (p:Pattern)-[:APPLIES_TO]->(a:CodeArea {name: 'auth'})
// RETURN p.name, p.description
