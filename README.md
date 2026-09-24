# SMP_LastFM

A Spider Monkey Panel (SMP) for foobar2000 that displays Last.fm user,
artist, album, and track statistics.

## Features

- Last.fm user statistics:
  - Total plays
  - Average plays per day
  - Average plays per week
  - Average plays per month
- Configurable Top Artists charts
- Six Last.fm chart periods
- Up to 50 ranked artists available through chart scrolling
- Now Playing information
- Last.fm listener and play counts for the current artist, album, and track
- Last.fm avatar support
- Downloaded avatars scaled proportionally into the fixed 126 x 126 avatar area
- Categorized Spider Monkey Panel Properties
- RGBA color Properties
- Built-in Help / Documentation
- Context-menu access to panel functions

## Requirements

- foobar2000
- Spider Monkey Panel (SMP) 1.6.1 or compatible
- A Last.fm account
- A Last.fm API key

## Installation

### Script installation

1. Install Spider Monkey Panel in foobar2000.
2. Copy `SMP_LastFM.js` into your SMP scripts folder.
3. Add a Spider Monkey Panel to your foobar2000 layout.
4. Load `SMP_LastFM.js`.
5. Open **Panel properties...**.
6. Enter your Last.fm username and API key under the `LAST.FM` properties.
7. Reload the panel.

The repository does not contain a personal Last.fm username or API key.

### Package installation

A release/test package can also be created with `main.js`, `package.json`, and
the `images` folder. Import that ZIP through Spider Monkey Panel's Package
Manager.

## Last.fm credentials

The panel uses:

- `LAST.FM | Username`
- `LAST.FM | API Key`

Do not commit a personal Last.fm API key to a public GitHub repository. Enter
your own credentials through the panel's Properties.

## Downloaded Avatar

Choose **Avatar > Download Avatar** from the context menu to download the
current Last.fm profile image associated with the configured account.

The downloaded file may be larger than the panel's avatar area. The panel
keeps the source image intact and scales it proportionally at draw time so it
fits inside the fixed **126 x 126 px** avatar area. Smaller images are not
upscaled, and non-square images retain their aspect ratio.

**Avatar > Restore Default Avatar** returns to the configured default image.

## Property Categories

- **LAST.FM** - account credentials
- **DISPLAY** - display and chart choices
- **LAYOUT** - panel positions and dimensions
- **FONTS** - font family and sizes
- **IMAGES** - image files and locations
- **COLORS** - panel colors

## Top Artist Periods

The supported Last.fm period values are:

| Value | Meaning |
|---|---|
| `7day` | Last 7 days |
| `1month` | Last month |
| `3month` | Last 3 months |
| `6month` | Last 6 months |
| `12month` | Last 12 months |
| `overall` | Entire Last.fm history |

The current default order is:

`1month, 6month, 12month, overall, 7day, 3month`

## Colors

Color Properties use `R,G,B,A`, with each component from 0 through 255.

Examples:

```text
255,0,0,255
255,0,0,128
```

The first is opaque red; the second is semi-transparent red.

## Chart Scrolling

Chart scrolling is always available. Move the mouse over a Top Artists chart
and use the mouse wheel to move through the ranked artists.

## Last.fm Update Behavior

The panel requests fresh Last.fm information when a new track starts.
Last.fm may take some time to process a new scrobble, so a count shown by the
panel can temporarily differ from the Last.fm website.

## Context Menu

The context menu provides:

- Help / Documentation
- Avatar actions
- Reload
- Open component folder
- Panel properties...
- Configure...

## Project History

SMP_LastFM is an adaptation of the original `foo_silk-lastfm` panel by MB for
Spider Monkey Panel.

The supplied original source identifies `foo_silk-lastfm 1.3`, dated
2011-01-20, and credits MB.

## GitHub

This repository contains the stable source, SMP package metadata, and documentation.
Do not commit personal credentials or downloaded personal avatar files. The
user-installable distribution is provided as a GitHub Release asset.

For a simple GitHub update from an existing local repository:

```text
git status
git add SMP_LastFM.js README.md CHANGELOG.md CONTRIBUTING.md LICENSE .gitignore images/
git commit -m "Release SMP_LastFM 2L"
git push
```

If this is the first upload, create the GitHub repository first, then add the
repository as `origin` and push the default branch.

## License

See [LICENSE](LICENSE). The supplied original source does not contain a clear
standard open-source license grant in the material reviewed for this project,
so this repository does not claim an OSI-approved license for the original
work. Review applicable upstream licensing or permission terms before
redistributing the complete derivative project.

## Disclaimer

Last.fm is a trademark/service of its respective owner. This project is not
affiliated with or endorsed by Last.fm.
