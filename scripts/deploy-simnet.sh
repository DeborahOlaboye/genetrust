#!/bin/bash

# Deploy and test contracts on Clarinet simnet (local sandbox)
# Use this for rapid local development and integration testing before testnet

set -e

echo "======================================================================"
echo "GeneTrust Simnet Deployment"
echo "======================================================================"
echo ""

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "ERROR: Clarinet is not installed. Please install it first:"
    echo "   https://docs.hiro.so/stacks/clarinet"
    exit 1
fi

echo "Verifying contracts..."
clarinet check

echo ""
echo "Deploying to simnet..."
echo ""

clarinet deployments apply --simnet --use-on-disk-deployment-plan --no-dashboard

echo ""
echo "Simnet deployment complete."
echo ""
echo "You can now run tests with: clarinet test"
echo ""
