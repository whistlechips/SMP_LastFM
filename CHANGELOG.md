# Changelog

## 2L - 2026-09-24

- Established the stable GitHub baseline following the 2K-v10 avatar scaling fix.
- Documented proportional downloaded-avatar display within the fixed 126 x 126 px avatar area.
- No functional changes beyond the validated 2K-v10 behavior.

## 2K-v10 - 2026-09-24

- Added proportional downloaded-avatar display within the fixed 126 x 126 px avatar area.
- Prevented the source image's native dimensions from changing the panel layout.
- Smaller source images are not upscaled.
- Non-square source images retain their aspect ratio and are centered within the avatar area.

## 2K-v9 - 2026-09

- Added downloaded-avatar existence checking.
- If the selected downloaded avatar is missing, the panel falls back to the configured default avatar without changing the Downloaded Avatar property.

## 2K

- Removed unsupported `fb.Trace()` usage.
- Completed the built-in Help / Documentation.
- Replaced extended Unicode punctuation in Help with ASCII-safe text.
- Decoupled User Statistics from avatar availability.
- Added Last.fm `registered@unixtime` handling for user statistics.
- Added categorized Properties and RGBA color handling.
- Updated Now Playing header alignment.
- Established current track-start update behavior while allowing for Last.fm scrobble processing delays.
