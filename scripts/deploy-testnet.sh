#!/bin/bash

set -e

echo "======================================================================"
echo "GeneTrust Testnet Deployment Script"
echo "======================================================================"
echo ""
echo "This script will deploy contracts to Stacks TESTNET"
echo "Testnet STX tokens will be used (obtain from the Stacks faucet)"
echo "Make sure settings/Testnet.toml is configured with your credentials"
echo ""

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "ERROR: Clarinet is not installed. Please install it first:"
    echo "   https://docs.hiro.so/stacks/clarinet"
    exit 1
fi

# Check if settings/Testnet.toml exists
if [ ! -f "settings/Testnet.toml" ]; then
    echo "ERROR: settings/Testnet.toml not found"
    echo "Please create this file with your testnet deployer mnemonic"
    exit 1
fi

# Run pre-deployment checks
echo "Running pre-deployment checks..."
bash scripts/pre-deploy-check.sh testnet

echo ""
echo "Deployment will use:"
echo "  - Network: Testnet"
echo "  - Plan: deployments/default.testnet-plan.yaml"
echo "  - Settings: settings/Testnet.toml"
echo ""

read -p "Proceed with testnet deployment? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Starting testnet deployment..."
echo ""

clarinet deployments apply --testnet --use-on-disk-deployment-plan --no-dashboard

echo ""
echo "Testnet deployment complete!"
echo ""

# Run post-deployment verification
bash scripts/post-deploy-verify.sh testnet
