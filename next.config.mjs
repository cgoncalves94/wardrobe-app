/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ]
  },
  webpack: (config) => {
    // Suppress optional dynamic requires inside supabase realtime client from emitting critical warnings
    config.module.exprContextCritical = false;
    return config;
  }
};
export default nextConfig;
