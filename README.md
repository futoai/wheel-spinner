# PDF Utils (Client-Side Only)

A browser-only PDF utility web app built with React + TypeScript + Vite + Tailwind + shadcn/ui.

## Features

- Merge multiple PDF files into one output
- Reorder pages with drag-and-drop
- Rotate selected pages (90deg increments)
- Delete selected pages
- Extract selected pages to a new PDF
- Split pages by ranges (exports a ZIP of PDFs)
- No backend, no server-side processing, no external uploads

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- shadcn/ui (Vite setup)
- `pdf-lib` for PDF editing
- `pdfjs-dist` for page thumbnail rendering
- `@dnd-kit` for sortable drag-and-drop

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The app is configured for static/IPFS-style hosting with relative asset paths via `base: "./"` in `vite.config.ts`.

## IPFS CID (Generated Locally)

Build output folder: `dist/`

CID:

`bafybeigenna4oyibds7qozpznz66dy5vvax3zm6qjeixvqvu3gehdlm5ly`

Generated locally with:

```bash
npx ipfs-car pack dist --output dist.car
```

## Example Gateway URLs

- `https://ipfs.io/ipfs/bafybeigenna4oyibds7qozpznz66dy5vvax3zm6qjeixvqvu3gehdlm5ly/`
- `https://ipfs.io/ipfs/bafybeigenna4oyibds7qozpznz66dy5vvax3zm6qjeixvqvu3gehdlm5ly/index.html`
- `https://bafybeigenna4oyibds7qozpznz66dy5vvax3zm6qjeixvqvu3gehdlm5ly.ipfs.dweb.link/`
