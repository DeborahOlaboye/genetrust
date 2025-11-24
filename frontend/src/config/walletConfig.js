// Stacks wallet configuration
import { AppConfig, UserSession } from '@stacks/auth';

export const appConfig = new AppConfig(
  ['store_write', 'publish_data']
);

export const userSession = new UserSession({ appConfig });

export const appDetails = {
  name: 'GeneTrust',
  icon: window.location.origin + '/logo192.png',
};

export const walletConfig = {
  appDetails,
  redirectTo: '/',
  onFinish: () => {
    window.location.reload();
  },
  userSession,
};
