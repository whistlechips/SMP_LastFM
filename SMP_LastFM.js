/*
    ============================================================
    SMP_LastFM
    Faithful Spider Monkey Panel 1.6.1 port of foo_silk-lastfm
    ============================================================

    Original:
        foo_silk-lastfm 1.3 (2011-01-20)
        by Matthijs Brobbel / MB

    This revision consolidates:
        - foo_silk-lastfm 1.3 panel code
        - foo_silk-lastfm.js Last.fm API code
        - relevant foo_silk.js helpers

    Revision 2L - stable baseline after 2K-v10 avatar scaling fix
    ============================================================
*/


/*
    Revision history:
    1A  Initial SMP consolidation.
    1B  Removed unsupported PopupMenu.Dispose() calls.
    1C  Added DefineScript/versioning and Properties-based credentials.
    1D  Removed diagnostic code; PSS controls panel sizing.
    1E  Restructured Context Menu; removed duplicate Properties entry;
        replaced unsupported HTML help with native popup help.
    1F  Removed the chart-scrolling setting; chart scrolling is always enabled.
    1G  Removed manual Last.fm refresh from the menu; added Avatar submenu
        with native avatar download and Restore Default Avatar.
    1H  Fixed the undefined grayed-menu flag.
    1I  Made menu flags self-contained; no global menu constants are required.
    1J  Fixed Open component folder; it now opens fb.ComponentPath in Explorer.
    1K  Fixed repeated Avatar downloads by releasing the loaded avatar image
        before overwriting avatar.jpg.
    1L  Restored the script-scope MENU alias lost during the 1K rebuild.
    1M  Corrected repeated Avatar downloads by disposing the loaded GDI
        avatar before overwriting avatar.jpg.
    1N  Restored openResource(), inadvertently lost during the Context Menu rebuild.
    1O  Restored showHelp() and its built-in HELP documentation, which was also lost during the Context Menu rebuild.
    1P  Fixed repeated Avatar downloads by saving each new avatar to a unique filename instead of overwriting the loaded image file.
    1Q  Fixed Context Menu web links to launch through the Windows Shell/default browser.
    1S  Removed post-scrobble verification timer; Last.fm data is refreshed when each new track starts, with normal Last.fm propagation lag accepted.
    1T  Added grouped RGBA color Properties and internal RGBA-to-color conversion.
    1U  Added Chart Bar Start/End and White/Digits color Properties and categorized configurable Properties.
    1V  Removed obsolete duplicate color Properties and corrected the default color palette for readable contrast.
    1W  Restored the original foo_silk-lastfm 1.3 chart and digit colors.
    1X  Corrected color-property wiring; removed legacy color Properties and migrated the previously stored chart defaults to the original palette.
    1Y  Restored all configurable Properties and grouped them into LAST.FM, DISPLAY, LAYOUT, FONTS, IMAGES, and COLORS categories.
    1Z  Corrected RGBA channel packing to SMP/GDI AABBGGRR and added conversion self-tests.
    2A  Corrected RGBA channel packing to the AARRGGBB order required by the current SMP drawing calls; verified primary RGB test colors.
    2B  Reused the Album Visualizer RGBA/AARRGGBB implementation directly for LastFM color Properties.
    2C  Removed the temporary property-migration mechanism; categorized Properties are now authoritative. Set requested Last.fm credential defaults.
    2D  Bottom-aligned the Last.fm Now Playing column headers with the Now Playing heading.
    2E  Moved the Last.fm Now Playing column headers down 7 px to match the reference layout.
    2F  Moved the Now Playing heading down 7 px so its baseline aligns with the Last.fm column headers.
    2G  Fixed user registration-date parsing to read Last.fm registered@unixtime, allowing per-day, per-week, and per-month statistics to calculate.
    2H  Expanded built-in Help / Documentation into a complete user guide covering Last.fm basics, display and property categories, chart periods, RGBA colors, scrolling, updates, context menu, and troubleshooting.
    2K-v7  Restored the IMAGES | Image Folder property as the active image path; if the saved path does not contain the configured logo file, automatically repair it to the package-local images folder.
    2K-v9  Added downloaded-avatar existence checking; if the selected downloaded avatar is missing, the panel falls back to the configured default avatar without changing the Downloaded Avatar property.
    2K-v10 Added proportional downloaded-avatar display within the fixed 126 x 126
           avatar area; layout calculations now use the fixed avatar area rather than
           the source image dimensions.
    2L  Established the stable GitHub baseline after the 2K-v10 avatar scaling fix.
*/



"use strict";

/* ========================================================================
   PROPERTIES
   ======================================================================== */

const COLORS = {
    panelBackground: window.GetProperty(
        'COLORS | Panel background',
        '31,30,30,255'
    ),
    artistText: window.GetProperty(
        'COLORS | Artist text',
        '245,245,247,255'
    ),
    albumText: window.GetProperty(
        'COLORS | Album text',
        '220,220,224,255'
    ),
    trackText: window.GetProperty(
        'COLORS | Track text',
        '255,255,255,255'
    ),
    secondaryText: window.GetProperty(
        'COLORS | Secondary text',
        '175,175,182,255'
    ),
    chartText: window.GetProperty(
        'COLORS | Chart text',
        '245,245,247,255'
    ),
    chartBarStart: window.GetProperty(
        'COLORS | Chart Bar Start Color',
        '75,100,125,255'
    ),
    chartBarEnd: window.GetProperty(
        'COLORS | Chart Bar End Color',
        '100,150,200,255'
    ),
    whiteDigits: window.GetProperty(
        'COLORS | White / Digits',
        '255,255,255,255'
    )
};

function RGBA(r, g, b, a) {
    return (((a & 0xff) << 24) |
        ((r & 0xff) << 16) |
        ((g & 0xff) << 8) |
        (b & 0xff)) >>> 0;
}

