# CLI Tool Setup

## Overview

Create a command-line tool that can initialize, update, and manage your `.cursor/working` structure across projects.

## Implementation Steps

1. **Create a Node.js CLI tool**

   ```javascript
   #!/usr/bin/env node
   // nddev.js - Neurodivergent Developer CLI

   const fs = require("fs-extra");
   const path = require("path");
   const { program } = require("commander");

   program
     .version("1.0.0")
     .description("CLI tool for neurodivergent developer workspace setup");

   program
     .command("init")
     .description(
       "Initialize the .cursor/working structure in the current project",
     )
     .action(() => {
       const templatePath = path.join(__dirname, "template");
       const targetPath = path.join(process.cwd(), ".cursor/working");

       fs.ensureDirSync(targetPath);
       fs.copySync(templatePath, targetPath);

       console.log("Neurodivergent developer workspace initialized!");
     });

   program
     .command("update")
     .description("Update the .cursor/working structure from the template")
     .action(() => {
       // Implementation for updating
     });

   program
     .command("create-task <name>")
     .description("Create a new task file")
     .option("-s, --status <status>", "Task status (todo, in-progress)", "todo")
     .action((name, options) => {
       // Implementation for creating a task
     });

   program.parse(process.argv);
   ```

2. **Package and publish**
   - Create a package.json with the CLI configuration
   - Publish to npm or use locally with npm link

3. **Usage**

   ```bash
   # Initialize in a new project
   nddev init

   # Create a new task
   nddev create-task "implement-feature-x" --status in-progress

   # Update from template
   nddev update
   ```

## Benefits

- Programmatic creation and management
- Can be extended with additional commands
- Consistent structure enforced by code
