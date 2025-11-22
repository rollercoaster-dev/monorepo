# Architecture

## Overview
- Describe the high-level architecture of the distributed, local-first badges app.

## Components
- **UI Layer**: VS Code-style interface for badge creation and viewing. Implemented using the **openbadges-ui** package.
- **Badge Engine**: Data model, metadata management, evidence collection. Powered by the **openbadges-modular-server** package.
- **Sync Engine**: Offline-first storage, conflict resolution, replication.
- **AI Services**: Badge scaffolding, journaling, nudges, accessibility transforms.
- **Security Module**: Encryption, key management, VC & DID integration. Utilizes standards from **openbadges-types** for VC implementation.

## Data Flow
- Placeholder for CRDT/replication patterns, event streams, and data pipelines.

## Module Breakdown
- UI
- Badge Engine
- Sync Engine
- AI Services
- Security & Crypto

## Tech Stack
- Placeholder for chosen frameworks, languages, and libraries.

## Related Packages

### openbadges-modular-server
- **Repository**: [rollercoaster-dev/openbadges-modular-server](https://github.com/rollercoaster-dev/openbadges-modular-server)
- **Description**: A stateless, modular Open Badges API with support for both Open Badges 2.0 and 3.0 specifications.
- **Status**: In active development
- **Features**:
  - Dual-version support for Open Badges 2.0 and 3.0 specifications
  - Modular architecture for easy integration with different database systems
  - Domain-driven design with clean separation of concerns
  - Stateless API design
  - Built with Bun and Elysia framework
- **Role in Architecture**: Serves as the core Badge Engine component, handling badge data models, validation, and API endpoints.

### openbadges-types
- **Repository**: [rollercoaster-dev/openbadges-types](https://github.com/rollercoaster-dev/openbadges-types)
- **Description**: TypeScript type definitions for Open Badges 2.0 and 3.0 specifications.
- **Status**: Released (v3.2.0)
- **Features**:
  - Comprehensive TypeScript types for both Open Badges 2.0 and 3.0
  - Type guards and validation utilities
  - Badge normalization for working with both versions
  - JSON-LD context schemas
- **Role in Architecture**: Provides the type foundation used across all components, ensuring consistency between UI, Badge Engine, and Security Module implementations.

### openbadges-ui
- **Repository**: [rollercoaster-dev/openbadges-ui](https://github.com/rollercoaster-dev/openbadges-ui)
- **Description**: A Vue 3 component library for implementing Open Badges functionality.
- **Status**: In development
- **Features**:
  - Accessibility-first design following WCAG guidelines
  - Support for both Open Badges 2.0 and 3.0
  - Themeable with CSS variables
  - Framework-agnostic core logic
  - Built on PrimeVue in unstyled mode
- **Role in Architecture**: Implements the UI Layer component, providing the VS Code-style interface for badge creation, viewing, and management.

## Diagrams
- [ ] Add architecture diagram(s) here. 