# Known Limitations (Beta V1)

This document outlines the known technical, functional, and product limitations of the 60Haus application going into the Closed Beta Phase.

## 1. Map & Location Engine
- **Dense Clustering Performance**: The map currently uses a basic clustering algorithm. If a single neighborhood has 1000+ active properties, zooming into that specific quadrant may cause frame drops.
- **Geocoding Precision**: Location lookup is reliant on standard APIs. Rural or newly developed addresses might snap to the nearest road rather than the exact plot.

## 2. Analytics & Reporting
- **Data Latency**: Owner analytics (Views, Saves, Lead Conversion) are heavily cached to prevent database overload. They may run up to 24 hours behind real-time activity depending on the aggregate cron schedule.
- **Unique Viewers Tracking**: Currently relies on simple device footprints which could slightly overcount users who browse anonymously and then log in.

## 3. Media Processing
- **Video Transcoding Delay**: Property videos uploaded by owners are processed asynchronously. They may appear pixelated or buffer slowly for the first 5-10 minutes after upload until the optimized HLS stream finishes generating on the server.
- **Max Upload Limit**: Individual image/video uploads are strictly capped at 20MB. Owners attempting to upload uncompressed 4K drone footage directly from their phones will encounter a failure toast.

## 4. Offline Capabilities
- **Read-Only Discover**: The Discovery feed and Property Details will load cached data while offline, but performing deep searches or filtering will fail gracefully.
- **Mutation Queue**: The offline retry queue (Save Property, Send Message) works persistently, but if the app is force-closed (swiped away) before connectivity is restored, the queue processing will only resume the next time the app is launched.

## 5. Security & Accounts
- **Account Deletion Delay**: While account deletion immediately removes user access and hides their listings via RLS, the actual hard-deletion of their associated images from the Storage buckets is processed in a weekly background cleanup job.

These limitations are actively tracked and will be systematically resolved during the beta iteration phase leading up to the public release.
