import './loadIslandStyles';
import BottomPopup from '../components/BottomPopup';
import { AuthProvider } from '../hooks/auth/AuthProvider';
import { SettingsProvider } from '../hooks/settings/SettingsProvider';
import Legal, { type LegalDoc } from '../pages/Legal';
import { PostHogProviderWrapper } from './PostHogProviderWrapper';
import { IsomorphicRouter } from './IsomorphicRouter';

interface Props {
  doc: LegalDoc;
  pathname?: string;
}

export default function LegalContent({ doc, pathname }: Props) {
  return (
    <PostHogProviderWrapper>
      <AuthProvider>
        <SettingsProvider>
          <IsomorphicRouter pathname={pathname}>
            <Legal doc={doc} />
            <BottomPopup />
          </IsomorphicRouter>
        </SettingsProvider>
      </AuthProvider>
    </PostHogProviderWrapper>
  );
}
