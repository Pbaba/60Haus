# Changelog

## [1.0.0-beta.1] - 2026-07-30
### Added
- **Closed Beta Platform**: Diagnostics, crash reporting, and usability telemetry.
- **In-App Feedback**: Users can now report bugs or usability issues directly from the app.
- **Feature Flags**: Remote toggles to disable features instantly without app store updates.
- **Offline Resilience**: App now queues actions while offline and automatically replays them (Save Property, Send Message).
- **Error Boundaries**: A global fallback screen prevents the app from hard-crashing on JavaScript errors.

### Changed
- **Rate Limiting**: Strictly enforced messaging and visit request spam protection at the database level.
- **FlatList Optimization**: Significant scroll performance improvements across Feed and Inbox.

### Security
- RLS audit complete. Conversations and Analytics events are completely locked down.
