import React from 'react';

const JsonLd = () => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://navlensanalytics.com/#organization',
        name: 'Navlens Analytics',
        url: 'https://navlensanalytics.com',
        logo: {
          '@type': 'ImageObject',
          url: 'https://navlensanalytics.com/images/logo.png', // Ensure this exists or use a valid path
        },
        sameAs: [
          'https://twitter.com/navlensanalytics',
          'https://linkedin.com/company/navlensanalytics',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '', // Add if available
          contactType: 'customer support',
          email: 'navlensanalytics@gmail.com',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Navlens Analytics',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description: 'Advanced web heatmaps and session replay software for optimizing user experience and conversion rates.',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '150',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default JsonLd;
