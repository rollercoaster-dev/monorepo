# VS Code Extension Setup

## Overview

Create a VS Code extension that provides UI and commands for managing your `.cursor/working` structure directly within the editor.

## Implementation Steps

1. **Initialize a VS Code extension project**

   ```bash
   npm install -g yo generator-code
   yo code
   ```

2. **Define commands in package.json**

   ```json
   "contributes": {
     "commands": [
       {
         "command": "neurodivergent-dev.initWorkspace",
         "title": "ND Dev: Initialize Workspace"
       },
       {
         "command": "neurodivergent-dev.createTask",
         "title": "ND Dev: Create New Task"
       },
       {
         "command": "neurodivergent-dev.parkIdea",
         "title": "ND Dev: Park Idea"
       }
     ],
     "viewsContainers": {
       "activitybar": [
         {
           "id": "neurodivergent-dev",
           "title": "ND Dev",
           "icon": "resources/icon.svg"
         }
       ]
     },
     "views": {
       "neurodivergent-dev": [
         {
           "id": "ndTasks",
           "name": "Tasks"
         },
         {
           "id": "ndIdeas",
           "name": "Ideas"
         }
       ]
     }
   }
   ```

3. **Implement the extension functionality**
   - Create template files
   - Implement command handlers
   - Build tree view providers for tasks and ideas

4. **Package and publish**
   ```bash
   vsce package
   vsce publish
   ```

## Benefits

- Integrated directly into your development environment
- Visual interface for managing tasks and ideas
- Quick commands for common operations
