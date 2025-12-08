# 🌳 Family Tree Layout Plan

## Overview
This document outlines the complete plan for how family members should be placed in the family tree visualization based on their relationships.

## Family Tree Structure (Top to Bottom)

### 1. **Grandparents Section** (Top Level)
**Who appears here:**
- Paternal Grandfather (father's father)
- Paternal Grandmother (father's mother)
- Maternal Grandfather (mother's father)
- Maternal Grandmother (mother's mother)

**Layout:**
```
[Paternal Grandfather] [Paternal Grandmother] | [Maternal Grandfather] [Maternal Grandmother]
```

**How to add:**
- Click "+" on Father's card → "Add Father" → Adds paternal grandfather
- Click "+" on Father's card → "Add Mother" → Adds paternal grandmother
- Click "+" on Mother's card → "Add Father" → Adds maternal grandfather
- Click "+" on Mother's card → "Add Mother" → Adds maternal grandmother

---

### 2. **Parents Section** (Second Level)
**Who appears here:**
- Father
- Father's Brothers (paternal uncles)
- Father's Sisters (paternal aunts)
- Mother
- Mother's Brothers (maternal uncles)
- Mother's Sisters (maternal aunts)

**Layout:**
```
[Father's Brothers] ── [Father] ── [Father's Sisters] | [Mother's Brothers] ── [Mother] ── [Mother's Sisters]
```

**How to add:**
- Click "+" on Father's card → "Add Brother" → Adds father's brother (paternal uncle)
- Click "+" on Father's card → "Add Sister" → Adds father's sister (paternal aunt)
- Click "+" on Mother's card → "Add Brother" → Adds mother's brother (maternal uncle)
- Click "+" on Mother's card → "Add Sister" → Adds mother's sister (maternal aunt)

**Key Rule:**
- When clicking "+" on Father/Mother card → Sibling gets Father/Mother's parents (grandparents)
- These siblings appear in Parents section, NOT in Your section

---

### 3. **You & Siblings Section** (Third Level - Center)
**Who appears here:**
- Your Brothers (siblings who share YOUR parents)
- You (logged-in user)
- Your Wife/Spouse
- Your Sisters (siblings who share YOUR parents)

**Layout:**
```
[Your Brothers] ── [You] [Wife] ── [Your Sisters]
```

**How to add:**
- Click "+" on Your card → "Add Brother" → Adds your brother
- Click "+" on Your card → "Add Sister" → Adds your sister
- Click "+" on Your card → "Add Spouse" → Adds your wife/husband

**Key Rule:**
- When clicking "+" on Your card → Sibling gets YOUR parents (father and mother)
- These siblings appear in Your section, NOT in Parents section

---

### 4. **Children Section** (Fourth Level)
**Who appears here:**
- Your Children
- Your Spouse's Children (if different from yours)

**Layout:**
```
[Child1] [Child2] [Child3] ...
```

**How to add:**
- Click "+" on Your card → "Add Child" → Adds your child
- Click "+" on Spouse's card → "Add Child" → Adds child (links to both parents)

---

### 5. **Other Family Members Section** (Catch-all)
**Who appears here:**
- Extended family members not fitting above categories
- Spouses of siblings (brothers-in-law, sisters-in-law)
- Spouses of uncles/aunts
- Other distant relatives

**Layout:**
```
[Member1] [Member2] [Member3] ...
```

---

## Relationship Detection Rules

### Sibling Detection Logic:
1. **Find siblings of Person X:**
   - Get Person X's `father_id` and `mother_id`
   - Find all members who share at least one parent with Person X
   - Exclude Person X themselves

2. **Parent Siblings (Uncles/Aunts):**
   - Father's siblings = Members sharing father's parents (grandparents)
   - Mother's siblings = Members sharing mother's parents (grandparents)
   - These appear in Parents section

3. **Your Siblings:**
   - Members sharing YOUR parents (father and mother)
   - Exclude parent siblings (uncles/aunts)
   - These appear in Your section

### Exclusion Rules:
- Parent siblings are EXCLUDED from Your siblings list
- Your siblings are EXCLUDED from Other Family Members
- All direct relatives are EXCLUDED from Other Family Members

---

## Backend Logic for Adding Siblings

### When clicking "+" on Card X → "Add Brother/Sister":

1. **Get Card X's information:**
   ```sql
   SELECT father_id, mother_id FROM family_members WHERE id = X
   ```

2. **Set new sibling's parents:**
   ```sql
   UPDATE family_members 
   SET father_id = X's father_id, mother_id = X's mother_id 
   WHERE id = new_sibling_id
   ```

3. **Set gender:**
   - If "Add Brother" → gender = 'male'
   - If "Add Sister" → gender = 'female'

4. **Result:**
   - New sibling shares parents with Card X
   - Appears next to Card X in the appropriate section

---

## Frontend Display Logic

### Section Assignment:

1. **Grandparents Section:**
   - Members who are parents of parents
   - Found by: `findParent(parent.id, 'father')` and `findParent(parent.id, 'mother')`

2. **Parents Section:**
   - Direct parents: `findParent(user.id, 'father')` and `findParent(user.id, 'mother')`
   - Parent siblings: `findSiblingsOfMember(father)` and `findSiblingsOfMember(mother)`

3. **You & Siblings Section:**
   - User: `findLoggedInUserMember()`
   - User siblings: `findSiblings(user)` EXCLUDING parent siblings
   - Spouse: `findSpouse(user.id)`

4. **Children Section:**
   - `findChildren(user.id)`

5. **Other Family Members:**
   - All members NOT in above categories

---

## Visual Design

### Color Coding:
- **Grandparents:** Purple background (`rgba(156, 39, 176, 0.05)`)
- **Parents:** Blue background (`rgba(33, 150, 243, 0.05)`)
- **You & Siblings:** Transparent background (removed green)
- **User + Spouse:** Pink container (`rgba(255, 182, 193, 0.2)`)
- **Children:** Yellow background (`rgba(255, 193, 7, 0.05)`)

### Connection Lines:
- **Vertical lines:** Connect generations (Grandparents → Parents → You → Children)
- **Horizontal lines:** Connect siblings within same generation
- **No line:** Between user and spouse (they're in same container)

---

## Implementation Checklist

### Backend:
- [x] Store gender when adding Brother/Sister
- [x] Use clicked person's parents (not logged-in user's parents)
- [x] Set parent relationships correctly

### Frontend:
- [x] Find siblings of any member (generic function)
- [x] Separate parent siblings from user siblings
- [x] Display parent siblings in Parents section
- [x] Display user siblings in Your section
- [x] Exclude parent siblings from Your section
- [x] Layout: Brothers left, User+Spouse middle, Sisters right

### Testing:
- [ ] Add father's brother → Should appear next to father
- [ ] Add mother's sister → Should appear next to mother
- [ ] Add your brother → Should appear next to you
- [ ] Add your sister → Should appear next to you
- [ ] Verify no duplication between sections

---

## Example Scenarios

### Scenario 1: Adding Father's Brother
1. User clicks "+" on Father's card
2. Selects "Add Brother"
3. Fills form: Name = "Uncle John"
4. Backend: Sets Uncle John's parents = Father's parents (grandparents)
5. Frontend: Detects Uncle John as Father's sibling
6. Display: Uncle John appears next to Father in Parents section

### Scenario 2: Adding Your Brother
1. User clicks "+" on Your card
2. Selects "Add Brother"
3. Fills form: Name = "Brother Mike"
4. Backend: Sets Brother Mike's parents = Your parents (father and mother)
5. Frontend: Detects Brother Mike as Your sibling
6. Display: Brother Mike appears next to You in Your section

### Scenario 3: Adding Mother's Sister
1. User clicks "+" on Mother's card
2. Selects "Add Sister"
3. Fills form: Name = "Aunt Sarah"
4. Backend: Sets Aunt Sarah's parents = Mother's parents (grandparents)
5. Frontend: Detects Aunt Sarah as Mother's sibling
6. Display: Aunt Sarah appears next to Mother in Parents section

---

## Key Principles

1. **Context Matters:** Where you click "+" determines where the new member appears
2. **Parent Inheritance:** Siblings inherit parents from the person whose card was clicked
3. **Section Separation:** Parent siblings ≠ Your siblings (different sections)
4. **Visual Clarity:** Each section has distinct styling and positioning
5. **Relationship Accuracy:** Database relationships match visual display

---

## Next Steps

1. Verify backend correctly sets parent relationships
2. Verify frontend correctly detects and separates siblings
3. Test all scenarios to ensure proper placement
4. Fix any remaining issues with section assignment

