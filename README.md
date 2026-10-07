# Absolute Acrylics website

Static site: `index.html`, `privacy.html`, `css/site.css`, `js/site.js`, and media in `assets/`.

- `assets/sequence/` holds 113 frames from the approved Higgsfield video of the real job. The opening scrubs through them on a canvas as you scroll, in five stages (Start, Before, Insulation, Finish, Completed). The stage timings live in `STAGES` and `TIMELINE` in `js/site.js`. Phones load every second frame.
- Visitors who prefer reduced motion, have Save-Data on, or have no JavaScript get a static opening (`.opening`) with the completed-house image and the stages as a list, and no long scroll.
- `assets/images/`: `work-before` and `work-after` are James's real job photos (the skip's lettering is blurred), `finish-render` and `finish-brick` are crops of the after photo, `completed-house` is the film's last frame, and `layers-cutaway` is a Higgsfield illustration (labelled as one on the page).
- `assets/source/` holds the original job photos.
- `assets/keyframes/` and `assets/review/` are the approved source keyframes and review sheets (not loaded by the page).

Run locally with any static server, for example `python3 -m http.server 8080`, then open http://localhost:8080.

## Quote form

The form posts to FormSubmit (`https://formsubmit.co/ajax/fiona.abac@gmail.com`). The first time it is used, FormSubmit emails fiona.abac@gmail.com an activation link; quote requests arrive once that link is clicked. If sending fails, the visitor is shown the phone number and a copy of their details to email instead.
