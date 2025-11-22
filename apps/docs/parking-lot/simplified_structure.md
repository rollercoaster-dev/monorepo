# Simplified .cursor/working Structure

## Core Directories

```
.cursor/working/
├── agent/                # AI assistant configuration and memory
│   ├── memory/           # Long-term storage for ideas and context
│   ├── config/           # Assistant behavior configuration
│   ├── frameworks/       # Reusable frameworks for productivity
│   └── templates/        # Reusable templates
├── tasks/                # Task management
│   ├── todo/             # Pending tasks
│   └── completed/        # Finished tasks
├── plan/                 # Project planning documents
├── docs/                 # Documentation
└── utilities/            # Code utilities and helpers
```

## Streamlined Workflow

1. **Task Management**

   - Use emoji prefixes (🟡 in-progress, 🟢 completed) for visual status
   - Standardize task file format with sections:
     - Current Status
     - Next Steps
     - Known Issues & Solutions
     - Notes

2. **Memory Management**

   - Store ideas in `agent/memory/` with prefix `idea_`
   - Keep system prompts in `agent/memory/`

3. **Frameworks**

   - Maintain productivity frameworks in `agent/frameworks/`:
     - `focus_management.md` - Drift detection and parking lot process
     - `time_management.md` - Pomodoro and time estimation
     - `energy_management.md` - Energy level tracking
     - `user_perspective.md` - Perspective integration
     - `intervention_thresholds.md` - When and how to intervene

4. **Planning**
   - Maintain high-level plans in `plan/`
   - Link tasks to plan components

## Benefits

- Reduces directory nesting
- Maintains clear visual status indicators
- Preserves all core functionality
- Works with both Cursor and Augment
