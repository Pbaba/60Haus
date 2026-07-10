# 60house Project Documentation

60house is a mobile-first real estate discovery application that transforms property hunting into a short-form, high-engagement video experience (resembling TikTok or Instagram Reels).

---

## 1. Product Vision & Philosophy

### Core Vision
Discovering a home should be fast, transparent, and visually complete. Traditional platforms rely heavily on flat images and text-heavy listings. 60house shifts the paradigm by centering the user flow entirely around full-screen vertical property walkthrough videos.

### The "One Thumb. One Second." Principle
- **One Thumb**: Navigating through property options must require nothing more than a single thumb swipe up or down. Filters, save actions, and contacting owners are all situated within easy reach of the thumb.
- **One Second**: A user opening the app immediately begins viewing a video. Home discovery starts within one second of launch, removing all signup gates or splash delays from the direct path.

---

## 2. Folder Architecture

The project source code is contained entirely inside the `src/` directory to keep the root clean and modular:

```
60house/
├── assets/                   # Native app icon & splash assets
├── src/
│   ├── app/                  # File-based navigation screens (Expo Router)
│   │   ├── (tabs)/           # Main bottom tabs group
│   │   │   ├── _layout.tsx   # Tab bar configurations & custom FloatingDock
│   │   │   ├── index.tsx     # 🏠 Feed Screen (Vertical videos)
│   │   │   ├── search.tsx    # 🔍 Search Screen (renamed from Discover)
│   │   │   ├── saved.tsx     # ❤️ Saved Listings Screen
│   │   │   └── profile.tsx   # 👤 Profile Screen
│   │   ├── owner/            # Dedicated Property Owner modules
│   │   │   └── upload.tsx    # ➕ Owner Upload Listing Screen
│   │   ├── settings.tsx      # App Settings Screen
│   │   └── _layout.tsx       # Root layout, font loader, and global contexts
│   ├── components/           # Shared reusable components
│   │   ├── BottomSheet/      # Scaffolded overlay bottom sheets
│   │   ├── video/            # Future video module folder (currently empty)
│   │   ├── ScreenContainer.tsx # Safe-area aware view container
│   │   ├── FloatingDock.tsx  # Dynamic floating navigation dock
│   │   ├── Button.tsx        # Styled button variants (primary, secondary, text)
│   │   ├── Input.tsx         # Inputs with focus & validation error styles
│   │   ├── Card.tsx          # Card surface layouts
│   │   ├── Avatar.tsx        # Profile images with fallback initials
│   │   └── Skeleton.tsx      # Pulsing loading placeholders
│   ├── constants/            # Common configuration settings and mock constants
│   ├── hooks/                # Custom React hooks (useTheme, useAuth)
│   ├── lib/                  # Native wrapper configurations (Supabase connection)
│   ├── services/             # Database/Storage integrations
│   ├── theme/                # Global styling tokens
│   │   ├── index.ts          # Central Theme specs (typography, padding, shadows)
│   │   └── motion.ts         # Central Motion configurations (durations, easing)
│   ├── types/                # Core TypeScript interfaces
│   └── utils/                # General utility helper methods
```

---

## 3. Navigation Rules
- **Base Navigator**: Root navigation is managed using standard Expo Router stack navigators.
- **Floating Dock**: The primary user navigation uses an absolute-positioned floating dock (`FloatingDock.tsx`) instead of a traditional tab bar.
- **Access Restrictions**: Normal users do not see or have access to property upload screens on the dock. This is reserved for the Owner Upload screen located under `/owner/upload` which displays only when authorized.

---

## 4. Theme & Motion System

### Design Tokens
We use a premium **Obsidian Dark** theme system:
- **Colors**: Obsidian (`#0A0A0B`), Primary Gold (`#DFB978`), Surface Container (`#151518`), Elevated Surface (`#1E1E22`), Muted Text (`#9A9AA0`).
- **Typography**: Uses the Inter font-family with standard density headings (`h1` = 28px, `h2` = 24px) and weights.
- **Spacing**: Built on a strict 4pt system (`xs` = 4px, `sm` = 8px, `md` = 12px, `lg` = 16px, `xl` = 24px).
- **Border Radius**: 4 tokens: `sm` (8px), `md` (12px), `lg` (16px), `xl` (24px), `full` (9999px).