function rgbaToColor(value) {
    const parts = String(value).split(',').map(function (v) {
        const n = parseInt(v.trim(), 10);
        return isNaN(n) ? 0 : Math.max(0, Math.min(255, n));
    });

    while (parts.length < 4) parts.push(255);

    return (((parts[3] & 0xff) << 24) |
        ((parts[0] & 0xff) << 16) |
        ((parts[1] & 0xff) << 8) |
        (parts[2] & 0xff)) >>> 0;
}

function testRgbaToColor() {
    const tests = [
        ['255,0,0,255', 0xFFFF0000],
        ['0,255,0,255', 0xFF00FF00],
        ['0,0,255,255', 0xFF0000FF],
        ['255,255,255,255', 0xFFFFFFFF],
        ['0,0,0,255', 0xFF000000],
        ['255,0,0,128', 0x80FF0000]
    ];

    for (let i = 0; i < tests.length; i++) {
        if (rgbaToColor(tests[i][0]) !== (tests[i][1] >>> 0)) {
            throw new Error('RGBA conversion test failed: ' + tests[i][0]);
        }
    }

    if (RGBA(255, 0, 0, 255) !== 0xFFFF0000 >>> 0) {
        throw new Error('RGBA helper test failed.');
    }
}

testRgbaToColor();

function updateColorProperties() {
    const readColor = function (key, fallback) {
        const value = window.GetProperty(key, fallback);
        return rgbaToColor(value);
    };

    COLOR.panelBackground = readColor(
        'COLORS | Panel background',
        '31,30,30,255'
    );
    COLOR.artistText = readColor(
        'COLORS | Artist text',
        '245,245,247,255'
    );
    COLOR.albumText = readColor(
        'COLORS | Album text',
        '220,220,224,255'
    );
    COLOR.trackText = readColor(
        'COLORS | Track text',
        '255,255,255,255'
    );
    COLOR.secondaryText = readColor(
        'COLORS | Secondary text',
        '175,175,182,255'
    );
    COLOR.chartText = readColor(
        'COLORS | Chart text',
        '245,245,247,255'
    );
    COLOR.chartBarStart = readColor(
        'COLORS | Chart Bar Start Color',
        '75,100,125,255'
    );
    COLOR.chartBarEnd = readColor(
        'COLORS | Chart Bar End Color',
        '100,150,200,255'
    );
    COLOR.whiteDigits = readColor(
        'COLORS | White / Digits',
        '255,255,255,255'
    );
}

const COLOR = {
    panelBackground: 0,
    artistText: 0,
    albumText: 0,
    trackText: 0,
    secondaryText: 0,
    chartText: 0,
    chartBarStart: 0,
    chartBarEnd: 0,
    whiteDigits: 0
};

const P = {
    // Last.fm credentials
    username:       ["LAST.FM | Username", ""],
    apiKey:         ["LAST.FM | API Key", ""],

    // Display / chart behavior
    topArtistPeriods: ["DISPLAY | Top Artist Periods", 4],
    topArtistLimit:   ["DISPLAY | Top Artists Shown", 45],
    period1:          ["DISPLAY | Top Artist Period 1", "1month"],
    period2:          ["DISPLAY | Top Artist Period 2", "6month"],
    period3:          ["DISPLAY | Top Artist Period 3", "12month"],
    period4:          ["DISPLAY | Top Artist Period 4", "overall"],
    period5:          ["DISPLAY | Top Artist Period 5", "7day"],
    period6:          ["DISPLAY | Top Artist Period 6", "3month"],
    mini:             ["DISPLAY | Minimized", false],
    avatarEnabled:    ["DISPLAY | Use Downloaded Avatar", false],

    // Layout
    chartPeriodWidth: ["LAYOUT | Chart Period Width", 270],
    chartBarStart:    ["LAYOUT | Chart Bar Start", 270],
    chartTop:         ["LAYOUT | Chart Top", 35],
    chartNameX:       ["LAYOUT | Chart Name X", 165],
    chartRankX:       ["LAYOUT | Chart Rank X", 150],

    // Fonts
    fontName:         ["FONTS | Font Name", "Segoe UI"],
    fontNowPlaying:   ["FONTS | Now Playing Font Size", 12],
    fontPlays:        ["FONTS | Statistics Font Size", 11],
    fontData:         ["FONTS | Chart Font Size", 11],
    fontTitle:        ["FONTS | Title Font Size", 13],
    fontBig:          ["FONTS | Heading Font Size", 15],

    // Image paths
    imagePath:        ["IMAGES | Image Folder", utils.GetPackagePath(window.ScriptInfo.PackageId) + "\\images\\"],
    logoFile:         ["IMAGES | Last.fm Logo", "lastfm_logo_red.jpg"],
    flipFile:         ["IMAGES | Digit Background", "scrobbleflip.png"],
    defaultAvatar:    ["IMAGES | Default Avatar", "default_avatar.png"],
    avatarFile:       ["IMAGES | Downloaded Avatar", "avatar.jpg"]
};

const PROP = {};
for (const key in P) {
    PROP[key] = window.GetProperty(P[key][0], P[key][1]);
}

// Keep the user-configurable Image Folder property, but repair a stale or
// invalid saved path so the package's bundled images remain available.
const packageImagePath = utils.GetPackagePath(window.ScriptInfo.PackageId) + "\\images\\";
if (!PROP.imagePath || !utils.Glob(PROP.imagePath + PROP.logoFile).length) {
    PROP.imagePath = packageImagePath;
    window.SetProperty(P.imagePath[0], PROP.imagePath);
}

function saveProperty(key, value) {
    PROP[key] = value;
    window.SetProperty(P[key][0], value);
}

/* ========================================================================
   CONSTANTS / HELPERS
   ======================================================================== */

