'use client'

import React from 'react';
import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="py-8 bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <Link href="/" className="text-blue-600 hover:text-blue-700 transition-colors mb-4 inline-block">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Terms and Conditions</h1>
          <p className="text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-lg max-w-none">
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms and Conditions ("Terms") constitute a legally binding agreement between you and Clamo ("Company," "we," "our," or "us") regarding your use of the Clamo platform and related services (the "Service").
            </p>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Company Information</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2"><strong>Clamo Legal</strong></p>
              <p className="text-gray-700">Email: <a href="mailto:support@clamo.legal" className="text-blue-600 hover:text-blue-700">support@clamo.legal</a></p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Service Description</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Clamo is an AI-powered legal assistant that provides:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Legal case analysis through conversational AI</li>
              <li>Personalized legal task generation</li>
              <li>Document template creation and preparation</li>
              <li>Case progress tracking and deadline reminders</li>
              <li>Guidance for Justice of the Peace proceedings</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              The Service is designed for individuals handling small claims and administrative sanctions without legal representation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Service Plans and Refund Policy</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Free and Premium Plans</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We offer both free and premium service tiers with different features and capabilities.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Refund Policy</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Premium plan payments may be refunded within 7 days of purchase if you are not satisfied with the service. Refunds will be processed within 5-7 business days to the original payment method.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. User Accounts and Responsibilities</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Account Creation</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              To use our Service, you must create an account by providing accurate and complete information, including a valid email address.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 User Responsibilities</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Provide accurate information about your product and business</li>
              <li>Use the Service for legitimate business purposes only</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not interfere with or disrupt the Service</li>
              <li>Not use the Service for any unlawful or prohibited activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payment Terms</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Pricing</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Current pricing includes:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Basic Plan: Free with limited features</li>
              <li>Premium Plan: €29/month with full access</li>
              <li>Professional Plan: Custom pricing for law firms</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Payment Processing</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              All payments are processed securely through Stripe. We do not store your payment information on our servers.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 Taxes</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You are responsible for any applicable taxes, duties, or fees related to your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Our Property</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Service, including all content, features, and functionality, is owned by Clamo and protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Your Content</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You retain ownership of any content you provide to us. By using the Service, you grant us a limited license to use your content solely to provide and improve our Service.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3 Generated Content</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Legal documents and tasks generated by our AI are provided for your use. You may implement and modify these suggestions as needed for your case. Note: This does not constitute legal advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Service Availability and Modifications</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We strive to maintain high service availability but do not guarantee uninterrupted access. We reserve the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Modify, suspend, or discontinue the Service at any time</li>
              <li>Update features and functionality</li>
              <li>Perform maintenance and upgrades</li>
              <li>Change pricing with reasonable notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimers and Limitation of Liability</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.1 Service Disclaimer</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE." WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.2 Legal Outcomes</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not guarantee specific legal outcomes or case results. Success depends on various factors including case merits, evidence quality, and court procedures. Our service provides guidance only and does not constitute legal advice.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.3 Limitation of Liability</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              IN NO EVENT SHALL CLAMO BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You agree to indemnify and hold harmless Clamo from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Termination</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Either party may terminate these Terms at any time. Upon termination:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Your access to the Service will cease</li>
              <li>We may delete your account and data according to our Privacy Policy</li>
              <li>Provisions that should survive termination will remain in effect</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law and Dispute Resolution</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms are governed by applicable local laws. Any disputes will be resolved through appropriate legal channels in the jurisdiction where the service is provided.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Severability</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may update these Terms from time to time. We will notify you of any material changes by email or through the Service. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              For questions about these Terms, please contact us:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Email: <a href="mailto:support@clamo.legal" className="text-blue-600 hover:text-blue-700">support@clamo.legal</a></li>
            </ul>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Clamo Legal. All rights reserved.
          </p>
          <div className="mt-2 space-x-4">
            <Link href="/" className="text-blue-600 hover:text-blue-700 transition-colors">
              Back to Home
            </Link>
            <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-700 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
} 