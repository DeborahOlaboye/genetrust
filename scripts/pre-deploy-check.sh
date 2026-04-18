#!/bin/bash

# Pre-deployment checklist for GeneTrust contracts
# Run this before any mainnet or testnet deployment

set -e

NETWORK=${1:-"mainnet"}
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "======================================================================"
echo "GeneTrust Pre-Deployment Checklist ($NETWORK)"
echo "======================================================================"
echo ""

# 1. Clarinet installed
echo "[1] Checking Clarinet installation..."
if command -v clarinet &> /dev/null; then
    VERSION=$(clarinet --version 2>&1 | head -1)
    pass "Clarinet installed: $VERSION"
else
    fail "Clarinet not installed"
fi

# 2. Contracts compile
echo ""
echo "[2] Checking contracts compile..."
if clarinet check &> /dev/null 2>&1; then
    pass "All contracts compile with no errors"
else
    fail "Contract compilation failed - run: clarinet check"
fi

# 3. Deployment plan exists
echo ""
echo "[3] Checking deployment plan..."
PLAN="deployments/default.${NETWORK}-plan.yaml"
if [ -f "$PLAN" ]; then
    pass "Deployment plan found: $PLAN"
else
    fail "Deployment plan not found: $PLAN"
fi

# 4. Settings file exists
echo ""
echo "[4] Checking settings file..."
SETTINGS_FILE="settings/$(echo "$NETWORK" | sed 's/./\u&/').toml"
# Capitalize first letter
CAPITALIZED=$(echo "$NETWORK" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')
SETTINGS="settings/${CAPITALIZED}.toml"
if [ -f "$SETTINGS" ]; then
    pass "Settings file found: $SETTINGS"
else
    fail "Settings file not found: $SETTINGS"
fi

# 5. No placeholder mnemonics
echo ""
echo "[5] Checking for placeholder values..."
if [ -f "$SETTINGS" ]; then
    if grep -q "REPLACE_WITH" "$SETTINGS" 2>/dev/null; then
        fail "Settings file contains REPLACE_WITH placeholders - update it"
    else
        pass "No placeholder values found in settings"
    fi
fi

if [ -f "$PLAN" ]; then
    if grep -q "REPLACE_WITH" "$PLAN" 2>/dev/null; then
        fail "Deployment plan contains REPLACE_WITH placeholders - update it"
    else
        pass "No placeholder values found in deployment plan"
    fi
fi

# 6. All contract files present
echo ""
echo "[6] Checking contract files..."
CONTRACTS=("genetic-data.clar" "exchange.clar" "data-governance.clar" "attestations.clar")
for CONTRACT in "${CONTRACTS[@]}"; do
    if [ -f "contracts/$CONTRACT" ]; then
        pass "contracts/$CONTRACT present"
    else
        fail "contracts/$CONTRACT missing"
    fi
done

# Summary
echo ""
echo "======================================================================"
echo "Pre-deployment check complete"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "======================================================================"

if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "Fix the above failures before deploying."
    exit 1
fi

echo ""
echo "All checks passed. Ready to deploy."