const DT = {
    LEFT: 0x00000000,
    CENTER: 0x00000001,
    RIGHT: 0x00000002,
    VCENTER: 0x00000004,
    CALCRECT: 0x00000400,
    NOPREFIX: 0x00000800,
    END_ELLIPSIS: 0x00008000
};

const MF = {
    STRING: 0x00000000,
    SEPARATOR: 0x00000800,
    GRAYED: 0x00000001,
    CHECKED: 0x00000008,
    UNCHECKED: 0x00000000,
    POPUP: 0x00000010
};

// Menu flag alias used by the Context Menu.
const MENU = MF;

function rgb(r, g, b) {
    return 0xFF000000 | (r << 16) | (g << 8) | b;
}

function colorValue(value) {
    return typeof value === "number" ? value : rgb(170, 97, 44);
}

function addCommas(value) {
    let s = String(value);
    while (/^\d\d{3}/.test(s)) {
        s = s.replace(/(\d)(\d{3}(\.|,|$))/, "$1,$2");
    }
    return s;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function imagePath(file) {
    return PROP.imagePath + file;
}

function periodList() {
    return [
        PROP.period1, PROP.period2, PROP.period3,
        PROP.period4, PROP.period5, PROP.period6
    ];
}

function periodLabel(period) {
    switch (period) {
        case "overall": return "Overall";
        case "12month": return "12 Months";
        case "6month": return "6 Months";
        case "3month": return "3 Months";
        case "1month": return "1 Month";
        case "7day": return "7 Days";
        default: return period;
    }
}

function configuredPeriodCount() {
    return clamp(Number(PROP.topArtistPeriods) || 0, 0, 6);
}

/* ========================================================================
   STATE
   ======================================================================== */

const state = {
    width: 0,
    height: 0,

    loading: false,
    requestCount: 0,
    completedRequests: 0,

    nowPlaying: ["", "", ""],
    activeChart: null,
    chartOffsets: [0, 0, 0, 0, 0, 0],

    // lastfm_data equivalent:
    // [0] user information
    // [1] artist information
    // [2] album information
    // [3] track information
    // [4+] top artist charts
    data: [],

    requests: [],
    responses: [],

    logo: null,
    flip: null,
    avatar: null
};

/* ========================================================================
   FONTS / COLORS
   ======================================================================== */

let fnt_np;
let fnt_plays;
let fnt_df;
let fnt_ta;
let fnt_big;

let clr_txt;
let clr_txt_hl;
let clr_bckgrnd;
let clr_white;
let clr_red;
let clr_red2;

function updateFonts() {
    const font = PROP.fontName;
    fnt_np = gdi.Font(font, Number(PROP.fontNowPlaying), 1);
    fnt_plays = gdi.Font(font, Number(PROP.fontPlays), 1);
    fnt_df = gdi.Font(font, Number(PROP.fontData), 0);
    fnt_ta = gdi.Font(font, Number(PROP.fontTitle), 1);
    fnt_big = gdi.Font(font, Number(PROP.fontBig), 1);

    window.Repaint();
}

function migrateColorProperties() {
    const startKey = 'COLORS | Chart Bar Start Color';
    const endKey = 'COLORS | Chart Bar End Color';

    const oldStart = '248,248,249,255';
    const oldEnd = '110,110,112,255';

    if (window.GetProperty(startKey, oldStart) === oldStart) {
        window.SetProperty(startKey, '75,100,125,255');
    }

    if (window.GetProperty(endKey, oldEnd) === oldEnd) {
        window.SetProperty(endKey, '100,150,200,255');
    }
}

function updateColors() {
    updateColorProperties();

    clr_txt = COLOR.artistText;
    clr_txt_hl = COLOR.trackText;
    clr_bckgrnd = COLOR.panelBackground;
    clr_white = COLOR.whiteDigits;
    clr_red = COLOR.chartBarStart;
    clr_red2 = COLOR.chartBarEnd;

    window.Repaint();
}

/* ========================================================================
   IMAGES
   ======================================================================== */

function disposeImage(image) {
    if (image) {
        try { image.Dispose(); } catch (e) {}
    }
}

function loadImages() {
    disposeImage(state.logo);
    disposeImage(state.flip);
    disposeImage(state.avatar);

    state.logo = gdi.Image(imagePath(PROP.logoFile));
    state.flip = gdi.Image(imagePath(PROP.flipFile));

    let avatarFile = PROP.defaultAvatar;

    if (PROP.avatarEnabled) {
        const downloadedAvatar = imagePath(PROP.avatarFile);
        if (PROP.avatarFile && utils.Glob(downloadedAvatar).length) {
            avatarFile = PROP.avatarFile;
        } else {
            // The selected downloaded avatar no longer exists.
            // Fall back to the configured default without changing the
            // Downloaded Avatar property, so the missing filename can be
            // restored automatically if the file becomes available again.
            avatarFile = PROP.defaultAvatar;
        }
    }

    state.avatar = gdi.Image(imagePath(avatarFile));

    window.Repaint();
}

/* ========================================================================
   NOW PLAYING
   ======================================================================== */

function updateNowPlaying() {
    state.nowPlaying = [
        fb.TitleFormat("%artist%").Eval(),
        fb.TitleFormat("%album%").Eval(),
        fb.TitleFormat("%title%").Eval()
    ];
}

/* ========================================================================
   LAST.FM DATA
   ======================================================================== */

function resetLastFmData() {
    state.data = [];

    for (let i = 0; i < 4 + configuredPeriodCount(); i++) {
        state.data[i] = [];
    }

    // User data: playcount, average/day, average/week,
    // average/month, registered, avatar.
    for (let i = 0; i <= 5; i++) {
        state.data[0][i] = 0;
    }

    // Artist / album / track:
    // playcount, userplaycount, listeners.
    for (let id = 1; id <= 3; id++) {
        state.data[id] = [0, 0, 0];
    }

    // Top artist charts.
    for (let id = 4; id < 4 + configuredPeriodCount(); id++) {
        state.data[id] = [[], []];

        for (let x = 0; x < 50; x++) {
            state.data[id][0][x] = 0;
            state.data[id][1][x] = "";
        }
    }
}

function getLastFmData() {
    if (!credentialsValid()) {
        state.loading = false;
        window.Repaint();
        return;
    }

    resetLastFmData();

    state.loading = true;
    state.completedRequests = 0;
    state.requestCount = 4 + configuredPeriodCount();
    state.requests = new Array(state.requestCount);
    state.responses = new Array(state.requestCount);

    requestLastFm("user.getinfo", 0);
    requestLastFm("artist.getinfo&artist=" + encodeURIComponent(state.nowPlaying[0]), 1);
    requestLastFm(
        "album.getinfo&artist=" + encodeURIComponent(state.nowPlaying[0]) +
        "&album=" + encodeURIComponent(state.nowPlaying[1]), 2
    );
    requestLastFm(
        "track.getinfo&artist=" + encodeURIComponent(state.nowPlaying[0]) +
        "&track=" + encodeURIComponent(state.nowPlaying[2]), 3
    );

    const periods = periodList();

    for (let i = 0; i < configuredPeriodCount(); i++) {
        requestLastFm(
            "user.gettopartists&period=" + encodeURIComponent(periods[i]),
            4 + i
        );
    }
}

function requestLastFm(method, id) {
    const xhr = new ActiveXObject("Microsoft.XMLHTTP");

    state.requests[id] = xhr;

    const url =
        "https://ws.audioscrobbler.com/2.0/" +
        "?api_key=" + encodeURIComponent(PROP.apiKey) +
        "&username=" + encodeURIComponent(PROP.username) +
        "&user=" + encodeURIComponent(PROP.username) +
        "&method=" + method +
        "&format=xml" +
        "&s=" + Math.random();

    try {
        xhr.open("GET", url, true);
        xhr.setRequestHeader("User-Agent", "SMP_LastFM");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            state.completedRequests++;

            if (xhr.status === 200) {
                state.responses[id] = xhr.responseText;
            } else {
                state.responses[id] = "";
            }

            if (state.completedRequests >= state.requestCount) {
                processLastFmData();
            }
        };
        xhr.send();
    } catch (e) {
        state.completedRequests++;

        if (state.completedRequests >= state.requestCount) {
            processLastFmData();
        }
    }
}

