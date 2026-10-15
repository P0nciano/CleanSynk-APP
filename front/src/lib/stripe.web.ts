// @stripe/stripe-react-native não roda no navegador: na web o pagamento fica indisponível
import type { ReactNode } from 'react';

const indisponivel = async () => ({ error: { message: 'Pagamento disponível apenas no app (Android/iOS).' } });

export function StripeProvider({ children }: { publishableKey: string; children: ReactNode }) {
  return children;
}

export function useStripe() {
  return { initPaymentSheet: indisponivel, presentPaymentSheet: indisponivel };
}
