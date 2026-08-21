# 60Haus — Store Readiness Roadmap & Future Sprint Architecture

**Project**: 60Haus — Mobile Real Estate Video Discovery Platform  
**Target Release**: v1.0.0 Production (App Store & Google Play Release)  
**Baseline Version**: v1.0.0-beta.1 (Phase 27 Baseline)  
**Date**: August 18, 2026

---

## 1. PART 16 — STORE READINESS ROADMAP

The roadmap below maps out the precise sequence of engineering phases required to transition 60Haus from its current audited state (Phase 27 Baseline) to public submission on the Apple App Store and Google Play Store:

```text
===================================================================================
                             60HAUS PRODUCT ROADMAP                                
===================================================================================

       [ CURRENT BASELINE ]
       Phase 27 / v1.0.0-beta.1 (Full Platform Audit Complete — 86.4% Health Score)
                │
                ▼
       [ SPRINT 28 ]
       Store Compliance, UGC Moderation & Testing Baseline
       ├── 1. In-App Account & Data Deletion Workflow (Apple Guideline 5.1.1)
       ├── 2. User-Generated Content (UGC) User Blocking (`user_blocks` RLS & UI)
       ├── 3. Automated Test Framework Setup (Jest & RNTL Baseline)
       └── 4. Geocoding API Production Key Binding
                │
                ▼
       [ SPRINT 29 ]
       Real-Device Validation & Closed Beta Distribution
       ├── 1. Physical Device Performance Profiling (Android Low-Memory & Video GC)
       ├── 2. Push Notification Production Setup (APNs & FCM Credentials in EAS)
       ├── 3. RLS Telemetry Hardening (`beta_feedback` SELECT Policy Restrict)
       └── 4. Internal Closed Beta Release via TestFlight & Firebase App Distribution
                │
                ▼
       [ CLOSED BETA VALIDATION ]
       Real-World Beta Testing Phase (100 Active Buyers & Owners)
       ├── Telemetry Log Monitoring (`beta_diagnostics`)
       ├── Crash Free User Rate Tracking (>99.5% Target)
       └── In-App Feedback Remediation (`BetaFeedbackSheet`)
                │
                ▼
       [ SPRINT 30 ]
       Release Hardening & Store Build Preparation
       ├── 1. App Store Metadata, Screenshots & Privacy Nutrition Labels
       ├── 2. Production Environment Verification & EAS Build Compilation
       └── 3. Final Regression Testing Suite Execution
                │
                ▼
       [ STORE SUBMISSION ]
       App Store & Google Play Store Review
       ├── Apple App Store Connect Review Submission
       └── Google Play Console Production Track Release
                │
                ▼
       [ v1.0.0 PRODUCTION RELEASE ]
       Public Store Rollout (Phased 7-Day Release)
===================================================================================
```

---

## 2. PART 17 — RECOMMENDED FUTURE SPRINTS

### 2.1 SPRINT 28: Store Compliance, UGC Moderation & Testing Baseline

* **Objective**: Eliminate all mandatory App Store submission blockers (Account Deletion & UGC User Blocking) and establish the automated unit testing framework.
* **Why Necessary**: Apple App Store Guideline 5.1.1(v) rejects apps that lack in-app account deletion. App Store Guideline 1.2 rejects social/UGC apps that lack user blocking mechanisms. Furthermore, 0% test coverage poses a severe risk to product stability.
* **Features / Tasks**:
  1. **Account Deletion Workflow (`AUTH-004`)**:
     - Create database RPC function `delete_user_account(user_id uuid)` that cascades profile data, property listings, messages, and revokes auth session.
     - Add self-serve "Delete Account" button with double confirmation dialog in `src/app/settings.tsx`.
  2. **User Blocking Feature (`TRUST-003`)**:
     - Create database table `user_blocks(blocker_id uuid, blocked_id uuid, created_at timestamptz)` with RLS policies restricting read/write to `blocker_id`.
     - Update `conversations` and `messages` RLS policies to filter out blocked users automatically.
     - Add "Block User" button to user profiles (`profile.tsx`) and chat headers (`chat/[id].tsx`).
  3. **Automated Test Baseline (`TEST-001`)**:
     - Install and configure `@testing-library/react-native` and `jest-expo`.
     - Write unit tests for `discoveryService.ts`, `propertyService.ts`, `bookmarkService.ts`, and `retryQueueService.ts`.
  4. **Geocoding API Integration (`DISC-005`)**:
     - Bind Google Maps / Mapbox Geocoding API key in `.env` and replace deterministic mock resolution in `locationResolver.ts`.
