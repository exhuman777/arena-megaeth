#!/bin/bash
# Build script for Neocities deployment
# Creates a dist-neocities/ folder with all static files

set -e

DIST="dist-neocities"

echo "Building Neocities distribution..."

# Clean and create dist folder
rm -rf "$DIST"
mkdir -p "$DIST/assets"
mkdir -p "$DIST/assets/icons32"

# Copy HTML files (excluding admin, trailer stuff)
cp index.html "$DIST/"
cp promo.html "$DIST/"
cp arena.html "$DIST/"
cp hub.html "$DIST/"
cp party.html "$DIST/"
cp party-game.html "$DIST/"
cp leaderboard.html "$DIST/"
cp guides.html "$DIST/"
cp about.html "$DIST/"
cp help.html "$DIST/" 2>/dev/null || true

# Copy CSS
cp styles.css "$DIST/"

# Copy all assets
cp assets/*.js "$DIST/assets/"
cp assets/*.png "$DIST/assets/"

# Copy icons folder if exists
cp -r assets/icons32/* "$DIST/assets/icons32/" 2>/dev/null || true

# Copy PWA files
cp manifest.json "$DIST/"
cp sw.js "$DIST/"

# Create README for the distribution
cat > "$DIST/README.txt" << 'EOF'
ARENA SURVIVAL - Standalone Version
====================================

HOW TO PLAY:
1. Open index.html or arena.html in your browser
2. That's it! No server needed.

FILES:
- index.html      - Main menu
- promo.html      - Landing page
- arena.html      - Game
- hub.html        - Character hub
- party.html      - Multiplayer setup
- party-game.html - Multiplayer game
- leaderboard.html- Local leaderboard
- guides.html     - How to play
- about.html      - About the game

NOTE: This version uses localStorage for saves.
Leaderboard is local only (no global rankings).

For the full experience with online leaderboards,
run the server version from the main repository.
EOF

echo "Done! Files in $DIST/"
echo ""
echo "To deploy to Neocities:"
echo "  1. Go to neocities.org and create an account"
echo "  2. Upload all files from $DIST/"
echo "  3. Your game will be at yoursite.neocities.org"
