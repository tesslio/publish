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
  pull_request:
  push:
    branches:
      - main

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: tesslio/publish@main
        with:
          token: ${{ secrets.TESSL_API_TOKEN }}
          # path: './path/to/tile' # Optional, defaults to current directory
```
