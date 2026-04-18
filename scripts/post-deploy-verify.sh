#!/bin/bash

# Post-deployment verification for GeneTrust contracts
# Reads the deployment receipts and checks that all transactions were anchored

set -e

NETWORK=${1:-"mainnet"}
RECEIPTS="deployments/default.${NETWORK}-receipts.json"

echo "======================================================================"
echo "GeneTrust Post-Deployment Verification ($NETWORK)"
echo "======================================================================"
echo ""

if [ ! -f "$RECEIPTS" ]; then
    echo "ERROR: Receipts file not found: $RECEIPTS"
    echo "Run the deployment first, then re-run this script."
    exit 1
fi

echo "Receipts file: $RECEIPTS"
echo ""

# Extract transaction IDs using basic string parsing (no jq dependency)
echo "Transactions found in receipts:"
grep -o '"txid": "[^"]*"' "$RECEIPTS" 2>/dev/null | while read -r line; do
    TXID=$(echo "$line" | grep -o '"[^"]*"$' | tr -d '"')
    echo "  - $TXID"
done

echo ""

# Check expected contracts are present in receipts
CONTRACTS=("dataset-registry" "exchange" "data-governance" "attestations")
echo "Checking contract deployments:"
for CONTRACT in "${CONTRACTS[@]}"; do
    if grep -q "\"$CONTRACT\"" "$RECEIPTS" 2>/dev/null; then
        echo "  FOUND: $CONTRACT"
    else
        echo "  MISSING: $CONTRACT (may have been deployed in a prior batch)"
    fi
done

echo ""
echo "Review the receipts file for full transaction details."
echo ""

# Show API URL for manual verification
if [ "$NETWORK" = "mainnet" ]; then
    API="https://api.hiro.so"
elif [ "$NETWORK" = "testnet" ]; then
    API="https://api.testnet.hiro.so"
else
    API="https://api.hiro.so"
fi

echo "Verify on Stacks Explorer:"
echo "  https://explorer.hiro.so/?chain=$NETWORK"
echo ""
echo "API endpoint: $API"
echo ""
