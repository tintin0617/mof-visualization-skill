---
name: mof-visualization
description: Create scientifically traceable three-dimensional MOF crystal-structure assets from CIF files. Use when Codex needs to register and prepare a MOF CIF, preserve framework chemistry, validate periodic connectivity and metal coordination, or render transparent ball-and-stick images, multi-angle inspection sheets, and true-3D rotation videos.
---

# MOF visualization

Generate reusable MOF structure assets from traceable crystallographic coordinates. Treat chemical identity and validation as gates, not visual options.

## Workflow

1. Read `references/source-policy.md` before selecting or cleaning a CIF.
2. Create a material JSON configuration using `examples/configs/uio-66.example.json` as the schema.
3. Register the source with `scripts/acquire-structure.mjs --config ... --input ... --project-root ...`.
4. Prepare the visualization CIF with `scripts/prepare-structure.mjs --config ... --project-root ...`.
5. Run `scripts/validate-structure.mjs --config ... --project-root ...`. Stop if validation fails.
6. Render with `scripts/render-material.mjs --config ... --project-root ...`.
7. Inspect the transparent still and four-view sheet before accepting the animation.

Run commands from an asset-project root or pass an absolute `--project-root`. Keep source CIF files outside this Skill package unless their redistribution terms are known.

## Scientific safeguards

- Preserve every non-hydrogen ligand atom, metal node, coordinating atom, substituent, and identity-defining functional group.
- Keep metal–coordination-atom–organic-linker connections visually continuous.
- Remove free solvent, guest molecules, disorder positions, or heavy atoms only through an explicit allowlist with a recorded reason.
- Permit ordinary hydrogen omission, but never omit its bonded heavy atom.
- Fail when source and prepared heavy-atom counts differ without authorization.
- Report coordination ranges and coordinating elements for every recognized metal.
- Use periodic minimum-image connectivity and explicit pair-specific distance limits.
- Stop when a required element pair lacks a supported threshold; never invent bonds.
- Render from three-dimensional coordinates with rotation matrices, never by rotating a flat image.

Read `references/source-policy.md` for provenance rules and `references/element-style.yaml` for visual colors and currently supported bond thresholds.

## Standard output

- Still: transparent PNG, 4096 × 4096, no text or logo.
- Inspection: four distinct viewpoints in one PNG.
- Animation: 3840 × 2160, 24 fps, 18 seconds, H.264/yuv420p, silent seamless loop.
- Metadata: citation, atom-removal log, validation results, render parameters, and SHA-256 hashes.

Keep the model restrained: thin bonds, compact spheres, stable lighting, clear depth, and no decorative pore effects or polyhedron overlays.
