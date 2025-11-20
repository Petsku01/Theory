# Ultimate Guide: Action Replay Cheats in Nintendo DS Emulators (November 2025 Edition)

**A comprehensive, step-by-step guide based on real-world testing with melonDS 1.1 desktop and Android, Kingdom Hearts 358/2 Days (KH358.nds), and other titles. Covers pitfalls, troubleshooting, and alternatives.**

## Table of Contents
- [Introduction](#introduction)
- [Legal & Prerequisites](#prerequisites)
- [Step 1: Install melonDS](#install-melonds)
- [Step 2: Obtain Cheat Databases](#obtain-cheats)
- [Step 3: Desktop Setup (.mch Files)](#desktop-setup)
- [Step 4: Load & Use Cheats](#use-cheats)
- [Step 5: Android Setup (XML Import)](#android-setup)
- [Step 6: Other Emulators](#other-emus)
- [Troubleshooting](#troubleshooting)
- [Advanced: Convert XML to .mch](#advanced-convert)
- [Popular Games & Direct Links](#examples)
- [Credits & Sources](#credits)

## Introduction
Action Replay (AR) codes work flawlessly in DS emulators for infinite health, max items, unlocks, etc. (e.g., Pokémon ROM hacks). 

**Key Facts (2025):**
- **melonDS 1.1** is the gold standard: Highest accuracy, speed, DSi support.
- Desktop: Uses **.mch files** (auto-loaded by ROM name match). **No XML import** in stable builds.
- Android: One-click **XML import**.
- Dumped AR .nds ROMs (v1.02/1.54): Boot but empty DB—skip them.
- Best DB: **DeadSkullzJr's** (10k+ games, updated Aug 2025).

## Prerequisites
- **Legally dumped .nds ROMs** (from your own cartridges).
- Windows/macOS/Linux (desktop) or Android 7+.
- ~500MB free space for melonDS + cheats.
- Text editor (Notepad++) for tweaks.

## Step 1: Install melonDS
1. Download **melonDS 1.1** (stable, Nov 2025):  
   - [Windows 64-bit](https://melonds.kuribo64.net/downloads.php) | [macOS](https://melonds.kuribo64.net/downloads.php) | [Linux AppImage](https://melonds.kuribo64.net/downloads.php)
2. Extract ZIP → Run `melonds.exe` (Windows) or AppImage (Linux).
3. **Optional BIOS**: Config → Emulation → Use BIOS files (improves compatibility; dump from real DS).
4. Test: File → Open ROM → Load any .nds (should run).

**Pro Tip**: Update to nightly builds for usrcheat.dat import (dev branch, Oct 2025).

## Step 2: Obtain Cheat Databases
| Source | Formats | Best For | Download |
|--------|---------|----------|----------|
| **DeadSkullzJr's NDS(i) DB** | cheats.xml, usrcheat.dat, etc. | Everything (Android XML, DeSmuME) | [GBAtemp Thread](https://gbatemp.net/threads/deadskullzjrs-nds-i-cheat-databases.488711/) → Latest (Aug 2025) |
| **Lyrx997 .mch Pack** | Pre-made .mch (from DeadSkullzJr XML) | Desktop melonDS | [GitHub](https://github.com/Lyrx997/MelonDS-Desktop-Cheats) → Download ZIP |
| **Universal-Team** | cheats.xml | Smaller, quick | [db.universal-team.net](https://db.universal-team.net/ds/ndsi-cheat-databases) |

**XML Size**: ~50-100MB, 15k+ codes across 5k+ games.

## Step 3: Desktop Setup (.mch Files)
Desktop melonDS auto-loads **.mch** files—no import needed.

### Naming Rules (Case-Sensitive on macOS/Linux)
| ROM Example | Correct .mch | Works? | Notes |
|-------------|--------------|--------|-------|
| `KH358.nds` | `KH358.mch` | ✅ | Exact base name |
| `Pokemon - Platinum Version (USA).nds` | `Pokemon - Platinum Version (USA).mch` | ✅ | Full name |
| `KH358 (Europe).nds` | `KH358 (Europe).mch` | ✅ | Includes tags |
| `KH358.nds.mch` | ❌ | No | `.nds.mch` ignored |

1. Download Lyrx997 ZIP → Extract.
2. Find matching .mch (search folder for game name).
3. **Copy** .mch to **same folder** as .nds ROM.
4. **Rename** if needed: Replace `.nds` with `.mch`.
5. **Custom Path** (optional): Config → Path Settings → Set "Cheat files path" to your cheats folder.

**KH358.nds Example**:
```
ROMs/
├── KH358.nds (256MB)
└── KH358.mch (22KB)  ← 300+ cheats: Max Munny, All Keyblades, 100% Journal
```
Direct: [KH358.mch](https://files.catbox.moe/2b8x0j.mch)

## Step 4: Load & Use Cheats
1. melonDS → File → Open ROM → Select .nds.
2. **System → Enable cheats** (checkmark).
3. **System → Setup cheat codes** → See folders (Master Codes, Items, etc.).
4. Tick codes → OK → Restart ROM if needed.
5. **Button-activated?** Press L+R (or specified) in-game.

**Game ID**: View in melonDS titlebar (e.g., "AKDE" for KH358) → Search DB by ID if name mismatch.

## Step 5: Android Setup (XML Import)
1. Download **melonDS Android** APK: [GitHub Releases](https://github.com/rafaelvcaetano/melonDS-android/releases).
2. Install → Grant storage.
3. Settings → Cheats → **Import cheats** → Select DeadSkullzJr `cheats.xml`.
4. Load ROM → Pause → Cheats → Search game → Enable.

**One-time setup**: 15k+ games forever.

## Step 6: Other Emulators
| Emulator | Format | Steps |
|----------|--------|-------|
| **DeSmuME** | usrcheat.dat | Tools → Cheats → List → Database → Load .dat → Search game. |
| **RetroArch (melonDS core)** | .cht | Import via menu; use .mch converter. |
| **DraStic (Paid Android)** | usrcheat.dat | ZIP to `/cheats/` folder. |

## Troubleshooting
| Issue | Fix |
|-------|-----|
| **Blank cheat menu** | Wrong .mch name/path. Verify match, restart melonDS. |
| **Cheats don't work** | Enable cheats, restart ROM, test one code, match version (USA/EUR). |
| **No XML import (Desktop)** | Not supported—use .mch. |
| **Linux case issues** | Exact capitalization. |
| **Crashes** | Disable conflicting codes (e.g., master code). |

**Logs**: Help → Open debug console.

## Advanced: Convert XML to .mch
1. Clone [Lyrx997 Repo](https://github.com/Lyrx997/MelonDS-Desktop-Cheats).
2. Run Python script: `python convert.py cheats.xml` → Generates .mch pack.

## Popular Games & Direct Links
| Game | Typical ROM Name | .mch Source |
|------|------------------|-------------|
| KH 358/2 Days | KH358.nds | [Direct](https://files.catbox.moe/2b8x0j.mch) |
| Pokémon Platinum | Pokemon - Platinum Version (USA).nds | Lyrx997 ZIP |
| Mario Kart DS | Mario Kart DS (USA).nds | Lyrx997 ZIP |

**Videos**: [Cheats Tutorial](https://www.youtube.com/watch?v=5MQqhn74nAE)

## Credits & Sources
- DeadSkullzJr (DBs)
- Lyrx997 ( .mch Converter)
- pk
- melonDS Team

Updated Nov 20, 2025. Star/fork if helpful! 🎮
