#!/bin/bash

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# AppleScript to create iTerm2 layout
osascript <<EOF
tell application "iTerm2"
    activate

    # Create new window
    create window with default profile

    tell current session of current window
        # Start in backend directory
        write text "cd \"$PROJECT_DIR/backend\" && code . && npm run dev"

        # Split right
        tell (split horizontally with default profile)
            # Start in billing directory (right top pane)
            write text "cd \"$PROJECT_DIR/billing\" && code . && npm run dev"

            # Split bottom
            tell (split vertically with default profile)
                # Start in inventory directory (right bottom pane)
                write text "cd \"$PROJECT_DIR/inventory\" && code . && npm run dev"
            end tell
        end tell
    end tell
end tell
EOF
