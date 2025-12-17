#!/bin/bash

set -e

echo "======================================================================"
echo "GeneTrust Mainnet Deployment Script"
echo "======================================================================"
echo ""
echo "⚠️  WARNING: This script will deploy contracts to Stacks MAINNET"
echo "⚠️  Real STX tokens will be spent on deployment fees"
echo "⚠️  Make sure you have configured settings/Mainnet.toml with your credentials"
echo ""

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "❌ Clarinet is not installed. Please install it first:"
    echo "   https://docs.hiro.so/stacks/clarinet"
    exit 1
fi

# Check if settings/Mainnet.toml exists
if [ ! -f "settings/Mainnet.toml" ]; then
    echo "❌ settings/Mainnet.toml not found"
    echo "Please create this file with your mainnet configuration"
    exit 1
fi

# Check if mainnet deployer mnemonic is set
if grep -q "REPLACE_WITH_YOUR_MAINNET_MNEMONIC" settings/Mainnet.toml; then
    echo "❌ Please update settings/Mainnet.toml with your mainnet deployer mnemonic"
    exit 1
fi

# Check if mainnet address is set in deployment plan
if grep -q "REPLACE_WITH_YOUR_MAINNET_ADDRESS" deployments/default.mainnet-plan.yaml; then
    echo "❌ Please update deployments/default.mainnet-plan.yaml with your mainnet address"
    exit 1
fi

# Confirm deployment
echo ""
echo "Deployment will use:"
echo "  - Network: Mainnet"
echo "  - Plan: deployments/default.mainnet-plan.yaml"
echo "  - Settings: settings/Mainnet.toml"
echo ""

read -p "Are you ready to proceed with mainnet deployment? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
fi

# Verify contracts compile
echo ""
echo "🔍 Verifying contracts..."
clarinet check

# Deploy to mainnet
echo ""
echo "🚀 Starting mainnet deployment..."
echo ""

clarinet deployment apply --network mainnet -f deployments/default.mainnet-plan.yaml --settings settings/Mainnet.toml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Check deployments/default.mainnet-receipts.json for transaction details"
echo ""
