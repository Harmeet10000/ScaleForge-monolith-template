#!/bin/bash

# Snyk Setup and Configuration Script
# This script helps set up Snyk integration for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME=${npm_package_name:-"auth-service"}
SNYK_POLICY_FILE=".snyk"
PACKAGE_JSON="package.json"

# Logging functions
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_blue() {
    echo -e "${BLUE}🔗 $1${NC}"
}

# Check if Snyk CLI is installed
check_snyk_cli() {
    if command -v snyk &> /dev/null; then
        log_info "Snyk CLI is installed"
        return 0
    else
        log_warn "Snyk CLI not found. Installing..."
        return 1
    fi
}

# Install Snyk CLI
install_snyk_cli() {
    if npm install -g snyk; then
        log_info "Snyk CLI installed successfully"
    else
        log_error "Failed to install Snyk CLI"
        exit 1
    fi
}

# Authenticate with Snyk
authenticate_snyk() {
    if [ -z "$SNYK_TOKEN" ]; then
        log_warn "SNYK_TOKEN environment variable not set"
        echo "Please set SNYK_TOKEN in your environment or CI/CD secrets"
        return 1
    fi

    if snyk auth "$SNYK_TOKEN" &> /dev/null; then
        log_info "Snyk authentication successful"
        return 0
    else
        log_error "Snyk authentication failed"
        return 1
    fi
}

# Run initial Snyk test
run_initial_test() {
    log_info "Running initial Snyk vulnerability scan..."
    
    if snyk test --json > snyk-test-results.json 2>/dev/null; then
        log_info "No vulnerabilities found"
    else
        VULN_COUNT=$(jq -r '.vulnerabilities | length' snyk-test-results.json 2>/dev/null || echo "unknown")
        if [ "$VULN_COUNT" != "null" ] && [ "$VULN_COUNT" != "unknown" ]; then
            log_warn "Found $VULN_COUNT vulnerabilities"
            echo 'Run "snyk wizard" to fix issues interactively'
        else
            log_warn "Initial scan completed with issues (this is normal for new setups)"
            echo "Check the Snyk dashboard for detailed results"
        fi
    fi
    
    # Clean up temporary file
    rm -f snyk-test-results.json
}

# Monitor project with Snyk
monitor_project() {
    if snyk monitor --project-name="$PROJECT_NAME"; then
        log_info "Project monitoring enabled in Snyk dashboard"
    else
        log_error "Failed to enable monitoring"
    fi
}

# Create .snyk policy file
create_policy_file() {
    if [ -f "$SNYK_POLICY_FILE" ]; then
        log_info ".snyk policy file already exists"
        return
    fi

    cat > "$SNYK_POLICY_FILE" << 'EOF'
# Snyk (https://snyk.io) policy file
version: v1.25.0

# Ignore specific vulnerabilities (add as needed)
ignore: {}

# Language settings
language-settings:
  javascript:
    # Exclude dev dependencies from production scans
    includeDevDependencies: false

# Patch settings
patch: {}
EOF

    if [ $? -eq 0 ]; then
        log_info "Created .snyk policy file"
    else
        log_error "Failed to create .snyk policy file"
    fi
}

# Update package.json with Snyk scripts
update_package_scripts() {
    if [ ! -f "$PACKAGE_JSON" ]; then
        log_error "package.json not found"
        return 1
    fi

    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        log_warn "jq not found. Skipping package.json update"
        echo "Please manually add these scripts to package.json:"
        echo '  "security:test": "snyk test",'
        echo '  "security:monitor": "snyk monitor",'
        echo '  "security:fix": "snyk fix",'
        echo '  "security:wizard": "snyk wizard"'
        return
    fi

    # Create temporary file with updated scripts
    jq '.scripts += {
        "security:test": "snyk test",
        "security:monitor": "snyk monitor", 
        "security:fix": "snyk fix",
        "security:wizard": "snyk wizard"
    }' "$PACKAGE_JSON" > "${PACKAGE_JSON}.tmp"

    if [ $? -eq 0 ]; then
        mv "${PACKAGE_JSON}.tmp" "$PACKAGE_JSON"
        log_info "Added Snyk scripts to package.json"
    else
        log_error "Failed to update package.json"
        rm -f "${PACKAGE_JSON}.tmp"
    fi
}

# Display setup summary
display_summary() {
    echo
    echo "🎉 Snyk Setup Complete!"
    echo
    echo "📋 Available Commands:"
    echo "  npm run security:test    - Test for vulnerabilities"
    echo "  npm run security:monitor - Monitor project in Snyk dashboard"
    echo "  npm run security:fix     - Apply automatic fixes"
    echo "  npm run security:wizard  - Interactive vulnerability fixing"
    echo
    log_blue "Useful Links:"
    echo "  Snyk Dashboard: https://app.snyk.io/"
    echo "  Snyk Documentation: https://docs.snyk.io/"
    echo
    echo "⚙️  CI/CD Integration:"
    echo "  1. Add SNYK_TOKEN to your CI/CD secrets"
    echo "  2. Workflows are already configured in .github/workflows/"
    echo "  3. Security scans will run automatically on push/PR"
}

# Main setup function
main() {
    echo "🚀 Starting Snyk setup..."
    echo

    # Check and install Snyk CLI
    if ! check_snyk_cli; then
        install_snyk_cli
    fi

    # Create policy file
    create_policy_file

    # Update package.json scripts
    update_package_scripts

    # Authenticate (if token available)
    if authenticate_snyk; then
        # Run initial test
        run_initial_test

        # Enable monitoring
        monitor_project
    fi

    # Display summary
    display_summary
}

# Run main function
main "$@"