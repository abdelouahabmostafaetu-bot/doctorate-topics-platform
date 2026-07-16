// ⚠️ هذا ملف مثال — لا يعمل وحده!
// انسخ محتواه يدوياً إلى ملف next.config.js الموجود لديك
// (لا تحذف الإعدادات الحالية في next.config.js — فقط غلّفها بـ withPWA)

const withPWA = require("next-pwa")({
	dest: "public",
	register: true,
	skipWaiting: true,
	disable: process.env.NODE_ENV === "development",
	runtimeCaching: [
		{
			urlPattern: /^https:\/\/www\.docmathdz\.dev\/api\/.*/,
			handler: "StaleWhileRevalidate",
			options: {
				cacheName: "api-cache",
				expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
			},
		},
		{
			urlPattern: /^https:\/\/www\.docmathdz\.dev\/.*/,
			handler: "StaleWhileRevalidate",
			options: {
				cacheName: "pages-cache",
				expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
			},
		},
	],
})

module.exports = withPWA({
	// ضع إعدادات next.config.js الحالية لديك هنا
})
