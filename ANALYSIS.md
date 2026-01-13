# REVERSI.EXE Analysis Document

## Original Application Analysis

### Executive Summary
Windows 2.0 Reversi (REVERSI.EXE) is a 16-bit New Executable (NE) format application implementing the classic board game Reversi (also known as Othello). This document provides a comprehensive analysis for faithful Angular recreation.

---

## 1. Technical Specifications

| Property | Value |
|----------|-------|
| Executable Type | 16-bit NE (New Executable) |
| Target OS | Microsoft Windows 2.0 |
| CPU | 8086 Real Mode |
| File Size | 15,760 bytes |
| NE Header Offset | 0x0400 |

---

## 2. Game Rules & Mechanics

### 2.1 Board Structure
- **Display Grid**: 8×8 squares (64 total positions)
- **Internal Grid**: 10×10 array (includes boundary cells for calculation)
- **Array Layout**: Row × 10 + Column addressing
- **Cell Values**:
  - `0x00` = Empty
  - `0x02` = White piece
  - `0x03` = Black piece  
  - `0xFF` = Boundary (rows/cols 0 and 9)

### 2.2 Initial Setup
Standard center placement:
```
Position (4,4) = White  [Array offset 0x2C/44]
Position (4,5) = Black  [Array offset 0x2D/45]
Position (5,4) = Black  [Array offset 0x36/54]
Position (5,5) = White  [Array offset 0x37/55]
```

Visual representation:
```
    1   2   3   4   5   6   7   8
  +---+---+---+---+---+---+---+---+
1 |   |   |   |   |   |   |   |   |
  +---+---+---+---+---+---+---+---+
2 |   |   |   |   |   |   |   |   |
  +---+---+---+---+---+---+---+---+
3 |   |   |   |   |   |   |   |   |
  +---+---+---+---+---+---+---+---+
4 |   |   |   | W | B |   |   |   |
  +---+---+---+---+---+---+---+---+
5 |   |   |   | B | W |   |   |   |
  +---+---+---+---+---+---+---+---+
6 |   |   |   |   |   |   |   |   |
  +---+---+---+---+---+---+---+---+
7 |   |   |   |   |   |   |   |   |
  +---+---+---+---+---+---+---+---+
8 |   |   |   |   |   |   |   |   |
  +---+---+---+---+---+---+---+---+
```

### 2.3 Game Rules
1. **Objective**: Have more pieces of your color when the game ends
2. **Move Mechanics**:
   - Place a piece to capture opponent pieces
   - Must outflank opponent pieces in at least one direction
   - Outflanked pieces are flipped to your color
   - Captures occur in 8 directions: horizontal, vertical, diagonal
3. **Turn Rules**:
   - If a valid move exists, player must make a move
   - If no valid move exists, player must pass
   - If both players cannot move, game ends
4. **End Conditions**:
   - Board is full (64 pieces placed)
   - Neither player can make a valid move
5. **Scoring**: Count of pieces for each color

### 2.4 Player Assignment
- **Human**: Black pieces (plays first)
- **Computer**: White pieces (AI opponent)

---

## 3. User Interface Layout

### 3.1 Window Structure
```
+------------------------------------------+
| [Menu Bar: Game | Skill]                 |
+------------------------------------------+
|                                          |
|    +---------------------------+         |
|    |                           |         |
|    |     8x8 Game Board        |         |
|    |                           |         |
|    +---------------------------+         |
|                                          |
| [Score Display: Black: XX  White: XX]    |
+------------------------------------------+
```

### 3.2 Dimensions & Proportions
- Window is relatively compact
- Board cells are square, equal size
- Board has visible grid lines
- Score display below board
- Classic Windows 2.0 window chrome

