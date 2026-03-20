# Wheel Spinner

Wheel Spinner is a React + TypeScript + Vite app that builds to static files and can be hosted on IPFS.

## IPFS Compatibility Fix

The build is configured with a relative Vite base path (`base: './'`) so generated files use relative links like `./assets/...` instead of `/assets/...`.

This prevents 404s on IPFS gateways where the app is served from `/ipfs/<CID>/...`.

## Latest Build CID

Generated on: 2026-03-20 (UTC)

- CID (v1): `bafybeicwshngvmh4nnhi5i4nlrscsvxxz4dhu647wbk4wenjp7ry3r2thq`

## IPFS Gateway Links

- https://ipfs.io/ipfs/bafybeicwshngvmh4nnhi5i4nlrscsvxxz4dhu647wbk4wenjp7ry3r2thq
- https://dweb.link/ipfs/bafybeicwshngvmh4nnhi5i4nlrscsvxxz4dhu647wbk4wenjp7ry3r2thq
- https://cloudflare-ipfs.com/ipfs/bafybeicwshngvmh4nnhi5i4nlrscsvxxz4dhu647wbk4wenjp7ry3r2thq
- https://gateway.pinata.cloud/ipfs/bafybeicwshngvmh4nnhi5i4nlrscsvxxz4dhu647wbk4wenjp7ry3r2thq
- https://w3s.link/ipfs/bafybeicwshngvmh4nnhi5i4nlrscsvxxz4dhu647wbk4wenjp7ry3r2thq

## Build

```bash
npm ci
npm run build
```

## Recompute CID For `dist/`

```bash
npx ipfs-car pack dist --output /tmp/wheel-spinner.car | tail -n 1
```

That command returns the root directory CID for the current build output.
