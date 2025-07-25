# Contributing to Production-Grade Auth Template

Thank you for your interest in contributing! This guide will help you get started with contributing to our authentication service template.

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Create** a feature branch: `git checkout -b feature/your-feature`
5. **Make** your changes
6. **Test** your changes: `npm run test`
7. **Submit** a pull request

## 📋 Prerequisites

- Node.js ≥ 22.14.0
- npm ≥ 10.7.0
- MongoDB (for testing)
- Redis (for testing)
- Git

## 🛠️ Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Production-grade-Auth-template.git
cd Production-grade-Auth-template

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.dev

# Start development server
npm run dev
```

## 📝 Code Style & Standards

### ESLint & Prettier
- Follow the ESLint configuration in `eslint.config.js`
- Use Prettier for code formatting (`.prettierrc`)
- Run `npm run lint` and `npm run format` before committing

### TypeScript
- Use TypeScript types where applicable
- Follow strict type-checking rules from `tsconfig.json`

### Commit Messages
Follow [Conventional Commits](https://conventionalcommits.org/):

```
feat: add user registration endpoint
fix: resolve JWT token expiration issue
docs: update API documentation
test: add unit tests for auth middleware
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests
- Write unit tests for new features
- Place tests in the `test/` directory
- Use descriptive test names
- Aim for >80% code coverage

## 🏗️ Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── middlewares/    # Express middlewares
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── validations/    # Input validation schemas
```

## 🔒 Security Guidelines

- Never commit sensitive data (API keys, passwords)
- Use environment variables for configuration
- Follow OWASP security practices
- Validate all user inputs
- Use secure authentication methods

## 📚 API Documentation

- Update Swagger documentation for new endpoints
- Run `npm run swagger` to generate docs
- Include request/response examples
- Document error responses

## 🐛 Bug Reports

When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS)
- Error logs/screenshots

## ✨ Feature Requests

For new features:
- Check existing issues first
- Provide clear use case
- Explain the problem it solves
- Consider implementation complexity

## 🔄 Pull Request Process

### Before Submitting
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### PR Requirements
- Clear, descriptive title
- Detailed description of changes
- Link to related issues
- Screenshots (if UI changes)
- Breaking changes noted

### Review Process
1. Automated checks run (CI/CD)
2. Code review by maintainers
3. Address feedback if needed
4. Approval and merge

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `needs-triage` - Needs initial review

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow GitHub's community guidelines

## 📞 Getting Help

- Check existing issues and discussions
- Ask questions in issue comments
- Join our community discussions
- Contact maintainers: [@harmeet10000](https://github.com/harmeet10000)

## 🎯 Development Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Local Development
```bash
# Start with fresh dependencies
npm ci

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format:fix

# Run tests
npm test

# Start development server
npm run dev
```

## 📦 Release Process

1. Version bump in `package.json`
2. Update `CHANGELOG.md`
3. Create release PR
4. Tag release after merge
5. GitHub Actions handles deployment

## 🙏 Recognition

Contributors will be:
- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Given credit in documentation

---

**Thank you for contributing to Production-Grade Auth Template!** 🚀

Your contributions help make authentication more secure and accessible for everyone.