function xmlValue(xml, tag, occurrence) {
    if (!xml) return "";

    const re = new RegExp(
        "<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">",
        "gi"
    );

    let match;
    let index = 0;

    while ((match = re.exec(xml)) !== null) {
        if (index++ === (occurrence || 0)) {
            return decodeXml(match[1]);
        }
    }

    return "";
}

function xmlAttribute(xml, tag, attribute) {
    if (!xml) return "";

    const re = new RegExp(
        "<" + tag + "\\b[^>]*\\b" + attribute +
        "\\s*=\\s*[\\\"']([^\\\"']*)[\\\"'][^>]*>",
        "i"
    );

    const match = String(xml).match(re);
    return match ? decodeXml(match[1]) : "";
}


function xmlValues(xml, tag) {
    const values = [];
    if (!xml) return values;

    const re = new RegExp(
        "<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">",
        "gi"
    );

    let match;
    while ((match = re.exec(xml)) !== null) {
        values.push(decodeXml(match[1]));
    }

    return values;
}

function decodeXml(value) {
    return String(value)
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function processLastFmData() {
    const responses = state.responses;

    for (let id = 0; id < state.requestCount; id++) {
        const error = xmlValue(responses[id], "error");
        if (error) {
        }
    }

    // User info.
    const playcount = xmlValue(responses[0], "playcount");
    const registered =
        xmlAttribute(responses[0], "registered", "unixtime") ||
        xmlValue(responses[0], "registered");

    state.data[0][0] = playcount || 0;
    state.data[0][4] = registered || "2000-01-01";

    const avatar =
        xmlValue(responses[0], "image", 2) ||
        imagePath(PROP.defaultAvatar);

    state.data[0][5] = avatar;

    const utc = parseRegisteredDate(state.data[0][4]);
    const now = Date.now();

    if (utc > 0 && Number(state.data[0][0]) > 0) {
        const elapsed = now - utc;

        state.data[0][1] =
            String(Math.round((Number(state.data[0][0]) /
                (elapsed / 86400000)) * 100) / 100);

        state.data[0][2] =
            String(Math.round((Number(state.data[0][0]) /
                (elapsed / 604800000)) * 10) / 10);

        state.data[0][3] =
            String(Math.round((Number(state.data[0][0]) /
                (elapsed / 2629743000))));
    }

    // Artist / album / track.
    for (let id = 1; id <= 3; id++) {
        state.data[id][0] = xmlValue(responses[id], "playcount") || "0";
        state.data[id][1] = xmlValue(responses[id], "userplaycount") || "0";
        state.data[id][2] = xmlValue(responses[id], "listeners") || "0";
    }

    // Top artists.
    for (let id = 4; id < 4 + configuredPeriodCount(); id++) {
        const plays = xmlValues(responses[id], "playcount");
        const names = xmlValues(responses[id], "name");

        for (let x = 0; x < 50; x++) {
            state.data[id][0][x] = plays[x] || 0;
            state.data[id][1][x] = names[x] || "";
        }
    }

    state.loading = false;

    if (PROP.avatarEnabled) {
        loadImages();
    }

    window.Repaint();
}

function parseRegisteredDate(value) {
    const text = String(value).trim();

    // Last.fm normally supplies registered@unixtime.
    if (/^\d+$/.test(text)) {
        const timestamp = Number(text);
        if (timestamp > 0) return timestamp * 1000;
    }

    // Preserve support for an ISO-style registered value.
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return 0;

    return Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
    );
}

