# Absolute Acrylics website

Static site: `index.html`, `privacy.html`, `css/home.css`, `js/home.js`, and media in `assets/`.

- The homepage has a slim header (logo and an "Our services" link), then a large rounded photo of the finished job with the free quote card overlapping its left edge, then a row of service tiles. On tablets the card sits over the left of a full-width photo, and on phones it sits below the photo.
- The photo is `assets/images/finished-house-*.webp`, cropped from James's after photo of the real job (`assets/source/job-after.jpg`).
- The quote card asks for name, phone number, email (optional) and address. Clicking a service tile fills in that service and jumps to the card. `index.html#enquire` jumps straight to it.
- `privacy.html` still uses the older `css/site.css`.
- The earlier cinematic scroll version lives on the `claude/cinematic-scroll-site-wiweu9` branch.

Run locally with any static server, for example `python3 -m http.server 8080`, then open http://localhost:8080.

## Quote form

The form posts to FormSubmit (`https://formsubmit.co/ajax/fiona.abac@gmail.com`). The first time it is used, FormSubmit emails fiona.abac@gmail.com an activation link; requests arrive once that link is clicked. If sending fails, the visitor is shown the phone number and a copy of their details to email instead.
