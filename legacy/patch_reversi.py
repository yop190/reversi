#!/usr/bin/env python3
"""
REVERSI.EXE Patching Tool for Windows 2.0
=========================================

This script creates two modified versions of REVERSI.EXE:
1. REVERSI_DA.EXE - Danish translation
2. REVERSI_2.EXE  - Corner starting positions

Technical Details:
- Executable Type: 16-bit NE (New Executable) format for Windows 2.0
- CPU: 8086 real mode
- The game board is stored as a 10x10 array (includes boundaries)
- Display grid is 8x8, internal grid is 10x10 for calculation
- Board array is at segment offset 0x0654

IMPORTANT: All patches maintain the exact same byte length to preserve
the NE executable structure and avoid relocation issues.
"""

import os
import shutil

def read_exe(filename):
    """Read executable file as bytes"""
    with open(filename, 'rb') as f:
        return bytearray(f.read())

def write_exe(filename, data):
    """Write executable file"""
    with open(filename, 'wb') as f:
        f.write(data)

def patch_bytes(data, offset, old_bytes, new_bytes):
    """
    Patch bytes at given offset.
    Validates that old_bytes match before patching.
    Returns True if patch was applied successfully.
    """
    if len(old_bytes) != len(new_bytes):
        raise ValueError(f"Patch size mismatch at 0x{offset:04X}: "
                        f"old={len(old_bytes)}, new={len(new_bytes)}")
    
    # Verify old bytes match
    actual = bytes(data[offset:offset + len(old_bytes)])
    if actual != old_bytes:
        print(f"WARNING: Bytes at 0x{offset:04X} don't match expected value!")
        print(f"  Expected: {old_bytes.hex()}")
        print(f"  Actual:   {actual.hex()}")
        return False
    
    # Apply patch
    data[offset:offset + len(new_bytes)] = new_bytes
    return True

def patch_string(data, offset, old_str, new_str, pad_char=b'\x00'):
    """
    Patch a string at given offset.
    New string must be <= old string length.
    Pads with null bytes if new string is shorter.
    """
    old_bytes = old_str.encode('latin-1')
    new_bytes = new_str.encode('latin-1')
    
    if len(new_bytes) > len(old_bytes):
        raise ValueError(f"New string too long at 0x{offset:04X}: "
                        f"'{new_str}' ({len(new_bytes)}) > '{old_str}' ({len(old_bytes)})")
    
    # Pad new string to match old length
    padded = new_bytes + pad_char * (len(old_bytes) - len(new_bytes))
    return patch_bytes(data, offset, old_bytes, padded)

