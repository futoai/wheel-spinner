# Attested AI Build

This repo runs an AI agent (Codex) to generate a web app from `prompt.txt`. Each build is attested with GitHub provenance so you can verify where and how the artifact was produced.

## Current Build

- **IPFS CID**: `bafybeif7ztnhq65lumvvtr4ekcwd2ifwgm3awq4zfr3srh462rwyinlb4y`
- **Source**: [ai-build-source](https://github.com/futoai/wheel-spinner/tree/ai-build-source) branch
- **Build output**: [ai-build-output](https://github.com/futoai/wheel-spinner/tree/ai-build-output) branch

## How to Verify

1. Download the `attested-ai-release` artifact from the [latest workflow run](https://github.com/futoai/wheel-spinner/actions).
2. Verify the attestation:
   ```bash
   gh attestation verify verifiable-build.tgz -R futoai/wheel-spinner
   ```
3. Confirm the IPFS CID matches:
   ```bash
   npx ipfs-only-hash@4.0.0 -r ./dist
   ```
