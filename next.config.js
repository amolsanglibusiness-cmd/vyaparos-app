const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    clientsClaim: true,
    disable: process.env.NODE_ENV === 'development',
    cacheOnFrontEndNav: true,
    fallbacks: {
        document: '/offline.html',
    },
    runtimeCaching: [
        {
            urlPattern: /^https?:\/\/[^/]+\/_next\/static\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'vyaparos-next-static',
                expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
        },
        {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
                cacheName: 'vyaparos-pages',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
        },
        {
            urlPattern: ({ request }) =>
                request.destination === 'script' ||
                request.destination === 'style' ||
                request.destination === 'font',
            handler: 'CacheFirst',
            options: {
                cacheName: 'vyaparos-assets',
                expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
        },
    ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export', <-- ही लाईन काढून टाका
    trailingSlash: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        unoptimized: true,
    },
    transpilePackages: ['lucide-react'],
    env: {
        NEXT_PUBLIC_APP_URL: 'https://vyaparos-app.vercel.app',
    },
};

module.exports = withPWA(nextConfig);