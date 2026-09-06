# MOF Visualization Skill

[![CI](https://github.com/tintin0617/mof-visualization-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/tintin0617/mof-visualization-skill/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/tintin0617/mof-visualization-skill?include_prereleases)](https://github.com/tintin0617/mof-visualization-skill/releases)

[简体中文](README.zh-CN.md)

A Codex Skill and reproducible Node.js workflow for turning traceable crystallographic CIF coordinates into validated three-dimensional MOF structure visuals.

The project records source provenance, preserves framework chemistry, validates periodic connectivity and metal coordination, and renders transparent stills, four-view inspection sheets, and true-3D rotation videos.

> **Alpha status:** The connection table currently supports a limited set of element pairs. Treat every new chemistry as unsupported until its thresholds and expected coordination have been reviewed and tested.

## Outputs

- Transparent PNG still: 4096 × 4096 by default
- Four-view inspection sheet
- Silent H.264/yuv420p video: 3840 × 2160, 24 fps, 18 seconds by default
- Source and prepared CIF files, validation report, provenance metadata, and SHA-256 hashes

The renderer uses three-dimensional coordinates, rotation matrices, perspective projection, depth-aware bonds, and atom shading. It never rotates a flat image to imitate 3D.

## Scientific safeguards

- Preserve framework heavy atoms, ligand substituents, functional groups, metal nodes, and coordinating atoms.
- Keep metal–coordination-atom–organic-linker paths visually continuous.
- Remove hydrogen, free solvent, guests, or disorder positions only under explicit, recorded rules.
- Compare source and prepared heavy-atom counts.
- Validate periodic minimum-image connectivity with pair-specific distance limits.
- Report coordination ranges and coordinating elements for recognized metals.
- Stop rendering when structural validation fails.

This workflow represents crystallographic structure. It does not establish defects, activation state, particle morphology, adsorption performance, or commercial formulation.

## Requirements

- Node.js 20 or newer
- FFmpeg on `PATH`, through `FFMPEG_PATH`, or passed with `--ffmpeg`
- A lawfully obtained, traceable CIF

CIF files are not bundled. Users must verify structure identity, citation accuracy, source terms, and redistribution rights.

## Installation

```bash
git clone https://github.com/tintin0617/mof-visualization-skill.git
cd mof-visualization-skill
npm ci
```

To install the Codex Skill, copy `skill/mof-visualization` into your Codex skills directory as `mof-visualization`, then reload Codex.

## Material configuration

Start from `examples/configs/uio-66.example.json`:

```json
{
  "id": "uio-66-example",
  "name": "UiO-66",
  "source": {
    "citation": "Cavka et al., Journal of the American Chemical Society (2008), 130, 13850-13851.",
    "selectionReason": "Example configuration; supply a lawfully obtained matching CIF."
  },
  "validation": {
    "requiredElements": ["Zr", "O", "C"],
    "requiredBondPairs": ["O-Zr", "C-O", "C-C"]
  },
  "render": { "clusterMode": "cell" }
}
```

The `id` accepts lowercase letters, digits, and hyphens. Supported cluster modes are `cell` and `spherical`.

## Workflow

```bash
node skill/mof-visualization/scripts/acquire-structure.mjs --config material.json --input structure.cif --project-root .
node skill/mof-visualization/scripts/prepare-structure.mjs --config material.json --project-root .
node skill/mof-visualization/scripts/validate-structure.mjs --config material.json --project-root .
node skill/mof-visualization/scripts/render-material.mjs --config material.json --project-root .
```

Use `--skip-video` while iterating on stills. Outputs are written under `materials/<id>/` and `outputs/`; both directories are ignored by Git.

For multiple configurations:

```bash
node skill/mof-visualization/scripts/render-batch.mjs --configs first.json,second.json --project-root .
```

## Supported chemistry and limitations

The current bond table includes C–C, C–N, C–O, Zn–N, Co–N, and Zr–O ranges. A visual color definition is not evidence of supported connectivity.

Before adding another chemistry, add a defensible distance range, required-element and bond configuration, a focused test fixture, expected coordination assertions, and visual inspection of the still and four views.

The parser targets conventional atom-site loops. Complex disorder, alternate positions, unexpanded symmetry, and unusual CIF dialects require manual review.

## Development

```bash
npm ci
npm test
npm run audit:public
```

The package remains marked `private` to prevent accidental npm publication. The GitHub repository and MIT-licensed source are public.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Roadmap

- Validate more MOF families with redistributable fixtures
- Consolidate connectivity thresholds into one audited configuration
- Add stronger CIF symmetry and disorder handling
- Expand media probing and cross-platform FFmpeg tests
- Evaluate COF support as a separate validated extension

## License

Released under the [MIT License](LICENSE). External CIF datasets retain their own source terms.