### 3.3 Colors (Windows 2.0 Palette)
| Element | Color |
|---------|-------|
| Window Background | Light gray (#C0C0C0) |
| Board Background | Green (classic Reversi green) |
| Grid Lines | Black |
| Black Pieces | Black with highlight |
| White Pieces | White with shadow |
| Menu Bar | Gray/White |
| Menu Text | Black |

---

## 4. Menu Structure

### 4.1 Game Menu
| Item | Shortcut | Action |
|------|----------|--------|
| &Hint | Alt+H | Show suggested move |
| &Pass | Alt+P | Pass turn (if no valid moves) |
| &New | Alt+N | Start new game |
| E&xit | Alt+X | Close application |
| A&bout Reversi... | Alt+B | Show about dialog |

### 4.2 Skill Menu
| Item | Shortcut | Description |
|------|----------|-------------|
| &Beginner | Alt+B | Easiest difficulty |
| &Novice | Alt+N | Easy difficulty |
| &Expert | Alt+E | Medium difficulty |
| &Master | Alt+M | Hardest difficulty |

---

## 5. User Interactions

### 5.1 Mouse Actions
- **Left Click on Board**: Attempt to place piece at cursor position
- **Cursor Display**: 
  - Cross/Plus cursor when hovering valid move position
  - Standard arrow when hovering invalid position

### 5.2 Keyboard Shortcuts
- Alt+G: Open Game menu
- Alt+S: Open Skill menu
- Alt+H: Hint
- Alt+P: Pass
- Alt+N: New Game
- Alt+X: Exit
- Alt+B: About dialog (from Game menu)

### 5.3 Error Messages
1. **Invalid Move**: "You may only move to a space where the cursor is a cross."
2. **Cannot Pass**: "You may not pass. Move where the cursor is a cross."
3. **Must Pass**: "You must Pass"

### 5.4 Game End Messages
- **Tie**: "Tie Game"
- **Win**: "You Won by [X]"
- **Loss**: "You Lost by [X]"

---

## 6. AI Behavior

### 6.1 Skill Levels
The computer opponent has 4 skill levels affecting:
- Search depth for move evaluation
- Move selection strategy

| Level | Behavior |
|-------|----------|
| Beginner | Minimal lookahead, random-ish moves |
| Novice | Basic strategy, some lookahead |
| Expert | Good strategy, deeper search |
| Master | Maximum search depth, best play |

### 6.2 AI Move Timing
- Computer "thinks" for a brief moment
- Move is displayed after computation completes
- No explicit thinking animation

---

## 7. Dialog Boxes

### 7.1 About Dialog
- Title: "About Reversi" or similar
- Shows application name
- Shows copyright information
- Single OK button to dismiss

---

## 8. Visual Details

### 8.1 Piece Rendering
- Circular pieces
- 3D effect with highlight/shadow
- Black piece: Dark with slight highlight
- White piece: Light with slight shadow

### 8.2 Board Rendering
- Green background
- Black grid lines
- Equal-sized square cells
- Pieces centered in cells

### 8.3 Window Chrome
- Windows 2.0 style title bar
- System menu button (top-left)
- Minimize/maximize buttons (if applicable)
- Standard window border

---

## 9. State Management

### 9.1 Game State
- Current board configuration (64 cells)
- Current player turn
- Score for each player
- Selected difficulty level
- Game over flag

### 9.2 Persistence
- No save/load functionality in original
- Game resets on New Game
- Difficulty persists during session

---

## 10. Edge Cases & Special Behaviors

1. **Multiple Captures**: Single move can flip pieces in multiple directions
2. **Corner Priority**: AI may prioritize corner moves (strategic value)
3. **Forced Pass**: Automatic detection when player has no valid moves
4. **Game End Detection**: Checks after each move if game should end
5. **Score Update**: Real-time update after each move

---

## 11. Component Mapping (Legacy → Angular)

| Legacy Feature | Angular Component/Service |
|----------------|---------------------------|
| Main Window | AppComponent |
| Game Board | BoardComponent |
| Individual Cell | TileComponent |
| Menu Bar | MenuComponent |
| Score Display | StatusBarComponent |
| About Dialog | AboutDialogComponent |
| Game Logic | GameEngineService |
| Move Validation | MoveValidationService |
| Game State | GameStateService |
| AI Opponent | ComputerPlayerService |

---

## 12. Implementation Notes

### 12.1 Strict Fidelity Requirements
- NO modern UI improvements
- NO animations or transitions
- NO responsive design
- NO accessibility enhancements
- Exact color matching to Windows 2.0
- Exact menu structure and labels
- Exact game behavior including quirks

### 12.2 Visual Authenticity
- Use pixel-perfect or close fonts
- Replicate Windows 2.0 button styles
- Match exact window proportions
- Classic cursor styles where possible

---

*Document generated during REVERSI.EXE reverse engineering analysis*
*Date: January 2026*
