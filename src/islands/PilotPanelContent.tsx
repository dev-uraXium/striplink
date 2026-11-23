import './loadIslandStyles';
import { AuthProvider } from '../hooks/auth/AuthProvider';
import { SettingsProvider } from '../hooks/settings/SettingsProvider';
import PilotPanel from '../pages/PilotPanel';
import { PostHogProviderWrapper } from './PostHogProviderWrapper';
import { IsomorphicRouter } from './IsomorphicRouter';

export default function PilotPanelContent({ pathname }: { pathname?: string }) {
  return (
    <PostHogProviderWrapper>
      <AuthProvider>
        <SettingsProvider>
          <IsomorphicRouter pathname={pathname}>
            <PilotPanel />
          </IsomorphicRouter>
        </SettingsProvider>
      </AuthProvider>
    </PostHogProviderWrapper>
  );
}
