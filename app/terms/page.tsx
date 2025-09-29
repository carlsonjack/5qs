import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | 5Q Strategy",
  description: "The terms and conditions governing your use of 5Q Strategy.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8 prose prose-slate dark:prose-invert">
      <h1>Terms & Conditions</h1>
      <p>
        These Terms & Conditions ("Terms") govern your access to and use of the
        5Q Strategy website, applications, and services (collectively, the
        "Services"). By accessing or using the Services, you agree to be bound
        by these Terms.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years old and able to form a binding contract to
        use the Services. If you are using the Services on behalf of an
        organization, you represent that you have authority to bind that
        organization to these Terms.
      </p>

      <h2>2. Account and Acceptable Use</h2>
      <p>
        You are responsible for the accuracy of information you provide and for
        all activity under your account. You agree not to misuse the Services,
        including by interfering with their normal operation, attempting to
        access them using a method other than the interfaces and instructions we
        provide, or using the Services for unlawful, harmful, or infringing
        purposes.
      </p>

      <h2>3. Content and License</h2>
      <p>
        You retain ownership of content you submit. You grant 5Q Strategy a
        non-exclusive, worldwide, royalty-free license to host, store, process,
        reproduce, and display your content solely to operate and improve the
        Services. You represent that you have the necessary rights to grant this
        license.
      </p>

      <h2>4. AI Outputs and Disclaimers</h2>
      <p>
        The Services may generate AI-assisted content. Outputs can be incomplete
        or inaccurate. You are responsible for evaluating fitness for your
        specific use and for any decisions made based on outputs. The Services
        are provided "as is" without warranties of any kind, to the fullest
        extent permitted by law.
      </p>

      <h2>5. Payment and Trials</h2>
      <p>
        If paid features are offered, you agree to applicable fees, billing
        cycles, and taxes. Unless otherwise stated, fees are non-refundable.
        Trials or promotional offers may be modified or terminated at any time.
      </p>

      <h2>6. Confidentiality</h2>
      <p>
        We will use commercially reasonable measures to protect your
        confidential information submitted through the Services, subject to our
        Privacy Policy. You agree not to disclose non-public information about
        the Services.
      </p>

      <h2>7. Prohibited Conduct</h2>
      <ul>
        <li>Reverse engineering or scraping the Services.</li>
        <li>Uploading malicious code or violating security controls.</li>
        <li>Infringing intellectual property or privacy rights.</li>
        <li>Using outputs to mislead, harass, or harm others.</li>
      </ul>

      <h2>8. Intellectual Property</h2>
      <p>
        The Services, including software, design, and trademarks, are owned by
        5Q Strategy and its licensors. No rights are granted except as expressly
        set out in these Terms.
      </p>

      <h2>9. Third-Party Services</h2>
      <p>
        The Services may integrate with third-party tools or services subject to
        their own terms. We are not responsible for third-party content or
        services.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, 5Q Strategy shall not be liable
        for any indirect, incidental, special, consequential, or punitive
        damages, or any loss of profits, data, or goodwill, arising from or in
        connection with your use of the Services.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless 5Q Strategy, its affiliates,
        and personnel from any claims, liabilities, damages, losses, and
        expenses arising from your use of the Services or violation of these
        Terms.
      </p>

      <h2>12. Termination</h2>
      <p>
        We may suspend or terminate your access to the Services at any time for
        any reason, including for violation of these Terms. Upon termination,
        provisions that by their nature should survive will survive.
      </p>

      <h2>13. Modifications</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        indicated by updating the effective date and, where appropriate,
        providing notice. Your continued use of the Services after changes
        indicates acceptance.
      </p>

      <h2>14. Governing Law; Dispute Resolution</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, without
        regard to its conflict of law principles. Any disputes will be resolved
        through binding arbitration on an individual basis. You waive class
        actions and jury trials to the maximum extent permitted by law.
      </p>

      <h2>15. Contact</h2>
      <p>Questions about these Terms can be sent to support@5qstrategy.com.</p>

      <p className="text-sm text-muted-foreground">
        Effective date: {new Date().toLocaleDateString()}
      </p>
    </main>
  );
}
