# Terraform Infrastructure Makefile
# Provides convenient commands for managing infrastructure

.PHONY: help setup-backend init-dev init-stage init-prod plan-dev plan-stage plan-prod apply-dev apply-stage apply-prod destroy-dev destroy-stage destroy-prod output-dev output-stage output-prod fmt validate clean

# Default environment
ENV ?= dev

# Colors for output
YELLOW := \033[1;33m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m

help: ## Show this help message
	@echo "$(YELLOW)Terraform Infrastructure Management$(NC)"
	@echo ""
	@echo "$(GREEN)Setup Commands:$(NC)"
	@echo "  setup-backend    Create S3 bucket and DynamoDB table for state management"
	@echo ""
	@echo "$(GREEN)Environment Commands:$(NC)"
	@echo "  init-ENV         Initialize Terraform for environment (dev/stage/prod)"
	@echo "  plan-ENV         Create execution plan for environment"
	@echo "  apply-ENV        Apply changes for environment"
	@echo "  destroy-ENV      Destroy infrastructure for environment"
	@echo "  output-ENV       Show outputs for environment"
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@echo "  fmt              Format Terraform files"
	@echo "  validate         Validate Terraform configuration"
	@echo "  clean            Clean temporary files"
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  make setup-backend"
	@echo "  make init-dev"
	@echo "  make plan-dev"
	@echo "  make apply-dev"
	@echo ""

setup-backend: ## Create S3 bucket and DynamoDB table for Terraform state
	@echo "$(GREEN)Setting up Terraform backend infrastructure...$(NC)"
	./scripts/setup-backend.sh

# Development environment commands
init-dev: ## Initialize Terraform for development environment
	@echo "$(GREEN)Initializing Terraform for development environment...$(NC)"
	./scripts/deploy.sh dev init

plan-dev: ## Create execution plan for development environment
	@echo "$(GREEN)Creating execution plan for development environment...$(NC)"
	./scripts/deploy.sh dev plan

apply-dev: ## Apply changes for development environment
	@echo "$(GREEN)Applying changes for development environment...$(NC)"
	./scripts/deploy.sh dev apply

destroy-dev: ## Destroy development environment infrastructure
	@echo "$(RED)Destroying development environment infrastructure...$(NC)"
	./scripts/deploy.sh dev destroy

output-dev: ## Show outputs for development environment
	@echo "$(GREEN)Showing outputs for development environment...$(NC)"
	./scripts/deploy.sh dev output

# Staging environment commands
init-stage: ## Initialize Terraform for staging environment
	@echo "$(GREEN)Initializing Terraform for staging environment...$(NC)"
	./scripts/deploy.sh stage init

plan-stage: ## Create execution plan for staging environment
	@echo "$(GREEN)Creating execution plan for staging environment...$(NC)"
	./scripts/deploy.sh stage plan

apply-stage: ## Apply changes for staging environment
	@echo "$(GREEN)Applying changes for staging environment...$(NC)"
	./scripts/deploy.sh stage apply

destroy-stage: ## Destroy staging environment infrastructure
	@echo "$(RED)Destroying staging environment infrastructure...$(NC)"
	./scripts/deploy.sh stage destroy

output-stage: ## Show outputs for staging environment
	@echo "$(GREEN)Showing outputs for staging environment...$(NC)"
	./scripts/deploy.sh stage output

# Production environment commands
init-prod: ## Initialize Terraform for production environment
	@echo "$(GREEN)Initializing Terraform for production environment...$(NC)"
	./scripts/deploy.sh prod init

plan-prod: ## Create execution plan for production environment
	@echo "$(GREEN)Creating execution plan for production environment...$(NC)"
	./scripts/deploy.sh prod plan

apply-prod: ## Apply changes for production environment
	@echo "$(GREEN)Applying changes for production environment...$(NC)"
	./scripts/deploy.sh prod apply

destroy-prod: ## Destroy production environment infrastructure
	@echo "$(RED)Destroying production environment infrastructure...$(NC)"
	./scripts/deploy.sh prod destroy

output-prod: ## Show outputs for production environment
	@echo "$(GREEN)Showing outputs for production environment...$(NC)"
	./scripts/deploy.sh prod output

# Development and maintenance commands
fmt: ## Format Terraform files
	@echo "$(GREEN)Formatting Terraform files...$(NC)"
	terraform fmt -recursive

validate: ## Validate Terraform configuration
	@echo "$(GREEN)Validating Terraform configuration...$(NC)"
	terraform validate

clean: ## Clean temporary files
	@echo "$(GREEN)Cleaning temporary files...$(NC)"
	rm -f *.tfplan
	rm -f .terraform.lock.hcl
	rm -rf .terraform/

# Quick development workflow
dev-workflow: init-dev plan-dev ## Quick development workflow (init + plan)
	@echo "$(GREEN)Development workflow completed. Review the plan and run 'make apply-dev' to apply changes.$(NC)"

# Production deployment workflow
prod-workflow: init-prod plan-prod ## Production workflow (init + plan)
	@echo "$(YELLOW)Production workflow completed. CAREFULLY review the plan and run 'make apply-prod' to apply changes.$(NC)"
