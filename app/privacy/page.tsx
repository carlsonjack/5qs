import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | 5Q Strategy",
  description:
    "How 5Q Strategy collects, uses, shares, and protects your personal information.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8 prose prose-slate dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>
        This Privacy Policy explains how 5Q Strategy ("we", "us", "our")
        collects, uses, shares, and protects information in connection with our
        website, applications, and services (the "Services").
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>
          <strong>Contact information</strong>: such as name, email address,
          phone number, and company details that you provide through forms,
          account creation, or communications.
        </li>
        <li>
          <strong>Usage data</strong>: including device information, IP address,
          browser type, pages visited, and interactions with the Services.
        </li>
        <li>
          <strong>Content</strong>: materials you upload or submit, including
          files and business information used to generate outputs.
        </li>
        <li>
          <strong>Cookies and similar technologies</strong>: to remember
          preferences, enable features, and analyze usage.
        </li>
      </ul>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>Provide, operate, and improve the Services and user experience.</li>
        <li>Communicate with you, including customer support and updates.</li>
        <li>Personalize content and features.</li>
        <li>Monitor security, detect fraud, and enforce policies.</li>
        <li>Comply with legal obligations and protect our rights.</li>
      </ul>

      <h2>3. Sharing of Information</h2>
      <p>
        We may share information with service providers who process data on our
        behalf, under appropriate confidentiality and security obligations. We
        may also share information to comply with law, respond to legal process,
        or protect the rights, property, or safety of 5Q Strategy, our users, or
        the public.
      </p>
      <p>
        <strong>
          We reserve the right to share your contact information with our
          partners when you provide it. Our partners may use your contact
          information to reach out with relevant offerings. You can opt out of
          partner communications by using the opt-out mechanisms they provide or
          by contacting us.
        </strong>
      </p>

      <h2>4. International Data Transfers</h2>
      <p>
        Your information may be transferred to and processed in countries other
        than where you reside. We implement appropriate safeguards as required
        by applicable law.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain personal information for as long as necessary to fulfill the
        purposes outlined in this Policy, comply with legal obligations, and
        resolve disputes.
      </p>

      <h2>6. Your Choices</h2>
      <ul>
        <li>
          You may update your information by contacting support or via account
          settings, where available.
        </li>
        <li>
          You may opt out of marketing emails by using the unsubscribe link in
          those emails.
        </li>
        <li>
          You can control cookies through your browser settings; disabling some
          cookies may affect functionality.
        </li>
      </ul>

      <h2>7. Security</h2>
      <p>
        We implement technical and organizational measures designed to protect
        personal information. However, no method of transmission or storage is
        completely secure.
      </p>

      <h2>8. Children’s Privacy</h2>
      <p>
        The Services are not directed to children under 13. We do not knowingly
        collect personal information from children under 13.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be indicated by updating the effective date and, where appropriate,
        providing notice. Your continued use of the Services after changes
        indicates acceptance.
      </p>

      <h2>10. Contact Us</h2>
      <p>
        If you have questions about this Policy or our practices, contact us at
        privacy@5qstrategy.com.
      </p>

      <p className="text-sm text-muted-foreground">
        Effective date: {new Date().toLocaleDateString()}
      </p>
    </main>
  );
}
