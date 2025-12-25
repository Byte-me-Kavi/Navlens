import React from 'react';

const FaqJsonLd = () => {
  const faqs = [
    {
      question: "Can I change my plan at any time?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges or credits to your account."
    },
    {
      question: "Is there a free trial?",
      answer: "Absolutely! We offer a 14-day free trial for all plans. No credit card required to get started. Full access to all features during your trial."
    },
    {
      question: "What happens if I exceed my pageview limit?",
      answer: "We'll notify you when you approach your limit. You can upgrade your plan anytime. We don't cut off service - you'll continue tracking but may see a notice."
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 30-day money-back guarantee on annual plans. If you're not satisfied, contact our support team for a full refund, no questions asked."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, absolutely. You can cancel your subscription at any time from your account settings. You'll have access until the end of your current billing period."
    }
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default FaqJsonLd;
