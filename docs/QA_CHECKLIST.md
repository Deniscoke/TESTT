# Manual QA checklist

Automated tests cover decoding, detectors, the build and the main browser flows (Linux Chrome and Windows Edge, both headless). These manual checks cover what automation can't: real displays, real drag and drop, and real files.

Tester: ______  Date: ______  Build version: ______  ZIP SHA-256: ______

## Free web edition: run on Windows 10/11 in Edge, plus Chrome or Firefox; macOS Safari is optional
### Opening
- [ ] F1 Unzip `pixel-proofreader-free-web-<version>.zip` and double-click `index.html`. It opens offline. Turn off Wi-Fi to confirm.
- [ ] F2 The drop zone, "Choose a PNG" and "Try a sample sprite" are visible, and the text is readable in light and dark system themes.
### Analysis
- [ ] F3 "Try a sample sprite" shows the counts **3 / 5 / 3** and coloured markers on the potion.
- [ ] F4 Drag and drop one of your own PNGs onto the page. It loads and the file name and size are shown.
- [ ] F5 Drop **two** PNGs. You get a message that Free checks one image, and the first file is analysed.
- [ ] F6 Drop a JPG, or a `.png` that is really a renamed text file. A friendly error appears and the previous image stays.
- [ ] F7 A large PNG (for example 2048×2048) loads within a few seconds. Note the time.
- [ ] F8 An indexed PNG with transparency and a grayscale PNG both load correctly.
### Viewer
- [ ] F9 Zoom with the buttons, the mouse wheel and the keyboard (+, −, 0). Pixels stay crisp with no blur.
- [ ] F10 Drag to pan. Fit and 1:1 work.
- [ ] F11 Unticking a check hides its markers, and "Show issues" hides all markers.
- [ ] F12 Hovering shows x/y, the hex colour, alpha, and which checks flagged that pixel.
- [ ] F13 Each check's explanation expands and reads clearly. Checks are labelled "suggestion" or "technical".
### Honesty and privacy
- [ ] F14 The privacy dialog opens. In DevTools → Network, no requests are made while analysing.
- [ ] F15 The Pro card says "coming soon" (no store URL configured), and nothing implies Pro is included in Free.
- [ ] F16 The original PNG file on disk is unchanged (same size and modified date).
### Layout and accessibility
- [ ] F17 Resize to phone width (or use DevTools device mode). There is no sideways scrolling and the sidebar sits below the viewer.
- [ ] F18 You can Tab through all controls with a visible focus ring, and checkboxes toggle with Space.

## Pro edition: pending M3 (private repository not created yet)
To be written alongside the Pro build. It will cover batch folders, exports (new files only, sources untouched), the extra checks, sensitivity settings, side-by-side view, the Edge app-window launcher and SmartScreen behaviour on Windows.