function credentialsValid() {
    return String(PROP.username).length > 0 &&
           String(PROP.apiKey).length === 32;
}

/* ========================================================================
   DRAWING
   ======================================================================== */

function chartGeometry() {
    const tap = Number(PROP.chartPeriodWidth);
    const tat = Number(PROP.chartTop);
    const tan = Number(PROP.chartNameX);
    const tar = Number(PROP.chartRankX);

    return {
        tap: tap,
        tat: tat,
        tan: tan,
        tar: tar,
        tab: Number(PROP.chartBarStart)
    };
}

function drawDigitString(gr, text, x, y) {
    text = String(text);

    for (let i = 0; i < text.length; i++) {
        if (state.flip) {
            gr.DrawImage(
                state.flip,
                x + i * 10.7,
                y,
                state.flip.Width,
                state.flip.Height,
                0, 0,
                state.flip.Width,
                state.flip.Height
            );
        }

        gr.GdiDrawText(
            text.substring(i, i + 1),
            fnt_plays,
            clr_white,
            x + i * 10.8 + 1.7,
            y - 1,
            100,
            fnt_plays.Height + 2,
            DT.NOPREFIX
        );
    }
}

const AVATAR_BOX = 126;

function avatarDisplayRect() {
    if (!state.avatar || !state.avatar.Width || !state.avatar.Height) {
        return { x: 5, y: 60, w: AVATAR_BOX, h: AVATAR_BOX };
    }

    const scale = Math.min(
        AVATAR_BOX / state.avatar.Width,
        AVATAR_BOX / state.avatar.Height,
        1
    );

    const w = Math.round(state.avatar.Width * scale);
    const h = Math.round(state.avatar.Height * scale);

    return {
        x: 5 + Math.floor((AVATAR_BOX - w) / 2),
        y: 60 + Math.floor((AVATAR_BOX - h) / 2),
        w: w,
        h: h
    };
}

function drawPlayStatistics(gr) {
    if (state.data[0][0] == 0) return;

    const labels = [" plays", " per day", " per week", " per month"];
    const baseY = 70 + AVATAR_BOX;

    for (let n = 0; n <= 3; n++) {
        drawDigitString(gr, state.data[0][n], 5, baseY + n * 15);

        gr.GdiDrawText(
            labels[n],
            fnt_plays,
            clr_txt,
            5 + String(state.data[0][n]).length * 10.8,
            baseY + n * 15,
            300,
            fnt_plays.Height + 2,
            DT.NOPREFIX
        );
    }
}

function drawNowPlaying(gr, g) {
    const artistY =
        g.tat + Number(PROP.topArtistLimit) * (fnt_df.Height - 3) +
        10 + fnt_big.Height;

    gr.GdiDrawText(
        "Now Playing",
        fnt_big,
        clr_txt_hl,
        g.tar,
        artistY - fnt_big.Height - 3,
        state.width,
        fnt_big.Height + 4,
        DT.NOPREFIX
    );

    gr.GdiDrawText(
        "Listeners on Last.fm",
        fnt_plays,
        clr_txt_hl,
        g.tar + 270,
        artistY - fnt_plays.Height - 3,
        state.width,
        fnt_plays.Height + 4,
        DT.NOPREFIX
    );

    gr.GdiDrawText(
        "Plays on Last.fm                  by " + PROP.username,
        fnt_plays,
        clr_txt_hl,
        g.tar + 410,
        artistY - fnt_plays.Height - 3,
        state.width,
        fnt_plays.Height + 4,
        DT.NOPREFIX
    );

    const labels = ["Artist:", "Album:", "Track:"];

    for (let i = 0; i < 3; i++) {
        const y = artistY + i * fnt_np.Height;

        gr.GdiDrawText(
            labels[i],
            fnt_np,
            clr_txt_hl,
            g.tar,
            y,
            50,
            fnt_np.Height + 2,
            DT.NOPREFIX
        );

        gr.GdiDrawText(
            state.nowPlaying[i],
            fnt_df,
            clr_txt,
            g.tar + 50,
            y,
            200,
            fnt_np.Height + 2,
            DT.NOPREFIX | DT.END_ELLIPSIS
        );
    }

    for (let id = 1; id <= 3; id++) {
        drawDigitString(
            gr,
            state.data[id][2],
            g.tar + 270,
            artistY + (id - 1) * 15
        );

        drawDigitString(
            gr,
            state.data[id][0],
            g.tar + 410,
            artistY + (id - 1) * 15
        );

        drawDigitString(
            gr,
            state.data[id][1],
            g.tar + 550,
            artistY + (id - 1) * 15
        );
    }
}

function drawTopArtists(gr, g) {
    const count = configuredPeriodCount();
    if (!count) return;

    const periods = periodList();
    const limit = clamp(Number(PROP.topArtistLimit) || 1, 1, 50);
    const rowHeight = fnt_df.Height - 3;

    for (let i = 0; i < count; i++) {
        const id = 4 + i;
        const data = state.data[id];
        if (!data) continue;

        gr.GdiDrawText(
            periodLabel(periods[i]) + " Top Artists",
            fnt_plays,
            clr_txt_hl,
            g.tar + i * g.tap,
            g.tat - fnt_plays.Height,
            g.tap,
            fnt_plays.Height + 4,
            DT.NOPREFIX
        );

        const max = Number(data[0][0]) || 1;
        const offset = state.chartOffsets[i] || 0;

        for (let y = offset; y < limit + offset; y++) {
            const x = y - offset;
            const plays = Number(data[0][y]) || 0;
            const name = data[1][y] || "";

            if (!plays) continue;

            const rowY = g.tat + x * rowHeight;

            gr.GdiDrawText(
                String(y + 1),
                fnt_df,
                clr_txt,
                g.tar + i * g.tap,
                rowY,
                fnt_df.Height - 2,
                rowHeight + 2,
                DT.RIGHT | DT.NOPREFIX
            );

            gr.GdiDrawText(
                name,
                fnt_df,
                clr_txt,
                g.tan + i * g.tap,
                rowY,
                g.tab - g.tan,
                rowHeight + 2,
                DT.NOPREFIX | DT.END_ELLIPSIS
            );

            const barWidth =
                (plays / max) * ((g.tar + g.tap) - g.tab - 15) + 10;

            gr.FillGradRect(
                g.tab + i * g.tap,
                rowY + 1,
                Math.max(0, barWidth),
                Math.max(1, rowHeight - 0.1),
                g.tap,
                clr_red,
                clr_red2
            );

            gr.GdiDrawText(
                addCommas(plays),
                fnt_plays,
                clr_white,
                g.tab + i * g.tap + 1,
                rowY,
                g.tap,
                rowHeight + 2,
                DT.NOPREFIX
            );
        }
    }
}

