# Knight Adventure Platformer

A 2D platformer game built with Phaser, featuring a playable knight, monsters, and a powerful level editor.

## Features
- Classic platformer gameplay with jumping, rolling, and monster encounters
- Multiple block types: terrain, decorative, special (water/lava), and trees
- Level editor with support for placing any block or monster
- Save and export custom levels as JSON
- Modern UI and keyboard/mouse controls

## Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd My-Game
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
4. Open your browser and go to `http://localhost:3000` (or the port shown in your terminal).

## Controls

### Main Game
- **Arrow Keys**: Move left/right, jump
- **Space**: Roll
- **Mouse**: Interact with menus

### Level Editor
- **1**: Terrain blocks
- **2**: Decorative blocks
- **3**: Special blocks (water, lava)
- **4**: Tree blocks
- **5**: Monster
- **Left/Right Arrow**: Cycle through blocks in the current category
- **Left Click**: Place block/monster
- **Right Click**: Remove block/monster
- **S**: Save/export level as JSON
- **Q/Esc**: Toggle command menu
- **M**: Return to main menu (when menu is open)

## Level Editor Usage
1. Select a block category (1-4) or monster (5).
2. Use left/right arrows to choose a block within the category.
3. Click on the grid to place blocks or monsters.
4. Right-click to remove blocks or monsters.
5. Press **S** to save/export your level as a JSON file.

## Assets & Credits
- Sprites by [analogStudios_](https://analogstudios.itch.io/) and [RottingPixels](https://rottingpixels.itch.io/)
- Sounds and music by Brackeys, Asbjørn Thirslund, Sofia Thirslund
- Fonts by Jayvee Enaguas ([Pixel Operator](https://www.dafont.com/pixel-operator.font))

All assets are used under the Creative Commons Zero (CC0) license.

---

Enjoy building and playing your own platformer levels!

