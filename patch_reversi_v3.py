#!/usr/bin/env python3
"""
REVERSI.EXE Patching Tool - Final Corrected Version
====================================================

STRING FORMAT CONSTRAINTS & ENCODING RULES
==========================================

1. MENU RESOURCES (Windows 2.0 NE format):
   -----------------------------------------
   Location: 0x3B61 - 0x3BE0
   Format: [string\x00] [\x00] [menu_id_word] [string\x00] ...
   
   Rules:
   - Strings are C-style null-terminated
   - Each menu item ends with \x00\x00 + 2-byte menu ID
   - Replacement strings must be EXACT same byte length
   - Pad shorter strings with SPACES, not nulls
   - The & character marks keyboard accelerator (next char is shortcut)

2. STRING TABLE (Pascal-style strings):
   -------------------------------------
   Location: 0x3CC0 - 0x3D90
   Format: [length_byte][string_data] (NO null terminator)
   
   Rules:
   - Length byte precedes each string
   - Replacement must keep same total length
   - Pad with spaces if shorter
   - Don't change length byte (keep original padding)

3. ENCODING RULES:
   ----------------
   - ASCII only (0x20-0x7E)
   - No extended ASCII / code page characters
   - Danish: Use 'ae' for æ, 'oe' for ø, 'aa' for å
   - & has special meaning in menus - place carefully

CRITICAL: Never add explicit \x00 in replacement strings!
"""

import os

def read_exe(filename):
    with open(filename, 'rb') as f:
        return bytearray(f.read())

def write_exe(filename, data):
    with open(filename, 'wb') as f:
        f.write(data)

def patch_exact(data, offset, old_bytes, new_bytes, description):
    """
    Replace bytes at exact offset with verification.
    Lengths must match exactly.
    """
    if len(old_bytes) != len(new_bytes):
        print(f"  [LEN ERR] {description}: old={len(old_bytes)} new={len(new_bytes)}")
        return False
    
    actual = bytes(data[offset:offset + len(old_bytes)])
    if actual != old_bytes:
        print(f"  [MISMATCH] {description} at 0x{offset:04X}")
        print(f"             Expected: {old_bytes!r}")
        print(f"             Actual:   {actual!r}")
        return False
    
    for i, b in enumerate(new_bytes):
        data[offset + i] = b
    
    print(f"  [OK] 0x{offset:04X}: {description}")
    return True

