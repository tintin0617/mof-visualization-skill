# Contributing

Thank you for helping improve the MOF Visualization Skill.

## Before opening a change

- Do not submit confidential, proprietary, or unpublished structures.
- Confirm that every CIF fixture may be redistributed under its source terms.
- Cite the source of every real crystallographic structure.
- Use a private security advisory when a report may expose private data or unsafe file access.
- Discuss large changes in an issue before implementation.

## Development

```bash
npm ci
npm test
npm run audit:public
```

Use Node.js 20 or newer. Install FFmpeg when testing video generation.

## Scientific changes

A new material, element pair, or cleanup rule must include its scientific source, a defensible distance range, required-element and bond configuration, tests for heavy-atom preservation and coordination, and inspection of the still and four views.

Never add a visually convenient bond or remove a framework heavy atom without recorded scientific justification.

## Pull requests

Keep changes focused. Describe software and scientific impact, list verification commands, and disclose CIF licensing constraints. All tests and the public-boundary audit must pass.

By contributing, you agree that your contribution is licensed under the MIT License.
