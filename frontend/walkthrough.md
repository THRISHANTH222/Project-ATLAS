# Walkthrough - Dark Mode & User Profile Settings

We have successfully built **Dark Neo-Brutalist Theme Support** and a dedicated **User Settings Dashboard** under `/dashboard/settings`.

---

## Visual Verification Slideshow

Here is a slideshow displaying the dark mode dashboard layout and profile configuration settings:

````carousel
![Overview (Dark Mode)](file:///C:/Users/SHAJITESH/.gemini/antigravity-ide/brain/a9f059c5-76f6-4b5d-9650-7ea4782c2442/brutalist_overview_dark.png)
<!-- slide -->
![Settings Page (Dark Mode)](file:///C:/Users/SHAJITESH/.gemini/antigravity-ide/brain/a9f059c5-76f6-4b5d-9650-7ea4782c2442/brutalist_settings_dark.png)
<!-- slide -->
![Settings Page Saved](file:///C:/Users/SHAJITESH/.gemini/antigravity-ide/brain/a9f059c5-76f6-4b5d-9650-7ea4782c2442/brutalist_settings_saved.png)
<!-- slide -->
![AI Chat (Dark Mode)](file:///C:/Users/SHAJITESH/.gemini/antigravity-ide/brain/a9f059c5-76f6-4b5d-9650-7ea4782c2442/brutalist_chat_dark.png)
````

And here is the browser recording showing the dark mode switch and settings updates:

![Dark Mode & Profile Configuration](file:///C:/Users/SHAJITESH/.gemini/antigravity-ide/brain/a9f059c5-76f6-4b5d-9650-7ea4782c2442/brutalist_dark_updates.webp)

---

## Change Breakdown

### 1. Dark Mode Theme Switcher (`src/app/dashboard/layout.tsx`)
- Added a **Sun/Moon toggle button** in the sidebar.
- Added a state-driven wrapper class (`theme === "dark" ? "dark bg-[#18181A] text-white" : ...`) that triggers Tailwind's responsive dark-mode prefix selectors.
- In Dark Neo-Brutalist mode:
  - Cards take dark slate background (`bg-[#242427]`) with solid white borders (`border-white`).
  - Drop shadows turn into high-contrast solid white blocks (`shadow-[4px_4px_0px_#FFFFFF]`).
- State is initialized lazily and saved in `localStorage` so it persists between reloads.

### 2. User Profile settings (`src/app/dashboard/settings/page.tsx`)
- Users can update their **Display Name** and paste a custom **Avatar URL** or select from DiceBear seeds.
- Added **Phone Number Linking**:
  - Country select dropdown list (e.g., India +91, USA +1, UK +44, Australia +61).
  - Form validation ensures phone numbers contain digits only and meet minimum length bounds.
- Integrates with `updateUserProfile` service helper in `src/lib/firebase.ts` to sync with either Firebase Authentication or mock localStorage emulations.

---

## Testing & Compilation
- **Linter validation**: `npm run lint` completed with **0 errors**.
- **Static build compilation**: `npm run build` compiled all routes cleanly.
- **Verification checks**: Verified toggling theme switches layout values dynamically, updates the bottom navigation user profile avatar seeds, and links phone codes correctly.