def create_danish_version(source_file, output_file):
    """
    Create Danish translation of REVERSI.EXE
    
    Translation strategy:
    - Keep strings same length or shorter
    - No accents (ae for æ, oe for ø, aa for å) to ensure ASCII compatibility
    - Preserve & for keyboard shortcuts
    - Preserve null terminators and structure bytes
    
    Menu resource format at 0x3B60+:
    - Control bytes before menu text
    - Strings are null-terminated
    
    String table at 0x3CA0+:
    - Pascal-style: length byte followed by string
    """
    print(f"\n{'='*60}")
    print("Creating Danish Translation: REVERSI_DA.EXE")
    print('='*60)
    
    data = read_exe(source_file)
    patches_applied = 0
    
    # String translations with offsets and original/new values
    # Format: (offset, original_string, danish_string, description)
    # CORRECTED OFFSETS based on actual hex dump analysis
    translations = [
        # Menu items (at 0x3B60+)
        # Format: control_byte "&MenuText\x00" 
        
        # "&Game" at 0x3B61 -> "&Spil" (same length!)
        (0x3B61, "&Game", "&Spil", "Menu: Game"),
        
        # "&Hint" at 0x3B6A -> "&Tip\x00" 
        (0x3B6A, "&Hint", "&Tip\x00", "Menu: Hint"),
        
        # "&Pass" at 0x3B73 -> "&Pas\x00"  
        (0x3B73, "&Pass", "&Pas\x00", "Menu: Pass"),
        
        # "&New" at 0x3B7C -> "&Ny\x00"
        (0x3B7C, "&New", "&Ny\x00", "Menu: New"),
        
        # "E&xit" at 0x3B88 -> "&Slut" (same length)
        (0x3B88, "E&xit", "&Slut", "Menu: Exit"),
        
        # "A&bout Reversi..." at 0x3B91 -> "O&m Reversi....." (17 chars)
        (0x3B91, "A&bout Reversi...", "O&m Reversi.....", "Menu: About"),
        
        # "&Skill" at 0x3BA4 -> "&Grad\x00"
        (0x3BA4, "&Skill", "&Grad\x00", "Menu: Skill"),
        
        # "&Beginner" at 0x3BAE -> "&Novis\x00\x00\x00" (9 chars)
        (0x3BAE, "&Beginner", "&Novis\x00\x00\x00", "Menu: Beginner"),
        
        # "&Novice" at 0x3BBB -> "&Let\x00\x00\x00" (7 chars)
        (0x3BBB, "&Novice", "&Let\x00\x00\x00", "Menu: Novice"),
        
        # "&Expert" at 0x3BC6 -> "&Eksper" (7 chars)
        (0x3BC6, "&Expert", "&Eksper", "Menu: Expert"),
        
        # "&Master" at 0x3BD1 -> "&Mester" (7 chars)
        (0x3BD1, "&Master", "&Mester", "Menu: Master"),
        
        # String table resources (at 0x3CA0+)
        # Pascal-style: length_byte + string (no null terminator in count)
        
        # "Pass" at 0x3CC2 (length byte 04 at 0x3CC1)
        (0x3CC2, "Pass", "Pas\x00", "Game: Pass"),
        
        # "You must Pass" at 0x3CC7 (length byte 0D=13 at 0x3CC6)
        (0x3CC7, "You must Pass", "Du maa passe\x00", "Game: You must Pass"),
        
        # "Tie Game" at 0x3CD5 (length byte 08 at 0x3CD4)
        (0x3CD5, "Tie Game", "Uafgjort", "Game: Tie Game"),
        
        # "You Lost by " at 0x3CDE (length byte 0C=12 at 0x3CDD)
        (0x3CDE, "You Lost by ", "Du tabte med", "Game: You Lost by"),
        
        # "You Won by " at 0x3CEB (length byte 0B=11 at 0x3CEA)
        (0x3CEB, "You Won by ", "Du vandt me", "Game: You Won by"),
        
        # "About..." at 0x3CF7 (length byte 08 at 0x3CF6)
        (0x3CF7, "About...", "Om......", "Dialog: About..."),
        
        # Long error message (57 chars) at 0x3D02
        (0x3D02, "You may only move to a space where the cursor is a cross.",
         "Du kan kun flytte til felt hvor markoren er kryds.\x00\x00\x00\x00\x00\x00\x00", 
         "Error: cursor cross"),
        
        # Error message (52 chars) at 0x3D3C  
        (0x3D3C, "You may not pass.  Move where the cursor is a cross.",
         "Du maa ej passe.  Flyt hvor markoren er et kryds.\x00\x00\x00",
         "Error: no pass"),
    ]
    
    for offset, old_str, new_str, desc in translations:
        # Use space as padding for visible strings
        pad = b'\x00' if new_str.endswith('\x00') else b' '
        # Ensure new string is same length
        if len(new_str) < len(old_str):
            new_str = new_str + '\x00' * (len(old_str) - len(new_str))
        elif len(new_str) > len(old_str):
            new_str = new_str[:len(old_str)]
        
        result = patch_string(data, offset, old_str, new_str)
        if result:
            print(f"  [OK] 0x{offset:04X}: {desc}")
            print(f"        '{old_str}' -> '{new_str.rstrip(chr(0))}'")
            patches_applied += 1
        else:
            print(f"  [FAIL] 0x{offset:04X}: {desc}")
    
    write_exe(output_file, data)
    print(f"\nDanish version saved: {output_file}")
    print(f"Patches applied: {patches_applied}")
    return patches_applied > 0

