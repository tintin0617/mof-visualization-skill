# MOF Visualization Skill

A pre-release Codex Skill for creating scientifically traceable three-dimensional MOF structure visuals from CIF files.

The project validates framework heavy atoms, periodic connectivity, and metal coordination before rendering transparent stills, multi-view inspection sheets, and true-3D rotation videos.

## Status

This repository is under private development. It has no open-source license yet and is not ready for redistribution.

CIF files are not bundled. Users are responsible for obtaining structures from traceable sources and complying with the source terms.

## Planned workflow

1. Provide a material JSON configuration and a lawfully obtained CIF.
2. Register its source and SHA-256 digest.
3. Prepare a visualization structure with an explicit atom-removal record.
4. Validate framework chemistry and periodic connectivity.
5. Render and inspect the outputs.

Detailed commands will be added as the public interface is implemented.

