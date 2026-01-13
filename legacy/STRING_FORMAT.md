# REVERSI.EXE String Format Documentation
## Windows 2.0 New Executable (NE) Format

This document describes the string format constraints, encoding rules, and 
special handling required for translating REVERSI.EXE from Windows 2.0.

---

## 1. EXECUTABLE FORMAT

**Type:** 16-bit New Executable (NE) for Windows 2.0  
**CPU:** 8086 Real Mode  
**File Size:** 15,760 bytes (MUST remain unchanged)  
**NE Header:** Located at offset 0x0400  

---

## 2. STRING LOCATIONS

### 2.1 Menu Resources (0x3B60 - 0x3BE0)

The menu resources use **C-style null-terminated strings** embedded in the 
Windows menu resource format.

**Binary Format:**
```
[flags:1-2 bytes] [menu_text\x00] [\x00] [menu_id:2 bytes] ...
```

**Example (hex):**
```
26 47 61 6d 65 00 00 32 00    = "&Game" + NUL + NUL + ID(0x0032)
26 48 69 6e 74 00 00 14 00    = "&Hint" + NUL + NUL + ID(0x0014)
```

**Menu String Offsets:**
| Offset   | Original Text       | Danish Text         | Length |
|----------|---------------------|---------------------|--------|
| 0x3B61   | &Game               | &Spil               | 5      |
| 0x3B6A   | &Hint               | &Tip                | 5      |
| 0x3B73   | &Pass               | &Pas                | 5      |
| 0x3B7C   | &New                | &Ny                 | 4      |
| 0x3B88   | E&xit               | &Slut               | 5      |
| 0x3B91   | A&bout Reversi...   | O&m Reversi.....    | 17     |
| 0x3BA4   | &Skill              | &Grad               | 6      |
| 0x3BAE   | &Beginner           | &Begynder           | 9      |
| 0x3BBB   | &Novice             | &Novis              | 7      |
| 0x3BC6   | &Expert             | &Kyndig             | 7      |
| 0x3BD1   | &Master             | &Mester             | 7      |


### 2.2 String Table (0x3CC0 - 0x3D90)

The string table uses **Pascal-style length-prefixed strings** with NO null 
terminator.

**Binary Format:**
```
[length:1 byte][string_data:N bytes]
```

**Example (hex):**
```
04 50 61 73 73    = 0x04 + "Pass" (4 bytes)
08 54 69 65 20 47 61 6d 65    = 0x08 + "Tie Game" (8 bytes)
```

**String Table Offsets:**
| Offset   | Original Text              | Danish Text           | Length |
|----------|----------------------------|-----------------------|--------|
| 0x3CC2   | Pass                       | Pas                   | 4      |
| 0x3CC7   | You must Pass              | Du maa passe          | 13     |
| 0x3CD5   | Tie Game                   | Uafgjort              | 8      |
| 0x3CDE   | You Lost by                | Du tabte med          | 12     |
| 0x3CEB   | You Won by                 | Du vandt me           | 11     |
| 0x3CF7   | About...                   | Om......              | 8      |
| 0x3D02   | You may only move...       | Du kan kun flytte...  | 57     |
| 0x3D3C   | You may not pass...        | Du kan ikke passe...  | 52     |

---

## 3. TRANSLATION RULES

### 3.1 Critical Constraints

1. **EXACT BYTE LENGTH**: Replacement strings MUST be exactly the same 
   number of bytes as the original. No exceptions.

2. **NO NULL BYTES IN STRINGS**: Never add \x00 inside replacement strings.
   The existing null terminators in the file must remain untouched.

3. **PAD WITH SPACES**: If the translation is shorter than the original,
   pad with space characters (0x20), NOT null bytes.

4. **PRESERVE STRUCTURE BYTES**: The bytes between menu items (null terminators,
   menu IDs, flags) must not be modified.


### 3.2 Character Encoding

- **ASCII ONLY**: Use characters 0x20 (space) through 0x7E (~) only
- **NO EXTENDED ASCII**: No code page 850/437 characters
- **NO MULTI-BYTE**: No UTF-8 or Unicode encoding

**Danish Character Substitutions:**
| Danish | ASCII Equivalent |
|--------|------------------|
| æ      | ae               |
| ø      | oe               |
| å      | aa               |
| Æ      | AE               |
| Ø      | OE               |
| Å      | AA               |


### 3.3 Keyboard Accelerator Handling

The **&** character has special meaning in Windows menus:
- The character AFTER & becomes the keyboard shortcut
- Example: "&File" makes Alt+F the shortcut
- Example: "E&xit" makes Alt+X the shortcut

