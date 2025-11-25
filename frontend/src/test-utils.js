import React from 'react';
import { render } from '@testing-library/react';
import { UserSession } from '@stacks/auth';

export const mockUserSession = (isSignedIn = true) => {
  const userSession = new UserSession({
    appConfig: {
      scopes: ['store_write', 'publish_data'],
      appDomain: 'http://localhost:3000',
    },
  });

  if (isSignedIn) {
    userSession.loadUserData = jest.fn().mockReturnValue({
      profile: {
        stxAddress: {
          testnet: 'ST1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5',
          mainnet: 'SP1PQHQKV0RJXZ9VCCSXM24VZ4QR6X4RA24P462A5',
        },
      },
    });
    userSession.isUserSignedIn = jest.fn().mockReturnValue(true);
  } else {
    userSession.isUserSignedIn = jest.fn().mockReturnValue(false);
  }

  return userSession;
};

export const renderWithProviders = (
  ui,
  {
    userSession = mockUserSession(),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <UserSessionContext.Provider value={userSession}>
      {children}
    </UserSessionContext.Provider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    userSession,
  };
};

export const mockMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
