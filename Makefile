.PHONY: check verify deploy-simnet deploy-testnet deploy-mainnet post-verify-mainnet post-verify-testnet changelog changelog-preview help

help:
	@echo "GeneTrust Contract Deployment"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  check               Run clarinet check on all contracts"
	@echo "  verify              Run contract verification script"
	@echo "  deploy-simnet       Deploy to local simnet"
	@echo "  deploy-testnet      Deploy to Stacks testnet"
	@echo "  deploy-mainnet      Deploy to Stacks mainnet"
	@echo "  post-verify-mainnet Verify mainnet deployment receipts"
	@echo "  post-verify-testnet Verify testnet deployment receipts"
	@echo "  changelog           Regenerate CHANGELOG.md from git history (requires git-cliff)"
	@echo "  changelog-preview   Preview unreleased changes (requires git-cliff)"
	@echo ""

check:
	clarinet check

verify:
	bash scripts/verify-contracts.sh

deploy-simnet:
	bash scripts/deploy-simnet.sh

deploy-testnet:
	bash scripts/deploy-testnet.sh

deploy-mainnet:
	bash scripts/deploy-mainnet.sh

post-verify-mainnet:
	bash scripts/post-deploy-verify.sh mainnet

post-verify-testnet:
	bash scripts/post-deploy-verify.sh testnet

changelog:
	git-cliff -o CHANGELOG.md

changelog-preview:
	git-cliff --unreleased