When translating, position the & to create logical shortcuts:
| English    | Danish      | Shortcut |
|------------|-------------|----------|
| &Game      | &Spil       | S        |
| &Hint      | &Tip        | T        |
| E&xit      | &Slut       | S        |
| &Beginner  | &Begynder   | B        |

**Conflict Avoidance:** Ensure no two items in the same menu have the 
same shortcut letter after &.

---

## 4. COMMON ERRORS AND SOLUTIONS

### 4.1 Menu Layout Corruption

**Symptom:** Menu items appear garbled, merged, or missing

**Cause:** Adding explicit \x00 null bytes in replacement strings creates
"double nulls" that corrupt the menu structure parsing.

**Solution:** Never include \x00 in replacement strings. Pad with spaces.

**Wrong:**
```python
patch(0x3B6A, b'&Hint', b'&Tip\x00')  # Creates double null!
```

**Correct:**
```python
patch(0x3B6A, b'&Hint', b'&Tip ')  # Pad with space
```


### 4.2 String Length Mismatch

**Symptom:** Patching tool reports length error, or adjacent strings corrupted

**Cause:** Replacement string is longer or shorter than original

**Solution:** Count bytes carefully. Truncate or pad to match exactly.

```python
# Original is 17 bytes: "A&bout Reversi..."
# Translation needs exactly 17 bytes
original = b'A&bout Reversi...'     # 17 bytes
danish   = b'O&m Reversi.....  '    # 17 bytes (with extra dots and space)
```


### 4.3 Pascal String Corruption

**Symptom:** String table entries display garbage or crash

**Cause:** Either modifying the length byte, or not matching the exact length

**Solution:** Keep the length byte unchanged, pad string data with spaces.

**Note:** The length byte at offset-1 specifies the string length. When
padding a Pascal string, the length byte should still match the ACTUAL
content length (not including padding). However, for safety, we keep 
the same total byte count and let the length byte remain unchanged.

---

## 5. BOARD POSITION PATCHES

The board initialization code is at offset 0x11E0-0x1220 in the code segment.

**Original positions (center 4 squares):**
```asm
MOV BYTE PTR [BX+0x33], 0x03   ; Black at (4,4)
MOV BYTE PTR [BX+0x36], 0x03   ; Black at (5,5)
MOV BYTE PTR [BX+0x34], 0x02   ; White at (4,5)
MOV BYTE PTR [BX+0x35], 0x02   ; White at (5,4)
```

**Corner positions (modified):**
| Offset   | Original    | Patched       | Effect       |
|----------|-------------|---------------|--------------|
| 0x11E2   | 0x33 (4,4)  | 0x0B (1,1)    | Black corner |
| 0x11F1   | 0x36 (5,5)  | 0x58 (8,8)    | Black corner |
| 0x1200   | 0x34 (4,5)  | 0x12 (1,8)    | White corner |
| 0x120F   | 0x35 (5,4)  | 0x51 (8,1)    | White corner |

**Board Array Layout:**
- 10x10 array at segment offset 0x0654
- Row 0 and 9 are border (value 0xFF)
- Column 0 and 9 are border (value 0xFF)
- Position = row * 10 + column
- Values: 0x00=empty, 0x02=white, 0x03=black, 0xFF=border

---

## 6. VERIFICATION CHECKLIST

After patching, verify:

- [ ] File size is exactly 15,760 bytes
- [ ] NE header present at offset 0x0400 ("NE" magic)
- [ ] No triple-null sequences (0x00 0x00 0x00) in menu area (indicates corruption)
- [ ] Menu strings are null-terminated (single 0x00 at end)
- [ ] Structure bytes (flags, menu IDs) are unchanged
- [ ] All translations are ASCII-only (0x20-0x7E)

---

## 7. TOOLS AND COMMANDS

**Examine hex dump:**
```bash
xxd -g1 -s 0x3B61 -l 128 REVERSI.EXE    # Menu area
xxd -g1 -s 0x3CC0 -l 200 REVERSI.EXE    # String table
```

**Search for strings:**
```bash
strings -t x REVERSI.EXE | grep -i "game"
```

**Compare files:**
```bash
cmp -l REVERSI.EXE REVERSI_DA.EXE | head -50
```

---

## 8. REFERENCES

- Microsoft Windows 2.0 Programmer's Reference (1987)
- NE Executable Format Specification
- IBM PC DOS 3.30 Technical Reference

---

*Document generated during REVERSI.EXE reverse engineering session*
*Last updated: 2025*
