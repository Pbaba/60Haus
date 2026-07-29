# Closed Beta Checklist: 60Haus

This checklist ensures the application is operationally ready, secure, and performant before distributing to the first closed beta users.

## 1. Functional & Edge Case Testing
- [ ] **Offline Mutations**: Turn off Wi-Fi, send a chat message, turn on Wi-Fi. Verify message delivers.
- [ ] **Deep Linking**: Verify clicking a `60haus.app/property/123` link opens directly to the property screen.
- [ ] **Push Notifications**: Send a test notification. Verify it routes to the correct chat thread upon tap.
- [ ] **Media Uploads**: Upload a large property video over a throttled network connection. Verify it doesn't timeout indefinitely.
- [ ] **Pagination Boundaries**: Scroll past 50 properties in the Discovery feed to ensure infinite scrolling logic triggers cleanly.

## 2. Security & Rate Limiting
- [ ] **RLS Verification**: Impersonate a regular user role in Supabase. Attempt to query `SELECT * FROM conversations`. Verify it ONLY returns rows where `buyer_id` or `owner_id` matches the user.
- [ ] **Abuse Prevention**: Rapid-fire the "Contact Owner" button 20 times. Verify the client debounces the UI and the SQL `check_rate_limit` rejects the spam.
- [ ] **Data Deletion**: Delete an account from Settings. Verify cascade rules wipe their properties and conversations securely.

## 3. Performance & Memory
- [ ] **Image Optimization**: Ensure the Discovery feed loads small thumbnails first, not 4K source images.
- [ ] **Memory Leaks**: Vigorously swipe through 100 properties in the Fullscreen Gallery on a physical device. Ensure RAM usage plateaus.
- [ ] **Render Blocking**: Open the Owner Analytics Dashboard. Ensure custom SVGs don't stutter the navigation transition.

## 4. Accessibility (a11y)
- [ ] **Screen Readers**: Turn on VoiceOver/TalkBack. Navigate the home screen and ensure property cards read out price and location intelligently.
- [ ] **Contrast**: Verify all tertiary text (like the "Offline" banner) passes WCAG AA contrast standards.
- [ ] **Font Scaling**: Increase device text size to 150%. Ensure the UI doesn't break or overlap unreadably in the Inbox.

## 5. Release & Environment Setup
- [ ] **Environment Variables**: Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are pointing to the PRODUCTION project, not staging.
- [ ] **Analytics Configuration**: Connect Sentry / PostHog endpoints in `loggingService.ts` and `performanceService.ts` if required for the beta.
- [ ] **App Store Assets**: Verify the Launcher Icon and Splash Screen map to the correct 60Haus branding.
- [ ] **App Version**: Ensure `app.json` has `version: 1.0.0` and a fresh `buildNumber`/`versionCode`.

## 6. Known Limitations (Beta V1)
- Map clustering is currently basic. Very dense neighborhoods (1000+ pins) may degrade map performance.
- Analytics data updates once daily rather than purely real-time (to save DB computation).
- Video transcoding happens lazily. Videos may appear pixelated for the first 5 minutes after upload.
