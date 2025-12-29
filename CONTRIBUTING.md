# Contributing to Rollercoaster.dev Monorepo

Thank you for your interest in contributing to Rollercoaster.dev! This project is built with neurodivergent-first principles, and we extend that philosophy to our contribution process.

## 🎯 Philosophy

**Low Barrier to Entry**

- Clear, step-by-step instructions
- No assumed knowledge
- Patient, supportive review process
- Multiple ways to contribute (not just code!)

**Neurodivergent-Friendly Process**

- Predictable workflows
- Written documentation over synchronous meetings
- Time to process and respond (no pressure)
- Recognition that different brains work differently

## 🚀 Quick Start

### First Time Setup

1. **Fork and Clone**

   ```bash
   gh repo fork rollercoaster-dev/monorepo --clone
   cd monorepo
   ```

2. **Install Dependencies**

   ```bash
   # Install Bun if you don't have it
   curl -fsSL https://bun.sh/install | bash

   # Install all dependencies
   bun install
   ```

3. **Verify Setup**

   ```bash
   # Run tests
   bun test

   # Build everything
   bun run build
   ```

### Making Changes

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make Your Changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test Your Changes**

   ```bash
   # Run tests for affected packages
   bun test

   # Run linting
   bun run lint

   # Type check
   bun run type-check
   ```

4. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

   See [Commit Message Format](#commit-message-format) below.

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   gh pr create
   ```

## 📝 Ways to Contribute

### Code Contributions

- **Bug fixes** - Found something broken? Fix it!
- **New features** - Check [Issues](https://github.com/rollercoaster-dev/monorepo/issues) for planned work
- **Tests** - Improve test coverage
- **Performance** - Make things faster

### Non-Code Contributions

- **Documentation** - Improve clarity, fix typos, add examples
- **Design** - UX improvements, accessibility feedback
- **Testing** - Manual testing, bug reports
- **User stories** - Share your experience, suggest features
- **Neurodivergent UX feedback** - This is HUGELY valuable!

## 🏗️ Monorepo Structure

```
monorepo/
├── apps/                    # Applications (openbadges-system, etc.)
├── packages/                # Shared libraries
└── experiments/             # Research and prototypes
```

**When making changes:**

- Applications go in `apps/`
- Reusable code goes in `packages/`
- Experimental ideas go in `experiments/`

## 🧪 Testing

### Running Tests

```bash
# All tests
bun test

# Specific package
bun --filter openbadges-types test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### Writing Tests

- **Test what matters** - Focus on behavior, not implementation
- **Clear test names** - `it('should create self-signed badge when user provides evidence')`
- **Arrange-Act-Assert** - Setup, execute, verify
- **Test edge cases** - Null, empty, invalid inputs

## 📐 Code Style

### TypeScript

- **Strict mode enabled** - Fix type errors, don't use `any`
- **Explicit types** - Prefer explicit over inferred when it aids clarity
- **Functional when possible** - Pure functions, immutability

### Formatting

```bash
# Check formatting
bun run format:check

# Auto-fix formatting
bun run format
```

We use Prettier - don't fight it, let it handle formatting.

### Linting

```bash
# Check linting
bun run lint

# Auto-fix linting issues
bun run lint:fix
```

## 📋 Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear, scannable history.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code change that neither fixes bug nor adds feature
- `perf:` - Performance improvement
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks, dependencies

### Scope

The package or app affected:

- `openbadges-system`
- `openbadges-ui`
- `skill-tree`
- `docs`
- `ci`

### Examples

```bash
feat(openbadges-system): add self-signed badge creation
fix(openbadges-ui): correct dyslexia theme font loading
docs(readme): update installation instructions
test(skill-tree): add visualization render tests
chore(deps): upgrade vue to 3.4.0
```

## 🔄 Pull Request Process

### Before Submitting

- [ ] Tests pass (`bun test`)
- [ ] Linting passes (`bun run lint`)
- [ ] Type checking passes (`bun run type-check`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention

### PR Template

When you create a PR, include:

```markdown
## What does this PR do?

Brief description of the change

## Why?

What problem does this solve?

## How to test?

Steps to verify the change works

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Breaking changes noted
```

### Review Process

1. **Automated checks** - CI runs tests, linting, type checking
2. **Code review** - Maintainer reviews code
3. **Feedback** - Address comments (no pressure, take your time)
4. **Approval** - Once approved, we'll merge
5. **Merge** - Squash and merge to keep history clean

**Timeline**: We try to review within 2-3 days. No pressure on you to respond quickly - take the time you need.

## 🔧 Maintenance Tasks

### Updating Bun Version

We update Bun regularly to get latest features and fixes.

**Update Method:**

```bash
# Update Bun to latest
bun upgrade

# Verify installation
bun --version

# Reinstall and test
bun install
bun test

# Commit if needed
git commit -am "chore: update Bun to X.Y.Z"
```

**Why Update:**

- Performance improvements
- Bug fixes
- New workspace features
- Security patches

## 🌐 SSR Safety Requirements

When writing code that runs in both browser and server environments (SSR/SSG):

### DOM/Window Access

Any code that accesses `document` or `window` must include guards:

```typescript
// Always guard direct DOM access
if (typeof document === "undefined") return;

// Or use optional chaining for simple access
const width = typeof window !== "undefined" ? window.innerWidth : 0;
```

### Vue Component Lifecycle Cleanup

If a component modifies `document.body` or creates global event listeners, add cleanup:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

onMounted(() => {
  // SSR guard
  if (typeof document === "undefined") return;

  document.body.classList.add("modal-open");
});

onUnmounted(() => {
  // Clean up DOM modifications
  if (typeof document === "undefined") return;

  document.body.classList.remove("modal-open");
});
</script>
```

### Template Defensive Coding

Always guard against undefined values before comparison:

```vue
<!-- Bad - may error if status is undefined -->
<div v-if="status !== 'not-applicable'"></div>
```

### Type Guards for Open Badges

Use `typeIncludes()` from `openbadges-types` for checking badge types (handles both string and array per OB2/OB3 spec):

```typescript
import { typeIncludes } from "openbadges-types";

// Works with both string and array type values
if (typeIncludes(badge.type, "Assertion")) {
  // Handle OB2 Assertion
}
```

## 🏷️ Issue Labels

- `good first issue` - Great for newcomers
- `help wanted` - We'd love contributions on this
- `bug` - Something's broken
- `enhancement` - New feature request
- `docs` - Documentation improvement
- `priority:critical/high/medium/low` - Issue priority
- `pkg:*` - Package-specific (e.g., `pkg:openbadges-types`)
- `app:*` - Application-specific (e.g., `app:openbadges-server`)
- `ob3-compliance` - Open Badges 3.0 spec work

## 🎯 Milestones & Priority

### Milestone Structure

Issues are organized into milestones by feature area:

```
OB3 Phase 1: Core Spec     ← Critical spec compliance (PRIORITY)
OB3 Phase 2: UI Layer      ← Forms and components
OB3 Phase 3: Quality       ← Test coverage and polish

OpenBadges Badge Generator ← Foundation layer (baking, verification)
MVP: Self-Signed Badges    ← Depends on Badge Generator
MVP: Badge Backpack        ← Independent, can work in parallel

Core Services              ← API keys, OAuth, conformance
Developer Experience       ← Documentation and onboarding
Infrastructure             ← CI/CD, tooling, tech debt
```

### Dependency Chain

```
Badge Generator (#14) → Self-Signed (#7)
                     ↘ Backpack (#8) [parallel]

OB3 Phase 1 → OB3 Phase 2 → OB3 Phase 3
```

### Picking Work

1. Check [Project Board](https://github.com/orgs/rollercoaster-dev/projects/11) for current priorities
2. Look for issues in priority milestones (OB3 Phase 1, Badge Generator)
3. Check issue dependencies - some are blocked by other work
4. `good first issue` labels are great for getting started

## 🎨 Design Contributions

We use [openbadges-ui](https://github.com/rollercoaster-dev/openbadges-ui) for our design system.

**7 Neurodivergent Themes:**

1. Dyslexia-friendly
2. Autism-friendly
3. Low vision
4. High contrast
5. Large text
6. Dark mode
7. Classic

When contributing design changes:

- Follow existing design system
- Test with multiple themes
- Consider cognitive load
- Get feedback from neurodivergent users

## 🧠 Neurodivergent-Friendly Guidelines

### For Contributors

- **No deadlines unless critical** - Work at your pace
- **Written > verbal** - All important info documented
- **Questions welcome** - There are no "dumb" questions
- **Hyperfocus-friendly** - Deep work is valued
- **Context switching is hard** - We get it, we design for it

### For Reviewers

- **Specific feedback** - "The error message is unclear" not "This needs work"
- **Assume good intent** - Everyone's trying their best
- **Tone matters** - Be kind, be patient
- **Celebrate wins** - Acknowledge good work

## 📚 Resources

### Project Documentation

- [Project Board](https://github.com/orgs/rollercoaster-dev/projects/11) - Current work
- [Issues](https://github.com/rollercoaster-dev/monorepo/issues) - Tasks and bugs
- [Vision Docs](apps/docs/vision/) - Where we're going (after Phase 5.5)

### Technical

- [Open Badges 3.0 Spec](https://www.imsglobal.org/spec/ob/v3p0/)
- [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [DIDs](https://www.w3.org/TR/did-core/)
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Turborepo](https://turbo.build/repo/docs)

### Tools

- [Bun](https://bun.sh/) - JavaScript runtime
- [Hono](https://hono.dev/) - Web framework
- [Vue 3](https://vuejs.org/) - Frontend framework
- [Drizzle](https://orm.drizzle.team/) - Database ORM

## 🤝 Code of Conduct

### Our Standards

- **Respectful** - Treat everyone with dignity
- **Inclusive** - Welcome diverse perspectives
- **Patient** - Everyone learns at different speeds
- **Kind** - Assume good intentions

### Unacceptable Behavior

- Harassment, discrimination, or hate speech
- Personal attacks or insults
- Pressure tactics or demanding behavior
- Gatekeeping or elitism

### Enforcement

If you experience or witness unacceptable behavior, please report it to the maintainers. All reports will be handled with discretion.

## ❓ Questions?

- **Not sure where to start?** Check issues labeled `good first issue`
- **Have a question?** Open a [Discussion](https://github.com/orgs/rollercoaster-dev/discussions)
- **Found a bug?** Open an [Issue](https://github.com/rollercoaster-dev/monorepo/issues)
- **Want to chat?** (Coming soon: Discord/community links)

## 🙏 Thank You!

Every contribution, no matter how small, makes this project better. Whether you're fixing a typo, reporting a bug, or building a major feature - thank you for being part of Rollercoaster.dev.

Your perspective matters. Your experience matters. Your contributions matter.

---

**Remember**: This is a neurodivergent-first project. If our process doesn't work for you, let us know. We'll adapt.
