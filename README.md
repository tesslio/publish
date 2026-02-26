# tesslio/publish

A github action that publishes a Tessl tile

## Example

Create `.github/workflows/publish-tile.yml` in your repository with the
following content:

```yaml
name: Publish Tile

permissions:
  id-token: write # Required for OIDC token
  contents: read # Required to checkout the repository

on:
  push:
    branches:
      - main # Trigger on push / merge to main

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: tesslio/publish@main
        with:
          token: ${{ secrets.TESSL_API_TOKEN }}
          # path: './path/to/tile' # Optional, defaults to current directory
          # review: 'true'          # Enable skill review quality gate (default: true)
          # review-threshold: '80'  # Minimum score 0-100 to pass (default: 80)
          # review-optimize: 'false' # Auto-improve skills before publish (default: false)
          # review-max-iterations: '3' # Max optimization iterations 1-10 (default: 3)
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `token` | *(required)* | Tessl API token for authentication |
| `path` | `.` | Path to the directory to bundle and publish |
| `review` | `true` | Enable skill review quality gate before publish |
| `review-threshold` | `80` | Minimum review score (0-100) required to pass |
| `review-optimize` | `false` | Automatically improve skill files before publish |
| `review-max-iterations` | `3` | Maximum optimization iterations (1-10) |

## Skill Review

When `review` is enabled and the tile contains skills (`SKILL.md` files), the action automatically installs the Tessl CLI and runs `tessl skill review` before publishing. If the score is below the threshold, publishing is blocked. If the review or optimize step fails (e.g. CLI error), the publish proceeds normally.

When `review-optimize` is enabled, the CLI will attempt to improve skill files in-place before the archive is created, so the published tile includes the optimized versions.
