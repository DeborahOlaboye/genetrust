# Development Guide

This guide will help you set up and start developing the GeneTrust application.

## Prerequisites

- Node.js 16+ and npm 8+
- Git
- VS Code (recommended) or your preferred code editor

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/DeborahOlaboye/genetrust.git
   cd genetrust
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Frontend
   VITE_APP_NAME="GeneTrust"
   VITE_API_URL=http://localhost:3001/api
   VITE_ENV=development
   
   # Backend
   PORT=3001
   NODE_ENV=development
   ```

## Available Scripts

In the project directory, you can run:

### Frontend

```bash
# Start development server with HMR
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

## Debugging

### VS Code Debugger

1. Open the Run and Debug view (Ctrl+Shift+D or Cmd+Shift+D)
2. Select a configuration from the dropdown
3. Press F5 or click the green play button to start debugging

### Browser DevTools

- Use React DevTools for React component inspection
- Use Redux DevTools for state management debugging
- Use the Network tab to monitor API requests

## Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` to check for linting errors
- Run `npm run format` to format your code

## Git Workflow

1. Create a new branch for your feature or bugfix
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

3. Push your changes to the remote repository
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. Create a pull request on GitHub

## Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Hero
- GitLens
- Import Cost
- Todo Tree
- DotENV

## Troubleshooting

### Common Issues

- **Dependency issues**: Try deleting `node_modules` and `package-lock.json` and run `npm install`
- **Build errors**: Check for TypeScript errors and fix them before building
- **Test failures**: Make sure all tests pass before pushing your changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
