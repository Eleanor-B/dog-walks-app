# UI Spacing System

## Base Unit: 8px

### Spacing Scale:
- **4px** (0.5 unit) - Tight spacing within components
- **8px** (1 unit) - xs - Minimum touch spacing
- **16px** (2 units) - sm - Default gap between elements
- **24px** (3 units) - md - Section spacing
- **32px** (4 units) - lg - Large section spacing
- **40px** (5 units) - xl
- **48px** (6 units) - 2xl
- **56px** (7 units) - 3xl
- **64px** (8 units) - 4xl

## Current Full Map Layout:

### Top Controls Row:
- **From top edge**: 16px (sm)
- **Button height**: ~42px (10px padding top + 10px bottom + ~22px content)
- **Gap between button bottom and legend**: 16px (sm) ✅ or 24px (md) for more breathing room

### Calculated Legend Position:
**No route:**
- Top: 16px (buttons top) + 42px (button height) + 16px (gap) = **74px**
- OR: 16px + 42px + 24px = **82px** (more space)

**With route:**
- Route card at: 70px
- Route card height: ~150px
- Gap below card: 16px
- Legend top: 70 + 150 + 16 = **236px**

### Recommdation:
- **No route**: `top: 80` (clean 10x8px)
- **With route**: `top: 240` (clean 30x8px)

## Other Consistent Spacing:
- **Button padding**: 12px 16px (consistent)
- **Card padding**: 16px
- **Section margins**: 40px (xl)
- **Filter chips gap**: 8px (xs)

