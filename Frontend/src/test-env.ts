// Test environment variables
console.log('Environment Variables Test:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_STRIPE_PUBLISHABLE_KEY:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET');

export const envTest = {
  apiUrl: import.meta.env.VITE_API_URL,
  stripeKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
};