def create_danish_version(source_file, output_file):
    """Create Danish translation with EXACT byte-for-byte replacement"""
    print(f"\n{'='*60}")
    print("Creating Danish Translation: REVERSI_DA.EXE")
    print('='*60)
    
    data = read_exe(source_file)
    ok = 0
    fail = 0
    
    # ========================================
    # MENU STRINGS - Game Menu
    # ========================================
    print("\n--- Game Menu ---")
    
    # 0x3B61: "&Game" -> "&Spil" (5 bytes) - PERFECT MATCH
    if patch_exact(data, 0x3B61, b'&Game', b'&Spil', "Game -> Spil"):
        ok += 1
    else: fail += 1
    
    # 0x3B6A: "&Hint" -> "&Tip " (5 bytes) - pad with space
    if patch_exact(data, 0x3B6A, b'&Hint', b'&Tip ', "Hint -> Tip"):
        ok += 1
    else: fail += 1
    
    # 0x3B73: "&Pass" -> "&Pas " (5 bytes) - pad with space
    if patch_exact(data, 0x3B73, b'&Pass', b'&Pas ', "Pass -> Pas"):
        ok += 1
    else: fail += 1
    
    # 0x3B7C: "&New" -> "&Ny " (4 bytes) - pad with space
    if patch_exact(data, 0x3B7C, b'&New', b'&Ny ', "New -> Ny"):
        ok += 1
    else: fail += 1
    
    # 0x3B88: "E&xit" -> "&Slut" (5 bytes) - PERFECT MATCH
    if patch_exact(data, 0x3B88, b'E&xit', b'&Slut', "Exit -> Slut"):
        ok += 1
    else: fail += 1
    
    # 0x3B91: "A&bout Reversi..." -> "O&m Reversi..... " (17 bytes)
    # A&bout Reversi... = 17 chars
    if patch_exact(data, 0x3B91, b'A&bout Reversi...', b'O&m Reversi..... ', "About -> Om"):
        ok += 1
    else: fail += 1
    
    # ========================================
    # MENU STRINGS - Skill Menu
    # ========================================
    print("\n--- Skill Menu ---")
    
    # 0x3BA4: "&Skill" -> "&Grad " (6 bytes) - pad with space
    if patch_exact(data, 0x3BA4, b'&Skill', b'&Grad ', "Skill -> Grad"):
        ok += 1
    else: fail += 1
    
    # 0x3BAE: "&Beginner" -> "&Begynder" (9 bytes) - PERFECT MATCH
    if patch_exact(data, 0x3BAE, b'&Beginner', b'&Begynder', "Beginner -> Begynder"):
        ok += 1
    else: fail += 1
    
    # 0x3BBB: "&Novice" -> "&Novis " (7 bytes) - pad with space
    if patch_exact(data, 0x3BBB, b'&Novice', b'&Novis ', "Novice -> Novis"):
        ok += 1
    else: fail += 1
    
    # Continue parsing for Expert and Master
    # 0x3BC6: "&Expert" -> "&Kyndig" (7 bytes)
    if patch_exact(data, 0x3BC6, b'&Expert', b'&Kyndig', "Expert -> Kyndig"):
        ok += 1
    else: fail += 1
    
    # 0x3BD1: "&Master" -> "&Mester" (7 bytes)
    if patch_exact(data, 0x3BD1, b'&Master', b'&Mester', "Master -> Mester"):
        ok += 1
    else: fail += 1
    
    # ========================================
    # STRING TABLE (Pascal strings)
    # ========================================
    print("\n--- String Table ---")
    
    # Need to find the exact offsets in the string table
    # Let me search for these strings
    exe_bytes = bytes(data)
    
    # "Pass" in string table - find it
    pass_offset = exe_bytes.find(b'\x04Pass')  # length byte 4 + "Pass"
    if pass_offset >= 0:
        if patch_exact(data, pass_offset + 1, b'Pass', b'Pas ', "Pass"):
            ok += 1
        else: fail += 1
    
    # "Tie Game" (8 bytes)
    tie_offset = exe_bytes.find(b'Tie Game')
    if tie_offset >= 0:
        if patch_exact(data, tie_offset, b'Tie Game', b'Uafgjort', "Tie Game"):
            ok += 1
        else: fail += 1
    
    # "You Lost by " (12 bytes)
    lost_offset = exe_bytes.find(b'You Lost by ')
    if lost_offset >= 0:
        if patch_exact(data, lost_offset, b'You Lost by ', b'Du tabte med', "You Lost by"):
            ok += 1
        else: fail += 1
    
    # "You Won by " (11 bytes) - exactly 11 chars
    won_offset = exe_bytes.find(b'You Won by ')
    if won_offset >= 0:
        if patch_exact(data, won_offset, b'You Won by ', b'Du vandt me', "You Won by"):
            ok += 1
        else: fail += 1
    
    # "About..." (8 bytes)
    about_str_offset = exe_bytes.find(b'About...')
    if about_str_offset >= 0:
        if patch_exact(data, about_str_offset, b'About...', b'Om......', "About..."):
            ok += 1
        else: fail += 1
    
    # ========================================
    # ERROR MESSAGES
    # ========================================
    print("\n--- Error Messages ---")
    
    # Long error message 1
    old_msg1 = b'You may only move to a space where the cursor is a cross.'
    msg1_offset = exe_bytes.find(old_msg1)
    if msg1_offset >= 0:
        new_msg1 = b'Du kan kun flytte hvor markoren er et kryds.             '
        # Ensure same length
        if len(new_msg1) < len(old_msg1):
            new_msg1 = new_msg1 + b' ' * (len(old_msg1) - len(new_msg1))
        elif len(new_msg1) > len(old_msg1):
            new_msg1 = new_msg1[:len(old_msg1)]
        if patch_exact(data, msg1_offset, old_msg1, new_msg1, "Error: invalid move"):
            ok += 1
        else: fail += 1
    
    # Long error message 2  
    old_msg2 = b'You may not pass.  Move where the cursor is a cross.'
    msg2_offset = exe_bytes.find(old_msg2)
    if msg2_offset >= 0:
        new_msg2 = b'Du kan ikke passe. Flyt hvor markoren er kryds.     '
        # Ensure same length
        if len(new_msg2) < len(old_msg2):
            new_msg2 = new_msg2 + b' ' * (len(old_msg2) - len(new_msg2))
        elif len(new_msg2) > len(old_msg2):
            new_msg2 = new_msg2[:len(old_msg2)]
        if patch_exact(data, msg2_offset, old_msg2, new_msg2, "Error: cannot pass"):
            ok += 1
        else: fail += 1
    
    # "You must Pass" (13 bytes)
    must_pass_offset = exe_bytes.find(b'You must Pass')
    if must_pass_offset >= 0:
        if patch_exact(data, must_pass_offset, b'You must Pass', b'Du maa passe ', "You must Pass"):
            ok += 1
        else: fail += 1
    
    # ========================================
    # SAVE
    # ========================================
    write_exe(output_file, data)
    print(f"\n{'='*60}")
    print(f"Danish version saved: {output_file}")
    print(f"Successful: {ok}, Failed: {fail}")
    print('='*60)
    
    return fail == 0