function drawPanel(gr) {
    gr.FillSolidRect(0, 0, state.width, state.height, COLOR.panelBackground);

    if (!credentialsValid()) {
        gr.GdiDrawText(
            "SMP_LastFM",
            fnt_big,
            clr_txt,
            0, 0,
            state.width, state.height,
            DT.CENTER | DT.VCENTER | DT.CALCRECT | DT.NOPREFIX
        );
        return;
    }

    if (state.loading) {
        gr.GdiDrawText(
            fb.IsPlaying
                ? "Grabbing last.fm stats. Hold on!"
                : "SMP_LastFM",
            fnt_big,
            clr_txt,
            0, 0,
            state.width, state.height,
            DT.CENTER | DT.VCENTER | DT.CALCRECT | DT.NOPREFIX
        );
        return;
    }

    const g = chartGeometry();

    if (state.logo) {
        gr.DrawImage(
            state.logo,
            5, 5, 100, 30,
            0, 0,
            state.logo.Width, state.logo.Height
        );
    }

    if (state.avatar) {
        const avatar = avatarDisplayRect();

        gr.DrawImage(
            state.avatar,
            avatar.x, avatar.y,
            avatar.w, avatar.h,
            0, 0,
            state.avatar.Width,
            state.avatar.Height
        );

        gr.DrawRect(
            5, 60,
            AVATAR_BOX, AVATAR_BOX,
            2,
            clr_txt_hl
        );

        gr.GdiDrawText(
            PROP.username,
            fnt_big,
            clr_txt_hl,
            5, 35,
            state.width,
            fnt_big.Height + 5,
            DT.NOPREFIX
        );
    }

    drawPlayStatistics(gr);
    drawTopArtists(gr, g);
    drawNowPlaying(gr, g);
}

/* ========================================================================
   MOUSE / CHART SCROLLING
   ======================================================================== */

function chartAtX(x) {
    const g = chartGeometry();
    const count = configuredPeriodCount();

    for (let i = 0; i < count; i++) {
        const left = g.tar + i * g.tap;
        const right = left + g.tap;

        if (x > left && x < right) return i;
    }

    return null;
}

function scrollChart(direction, index) {
    if (index === null || index === undefined) return;

    const limit = clamp(Number(PROP.topArtistLimit) || 1, 1, 50);
    const maxOffset = Math.max(0, 50 - limit);

    if (direction > 0) {
        state.chartOffsets[index] =
            Math.max(0, state.chartOffsets[index] - 1);
    } else {
        state.chartOffsets[index] =
            Math.min(maxOffset, state.chartOffsets[index] + 1);
    }

    window.Repaint();
}

/* ========================================================================
   AVATAR
   ======================================================================== */

function downloadAvatar() {
    if (!credentialsValid()) return false;

    const url = state.data[0] && state.data[0][5];
    if (!url) return false;

    let stream = null;

    try {
        const xhr = new ActiveXObject("Microsoft.XMLHTTP");
        xhr.open("GET", url, false);
        xhr.send();

        if (xhr.status !== 200 || !xhr.responseBody) {
            fb.ShowPopupMessage(
                "Unable to download the Last.fm avatar.\n\nHTTP status: " +
                xhr.status,
                "SMP_LastFM"
            );
            return false;
        }

        // Never overwrite the image currently loaded by gdi.Image().
        // Windows may retain the old bitmap file handle even after Dispose(),
        // so each successful download receives a unique filename.
        const stamp = new Date().getTime();
        const fileName = "avatar_" + stamp + ".jpg";
        const target = imagePath(fileName);

        stream = new ActiveXObject("ADODB.Stream");
        stream.Type = 1; // adTypeBinary
        stream.Open();
        stream.Write(xhr.responseBody);
        stream.SaveToFile(target, 2); // adSaveCreateOverWrite
        stream.Close();
        stream = null;

        // Release the old image only after the new file has been safely saved.
        disposeImage(state.avatar);
        state.avatar = null;

        // Store the new filename as the active downloaded avatar.
        saveProperty("avatarFile", fileName);
        saveProperty("avatarEnabled", true);

        loadImages();
        window.Repaint();
        return true;
    } catch (e) {
        if (stream) {
            try { stream.Close(); } catch (ignore) {}
        }

        fb.ShowPopupMessage(
            "Unable to download the Last.fm avatar.\n\n" +
            String(e.message || e),
            "SMP_LastFM"
        );
        return false;
    }
}
function restoreDefaultAvatar() {
    saveProperty("avatarEnabled", false);
    loadImages();
    window.Repaint();
}

