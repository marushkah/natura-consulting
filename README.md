# Natura Consulting website (GitHub Pages), version 3.0

A static, English-only site with no build step:

- `index.html`: the whole site
- `404.html`: the "page not found" page
- `assets/`: stylesheet (`site.css`), script (`site.js`), the two photos, the browser tab icons and the social preview image (`og-image.jpg`)
- `robots.txt` and `sitemap.xml`: tell search engines where the site lives

The page's `<head>` assumes the site will live at `https://natura.consulting/`. If the address changes, update the canonical link, the `og:` tags, the JSON-LD block, `robots.txt` and `sitemap.xml`.

## Before launch
1. Confirm the offers in the "Offers" section. Prices are not shown on the site for now.
2. The logo says "Natura" with "Responsible AI and tech for nonprofits" underneath.
3. Make sure `info@natura.consulting` still receives mail, or replace it in `index.html`.
4. Add two or three client testimonials when you have permission to quote them. Place them between the offers and the booking section.
5. After December 2026, change "MBA, December 2026" to "MBA '26" in the About section.

## Booking
Every booking button opens one Calendly page for a free 30-minute call: `https://calendly.com/natura-info/30min`

To change it, search for that address in `index.html` and `404.html` and replace it everywhere.

## Publish on GitHub Pages
1. Create a new public repository on GitHub, for example `natura-consulting`.
2. Upload the contents of this folder (`index.html`, `404.html`, `assets/`, `robots.txt`, `sitemap.xml`, `CNAME`, `README.md`, `.nojekyll`).
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
4. After about a minute the site is live at `https://<your-github-username>.github.io/natura-consulting/`.

## Move natura.consulting off Squarespace (when ready)
1. In **Settings → Pages → Custom domain**, enter `www.natura.consulting` and save. GitHub adds a `CNAME` file to the repo.
2. At your domain registrar (Squarespace Domains if the domain is registered there), change DNS:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` record for `www` → `<your-github-username>.github.io`
   - Remove the old Squarespace A/CNAME records.
3. Once DNS resolves, tick **Enforce HTTPS** in Settings → Pages.
4. Keep the Squarespace plan running until the GitHub version loads on your domain, then cancel the site plan (not the domain, if it is registered there).
