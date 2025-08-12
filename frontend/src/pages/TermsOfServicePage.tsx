import React from 'react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>

      <div className="prose prose-lg dark:prose-invert max-w-none border border-gray-200 dark:border-gray-700 rounded-2xl p-8 bg-white dark:bg-gray-800 shadow-sm">
        <div className="space-y-6 leading-relaxed">
          <p>Last updated: August 10, 2025</p>

          <p>
            These Terms of Service (the “Terms”) govern your access to and use of Thesyx and its services, including the
            website, document upload features, AI chat, text-to-speech (TTS), and related pages (collectively, the “Service”).
            By creating an account or using the Service, you agree to these Terms.
          </p>

          <h2>1. Account & Eligibility</h2>
          <p>
            You must be at least 13 years old to use the Service. By registering, you represent that the information you
            provide is accurate and complete, and you agree to keep it up to date. You are responsible for safeguarding your
            account credentials and for all activity under your account.
          </p>

          <h2>2. Acceptable Use</h2>
          <p>When using the Service, you agree not to:</p>
          <ul>
            <li>Upload or share content that is unlawful, infringing, harmful, or violates the rights of others.</li>
            <li>Attempt to interfere with or compromise the integrity or security of the Service.</li>
            <li>Reverse-engineer, scrape, or misuse APIs or features beyond their intended usage.</li>
            <li>Use the Service to generate or disseminate misleading or harmful content.</li>
          </ul>

          <h2>3. Content & Ownership</h2>
          <p>
            You retain ownership of the content you upload (e.g., books, documents). By uploading, you grant Thesyx a
            limited, non-exclusive, worldwide license to store, process, and display the content solely to provide the Service
            (e.g., rendering, search, AI-assisted chat, TTS). You represent that you have the necessary rights to upload and
            process such content.
          </p>

          <h2>4. AI Features & TTS</h2>
          <p>
            Our AI chat and TTS features help you interact with your content. We strive for accuracy but do not guarantee
            correctness or suitability of AI outputs. You are responsible for reviewing AI responses and using them at your
            own discretion.
          </p>
          <p>
            Usage of AI queries, TTS minutes, and book uploads may be subject to plan-specific limits (e.g., Free plan totals,
            Pro plan monthly quotas). Details are shown in your account and on the pricing page. If a quota is exceeded, access
            to the corresponding feature may be restricted until usage resets or your plan is upgraded.
          </p>

          <h2>5. Plans, Billing & Trials</h2>
          <p>
            If you subscribe to a paid plan, you authorize us and our payment processor (e.g., Stripe) to charge the payment
            method you provide. Subscriptions renew automatically until canceled. You may cancel at any time; cancellations
            take effect at the end of the current billing period. Fees are generally non-refundable unless required by law.
          </p>

          <h2>6. Privacy</h2>
          <p>
            Your use of the Service is subject to our Privacy Policy, which explains how we collect, use, and protect your
            information. By using the Service, you consent to our data practices as described in the Privacy Policy.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            All Service components, including software, UI, designs, logos, and trademarks, are owned by Thesyx or its
            licensors and are protected by intellectual property laws. Except as expressly permitted, you may not copy,
            modify, distribute, or create derivative works based on the Service.
          </p>

          <h2>8. Third-Party Services</h2>
          <p>
            The Service may integrate with third-party tools (e.g., Google OAuth, payment processing). We are not responsible
            for third-party services or their terms. Your use of third-party services is governed by their policies.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate your access if you violate these Terms or if we believe your use poses risk to others
            or the Service. You may stop using the Service at any time. Upon termination, provisions that by their nature
            should survive will remain in effect (e.g., ownership, disclaimers, limitations of liability).
          </p>

          <h2>10. Disclaimers</h2>
          <p>
            The Service is provided “as is” and “as available” without warranties of any kind, express or implied, including
            fitness for a particular purpose and non-infringement. We do not warrant that the Service will be uninterrupted,
            secure, or error-free.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Thesyx and its affiliates will not be liable for indirect, incidental,
            special, consequential, or punitive damages, or any loss of profits or data, arising out of or related to your use
            of the Service. Our aggregate liability for all claims related to the Service will not exceed the amount you paid
            us (if any) in the 12 months preceding the event giving rise to the claim.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Thesyx and its affiliates from and against any claims, liabilities,
            damages, losses, and expenses (including reasonable attorneys’ fees) arising out of or in any way connected with
            (a) your use of the Service, (b) your content, or (c) your violation of these Terms.
          </p>

          <h2>13. Changes to the Terms</h2>
          <p>
            We may update these Terms from time to time. We will update the “Last updated” date above when changes are made.
            Your continued use of the Service constitutes acceptance of the revised Terms.
          </p>

          <h2>14. Contact</h2>
          <p>
            For questions about these Terms, contact us at: mirzatalib110@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage; 