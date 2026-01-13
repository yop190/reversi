#!/usr/bin/env python3
"""
REVERSI.EXE Patching Tool for Windows 2.0 - CORRECTED VERSION
==============================================================

String Format Constraints:
--------------------------
1. MENU RESOURCES (at 0x3B60+):
   - Format: [flags] [null-terminated C string] [optional padding] [menu_id]
   - Strings MUST be exactly the same length as original
   - DO NOT add explicit \x00 - the file already has null terminators
   - Shorter strings must be padded with SPACES, not nulls
   - The & character marks keyboard shortcuts - preserve position carefully

2. STRING TABLE (at 0x3CA0+):  
   - Format: [length_byte] [string_data] (Pascal-style, NO null terminator)
   - Length byte must match string content length
   - If string is shorter, we CANNOT safely change the length byte
   - Must pad with spaces to maintain original byte count

3. ENCODING RULES:
   - ASCII only (0x20-0x7E)
   - No multi-byte characters
   - No accented characters (use ae/oe/aa for Danish)
   - & is special - marks the next char as keyboard shortcut

CRITICAL: Never add \x00 inside replacement strings for menu items!
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

def patch_bytes_at(data, offset, new_bytes, description=""):
    """
    Directly patch bytes at offset without verification.
    Use when you know exactly what bytes to write.
    """
    for i, b in enumerate(new_bytes):
        data[offset + i] = b
    return True

def safe_patch_menu_string(data, offset, old_str, new_str, description=""):
    """
    Safely patch a menu string (C-style null-terminated).
    
    Rules:
    - New string must be <= old string length
    - Pad with spaces if shorter (NOT nulls!)
    - Do NOT include null terminator in new_str
    - The original null terminator in file stays in place
    """
    old_bytes = old_str.encode('ascii')
    new_bytes = new_str.encode('ascii')
    
    if len(new_bytes) > len(old_bytes):
        print(f"  [ERROR] New string too long: '{new_str}' > '{old_str}'")
        return False
    
    # Pad with spaces to match length (NOT nulls!)
    padded = new_bytes + b' ' * (len(old_bytes) - len(new_bytes))
    
    # Verify original bytes match
    actual = bytes(data[offset:offset + len(old_bytes)])
    if actual != old_bytes:
        print(f"  [WARN] Bytes at 0x{offset:04X} don't match!")
        print(f"         Expected: {old_bytes}")
        print(f"         Actual:   {actual}")
        return False
    
    # Apply patch
    for i, b in enumerate(padded):
        data[offset + i] = b
    
    print(f"  [OK] 0x{offset:04X}: {description}")
    print(f"       '{old_str}' -> '{new_str}'")
    return True

def safe_patch_pascal_string(data, offset, old_str, new_str, description=""):
    """
    Safely patch a Pascal-style string (length-prefixed, no null terminator).
    
    Rules:
    - The length byte is at (offset - 1)
    - String data starts at offset
    - New string must be <= old string length
    - Pad with spaces if shorter
    - We also need to update the length byte!
    """
    old_bytes = old_str.encode('ascii')
    new_bytes = new_str.encode('ascii')
    
    if len(new_bytes) > len(old_bytes):
        print(f"  [ERROR] New string too long: '{new_str}' > '{old_str}'")
        return False
    
    # Verify original bytes match
    actual = bytes(data[offset:offset + len(old_bytes)])
    if actual != old_bytes:
        print(f"  [WARN] Bytes at 0x{offset:04X} don't match!")
        print(f"         Expected: {old_bytes}")
        print(f"         Actual:   {actual}")
        return False
    
    # For Pascal strings, we should update the length byte
    # But this is risky - let's keep same length with padding instead
    padded = new_bytes + b' ' * (len(old_bytes) - len(new_bytes))
    
    # Apply patch
    for i, b in enumerate(padded):
        data[offset + i] = b
    
    print(f"  [OK] 0x{offset:04X}: {description}")
    print(f"       '{old_str}' -> '{new_str}'")
    return True

def create_danish_version(source_file, output_file):
    """
    Create Danish translation of REVERSI.EXE - CORRECTED
    
    CRITICAL RULES:
    - Keep EXACT same byte length for all strings
    - NO \x00 null terminators in replacement strings
    - Pad shorter strings with SPACES
    - ASCII only, no accents
    """
    print(f"\n{'='*60}")
    print("Creating Danish Translation: REVERSI_DA.EXE (CORRECTED)")
    print('='*60)
    
    data = read_exe(source_file)
    patches_ok = 0
    patches_fail = 0
    
    # ============================================================
    # MENU TRANSLATIONS
    # Format: (offset, original, danish, description)
    # RULES: Same length, no nulls, pad with spaces
    # ============================================================
    print("\n--- Menu Translations ---")
    
    menu_patches = [
        # "&Game" (5 chars) -> "&Spil" (5 chars) - PERFECT MATCH
        (0x3B61, "&Game", "&Spil", "Menu: Game"),
        
        # "&Hint" (5 chars) -> "&Tip " (5 chars with space padding)
        # Note: "Tip" is only 3 chars + & = 4, need 5, so "&Tip " 
        (0x3B6A, "&Hint", "&Tip ", "Menu: Hint"),
        
        # "&Pass" (5 chars) -> "&Pas " (5 chars with space)
        (0x3B74, "&Pass", "&Pas ", "Menu: Pass"),
        
        # "&New" (4 chars) -> "&Ny " (4 chars with space)
        # Wait, let me check: N e w = 3 + & = 4. Ny = 2 + & = 3. Need "&Ny "
        (0x3B7E, "&New", "&Ny ", "Menu: New"),
        
        # "E&xit" (5 chars) -> "&Slut" (5 chars) - PERFECT MATCH  
        (0x3B88, "E&xit", "&Slut", "Menu: Exit"),
        
        # "A&bout Reversi..." (17 chars) -> "O&m Reversi...." (17 chars)
        # A&bout Reversi... = 17 chars
        # O&m Reversi.....  = 16 chars, need 17
        # Let's use: "O&m Reversi....." (add one more dot)
        (0x3B91, "A&bout Reversi...", "O&m Reversi.....", "Menu: About"),
        
        # "&Skill" (6 chars) -> "&Grad " (6 chars)
        # Skill = 5 + & = 6. Grad = 4 + & = 5. Need "&Grad "
        (0x3BA4, "&Skill", "&Grad ", "Menu: Skill"),
        
        # "&Beginner" (9 chars) -> "&Begynder" (9 chars) - PERFECT!
        (0x3BAE, "&Beginner", "&Begynder", "Menu: Beginner"),
        
        # "&Novice" (7 chars) -> "&Novis " (7 chars)
        # Novice = 6 + & = 7. Let = 3 + & = 4. Use "&Novis " (6 + & = 7)
        (0x3BBB, "&Novice", "&Novis ", "Menu: Novice"),
        
        # "&Expert" (7 chars) -> "&Ekspert" NO! That's 8 chars!
        # Expert = 6 + & = 7. Ekspert = 7 + & = 8. Too long!
        # Use "&Profi " (6 chars) or "&Expert" -> keep original? Or "&Eksp. "
        # Actually let's use "&Dygtig" (7 chars) = Dygtig (6) + & = 7. WAIT
        # Let me count: & E x p e r t = 7 chars total
        # Best: "&Kyndig" = 7 chars (& K y n d i g)
        (0x3BC6, "&Expert", "&Kyndig", "Menu: Expert"),
        
        # "&Master" (7 chars) -> "&Mester" (7 chars) - PERFECT MATCH!
        (0x3BD1, "&Master", "&Mester", "Menu: Master"),
    ]
    
    for offset, old_str, new_str, desc in menu_patches:
        # Verify lengths match
        if len(old_str) != len(new_str):
            print(f"  [LENGTH ERROR] {desc}: '{old_str}'({len(old_str)}) vs '{new_str}'({len(new_str)})")
            patches_fail += 1
            continue
        
        if safe_patch_menu_string(data, offset, old_str, new_str, desc):
            patches_ok += 1
        else:
            patches_fail += 1
    
    # ============================================================
    # STRING TABLE TRANSLATIONS (Pascal-style)
    # Format: [length_byte][string_data]
    # RULES: Keep same byte length, pad with spaces
    # ============================================================
    print("\n--- String Table Translations ---")
    
    string_patches = [
        # "Pass" (4 chars) at 0x3CC2 -> "Pas " (4 chars with space)
        (0x3CC2, "Pass", "Pas ", "String: Pass"),
        
        # "You must Pass" (13 chars) -> "Du maa passe " (13 chars)
        # Let me count: Y o u   m u s t   P a s s = 13
        #              D u   m a a   p a s s e   = 12, need 13: "Du maa passe "
        (0x3CC7, "You must Pass", "Du maa passe ", "String: You must Pass"),
        
        # "Tie Game" (8 chars) -> "Uafgjort" (8 chars) - PERFECT!
        (0x3CD5, "Tie Game", "Uafgjort", "String: Tie Game"),
        
        # "You Lost by " (12 chars) -> "Du tabte med" (12 chars) - PERFECT!
        (0x3CDE, "You Lost by ", "Du tabte med", "String: You Lost by"),
        
        # "You Won by " (11 chars) -> "Du vandt me" (11 chars)
        # Y o u   W o n   b y   = 11 chars
        # D u   v a n d t   m e = 11 chars? Let me count: D u   v a n d t   m e = 11
        # Wait: "Du vandt med" = 12 chars. "Du vandt me" = 11 chars - CORRECT!
        (0x3CEB, "You Won by ", "Du vandt me", "String: You Won by"),
        
        # "About..." (8 chars) -> "Om......" (8 chars)
        (0x3CF7, "About...", "Om......", "String: About..."),
    ]
    
    for offset, old_str, new_str, desc in string_patches:
        # Verify lengths match
        if len(old_str) != len(new_str):
            print(f"  [LENGTH ERROR] {desc}: '{old_str}'({len(old_str)}) vs '{new_str}'({len(new_str)})")
            patches_fail += 1
            continue
            
        if safe_patch_pascal_string(data, offset, old_str, new_str, desc):
            patches_ok += 1
        else:
            patches_fail += 1
    
    # ============================================================
    # LONG ERROR MESSAGES
    # ============================================================
    print("\n--- Error Message Translations ---")
    
    # Long message 1: 57 chars
    # "You may only move to a space where the cursor is a cross."
    old_msg1 = "You may only move to a space where the cursor is a cross."
    # Danish: "Du kan kun flytte til felt hvor markoren er et kryds." = 54 chars
    # Need exactly 57, pad with spaces
    new_msg1 = "Du kan kun flytte til felt hvor markoren er kryds.      "
    # Let me count: 50 + 7 spaces? Let me recount original
    # Y o u   m a y   o n l y   m o v e   t o   a   s p a c e   w h e r e   t h e   c u r s o r   i s   a   c r o s s .
    # = 58 chars including the period? Let me count char by char:
    # "You may only move to a space where the cursor is a cross."
    # That's 58 characters. Let me verify:
    print(f"  Original msg1 length: {len(old_msg1)}")
    new_msg1 = "Du kan kun flytte hvor markoren er et kryds.            "
    if len(new_msg1) < len(old_msg1):
        new_msg1 = new_msg1 + ' ' * (len(old_msg1) - len(new_msg1))
    elif len(new_msg1) > len(old_msg1):
        new_msg1 = new_msg1[:len(old_msg1)]
    
    if safe_patch_pascal_string(data, 0x3D02, old_msg1, new_msg1, "Error: invalid move"):
        patches_ok += 1
    else:
        patches_fail += 1
    
    # Long message 2: 52 chars
    old_msg2 = "You may not pass.  Move where the cursor is a cross."
    print(f"  Original msg2 length: {len(old_msg2)}")
    new_msg2 = "Du kan ikke passe.  Flyt hvor markoren er kryds.    "
    if len(new_msg2) < len(old_msg2):
        new_msg2 = new_msg2 + ' ' * (len(old_msg2) - len(new_msg2))
    elif len(new_msg2) > len(old_msg2):
        new_msg2 = new_msg2[:len(old_msg2)]
    
    if safe_patch_pascal_string(data, 0x3D3C, old_msg2, new_msg2, "Error: cannot pass"):
        patches_ok += 1
    else:
        patches_fail += 1
    
    # ============================================================
    # SAVE RESULT
    # ============================================================
    write_exe(output_file, data)
    print(f"\n{'='*60}")
    print(f"Danish version saved: {output_file}")
    print(f"Successful patches: {patches_ok}")
    print(f"Failed patches: {patches_fail}")
    print('='*60)
    
    return patches_fail == 0

def create_corner_version(source_file, output_file):
    """
    Create version with corner starting positions
    (This was already working correctly)
    """
    print(f"\n{'='*60}")
    print("Creating Corner Start Version: REVERSI_2.EXE")
    print('='*60)
    
    data = read_exe(source_file)
    
    # Board position patches - these were verified working
    patches = [
        (0x11E2, [0xC6, 0x40, 0x0B, 0x03], "Black at corner 1,1"),
        (0x11F1, [0xC6, 0x40, 0x58, 0x03], "Black at corner 8,8"),
        (0x1200, [0xC6, 0x40, 0x12, 0x02], "White at corner 1,8"),
        (0x120F, [0xC6, 0x40, 0x51, 0x02], "White at corner 8,1"),
    ]
    
    for offset, new_bytes, desc in patches:
        patch_bytes_at(data, offset, new_bytes, desc)
        print(f"  [OK] 0x{offset:04X}: {desc}")
    
    write_exe(output_file, data)
    print(f"\nCorner version saved: {output_file}")
    return True

def verify_menu_structure(filename):
    """Verify the menu resource structure is intact"""
    print(f"\nVerifying menu structure in {filename}...")
    
    with open(filename, 'rb') as f:
        data = f.read()
    
    # Check for double-nulls in menu area (bad sign)
    menu_start = 0x3B60
    menu_end = 0x3BE0
    menu_data = data[menu_start:menu_end]
    
    # Look for patterns that indicate corruption
    issues = []
    
    # Check that menu strings don't have embedded nulls
    # (nulls should only appear at string boundaries)
    i = 0
    while i < len(menu_data) - 2:
        if menu_data[i] == 0 and menu_data[i+1] == 0 and menu_data[i+2] == 0:
            # Three nulls in a row might indicate corruption
            issues.append(f"Triple null at menu offset +0x{i:02X}")
        i += 1
    
    if issues:
        print(f"  [WARN] Potential issues found:")
        for issue in issues[:5]:  # Show first 5
            print(f"         {issue}")
    else:
        print("  [OK] Menu structure looks intact")
    
    return len(issues) == 0

def main():
    source_file = "REVERSI.EXE"
    danish_file = "REVERSI_DA.EXE"
    corner_file = "REVERSI_2.EXE"
    
    print("="*60)
    print("REVERSI.EXE Patching Tool - CORRECTED VERSION")
    print("="*60)
    
    if not os.path.exists(source_file):
        print(f"ERROR: Source file '{source_file}' not found!")
        return 1
    
    # Create Danish translation with corrected string handling
    create_danish_version(source_file, danish_file)
    verify_menu_structure(danish_file)
    
    # Create corner position version (already working)
    create_corner_version(source_file, corner_file)
    
    print("\n" + "="*60)
    print("Patching Complete!")
    print("="*60)
    
    return 0

if __name__ == "__main__":
    exit(main())