* **Dependencies**: Supabase MCP access for `user_blocks` migration and deletion RPC function creation.
* **Definition of Done**:
  - In-app Account Deletion successfully purges user profile in manual testing.
  - Blocking a user instantly hides their messages and property listings from the blocker.
  - `npm run test` executes cleanly with $\ge 25\%$ core service test coverage.
  - `npx tsc --noEmit` passes with 0 errors.
* **Estimated Risk**: Low (Focused compliance additions without altering existing feed architecture).

---

### 2.2 SPRINT 29: Real-Device Validation & Closed Beta Distribution

* **Objective**: Validate video playback, memory footprint, and network transitions on physical iOS/Android devices, configure native push notifications, and launch Closed Beta.
* **Why Necessary**: Simulators cannot measure physical video memory pressure, battery drain, or APNs/FCM push notification delivery under real cell network conditions.
* **Features / Tasks**:
  1. **Real-Device Media Profiling**:
     - Profile vertical video scrolling in `index.tsx` on physical low-end Android devices (3GB RAM) using Flipper / Android Studio Profiler.
     - Optimize `expo-video` instance recycling and memory garbage collection.
  2. **Push Notification Provisioning**:
     - Set up Apple Push Notification service (APNs) key and Firebase Cloud Messaging (FCM) server key in EAS.
     - Implement backend trigger for new message push notifications.
  3. **Telemetry RLS Hardening**:
     - Restrict RLS `SELECT` policy on `beta_feedback` and `beta_diagnostics` tables to prevent unauthorized reading.
  4. **Closed Beta Release**:
     - Build iOS build (`.ipa`) via EAS Build and upload to TestFlight.
     - Build Android build (`.apk` / `.aab`) via EAS Build and upload to Google Play Console Internal Testing.
* **Dependencies**: Sprint 28 completion; Apple Developer Account & Google Play Console administrative access.
* **Definition of Done**:
  - TestFlight and Google Play Internal Testing builds distributed to 100 beta testers.
  - Video feed operates at smooth 60fps without memory leak crashes during 30-minute continuous scroll tests.
  - Push notifications successfully arrive on physical iOS & Android hardware upon receiving a chat message.
* **Estimated Risk**: Medium (Hardware-specific video driver quirks may require memory threshold tweaks).

---

### 2.3 SPRINT 30: Beta Remediation & Release Hardening

* **Objective**: Resolve telemetry feedback reported by closed beta testers, polish store metadata assets, and prepare release builds.
* **Why Necessary**: Real closed-beta feedback identifies edge-case UI glitches and network failure scenarios that must be resolved prior to public launch.
* **Features / Tasks**:
  1. **Beta Feedback Remediation**:
     - Triage and fix top reported bugs from `beta_feedback` and `beta_diagnostics`.
  2. **Store Metadata & Assets**:
     - Generate high-resolution store screenshots for iOS (6.7" & 5.5") and Android (Phone & Tablet).
     - Prepare App Store Privacy Nutrition Labels and Google Play Data Safety forms.
  3. **Production EAS Release Builds**:
     - Execute production EAS builds (`eas build --platform all --profile production`).
* **Dependencies**: Closed Beta testing cycle complete (minimum 7 days of real user data).
* **Definition of Done**:
  - Crash-free user rate $> 99.5\%$ over beta period.
  - All P0 and P1 beta feedback tickets resolved.
  - Release binaries (`.ipa` and `.aab`) compiled and signed cleanly.
* **Estimated Risk**: Low.

---

### 2.4 SPRINT 31: App Store & Google Play Submission

* **Objective**: Submit 60Haus v1.0.0 to Apple App Store Connect and Google Play Console for formal app review.
* **Why Necessary**: Final milestone to publish the application to the public stores.
* **Features / Tasks**:
  1. **App Store Review Submission**: Submit iOS app for review with test credentials provided for Apple app reviewers.
  2. **Google Play Console Release**: Submit Android app for Google Play Store review.
  3. **Phased Rollout Management**: Configure 7-day phased rollout for public release monitoring.
* **Dependencies**: Sprint 30 completion.
* **Definition of Done**:
  - App Store Review status: "Approved for Release".
  - Google Play Store status: "Published".
* **Estimated Risk**: Low (All technical and policy compliance blockers resolved in Sprint 28 & 29).
