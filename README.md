# 🎮 Reversi - Modern Angular Application

A classic Reversi (Othello) game reimagined with modern web technologies. Originally based on Microsoft's Windows 2.0 Reversi, this project has been fully modernized while preserving 100% of the original game functionality.

![Angular](https://img.shields.io/badge/Angular-19-DD0031?logo=angular)
![Material](https://img.shields.io/badge/Material-3-673AB7?logo=material-design)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)

## ✨ Features

### Modern UI/UX
- **Glassmorphism Design** - Elegant frosted glass effects with backdrop blur
- **3D Game Pieces** - Realistic pieces with gradients, shadows, and flip animations
- **Responsive Layout** - Fully responsive from mobile to desktop
- **Dark Theme** - Beautiful dark color scheme with cyan/violet accents
- **Smooth Animations** - CSS animations for piece placement, flips, and UI interactions
- **Accessibility** - Full keyboard navigation and ARIA labels

### Game Features
- **4 Difficulty Levels** - Beginner, Novice, Expert, Master
- **AI Opponent** - Computer player with varying strategy depths
- **Hint System** - Get move suggestions when stuck
- **Move Validation** - Visual indicators for valid moves
- **Pass Detection** - Automatic handling when no valid moves available
- **Game Over Detection** - Victory/draw detection with winner announcement

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `N` | New Game |
| `H` | Show Hint |
| `P` | Pass Turn |
| `1-4` | Set Difficulty (Beginner to Master) |
| `Esc` | Close Dialog |

## 🚀 Quick Start

### Prerequisites
- Node.js 18.19.1+ or 20.11.1+ or 22+
- npm 6.11.0+ or yarn 1.13.0+

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd REVERSI

# Install dependencies
npm install

# Start development server
npm start
```

Navigate to `http://localhost:4200/`. The app will hot-reload on file changes.

### Build for Production
```bash
npm run build
```
Build output is in `dist/reversi-app/`.

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 19.2.18 | Framework |
| Angular Material | 19.2.19 | UI Components (Material 3) |
| Tailwind CSS | 3.x | Utility-first styling |
| TypeScript | 5.x | Type safety |
| RxJS | 7.x | Reactive programming |
| Angular Signals | Latest | State management |

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── about-dialog/     # About modal with glass morphism
│   │   ├── board/            # 8x8 game board with coordinates
│   │   ├── menu/             # Material toolbar with dropdown menus
│   │   ├── status-bar/       # Score display with animated indicators
│   │   └── tile/             # Individual cell with 3D piece rendering
│   ├── models/
│   │   └── game.types.ts     # TypeScript interfaces & enums
│   ├── services/
│   │   ├── computer-player.service.ts  # AI move calculation
│   │   ├── game-engine.service.ts      # Game orchestration
│   │   ├── game-state.service.ts       # Reactive state (Signals)
│   │   └── move-validation.service.ts  # Reversi rules engine
│   └── app.component.ts      # Root component
├── custom-theme.scss         # Material 3 theme (cyan/violet)
├── styles.css                # Tailwind + custom utilities
└── index.html                # Entry HTML with meta tags
```

## 🎨 Design System

### Color Palette
- **Primary**: Cyan (`#00bcd4`)
- **Accent**: Violet (`#7c3aed`)
- **Background**: Slate gradients (`#0f172a` → `#1e293b`)
- **Black Pieces**: Deep slate with gradient
- **White Pieces**: Pearl white with gradient

### Animations
- Piece flip: 3D transform on Y-axis
- Piece drop: Scale bounce effect
- Valid move pulse: Ripple animation
- Score update: Count-up animation
- UI elements: Fade and slide transitions

## 🎯 Game Rules

1. **Objective**: Have more pieces of your color when the game ends
2. **Placement**: Place a piece to "sandwich" opponent pieces between your existing pieces
3. **Flipping**: All sandwiched opponent pieces flip to your color
4. **Valid Moves**: You must flip at least one opponent piece
5. **Passing**: If no valid moves, your turn is skipped
6. **Game Over**: When no player can move, highest piece count wins

## 📄 Legacy

This project is a modern reimagining of Microsoft's original Reversi game from Windows 2.0 (1987). The original game code can be found in the `/legacy` folder for historical reference.

Key aspects preserved from the original:
- All game rules and mechanics
- AI difficulty levels
- Hint functionality
- Pass/skip mechanics

## 📝 License

See [LICENSE.TXT](LICENSE.TXT) for details.

---

<p align="center">
  Built with ❤️ using Angular + Material + Tailwind
</p>
