# REVERSI.EXE to Angular Feature Mapping

## Component Mapping

| Legacy Feature | Angular Component | Description |
|----------------|-------------------|-------------|
| Main Window | `AppComponent` | Main application window with Windows 2.0 chrome |
| Title Bar | `AppComponent` (template) | "Reversi" title with window controls |
| Menu Bar | `MenuComponent` | Game and Skill menus |
| Game Board | `BoardComponent` | 8×8 grid container |
| Board Cell | `TileComponent` | Individual cell with piece rendering |
| Score Display | `StatusBarComponent` | Black/White piece counts |
| Message Display | `StatusBarComponent` | Game messages (win/lose/tie/errors) |
| About Dialog | `AboutDialogComponent` | "About Reversi" modal dialog |

## Service Mapping

| Legacy Function | Angular Service | Method/Property |
|-----------------|-----------------|-----------------|
| Board State Array (0x0654) | `GameStateService` | `board` signal |
| Current Player | `GameStateService` | `currentPlayer` signal |
| Skill Level | `GameStateService` | `skillLevel` signal |
| Move Validation | `MoveValidationService` | `validateMove()` |
| Valid Moves Check | `MoveValidationService` | `getValidMoves()`, `hasValidMoves()` |
| Piece Counting | `MoveValidationService` | `countPieces()` |
| AI Move Selection | `ComputerPlayerService` | `getMove()` |
| Game Loop | `GameEngineService` | `makeMove()`, `pass()` |
| New Game Init | `GameEngineService` | `newGame()` |
| Hint Logic | `GameEngineService` | `getHint()` |

## Menu Mapping

### Game Menu
| Original Label | Shortcut | Angular Event | Handler |
|----------------|----------|---------------|---------|
| &Hint | Alt+H | `(hint)` | `onHint()` |
| &Pass | Alt+P | `(pass)` | `onPass()` |
| &New | Alt+N | `(newGame)` | `onNewGame()` |
| E&xit | Alt+X | `(exit)` | `onExit()` |
| A&bout Reversi... | Alt+B | `(about)` | `onAbout()` |

### Skill Menu
| Original Label | Shortcut | Angular Event | Value |
|----------------|----------|---------------|-------|
| &Beginner | Alt+B | `(skillChange)` | `SkillLevel.Beginner` |
| &Novice | Alt+N | `(skillChange)` | `SkillLevel.Novice` |
| &Expert | Alt+E | `(skillChange)` | `SkillLevel.Expert` |
| &Master | Alt+M | `(skillChange)` | `SkillLevel.Master` |

## Data Structure Mapping

### Board Array
| Original | Angular |
|----------|---------|
| 10×10 array at segment 0x0654 | `CellState[][]` (10×10) |
| Boundary: 0xFF | `CellState.Boundary` |
| Empty: 0x00 | `CellState.Empty` |
| White: 0x02 | `CellState.White` |
| Black: 0x03 | `CellState.Black` |

### Initial Position
| Display Position | Internal Index | Original Offset | Piece |
|------------------|----------------|-----------------|-------|
| (4,4) | [4][4] | 0x2C | White |
| (4,5) | [4][5] | 0x2D | Black |
| (5,4) | [5][4] | 0x36 | Black |
| (5,5) | [5][5] | 0x37 | White |

## Visual Mapping

### Colors
| Original Element | Windows 2.0 Color | CSS Value |
|------------------|-------------------|-----------|
| Desktop | Teal | `#008080` |
| Window Background | Light Gray | `#c0c0c0` |
| Title Bar | Navy Blue Gradient | `linear-gradient(#000080, #1084d0)` |
| Board | Green | `#008000` |
| Grid Lines | Black | `#000000` |
| Black Piece | Black | `#000000` |
| White Piece | White | `#ffffff` |

### UI Elements
| Original | Angular CSS Class |
|----------|-------------------|
| Window Border | `.window` with `border: 2px outset` |
| Menu Bar | `.menu-bar` |
| Dropdown Menu | `.dropdown` |
| 3D Button | `border: 2px outset #c0c0c0` |
| Pressed Button | `border-style: inset` |

## Message Mapping

| Original String | Location | Angular Usage |
|-----------------|----------|---------------|
| "You may only move to a space where the cursor is a cross." | 0x3D02 | Invalid move error |
| "You may not pass. Move where the cursor is a cross." | 0x3D3C | Cannot pass error |
| "You must Pass" | 0x3CC7 | Forced pass message |
| "Tie Game" | 0x3CD5 | Draw result |
| "You Won by X" | 0x3CEB | Win result |
| "You Lost by X" | 0x3CDE | Loss result |

## Behavioral Fidelity

| Behavior | Implementation |
|----------|----------------|
| Human plays first | `currentPlayer` initialized to `Player.Human` |
| Human is Black | `Player.Human = CellState.Black` |
| Computer is White | `Player.Computer = CellState.White` |
| Valid move cursor | CSS `cursor: crosshair` on valid cells |
| Computer "thinking" | 300ms delay before AI move |
| Skill affects AI depth | `ComputerPlayerService.getMove()` switches by level |

---

*Document generated for REVERSI.EXE Angular clone project*
*January 2026*
