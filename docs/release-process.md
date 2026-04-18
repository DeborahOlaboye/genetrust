# Release Process

This document describes how to cut a new release of GeneTrust.

## Versioning

GeneTrust follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** — breaking changes to smart contract interfaces or SDK public API
- **MINOR** — new features that are backwards-compatible
- **PATCH** — bug fixes and documentation updates

## Steps

### 1. Pre-release checks

```bash
# Verify all contracts compile cleanly
make check

# Run the full test suite
npm test

# Confirm no placeholder addresses remain in deployment plans
bash scripts/pre-deploy-check.sh testnet
```

### 2. Update version in package.json

```bash
npm version minor   # or major / patch
```

This updates `package.json` and creates a commit automatically.

### 3. Update CHANGELOG.md

Move items from `## [Unreleased]` to a new versioned section:

```markdown
## [0.2.0] - YYYY-MM-DD

### Added
- ...

### Changed
- ...
```

Then update the compare links at the bottom of the file:

```markdown
[Unreleased]: https://github.com/DeborahOlaboye/genetrust/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/DeborahOlaboye/genetrust/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DeborahOlaboye/genetrust/releases/tag/v0.1.0
```

Alternatively, use git-cliff to regenerate the file automatically:

```bash
make changelog
# or
npm run changelog
```

### 4. Commit and tag

```bash
git add CHANGELOG.md package.json
git commit -m "chore(release): bump version to v0.2.0"
git tag -a v0.2.0 -m "Release v0.2.0"
```

### 5. Push

```bash
git push origin main --tags
```

Pushing the tag triggers the `changelog` GitHub Actions workflow, which:
- Runs git-cliff with `cliff.toml`
- Commits the regenerated `CHANGELOG.md`
- Creates a GitHub Release draft (if configured)

### 6. Deploy contracts (if changed)

```bash
bash scripts/deploy-testnet.sh   # validate on testnet first
bash scripts/deploy-mainnet.sh   # then mainnet
```

## Hotfix releases

For urgent fixes on a tagged release:

1. Branch from the tag: `git checkout -b hotfix/v0.1.1 v0.1.0`
2. Apply the fix and commit
3. Tag `v0.1.1` and push
4. Merge the hotfix back into `main`
