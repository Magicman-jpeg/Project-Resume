# Jay Clifferson P. Arevalo — IT Portfolio

A responsive personal portfolio presenting my Information Technology education, technical skills, cloud and systems projects, and student-community leadership.

## Live Portfolio

[View the website on GitHub Pages](https://magicman-jpeg.github.io/Project-Resume/)

## Features

- Responsive desktop and mobile layout
- **Page-turn navigation** on large screens: each section turns like a page (wheel, arrow/page keys, swipe, nav links, or the side pager) with a 3D curl, page indicator, and hash-synced deep links — progressively enhanced, so it falls back to normal scrolling on touch/small screens, with reduced motion, or without JavaScript
- **Ambient music player**: a floating control to turn music on/off and adjust the volume up/down, with the choice remembered between visits. The audio is generated in the browser (Web Audio API), so there is no external file and no music-licensing concern. It is off by default (never autoplays)
- Light and dark appearances with saved preference
- Accessible color contrast and reduced-motion support
- Fixed ASCII-art parallax background
- Downloadable curriculum vitae
- No installation or build process required

## Project Structure

```text
.
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── docs/
│   │   └── jay-arevalo-cv.pdf
│   └── js/
│       ├── main.js
│       ├── pageturn.js   # Page-turn navigation (progressive enhancement)
│       └── music.js      # Ambient music player (Web Audio, off by default)
├── index.html
└── README.md
```

## Running Locally

No dependencies are required. Open `index.html` directly in a web browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Technologies

HTML5, CSS3, vanilla JavaScript, GSAP, ScrollTrigger, Remix Icon, and Google Fonts.

The external fonts, icons, and animations are loaded from public CDNs, so an internet connection is recommended for the complete visual experience.
