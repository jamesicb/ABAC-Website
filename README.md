# Absolute Acrylics website

Static site: `index.html`, `privacy.html`, `css/home.css`, `js/home.js`, and media in `assets/`.

- The homepage has a two-tier header (a thin navy strip, then logo, SEAI badge, menu and Enquire button), a full-width before and after photo slider, and a row of service tiles.
- The slider uses `assets/images/compare-before-*.webp` and `compare-after-*.webp`. The before photo was warped to line up with the after photo (same house, same framing) and the skip's lettering is blurred. Drag, click or use the arrow keys on the divider.
- "Enquire now", "Contact Us", "Ask about your grant" and the service tiles open the enquiry form in a pop-up dialog. `index.html#enquire` opens it directly.
- `privacy.html` still uses the older `css/site.css`.
- The earlier cinematic scroll version lives on the `claude/cinematic-scroll-site-wiweu9` branch.

Run locally with any static server, for example `python3 -m http.server 8080`, then open http://localhost:8080.

## Enquiry form

The form posts to FormSubmit (`https://formsubmit.co/ajax/fiona.abac@gmail.com`). The first time it is used, FormSubmit emails fiona.abac@gmail.com an activation link; requests arrive once that link is clicked. If sending fails, the visitor is shown the phone number and a copy of their details to email instead.
