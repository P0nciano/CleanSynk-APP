import { Alert, Platform, type AlertButton } from 'react-native';

// No navegador o Alert.alert do react-native-web não mostra nada: troca pelos diálogos do browser.
// Com botões, usa confirm(): OK roda o botão que não é "cancel", Cancelar roda o "cancel".
if (Platform.OS === 'web') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const texto = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length < 2) {
      window.alert(texto);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancelar = buttons.find((b) => b.style === 'cancel');
    const confirmar = buttons.find((b) => b !== cancelar);
    (window.confirm(texto) ? confirmar : cancelar)?.onPress?.();
  };
}
