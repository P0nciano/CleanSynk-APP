// @ts-ignore - side-effect import de CSS (Expo/Web)
import '../global.css';
import { Slot } from 'expo-router';
import { AuthProvider } from 'src/context/auth';


export default function Layout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
