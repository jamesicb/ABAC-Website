# Absolute Acrylics website

Static site: `index.html`, `css/site.css`, `js/site.js`, and media in `assets/`.

- `assets/sequence/` holds 120 frames from the approved Higgsfield video. The hero scrubs through them on a canvas as you scroll.
- `assets/images/` holds the supporting Higgsfield stills.
- `assets/keyframes/` and `assets/review/` are the approved source keyframes and review sheets (not loaded by the page).

Run locally with any static server, for example `python3 -m http.server 8080`, then open http://localhost:8080.

## Quote form

The form posts to FormSubmit (`https://formsubmit.co/ajax/fiona.abac@gmail.com`). The first time it is used, FormSubmit emails fiona.abac@gmail.com an activation link; quote requests arrive once that link is clicked. If sending fails, the visitor is shown the phone number and a copy of their details to email instead.
