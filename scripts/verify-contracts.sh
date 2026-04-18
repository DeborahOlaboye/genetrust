#!/bin/bash

set -e

echo "======================================================================"
echo "GeneTrust Contract Verification"
echo "======================================================================"
echo ""

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "ERROR: Clarinet is not installed. Please install it first:"
    echo "   https://docs.hiro.so/stacks/clarinet"
    exit 1
fi

echo "Running clarinet check on all contracts..."
echo ""

clarinet check

echo ""
echo "All contracts passed verification."
echo ""

# List all contract files
echo "Contracts found:"
for f in contracts/*.clar; do
    lines=$(wc -l < "$f")
    echo "  - $f ($lines lines)"
done

echo ""
