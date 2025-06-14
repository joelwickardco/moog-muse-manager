Excellent — we’ll build the UX spec around **Option A: Clipboard-Style Patch Copying**.

---

### 🧭 Core Workflow: Patch Curation & Copying

#### 1. **User selects a source bank**

- View shows 16 patches in a grid (e.g. 4x4)
- Each patch shows:
  - Patch name
  - Favorited status (heart icon in top-right, clickable to toggle)
  - Tags (rendered as removable chips)
  - Action button (⋯ or hover menu)
  - Selected state is indicated by a colored border or glow (e.g. `ring-2 ring-blue-500`)

---

#### 2. **User marks patches**

- Click to select (single or multi-select)
- Shift-click for range selection
- Selected patches show border highlight

---

#### 3. **User clicks “Copy to…”**

- Triggered via:
  - Toolbar button when one or more patches are selected
  - Right-click/context menu on a selected patch

---

#### 4. **Copy Drawer/Modal Appears**

Components:

- 📚 **Destination Library** dropdown (defaults to current)
- 🗂️ **Destination Bank** dropdown
  - If the selected bank is full (16 patches), disable Confirm and show error: `"Bank 03 is full. Please remove one or more patches before copying."`
- 🔢 **Patch Slot Picker**
  - Display 16 slot tiles (01–16)
  - Allow user to select empty slots to place patches into
  - Must select as many slots as patches being copied
  - Show occupied vs available vs selected states clearly
- ✅ Confirm button (disabled until all selections valid)
- ↩️ Cancel button

---

#### 5. **After Copy**

- Snackbar/toast appears: `✅ 3 patches copied to Bank 03 of My Favorites Library [Undo]`
- Undo rolls back copy (temporary in-memory)
- No redirection required

---

### 🧱 Suggested React/Tailwind Components

- `PatchGrid` — renders 4x4 grid of patch cards
- `PatchCard` — displays patch metadata, favorite toggle, tags, selected state
- `PatchSelectorContext` — manages global selection state
- `CopyToDrawer` — modal for patch copy destination/slot UI
- Global state/store for managing copy workflows (e.g. Zustand or Context)

---

### 🧩 Tags & Favorites Logic

- Tags are stored as plain strings on the patch object
- No global tag list or suggestion dropdown
- Users can add a tag by typing and pressing Enter
- Tags displayed as chips with an `x` to remove

- Favorite toggle: heart icon in top-right of patch card
  - Uses Heroicons: outline when inactive, filled when active

---

### 🧠 Behavioral Notes

- Patch name collisions are **allowed** within a bank — no renaming required
- Patches cannot be copied to full banks — user must clear space first
- Copy modal enforces **manual slot selection** — no auto-placement
- Patch selection and tagging/favoriting can be done while working alongside synth hardware