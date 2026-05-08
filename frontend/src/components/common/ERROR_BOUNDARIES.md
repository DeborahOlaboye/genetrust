# Error Boundary Strategy

This document describes the three-tier error boundary system used in GeneTrust's React frontend.

## Tier 1 — PageErrorBoundary

**Use when:** An error in this subtree should replace the entire page with a full-screen fallback.

**Placed at:**
- Root `App` component (catch-all)
- Each route in `router/index.jsx` (per-page isolation)

**Features:**
- Full-page centred fallback with GeneTrust branding
- ChunkLoadError detection with automatic one-time reload
- "Try Again" and "Go Home" actions
- `onError` / `onReset` callbacks
- Dev-only error details `<details>` block

---

## Tier 2 — SectionErrorBoundary

**Use when:** An error in one section should show an inline fallback without affecting the rest of the page.

**Placed at:**
- `UserDashboard` — datasets table, listings table, upload wizard
- `ResearcherDashboard` — marketplace listings
- `ConsentPage` — ConsentManagementPanel
- `UploadPage` — DatasetUploadWizard

**Features:**
- Compact inline error banner with section name
- Single Retry button that calls `handleReset`
- Dev-only error `<details>` block (hidden in production)
- `onError` / `onReset` callbacks

---

## Tier 3 — InlineErrorBoundary

**Use when:** A single small component (e.g., a price tag, an avatar) should fail silently with minimal inline text.

**Features:**
- `<span>`-level inline fallback
- Configurable `fallbackText`
- Optional `retry` link
- `onError` callback

---

## WalletErrorBoundary

**Use when:** A subtree relates to wallet connection and should show wallet-specific recovery messaging.

**Pattern:**
```jsx
<WalletErrorBoundary>
  <WalletConnectButton />
</WalletErrorBoundary>
```

Detects user-rejection and wallet-not-connected patterns and adjusts copy accordingly.

---

## Decision tree

```
Error thrown in component tree
  ├─ Whole page unusable?          → PageErrorBoundary
  ├─ Section can fail independently?  → SectionErrorBoundary
  ├─ Wallet-related component?     → WalletErrorBoundary
  └─ Tiny leaf component?          → InlineErrorBoundary
```

---

## Loading State Patterns

| Situation | Component |
|-----------|-----------|
| Dashboard stat cards loading | `DashboardStatsSkeleton` |
| Datasets list loading | `DatasetTableSkeleton` |
| Listings list loading | `ListingsTableSkeleton` |
| Marketplace grid loading | `MarketplaceListingSkeleton` |
| Form submitting | `FormSubmitOverlay` |
| Any element loading | `SkeletonLoader` |
| Full page transition | `LoadingSpinner` |

---

## Hooks

| Hook | Purpose |
|------|---------|
| `useAsyncError` | Surface an async error to the nearest ErrorBoundary |
| `useErrorBoundaryReset` | Force-remount an ErrorBoundary subtree via `key` prop |