### Motion Specifications (`src/theme/motion.ts`)
- **Durations**: Fast (`150ms`), Normal (`250ms`), Slow (`400ms`).
- **Spring Parameters**: Custom physics setups for floating dock movements and bottom sheets:
  - `floatingDock`: `{ damping: 24, stiffness: 220, mass: 0.8 }`
  - `bottomSheet`: `{ damping: 28, stiffness: 180, mass: 1.1 }`

---

## 5. Coding Standards & Component Guidelines
- **Strict Typing**: All components, hooks, and helpers must feature explicit interfaces and return types. No `any` type is allowed.
- **Separation of Logic**: Keep UI components presentational. Fetching, state mutation, and API transactions are decoupled into custom hooks under `hooks/` or services under `services/`.
- **Reusable Styling**: Do not hardcode margins, colors, or padding inside views. Always fetch properties directly from the centralized `Theme`.

---

## 6. Sprint Roadmap

### Completed: Sprint 0 — Project Foundation
- Initialized React Native Expo project using TypeScript & SDK 57.
- Set up `src/` directory architecture.
- Installed core packages (`react-native-reanimated`, `@shopify/flash-list`, `expo-blur`, etc.).
- Integrated Supabase client instance with `SecureStore` persistence.
- Built reusable UI components and centralized Theme & Motion tokens.
- Structured the customized `FloatingDock` tab bar navigation.

### Completed: Sprint 1 — Visual Identity (Mock Data)
- Refined Design System with premium Obsidian (`#0A0A0B`) & Champagne Gold (`#DFB978`) color palettes.
- Refined `FloatingDock` to center and wrap content with subtle underline active indicators.
- Created `SearchOverlay` filtering Feed seamlessly without separate search page layouts.
- Built 10 navigable screens (Splash, Onboarding, Login, Register, Feed, Search, Saved, Profile, Settings, Owner Upload) using realistic Indian real estate listing models and mock profiles.

### Completed: Sprint 2 — Interactive Experience (Offline Mock)
- Integrated central state management layer using `PropertyContext` & `useProperties` hook.
- Integrated `expo-image-picker` and `expo-haptics` for native media picking and tactile notifications.
- Created gesture-driven Bottom Sheet snapping to closed, peek, and open points.
- Refined feed with vertical pagination snappings, pull-to-refresh triggers, and expandable details panel.
- Unified global error/empty visual indicator variants (`FeedbackState.tsx`).

### Completed: Sprint 3 — Accounts & Profiles (Live Backend)
- Integrated Supabase Auth for live signup, login, password resets, and session restorations.
- Restructured context providers into isolated blocks: Auth, Profile, and Property Contexts.
- Wrote full migration scripts (`supabase_migration.sql`) defining profile tables, triggers, and security policies.
- Implemented gated Guest Mode restricting listings saves and uploads with redirect modal screens.
- Refined Settings dashboard to allow updating profile avatar images, names, bios, and phone attributes directly in Supabase.

### Completed: Sprint 4 — Listings & Owner Management (Supabase DB)
- Created public properties and public property_images normalized tables.
- Implemented split services structure: propertyService, propertyUploadService, and propertySearchService.
- Built Owner Listings Dashboard with draft vs published tab toggles, counts, status badges, edits, and deletions.
- Configured Supabase Storage photo uploading converting pick assets to binary blobs dynamically.
- Implemented paginated Feed queries and Search overlays pulling directly from Supabase tables.

### Completed: Sprint 5 — Video Feed Engine (Walkthrough Videos)
- Integrated `expo-video` and `expo-video-thumbnails` standard SDK packages.
- Migrated feed components to `@shopify/flash-list` for high-speed recycling.
- Created `VideoFeedItem` supporting visible auto-plays, mute switches, and error recoveries.
- Configured automatic thumbnail frame extractions and `property-videos` storage bucket uploads.
- Built portrait orientation, size (<100MB), and duration checks on uploads.
- Added 2-second view increment triggers and SQL soft deletes.

