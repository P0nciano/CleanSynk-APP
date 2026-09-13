declare global {
  const process: {
    env: {
      EXPO_PUBLIC_API_URL?: string;
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
    };
  };
}

export {};