function openResource(url) {
    try {
        // Launch the URL through Windows Shell so it opens in the user's
        // default web browser. This avoids relying on unavailable/disabled
        // URL helpers in this SMP 1.6.1 environment.
        const shell = new ActiveXObject("WScript.Shell");
        shell.Run('cmd.exe /c start "" "' + url + '"', 0, false);
    } catch (e) {
        fb.ShowPopupMessage(
            "Unable to open the web browser.\n\n" +
            String(e.message || e),
            "SMP_LastFM"
        );
    }
}

const HELP = {
    about:
        "SMP_LastFM - Help & Documentation\n\n" +
        "WHAT IS SMP_LastFM?\n" +
        "SMP_LastFM is a Spider Monkey Panel for foobar2000 that displays " +
        "Last.fm account statistics, Top Artist charts, and information " +
        "about the currently playing track. It reads information from " +
        "Last.fm; it does not create scrobbles itself.\n\n" +

        "GETTING STARTED\n" +
        "SMP_LastFM uses two Last.fm account values:\n" +
        "  - LAST.FM | Username - your Last.fm username.\n" +
        "  - LAST.FM | API Key - your Last.fm API key.\n" +
        "Enter these under Panel properties....\n\n" +

        "HOW LAST.FM WORKS\n" +
        "A scrobble is Last.fm's record that you listened to a track. " +
        "Last.fm may take some time to process a new scrobble. Therefore " +
        "a newly played track may not immediately change every Last.fm " +
        "count shown by the panel.\n\n" +
        "The panel refreshes its displayed information when a new track " +
        "starts. Last.fm counts may temporarily differ from the numbers " +
        "shown on the Last.fm website. This is normal.\n\n" +

        "UNDERSTANDING THE DISPLAY\n" +
        "USER STATISTICS\n" +
        "  plays       Your total Last.fm play count.\n" +
        "  per day     Average plays per day since account registration.\n" +
        "  per week    Average plays per week since account registration.\n" +
        "  per month   Average plays per month since account registration.\n\n" +

        "TOP ARTISTS\n" +
        "Each column is a Last.fm Top Artists chart for one selected period. " +
        "Artists are ranked by Last.fm play count and the bars show their " +
        "relative play counts. The chart can contain up to 50 artists.\n\n" +
        "NOW PLAYING\n" +
        "The Now Playing section identifies the current artist, album and " +
        "track. The Last.fm columns show Last.fm information for the current " +
        "artist, album and track. These values are not your personal total " +
        "play count.\n\n" +

        "DISPLAY PROPERTIES\n" +
        "Top Artist Periods\n" +
        "  Controls how many Top Artist columns are displayed. The first N " +
        "configured periods are used from left to right.\n\n" +
        "Top Artists Shown\n" +
        "  Controls how many ranked artists are visible in each chart at one " +
        "time. Scrolling reveals additional artists.\n\n" +
        "Top Artist Period 1-6\n" +
        "  Selects the Last.fm period for the corresponding chart column:\n\n" +
        "    7day       Last 7 days\n" +
        "    1month     Last month\n" +
        "    3month     Last 3 months\n" +
        "    6month     Last 6 months\n" +
        "    12month    Last 12 months\n" +
        "    overall    Entire Last.fm history\n\n" +
        "Period 1 is the first/leftmost chart, Period 2 the next chart, and " +
        "so on.\n" +
        "Current defaults: 1month, 6month, 12month, overall, 7day, 3month.\n\n" +

        "OTHER PROPERTY CATEGORIES\n" +
        "LAST.FM\n" +
        "  Account credentials used to request Last.fm data.\n\n" +
        "DISPLAY\n" +
        "  Top Artist periods, number of artists shown, and display choices.\n\n" +
        "LAYOUT\n" +
        "  Positions and dimensions used by the panel.\n\n" +
        "FONTS\n" +
        "  Font family and font sizes.\n\n" +
        "IMAGES\n" +
        "  Image files and image-folder locations used by the panel.\n\n" +
        "COLORS\n" +
        "  Colors used by the panel.\n\n" +

        "COLORS - RGBA FORMAT\n" +
        "Color Properties use R,G,B,A values, each from 0 to 255.\n" +
        "  R = red\n  G = green\n  B = blue\n  A = alpha/transparency\n\n" +
        "Example: 255,0,0,255 = opaque red.\n" +
        "Example: 255,0,0,128 = semi-transparent red.\n\n" +

        "SCROLLING\n" +
        "Top Artist chart scrolling is always available; there is no " +
        "scrolling Property to enable. Move the mouse over a chart and use " +
        "the mouse wheel to move through the ranked artists.\n\n" +

        "CONTEXT MENU\n" +
        "Help / Documentation - opens this guide.\n" +
        "Avatar > Download Avatar - downloads the Last.fm profile avatar.\n" +
        "Avatar > Restore Default Avatar - returns to the default avatar.\n" +
        "Reload - reloads the SMP script and requests current data again.\n" +
        "Open component folder - opens the installed component folder.\n" +
        "Panel properties... - opens the Spider Monkey Panel Properties dialog.\n" +
        "Configure... - opens the Spider Monkey Panel Configure dialog.\n\n" +

        "TROUBLESHOOTING\n" +
        "If Last.fm information is missing, check LAST.FM | Username and " +
        "LAST.FM | API Key. If a newly scrobbled track is not reflected " +
        "immediately, allow time for Last.fm to process the scrobble.\n\n" +

        "SMP_LastFM is based on the original foo_silk-lastfm panel by MB, " +
        "adapted for Spider Monkey Panel.",

    interaction:
        "SMP_LastFM Interaction\n\n" +
        "Right-click anywhere in the panel to open the Context Menu.\n\n" +
        "Mouse wheel over a Top Artist chart scrolls through the complete " +
        "ranked list.\n\n" +
        "Avatar > Download Avatar downloads the current Last.fm profile image.\n" +
        "Avatar > Restore Default Avatar returns to the built-in default image.\n\n" +
        "Last.fm username and API key are stored in SMP panel Properties."
};

