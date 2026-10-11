import { PolicyLayout } from './PolicyLayout';

const TOC = [
  { id: 'data-controller', title: '1. Data Controller & NDPA 2023 Scope' },
  { id: 'data-collected', title: '2. Personal Data We Collect' },
  { id: 'processing-purposes', title: '3. Legal Bases & Processing Purposes' },
  { id: 'data-sharing', title: '4. Data Sharing & Disclosure to Sellers' },
  { id: 'data-retention', title: '5. Data Retention Schedules (OI-10)' },
  { id: 'user-rights', title: '6. Your Rights Under NDPA 2023' },
  { id: 'data-security', title: '7. Security Safeguards & Encryption' },
  { id: 'cookies-tracking', title: '8. Cookies & Session Storage' },
  { id: 'dpo-contact', title: '9. Data Protection Officer (DPO) Contact' },
];

/**
 * PrivacyNotice — Privacy Notice & NDPA 2023 Compliance Page
 * Conforms to SRS NFR-SEC-12, OI-10, and Task FE-053
 */
export function PrivacyNotice() {
  const sectionHeadingStyle = {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#0f172a',
    marginTop: '2.25rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.35rem',
    borderBottom: '1px solid #f1f5f9',
  };

  const paragraphStyle = {
    color: '#334155',
    lineHeight: 1.7,
    fontSize: '0.95rem',
    marginBottom: '1rem',
  };

  const listStyle = {
    color: '#334155',
    lineHeight: 1.7,
    fontSize: '0.95rem',
    marginBottom: '1.25rem',
    paddingLeft: '1.5rem',
  };

  return (
    <PolicyLayout
      title="Privacy Notice"
      subtitle="How Vegetable Joint collects, processes, protects, and retains your personal data in full compliance with the Nigeria Data Protection Act (NDPA) 2023."
      lastUpdated="February 2026"
      badge="Data Protection & NDPA 2023"
      tableOfContents={TOC}
    >
      <div
        className="privacy-notice-document"
        data-testid="privacy-notice-page"
      >
        {/* Section 1 */}
        <section id="data-controller">
          <h2 style={sectionHeadingStyle}>
            1. Data Controller &amp; NDPA 2023 Scope
          </h2>
          <p style={paragraphStyle}>
            This Privacy Notice explains how <strong>Vegetable Joint</strong>{' '}
            (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), operated by
            TriNova Technologies, handles your personal data when you interact
            with our digital vegetable marketplace.
          </p>
          <p style={paragraphStyle}>
            We operate as a <strong>Data Controller</strong> under the
            provisions of the{' '}
            <strong>Nigeria Data Protection Act (NDPA) 2023</strong> and
            guidelines issued by the Nigeria Data Protection Commission (NDPC).
            We are committed to processing all personal data transparently,
            fairly, lawfully, and with rigorous technical safeguards.
          </p>
        </section>

        {/* Section 2 */}
        <section id="data-collected">
          <h2 style={sectionHeadingStyle}>2. Personal Data We Collect</h2>
          <p style={paragraphStyle}>
            Depending on your role as a Buyer, Seller, or general visitor, we
            collect the following categories of personal data:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Buyer Account &amp; Order Data:</strong> Full name, email
              address, Nigerian telephone number, delivery address and delivery
              landmarks, recipient contact information, and historical orders
              placed on the platform.
            </li>
            <li>
              <strong>Seller Profile &amp; Business Data:</strong> Full name,
              registered business or farm name, contact phone number,
              farm/market location (e.g., Ketu Mile 12, Gombe, Kano, Plateau),
              produce catalog listings, and inventory metrics.
            </li>
            <li>
              <strong>Authentication &amp; Security Data:</strong> Encrypted
              password hashes, session authentication tokens, password reset
              tokens, and email verification status.
            </li>
            <li>
              <strong>Technical &amp; Audit Logs:</strong> IP address, device
              browser type, timestamps of login activities, and administrative
              moderation audit logs (SRS ADM-09).
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section id="processing-purposes">
          <h2 style={sectionHeadingStyle}>
            3. Legal Bases &amp; Processing Purposes
          </h2>
          <p style={paragraphStyle}>
            Under Section 25 of the NDPA 2023, we process personal data only
            when a valid lawful basis exists:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Contractual Performance:</strong> Creating your user
              account, displaying vegetable listings, facilitating cart
              management, processing multi-vendor orders, generating order
              numbers, and enabling delivery coordination between buyers and
              sellers.
            </li>
            <li>
              <strong>Legitimate Interests:</strong> Verifying seller
              authenticity, moderating produce quality, preventing marketplace
              fraud, maintaining platform availability, and securing user
              accounts.
            </li>
            <li>
              <strong>Legal &amp; Regulatory Obligations:</strong> Maintaining
              financial audit records, responding to lawful inquiries from
              regulatory agencies in Nigeria, and honoring statutory tax and
              commerce requirements.
            </li>
            <li>
              <strong>Consent:</strong> Sending platform announcements,
              promotional agricultural newsletters, or optional customer
              satisfaction surveys where you have explicitly opted in.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="data-sharing">
          <h2 style={sectionHeadingStyle}>
            4. Data Sharing &amp; Disclosure to Sellers
          </h2>
          <p style={paragraphStyle}>
            Because Vegetable Joint connects buyers directly with independent
            sellers:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Direct Fulfillment Sharing:</strong> When a buyer places
              an order, the buyer&apos;s name, delivery address, landmark, and
              contact phone number are transmitted exclusively to the specific
              seller fulfilling that order to enable delivery or pickup
              coordination.
            </li>
            <li>
              <strong>Administrative Review:</strong> Platform administrators
              have access to order records and user profiles for seller
              moderation, fraud investigation, and dispute resolution (SRS
              ADM-02, ADM-03).
            </li>
            <li>
              <strong>No Third-Party Sale:</strong> We strictly do{' '}
              <strong>not sell, rent, or trade</strong> your personal
              information or contact details to third-party marketing brokers or
              advertisers.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section id="data-retention">
          <h2 style={sectionHeadingStyle}>
            5. Data Retention Schedules (SRS OI-10)
          </h2>
          <p style={paragraphStyle}>
            Pursuant to the principles of data minimization and retention
            limitation (NDPA 2023 Section 24), we do not retain personal data
            longer than necessary:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Order Records &amp; Invoices:</strong> Retained for{' '}
              <strong>6 years</strong> following order completion to satisfy
              Nigerian statutory commercial and accounting record-keeping
              requirements.
            </li>
            <li>
              <strong>Security &amp; Audit Logs:</strong> System audit logs
              recording logins, administrative moderation, and status changes
              are retained for <strong>2 years</strong> for cybersecurity
              monitoring and threat analysis.
            </li>
            <li>
              <strong>Deactivated Accounts:</strong> When an account is closed,
              personal profile data is removed or pseudonymized within{' '}
              <strong>30 days</strong>, provided all outstanding orders and
              disputes have been resolved.
            </li>
            <li>
              <strong>Uncompleted Cart Sessions:</strong> Guest and unsubmitted
              cart items are cleared automatically after 30 days of inactivity.
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section id="user-rights">
          <h2 style={sectionHeadingStyle}>6. Your Rights Under NDPA 2023</h2>
          <p style={paragraphStyle}>
            As a data subject in Nigeria, you have specific enforceable legal
            rights regarding your personal data:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Right to Access (Section 34):</strong> You may request a
              copy of the personal data we hold about you at any time.
            </li>
            <li>
              <strong>Right to Rectification (Section 35):</strong> You have the
              right to correct inaccurate, incomplete, or outdated information
              directly via your account profile or by contacting our team.
            </li>
            <li>
              <strong>Right to Erasure / Deletion (Section 36):</strong> You may
              request the deletion of your personal data where there is no
              continuing legal or contractual justification for its retention.
            </li>
            <li>
              <strong>Right to Restrict or Object to Processing:</strong> You
              may object to the processing of your data for direct marketing or
              specific legitimate interest operations.
            </li>
            <li>
              <strong>Right to Lodge a Complaint:</strong> If you believe your
              data has been processed unlawfully, you have the right to lodge a
              complaint with the Nigeria Data Protection Commission (NDPC).
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section id="data-security">
          <h2 style={sectionHeadingStyle}>
            7. Security Safeguards &amp; Encryption
          </h2>
          <p style={paragraphStyle}>
            In compliance with Non-Functional Requirements{' '}
            <strong>NFR-SEC-01 through NFR-SEC-12</strong>, we implement
            enterprise-grade security safeguards:
          </p>
          <ul style={listStyle}>
            <li>
              Transport Layer Security (TLS/HTTPS) for all data in transit
              across the platform.
            </li>
            <li>
              Robust password hashing using modern cryptographic algorithms
              (bcrypt).
            </li>
            <li>
              Role-Based Access Control (RBAC) ensuring buyers, sellers, and
              administrators only access permissible data.
            </li>
            <li>
              Session token invalidation upon logout and session expiration
              guards (SRS AUTH-05).
            </li>
            <li>
              Parameterized database queries to prevent SQL injection
              vulnerabilities (OWASP ASVS compliance).
            </li>
          </ul>
        </section>

        {/* Section 8 */}
        <section id="cookies-tracking">
          <h2 style={sectionHeadingStyle}>8. Cookies &amp; Session Storage</h2>
          <p style={paragraphStyle}>
            We use secure client-side session cookies and local storage tokens
            strictly necessary to maintain your login state, preserve your
            shopping cart items between page refreshes, and store your interface
            preferences. We do not use third-party behavioral tracking cookies.
          </p>
        </section>

        {/* Section 9 */}
        <section id="dpo-contact">
          <h2 style={sectionHeadingStyle}>
            9. Data Protection Officer (DPO) Contact
          </h2>
          <p style={paragraphStyle}>
            If you wish to exercise your data subject rights, submit an access
            or deletion request, or have questions regarding our privacy
            practices, please contact our Data Protection Officer:
          </p>
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              marginTop: '0.75rem',
              lineHeight: 1.6,
              fontSize: '0.9rem',
              color: '#334155',
            }}
          >
            <div>
              <strong>Data Protection Officer</strong>
            </div>
            <div>Vegetable Joint (TriNova Technologies)</div>
            <div>
              Email:{' '}
              <a
                href="mailto:privacy@vegetablejoint.ng"
                style={{ color: '#15803d', fontWeight: 600 }}
              >
                privacy@vegetablejoint.ng
              </a>
            </div>
            <div>
              Support Desk:{' '}
              <a
                href="mailto:support@vegetablejoint.ng"
                style={{ color: '#15803d', fontWeight: 600 }}
              >
                support@vegetablejoint.ng
              </a>
            </div>
            <div>Helpline: +234 800 000 0000</div>
            <div>Address: Lagos, Nigeria</div>
          </div>
        </section>
      </div>
    </PolicyLayout>
  );
}

export default PrivacyNotice;
