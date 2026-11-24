import './loadIslandStyles';
import { AuthProvider } from '../hooks/auth/AuthProvider';
import { SettingsProvider } from '../hooks/settings/SettingsProvider';
import PfTrackerSync from '../pages/PfTrackerSync';
import { PostHogProviderWrapper } from './PostHogProviderWrapper';
import { IsomorphicRouter } from './IsomorphicRouter';

export default function PfTrackerContent({ pathname }: { pathname?: string }) {
  return (
    <PostHogProviderWrapper>
      <AuthProvider>
        <SettingsProvider>
          <IsomorphicRouter pathname={pathname}>
            <PfTrackerSync />
          </IsomorphicRouter>
        </SettingsProvider>
      </AuthProvider>
    </PostHogProviderWrapper>
  );
}