### Completed: Sprint 6 — Discovery Engine (Centralized Rankings)
- Created public reports and public saved_searches database tables.
- Implemented DiscoveryService to execute freshness + sponsored weighted score calculations.
- Integrated multi-criteria recommendation scoring (matching city, locality, bedrooms, property types).
- Configured cursor-based pagination and min/max budget range filters inside searches.
- Built interactive Listing Reports Bottom Sheet gating guest submissions.

### Completed: Sprint 6.5 — Native Stabilization & Production Foundation
- Resolved gesture detector warnings by wrapping the root stack layout in `GestureHandlerRootView`.
- Configured resilient local mock listings fallbacks inside `PropertyContext` when Supabase database is unseeded.
- Optimized performance by wrapping render items and action buttons in React `useCallback` hooks.
- Cleared all ESLint errors and warnings across the codebase.
- Verified development build compatibility and passed all `expo-doctor` diagnostic tests.
- Designed a reusable top-level `ErrorBoundary` catching JavaScript exceptions.

---

## 4. Technical Architecture Specifications

### A. Context Hierarchy
The application manages global states through three isolated context providers nested at the root layout level (`src/app/_layout.tsx`):
1.  **`AuthContext`**: Manages Supabase session states, user registration, sign-ins, sign-outs, and handles the gated `isGuest` boolean flag.
2.  **`ProfileContext`**: Automatically listens to the authenticated user and syncs profile columns (`name`, `bio`, `role`, `avatar_url`) from the database.
3.  **`PropertyContext`**: Exposes search filters, active video listings collections, saves bookmarks, and monitors owner creation/upload progress states.

### B. Service Layer Architecture
All query mutations are decoupled from state contexts and isolated inside `src/services/`:
*   `authService`: Wraps authentication sign-ups, log-ins, and session cleanups.
*   `profileService`: Executes read/write updates on user profiles.
*   `propertyService`: Implements listing CRUD queries, soft deletes, and analytics increments.
*   `propertyUploadService`: Triggers size and length validations, extracts frame previews, and pushes assets to Supabase Storage.
*   `propertySearchService`: Executes cursor-based feed queries and budget range filters.
*   `discoveryService`: Ranks candidate listings using time-decay freshness and active sponsored boost scores, and grades recommendations.
*   `reportService`: Logs listing reports in the database.

### C. Routing & Navigation
Uses **Expo Router** file-based routing:
*   Root layout loads fonts and wraps providers in a top-level `ErrorBoundary` and `GestureHandlerRootView`.
*   `(tabs)/` contains bottom tab links (`index`, `search`, `saved`, `profile`) rendered inside a custom static `FloatingDock` navigation layout.
*   `owner/upload` mounts as a presentation modal for edits and new submissions.
*   `settings` operates as a slide-in card for profile edits.
*   `property/[id]` enables deep linking to property details.

### D. Discovery & Recommendation Pipeline
*   **Rankings**: Uses a centralized decay ranking algorithm:
    $$\text{Score} = \frac{1.0}{1.0 + \text{Listing Age in Days}} + \text{Sponsorship Boost}$$
*   **Recommendations**: Grades similarity by analyzing matching cities, local regions, bed configurations, listing Rent/Buy intent, and property models.
*   **Cursor Pagination**: Uses property `created_at` timestamp cursors in paginated retrievals rather than standard page offsets, avoiding overlapping listings when items load dynamically.

### E. Video Engine & Storage Architecture
*   **expo-video**: Video feeds are built on top of SDK 57's native `expo-video` players inside the recycled `FlashList` items.
*   **Visibility Control**: Only the active vertical page plays automatically, muting/unmuting globally through contextual states, and restarting when refocused.
*   **Supabase Storage Buckets**:
    *   `avatars/`: Owner profiles.
    *   `property-images/`: Visual carousels.
    *   `property-videos/`: Walkthrough MP4/MOV videos.
    *   `property-thumbnails/`: Automatically generated frame captures.

