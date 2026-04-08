import { registerRootComponent } from 'expo';
import App from '@/App';

// Prevent splash screen auto-hide
// SplashScreen.preventAutoHideAsync();

export default function Index() {
  return <App />;
}

registerRootComponent(Index);
