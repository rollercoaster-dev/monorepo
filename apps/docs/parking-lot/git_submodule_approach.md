# Git Submodule Approach

## Overview
Use Git submodules to include your `.cursor/working` structure as a submodule in each project, allowing for centralized updates.

## Implementation Steps

1. **Create a dedicated repository**
   - Create a repository containing only your `.cursor/working` structure
   - Include README and documentation

2. **Add as a submodule to projects**
   ```bash
   # In your project repository
   git submodule add https://github.com/yourusername/cursor-working.git .cursor/working
   git commit -m "Add .cursor/working as a submodule"
   ```

3. **Update across projects**
   ```bash
   # Update the submodule to the latest version
   git submodule update --remote .cursor/working
   git commit -m "Update .cursor/working submodule"
   ```

4. **Clone projects with submodules**
   ```bash
   # When cloning a project that uses the submodule
   git clone --recurse-submodules https://github.com/yourusername/your-project.git
   ```

5. **Create a helper script**
   ```bash
   #!/bin/bash
   # cursor-working-update.sh
   
   # Update the submodule
   git submodule update --remote .cursor/working
   
   # Commit the update
   git commit -m "Update .cursor/working submodule" .cursor/working
   ```

## Benefits
- Centralized updates
- Version control for your structure
- Easy to roll back changes if needed