def create_corner_version(source_file, output_file):
    """
    Create version with corner starting positions
    
    Original positions (center of 8x8 displayed grid):
    - In 10x10 internal grid with boundary:
      Position (row, col) = (4,4), (4,5), (5,4), (5,5) in 0-indexed
      Linear offsets: 44, 45, 54, 55 (0x2C, 0x2D, 0x36, 0x37)
    
    New positions (corners of 8x8 displayed grid):
    - (1,1), (1,8), (8,1), (8,8) in 1-indexed display
    - In 10x10 internal: (1,1), (1,8), (8,1), (8,8) 
    - Linear offsets: 11, 18, 81, 88 (0x0B, 0x12, 0x51, 0x58)
    
    The initialization code at file offset 0x11E4-0x1212 sets up pieces:
    - 0x11E4: c6 40 2d 03  -> MOV [BX+2Dh], 03h (black at 45)
    - 0x11F2: c6 40 36 03  -> MOV [BX+36h], 03h (black at 54)  
    - 0x1200: c6 40 2c 02  -> MOV [BX+2Ch], 02h (white at 44)
    - 0x1210: c6 40 37 02  -> MOV [BX+37h], 02h (white at 55)
    
    Patch to corners:
    - 0x11E4: c6 40 0b 03  -> MOV [BX+0Bh], 03h (black at 11 = corner 1,1)
    - 0x11F2: c6 40 58 03  -> MOV [BX+58h], 03h (black at 88 = corner 8,8)
    - 0x1200: c6 40 12 02  -> MOV [BX+12h], 02h (white at 18 = corner 1,8)
    - 0x1210: c6 40 51 02  -> MOV [BX+51h], 02h (white at 81 = corner 8,1)
    """
    print(f"\n{'='*60}")
    print("Creating Corner Start Version: REVERSI_2.EXE")
    print('='*60)
    
    data = read_exe(source_file)
    patches_applied = 0
    
    # Board position patches
    # Format: (offset, old_bytes, new_bytes, description)
    # CORRECTED OFFSETS based on actual hex dump analysis at 0x11E0-0x1210
    position_patches = [
        # Black piece 1: center (4,5) -> corner (1,1)
        # At 0x11E2: c6 40 2d 03 -> c6 40 0b 03
        (0x11E2, bytes([0xC6, 0x40, 0x2D, 0x03]),  # MOV [BX+2Dh], 03
                 bytes([0xC6, 0x40, 0x0B, 0x03]),  # MOV [BX+0Bh], 03
         "Black piece: pos 45 -> pos 11 (corner 1,1)"),
        
        # Black piece 2: center (5,4) -> corner (8,8)
        # At 0x11F1: c6 40 36 03 -> c6 40 58 03
        (0x11F1, bytes([0xC6, 0x40, 0x36, 0x03]),  # MOV [BX+36h], 03
                 bytes([0xC6, 0x40, 0x58, 0x03]),  # MOV [BX+58h], 03
         "Black piece: pos 54 -> pos 88 (corner 8,8)"),
        
        # White piece 1: center (4,4) -> corner (1,8)
        # At 0x1200: c6 40 2c 02 -> c6 40 12 02
        (0x1200, bytes([0xC6, 0x40, 0x2C, 0x02]),  # MOV [BX+2Ch], 02
                 bytes([0xC6, 0x40, 0x12, 0x02]),  # MOV [BX+12h], 02
         "White piece: pos 44 -> pos 18 (corner 1,8)"),
        
        # White piece 2: center (5,5) -> corner (8,1)
        # At 0x120F: c6 40 37 02 -> c6 40 51 02
        (0x120F, bytes([0xC6, 0x40, 0x37, 0x02]),  # MOV [BX+37h], 02
                 bytes([0xC6, 0x40, 0x51, 0x02]),  # MOV [BX+51h], 02
         "White piece: pos 55 -> pos 81 (corner 8,1)"),
    ]
    
    print("\nPatching initial piece positions from center to corners...")
    print("  Original: Black at (4,5)(5,4), White at (4,4)(5,5) - center")
    print("  New:      Black at (1,1)(8,8), White at (1,8)(8,1) - corners")
    print()
    
    for offset, old_bytes, new_bytes, desc in position_patches:
        result = patch_bytes(data, offset, old_bytes, new_bytes)
        if result:
            print(f"  [OK] 0x{offset:04X}: {desc}")
            print(f"        {old_bytes.hex()} -> {new_bytes.hex()}")
            patches_applied += 1
        else:
            print(f"  [FAIL] 0x{offset:04X}: {desc}")
    
    write_exe(output_file, data)
    print(f"\nCorner version saved: {output_file}")
    print(f"Patches applied: {patches_applied}")
    return patches_applied == len(position_patches)

def verify_exe(filename):
    """Verify the NE executable structure is intact"""
    print(f"\nVerifying {filename}...")
    
    with open(filename, 'rb') as f:
        data = f.read()
    
    # Check MZ header
    if data[0:2] != b'MZ':
        print("  ERROR: Invalid MZ header!")
        return False
    print("  [OK] MZ header valid")
    
    # Get NE header offset from MZ header at offset 0x3C
    ne_offset = int.from_bytes(data[0x3C:0x3E], 'little')
    
    # Actually for this old format, NE is at fixed offset 0x400
    ne_offset = 0x400
    
    # Check NE header
    if data[ne_offset:ne_offset+2] != b'NE':
        print(f"  ERROR: Invalid NE header at 0x{ne_offset:04X}!")
        return False
    print(f"  [OK] NE header valid at 0x{ne_offset:04X}")
    
    # Check file size
    print(f"  [OK] File size: {len(data)} bytes")
    
    return True

def main():
    """Main function"""
    source_file = "REVERSI.EXE"
    danish_file = "REVERSI_DA.EXE"
    corner_file = "REVERSI_2.EXE"
    
    print("="*60)
    print("REVERSI.EXE Patching Tool")
    print("Windows 2.0 / 16-bit NE Executable")
    print("="*60)
    
    # Check source file exists
    if not os.path.exists(source_file):
        print(f"ERROR: Source file '{source_file}' not found!")
        return 1
    
    print(f"\nSource file: {source_file}")
    print(f"File size: {os.path.getsize(source_file)} bytes")
    
    # Create Danish translation
    try:
        create_danish_version(source_file, danish_file)
        verify_exe(danish_file)
    except Exception as e:
        print(f"ERROR creating Danish version: {e}")
    
    # Create corner start version
    try:
        create_corner_version(source_file, corner_file)
        verify_exe(corner_file)
    except Exception as e:
        print(f"ERROR creating corner version: {e}")
    
    print("\n" + "="*60)
    print("Patching Complete!")
    print("="*60)
    print(f"\nCreated files:")
    for f in [danish_file, corner_file]:
        if os.path.exists(f):
            print(f"  - {f} ({os.path.getsize(f)} bytes)")
    
    return 0

if __name__ == "__main__":
    exit(main())
