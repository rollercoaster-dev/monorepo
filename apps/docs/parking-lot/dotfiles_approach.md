# Dotfiles Approach

## Overview

Integrate your `.cursor/working` structure into a dotfiles repository for consistent setup across all your development environments.

## Implementation Steps

1. **Create or update your dotfiles repository**
   - Add the `.cursor/working` structure to your dotfiles repo
   - Create a symlink setup script

2. **Setup script example**

   ```bash
   #!/bin/bash
   # setup-cursor-working.sh

   # Define source and target
   DOTFILES_DIR="$HOME/dotfiles"
   CURSOR_TEMPLATE="$DOTFILES_DIR/.cursor/working"

   # Function to set up in a specific directory
   setup_cursor_working() {
     local TARGET_DIR="$1/.cursor/working"

     # Create directory if it doesn't exist
     mkdir -p "$TARGET_DIR"

     # Create symlinks for each top-level directory
     for dir in "$CURSOR_TEMPLATE"/*; do
       if [ -d "$dir" ]; then
         dir_name=$(basename "$dir")
         ln -sf "$dir" "$TARGET_DIR/$dir_name"
       fi
     done

     echo "Set up .cursor/working in $1"
   }

   # If no argument is provided, use current directory
   if [ -z "$1" ]; then
     setup_cursor_working "$(pwd)"
   else
     setup_cursor_working "$1"
   fi
   ```

3. **Add to your dotfiles installation**
   - Include in your main dotfiles setup script
   - Make it optional during installation

## Benefits

- Consistent across all your machines
- Updates propagate to all projects
- Integrates with your existing dotfiles workflow
