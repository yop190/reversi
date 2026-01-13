REVERSI.EXE - Background Color Patch
=====================================

This floppy contains:
- REVERSI.EXE (patched for yellow background)
- REVERSI.BAK (original backup)
- README.TXT (this file)

USAGE IN DOSBOX:
1. Start DOSBox
2. Mount this image: IMGMOUNT A REVERSI.IMG -t floppy
3. Switch to A drive: A:
4. Run: REVERSI.EXE

USAGE IN WINDOWS 2.0:
1. Copy REVERSI.EXE to C:\WINDOWS
2. Create a program item in Program Manager
3. Run Reversi

PATCH DETAILS:
- Offset 0x0942 changed from 6A 01 to 6A 0B
- Attempts to use brush ID 11 for yellow background
- Original backed up as REVERSI.BAK

To revert: Copy REVERSI.BAK over REVERSI.EXE

Created: January 2026
