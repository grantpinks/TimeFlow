export function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TimeFlow",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web, iOS, Android",
    "description": "AI-powered scheduling assistant that automatically manages your tasks, emails, and habits. Integrates with Google Calendar for seamless productivity.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free plan available with paid Pro and Teams plans"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "500",
      "bestRating": "5",
      "worstRating": "1"
    },
    "featureList": [
      "AI-powered task scheduling",
      "Smart email categorization",
      "Habit-aware calendar integration",
      "Google Calendar sync",
      "Natural language processing",
      "Automatic conflict resolution"
    ],
    "screenshot": "https://www.time-flow.app/screenshots/main.png",
    "softwareVersion": "1.0",
    "author": {
      "@type": "Organization",
      "name": "TimeFlow",
      "url": "https://www.time-flow.app"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