function showHelp(kind) {
    if (kind === "about") {
        fb.ShowPopupMessage(HELP.about, "About SMP_LastFM");
    } else {
        fb.ShowPopupMessage(HELP.interaction, "SMP_LastFM Help");
    }
}

function showContextMenu(x, y) {
    const menu = window.CreatePopupMenu();
    const avatar = window.CreatePopupMenu();

    menu.AppendMenuItem(MENU.STRING, 1, "Help / Documentation");
    menu.AppendMenuItem(MENU.SEPARATOR, 0, "");

    menu.AppendMenuItem(MENU.STRING, 2, "Spider Monkey Panel Documentation");
    menu.AppendMenuItem(MENU.STRING, 3, "Title Formatting Reference");
    menu.AppendMenuItem(MENU.STRING, 4, "Query Syntax");

    menu.AppendMenuItem(MENU.SEPARATOR, 0, "");

    menu.AppendMenuItem(MENU.STRING, 5, "Homepage");
    menu.AppendMenuItem(MENU.STRING, 6, "Components");
    menu.AppendMenuItem(MENU.STRING, 7, "Wiki");
    menu.AppendMenuItem(MENU.STRING, 8, "Forums");

    menu.AppendMenuItem(MENU.SEPARATOR, 0, "");

    // The command remains enabled; downloadAvatar() validates credentials.
    // Leave the command enabled and let downloadAvatar() validate credentials.
    avatar.AppendMenuItem(MENU.STRING, 20, "Download Avatar");
    avatar.AppendMenuItem(MENU.STRING, 21, "Restore Default Avatar");
    avatar.AppendTo(menu, MENU.STRING, "Avatar");

    menu.AppendMenuItem(MENU.SEPARATOR, 0, "");

    menu.AppendMenuItem(MENU.STRING, 10, "Reload");
    menu.AppendMenuItem(MENU.STRING, 11, "Open component folder");
    menu.AppendMenuItem(MENU.STRING, 12, "Panel properties...");
    menu.AppendMenuItem(MENU.STRING, 13, "Configure...");

    const selected = menu.TrackPopupMenu(x, y);

    switch (selected) {
        case 1:
            showHelp("about");
            break;
        case 2:
            openResource("https://theqwertiest.github.io/foo_spider_monkey_panel/");
            break;
        case 3:
            openResource("https://wiki.hydrogenaud.io/index.php?title=Foobar2000:Title_Formatting_Reference");
            break;
        case 4:
            openResource("https://wiki.hydrogenaud.io/index.php?title=Foobar2000:Query_syntax");
            break;
        case 5:
            openResource("https://www.foobar2000.org/");
            break;
        case 6:
            openResource("https://www.foobar2000.org/components");
            break;
        case 7:
            openResource("https://wiki.hydrogenaud.io/");
            break;
        case 8:
            openResource("https://hydrogenaud.io/");
            break;
        case 10:
            window.Reload();
            break;
        case 11:
            // Open the Spider Monkey Panel component folder in Windows Explorer.
            // fb.ComponentPath is the authoritative SMP component directory.
            try {
                const shell = new ActiveXObject("WScript.Shell");
                shell.Run('explorer.exe "' + fb.ComponentPath + '"');
            } catch (e) {
                fb.ShowPopupMessage(
                    "Unable to open the SMP component folder.\n\n" +
                    String(e.message || e),
                    "SMP_LastFM"
                );
            }
            break;
        case 12:
            window.ShowProperties();
            break;
        case 13:
            try {
                window.ShowConfigure();
            } catch (e) {
                fb.ShowPopupMessage(
                    "This script has no separate Configure dialog.\n\n" +
                    "Use Panel properties... to configure SMP_LastFM.",
                    "SMP_LastFM"
                );
            }
            break;
        case 20:
            downloadAvatar();
            break;
        case 21:
            restoreDefaultAvatar();
            break;
    }
}


/* ========================================================================
   SMP CALLBACKS
   ======================================================================== */

function on_size() {
    state.width = window.Width;
    state.height = window.Height;
}

function on_paint(gr) {
    state.width = window.Width;
    state.height = window.Height;

    drawPanel(gr);
}

function on_playback_new_track(metadb) {
    if (PROP.mini) {
        window.Repaint();
        return;
    }

    updateNowPlaying();

    state.loading = true;
    state.chartOffsets = [0, 0, 0, 0, 0, 0];

    getLastFmData();
}

function on_playback_stop(reason) {
    window.Repaint();
}

function on_mouse_move(x, y) {
    state.activeChart = chartAtX(x);
}

function on_mouse_wheel(step) {
    if (state.activeChart === null) return;

    scrollChart(step, state.activeChart);
}

function on_mouse_rbtn_up(x, y) {
    showContextMenu(x, y);
    return true;
}

function on_colors_changed() {
    updateColors();
}

function on_font_changed() {
    updateFonts();
}

function on_property_changed(name) {
    // SMP invokes this when a script property changes through its property
    // editor. Reload dynamic resources when relevant.
    for (const key in P) {
        if (P[key][0] === name) {
            PROP[key] = window.GetProperty(name, P[key][1]);
            break;
        }
    }

    updateFonts();
    updateColors();
    updateColorProperties();
    loadImages();
    on_size();
}

function on_notify_data(name, info) {
    if (name === "username_api") {
        PROP.username = window.GetProperty(P.username[0], P.username[1]);
        PROP.apiKey = window.GetProperty(P.apiKey[0], P.apiKey[1]);
        getLastFmData();
    }
}

/* ========================================================================
   INITIALIZATION
   ======================================================================== */

updateFonts();
migrateColorProperties();
updateColors();
updateColorProperties();
loadImages();
resetLastFmData();
updateNowPlaying();
on_size();

if (fb.IsPlaying && !PROP.mini) {
    on_playback_new_track();
}
