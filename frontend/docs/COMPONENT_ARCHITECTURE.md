# Component Architecture

## Overview

The application follows the Atomic Design methodology with some modifications:

### Core Concepts

1. **Atoms**: Basic building blocks (buttons, inputs, etc.)
2. **Molecules**: Groups of atoms functioning together
3. **Organisms**: Complex UI components
4. **Templates**: Page layouts
5. **Pages**: Complete views

## Data Flow

1. **Unidirectional Data Flow**: Data flows down, events flow up
2. **State Management**: Uses React Context + useReducer for global state
3. **API Calls**: Handled in service layer

## Key Components

### Wallet Integration
- `WalletProvider`: Manages wallet state and connection
- `ConnectButton`: UI for wallet connection
- `AccountInfo`: Displays connected wallet info

### Data Management
- `DatasetList`: Displays available datasets
- `DatasetUpload`: Handles file uploads
- `DatasetViewer`: Visualizes genomic data

## Best Practices

1. Keep components small and focused
2. Use TypeScript for type safety
3. Follow the Container/Component pattern
4. Keep business logic out of presentational components
