# Customer images (drop folder)

Each numbered folder = one place on the site. Open a folder to see exactly what that page needs.

| Folder | Page / use |
|---|---|
| [`01-home/`](01-home/) | Home hero + “What to expect” |
| [`02-book/`](02-book/) | Book a Show trust photos |
| [`03-about/`](03-about/) | About cast photo |
| [`04-gallery/`](04-gallery/) | Shared photos on live show detail pages |
| [`05-online/`](05-online/) | Online Mysteries hero |
| [`06-shows/`](06-shows/) | One cover per show title |
| [`_inbox/`](_inbox/) | Unsorted originals (site ignores this) |

**Exact sizes not required.** Use `.jpg`, `.png`, or `.webp`. Keep the filenames listed in each folder’s README.

## See what’s missing

```bash
npm run images:status
```

That prints a checklist and writes [`STATUS.md`](STATUS.md) with:

- **[OK]** — good enough for now  
- **[TEMP]** — file exists but is a stand-in (wrong show / reused photo) — replace  
- **[MISSING]** — no file yet  

## How to add a photo

1. Open the right folder (e.g. `06-shows/`).  
2. Save as the exact name from that folder’s README (e.g. `murder-preserved-cover.jpg`).  
3. Refresh the site.  
4. Run `npm run images:status` to update the checklist.