def create_corner_version(source_file, output_file):
    """Create version with corner starting positions"""
    print(f"\n{'='*60}")
    print("Creating Corner Version: REVERSI_2.EXE")
    print('='*60)
    
    data = read_exe(source_file)
    
    patches = [
        (0x11E2, b'\xC6\x40\x0B\x03', "Black at 1,1"),
        (0x11F1, b'\xC6\x40\x58\x03', "Black at 8,8"),
        (0x1200, b'\xC6\x40\x12\x02', "White at 1,8"),
        (0x120F, b'\xC6\x40\x51\x02', "White at 8,1"),
    ]
    
    for offset, new_bytes, desc in patches:
        for i, b in enumerate(new_bytes):
            data[offset + i] = b
        print(f"  [OK] 0x{offset:04X}: {desc}")
    
    write_exe(output_file, data)
    print(f"\nCorner version saved: {output_file}")
    return True

def verify_patched_file(filename):
    """Verify patched file structure"""
    print(f"\nVerifying {filename}...")
    
    with open(filename, 'rb') as f:
        data = f.read()
    
    # Check file size
    expected_size = 15760
    if len(data) != expected_size:
        print(f"  [WARN] File size: {len(data)} (expected {expected_size})")
    else:
        print(f"  [OK] File size: {len(data)} bytes")
    
    # Check NE header
    if data[0x400:0x402] == b'NE':
        print("  [OK] NE header present")
    else:
        print("  [WARN] NE header missing!")
    
    return True

def main():
    source = "REVERSI.EXE"
    danish = "REVERSI_DA.EXE"
    corner = "REVERSI_2.EXE"
    
    if not os.path.exists(source):
        print(f"ERROR: {source} not found!")
        return 1
    
    create_danish_version(source, danish)
    verify_patched_file(danish)
    
    create_corner_version(source, corner)
    verify_patched_file(corner)
    
    # Update floppy image
    print(f"\n{'='*60}")
    print("Updating Floppy Image")
    print('='*60)
    
    import subprocess
    try:
        # Delete old files from image
        subprocess.run(['mdel', '-i', 'REVERSI_FLOPPY.img', '::REVERSI_DA.EXE'], 
                      capture_output=True)
        subprocess.run(['mdel', '-i', 'REVERSI_FLOPPY.img', '::REVERSI_2.EXE'], 
                      capture_output=True)
        
        # Copy new files
        for f in [source, danish, corner, 'README.TXT']:
            if os.path.exists(f):
                result = subprocess.run(
                    ['mcopy', '-i', 'REVERSI_FLOPPY.img', '-o', f, '::'],
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    print(f"  [OK] Copied {f} to floppy image")
                else:
                    print(f"  [WARN] Failed to copy {f}: {result.stderr}")
        
        # List contents
        result = subprocess.run(
            ['mdir', '-i', 'REVERSI_FLOPPY.img'],
            capture_output=True, text=True
        )
        print(f"\nFloppy contents:\n{result.stdout}")
    except FileNotFoundError:
        print("  [SKIP] mtools not available for floppy update")
    
    print("\n" + "="*60)
    print("PATCHING COMPLETE!")
    print("="*60)
    
    return 0

if __name__ == "__main__":
    exit(main())
