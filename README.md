# MOF Visualization Skill

A pre-release Codex Skill for creating scientifically traceable three-dimensional MOF structure visuals from CIF files.

The project validates framework heavy atoms, periodic connectivity, and metal coordination before rendering transparent stills, multi-view inspection sheets, and true-3D rotation videos.

## Status

This repository is under private development. It has no open-source license yet and is not ready for redistribution.

CIF files are not bundled. Users are responsible for obtaining structures from traceable sources and complying with the source terms.

## Requirements

- Node.js 20 or newer
- FFmpeg for MP4 generation
- A lawfully obtained, traceable CIF

Install JavaScript dependencies with `npm install`.

## Material configuration

Copy `examples/configs/uio-66.example.json` and set:

- `id`: a filesystem-safe lowercase identifier
- `name`: the academic material name
- `source.citation` and `source.selectionReason`
- required elements and bond pairs for validation
- `render.clusterMode`: `cell` or `spherical`

## Workflow

```bash
node skill/mof-visualization/scripts/acquire-structure.mjs --config material.json --input structure.cif --project-root .
node skill/mof-visualization/scripts/prepare-structure.mjs --config material.json --project-root .
node skill/mof-visualization/scripts/validate-structure.mjs --config material.json --project-root .
node skill/mof-visualization/scripts/render-material.mjs --config material.json --project-root .
```

Generated files are written under `materials/<id>/` and `outputs/`; both directories are ignored by Git. Use `--skip-video` while testing still images. Use `--ffmpeg /path/to/ffmpeg` or `FFMPEG_PATH` when FFmpeg is not available on `PATH`.

## Scientific limits

The current connection table supports only the element pairs listed in `skill/mof-visualization/references/element-style.yaml`. Add and validate new pair-specific thresholds before using other chemistries. The renderer represents crystallographic coordinates; it does not establish defects, activation state, particle morphology, or formulation.

Run `npm test` for the automated suite and `npm run audit:public` before every release candidate.
