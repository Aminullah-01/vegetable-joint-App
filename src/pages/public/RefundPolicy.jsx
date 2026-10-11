import { PolicyLayout } from './PolicyLayout';

const TOC = [
  {
    id: 'perishable-nature',
    title: '1. Perishable Goods & Agricultural Scope',
  },
  { id: 'inspection-delivery', title: '2. Immediate Inspection on Delivery' },
  { id: 'eligible-claims', title: '3. Eligible Refund & Dispute Scenarios' },
  {
    id: 'reporting-windows',
    title: '4. Reporting Windows & Evidence Requirements',
  },
  {
    id: 'dispute-workflow',
    title: '5. Dispute Resolution Workflow (Release 1.0)',
  },
  { id: 'refund-methods', title: '6. Settlement & Refund Methods' },
  { id: 'non-refundable', title: '7. Ineligible / Non-Refundable Scenarios' },
  {
    id: 'seller-accountability',
    title: '8. Seller Moderation & Quality Sanctions',
  },
  { id: 'contact-support', title: '9. Dispute Support & Contact' },
];

/**
 * RefundPolicy — Refund, Return & Dispute Policy Page
 * Conforms to SRS OI-11 (Manual, out-of-platform dispute policy for perishable goods in 1.0) and Task FE-053
 */
export function RefundPolicy() {
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
      title="Refund & Dispute Policy"
      subtitle="Procedures, reporting timeframes, and dispute mediation rules for perishable agricultural vegetables on Vegetable Joint."
      lastUpdated="February 2026"
      badge="Perishable Goods & Disputes (SRS OI-11)"
      tableOfContents={TOC}
    >
      <div className="refund-policy-document" data-testid="refund-policy-page">
        {/* Section 1 */}
        <section id="perishable-nature">
          <h2 style={sectionHeadingStyle}>
            1. Perishable Goods &amp; Agricultural Scope
          </h2>
          <p style={paragraphStyle}>
            All produce listed on <strong>Vegetable Joint</strong> consists of
            freshly harvested, perishable agricultural commodities, including
            leafy greens (such as ugwu, waterleaf, spinach, and cabbage),
            tomatoes, peppers, onions, carrots, cucumbers, and legumes.
          </p>
          <p style={paragraphStyle}>
            Due to the organic, temperature-sensitive nature of fresh farm
            produce in Nigerian climatic conditions, standard retail return
            policies for non-perishable goods cannot be applied. Once fresh
            produce is harvested, dispatched, and received, its quality depends
            heavily on rapid consumption or proper cold/dry storage. This policy
            outlines clear, fair guidelines to protect both buyers and
            hard-working farmers.
          </p>
        </section>

        {/* Section 2 */}
        <section id="inspection-delivery">
          <h2 style={sectionHeadingStyle}>
            2. Immediate Inspection on Delivery
          </h2>
          <p style={paragraphStyle}>
            <strong>
              Buyers are strongly advised to inspect all vegetables immediately
              upon delivery or pickup.
            </strong>
          </p>
          <p style={paragraphStyle}>
            If you notice that the delivered produce is severely damaged,
            decayed, rotten, or manifestly does not correspond to the order
            placed, you have the right to point out the defect to the delivery
            courier or seller immediately and decline acceptance of the affected
            portion.
          </p>
        </section>

        {/* Section 3 */}
        <section id="eligible-claims">
          <h2 style={sectionHeadingStyle}>
            3. Eligible Refund &amp; Dispute Scenarios
          </h2>
          <p style={paragraphStyle}>
            You may lodge a dispute or request replacement/refund under the
            following verified circumstances:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Severe Spoilage / Decay:</strong> Vegetables arrived
              rotten, mouldy, infested, or unfit for consumption at the time of
              delivery.
            </li>
            <li>
              <strong>Incorrect Variety Delivered:</strong> The seller delivered
              an entirely different vegetable variety (e.g. delivered bell
              peppers instead of scotch bonnet, or waterleaf instead of fluted
              pumpkin).
            </li>
            <li>
              <strong>Missing Items / Short-Shipment:</strong> Line items or
              quantities confirmed in your order were omitted without prior
              notice or credit.
            </li>
            <li>
              <strong>Severe Transit Crushing:</strong> Poor packaging or rough
              transit resulted in crushed or pulped produce (such as crushed
              tomato baskets) rendering them unusable.
            </li>
            <li>
              <strong>Seller Non-Fulfillment:</strong> The seller confirmed the
              order but failed to harvest, dispatch, or coordinate delivery
              within the agreed fulfillment period.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="reporting-windows">
          <h2 style={sectionHeadingStyle}>
            4. Reporting Windows &amp; Evidence Requirements
          </h2>
          <p style={paragraphStyle}>
            To protect sellers against post-delivery deterioration caused by
            improper storage, claims must be reported within strict time
            windows:
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#166534',
                  marginBottom: '0.25rem',
                }}
              >
                🥬 Leafy Greens &amp; Cut Produce
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#15803d',
                  fontWeight: 600,
                }}
              >
                Within 4 Hours of Delivery
              </div>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#334155',
                  margin: '0.25rem 0 0',
                }}
              >
                Ugwu, spinach, scent leaves, waterleaf, and fresh herbs wilt
                rapidly in ambient heat.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '0.25rem',
                }}
              >
                🍅 Hardy &amp; Root Vegetables
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  fontWeight: 600,
                }}
              >
                Within 24 Hours of Delivery
              </div>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: '#334155',
                  margin: '0.25rem 0 0',
                }}
              >
                Roma tomatoes, scotch bonnets, onions, carrots, cucumbers,
                cabbage, and potatoes.
              </p>
            </div>
          </div>
          <p style={paragraphStyle}>
            <strong>Required Evidence:</strong> All dispute claims must be
            accompanied by:
          </p>
          <ul style={listStyle}>
            <li>
              The Vegetable Joint Order Reference (e.g.{' '}
              <code>VJ-20260210-001</code>).
            </li>
            <li>
              Clear, well-lit photos or a short video demonstrating the defect
              alongside the delivery packaging.
            </li>
            <li>
              A concise description of the issue (e.g. &quot;3 out of 5 baskets
              crushed and spoiled&quot;).
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section id="dispute-workflow">
          <h2 style={sectionHeadingStyle}>
            5. Dispute Resolution Workflow (Release 1.0)
          </h2>
          <p style={paragraphStyle}>
            In Release 1.0 (MVP), dispute settlement is managed through a prompt
            four-step manual mediation workflow (pursuant to SRS Open Issue{' '}
            <strong>OI-11</strong>):
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: '4px solid #15803d',
              }}
            >
              <strong style={{ color: '#0f172a' }}>
                Step 1: Direct Seller Resolution
              </strong>
              <p
                style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.875rem',
                  color: '#475569',
                }}
              >
                The buyer contacts the seller directly using the seller phone
                number provided on the order confirmation and seller profile
                page. Most issues are swiftly resolved by the seller sending
                replacement vegetables or adjusting settlement fees.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: '4px solid #3b82f6',
              }}
            >
              <strong style={{ color: '#0f172a' }}>
                Step 2: Escalation to Vegetable Joint Support
              </strong>
              <p
                style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.875rem',
                  color: '#475569',
                }}
              >
                If the seller is unreachable within 12 hours or refuses to
                address a valid, evidence-backed complaint, the buyer escalates
                the case to Vegetable Joint Support at{' '}
                <a
                  href="mailto:support@vegetablejoint.ng"
                  style={{ color: '#15803d', fontWeight: 600 }}
                >
                  support@vegetablejoint.ng
                </a>{' '}
                or via helpline with order details and photos.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              <strong style={{ color: '#0f172a' }}>
                Step 3: Platform Investigation &amp; Mediation
              </strong>
              <p
                style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.875rem',
                  color: '#475569',
                }}
              >
                A platform administrator reviews the photographic evidence
                against the product listing specifications and order timestamps.
                The administrator contacts the seller to mandate an appropriate
                settlement (direct refund or replacement delivery).
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: '4px solid #ef4444',
              }}
            >
              <strong style={{ color: '#0f172a' }}>
                Step 4: Seller Moderation &amp; Enforcement
              </strong>
              <p
                style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.875rem',
                  color: '#475569',
                }}
              >
                Sellers who refuse legitimate refunds or repeatedly supply
                substandard produce are subject to administrative reprimands,
                listing suspension, or permanent account deactivation under
                platform moderation rules (SRS ADM-03).
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section id="refund-methods">
          <h2 style={sectionHeadingStyle}>
            6. Settlement &amp; Refund Methods
          </h2>
          <p style={paragraphStyle}>
            When a refund or financial adjustment is approved:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Direct Bank Reversal / Transfer:</strong> The seller
              refunds the buyer directly via electronic Nigerian bank transfer
              (NIP) within 24–48 hours of resolution.
            </li>
            <li>
              <strong>Credit for Next Order:</strong> Upon mutual agreement, the
              seller may issue an equivalent produce credit applied toward the
              buyer&apos;s next harvest order.
            </li>
            <li>
              <strong>Partial Adjustments:</strong> For mixed orders where only
              specific units were affected, refunds are calculated pro-rata
              based on the stated unit price of the affected items.
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section id="non-refundable">
          <h2 style={sectionHeadingStyle}>
            7. Ineligible / Non-Refundable Scenarios
          </h2>
          <p style={paragraphStyle}>
            Disputes will not be approved under the following conditions:
          </p>
          <ul style={listStyle}>
            <li>
              Claims submitted beyond the mandatory 4-hour (greens) or 24-hour
              (hardy) inspection window.
            </li>
            <li>
              Produce deterioration resulting from improper buyer storage (e.g.
              leaving tomatoes in direct sunlight or sealed humid plastic bags).
            </li>
            <li>
              Natural cosmetic irregularities (e.g. minor skin blemishes, shape
              differences) that do not compromise culinary quality or freshness.
            </li>
            <li>
              Buyer change of mind after the seller has harvested and dispatched
              fresh crops.
            </li>
            <li>
              Deliveries delayed or failed due to incorrect phone numbers or
              unreachable recipients provided by the buyer.
            </li>
          </ul>
        </section>

        {/* Section 8 */}
        <section id="seller-accountability">
          <h2 style={sectionHeadingStyle}>
            8. Seller Moderation &amp; Quality Sanctions
          </h2>
          <p style={paragraphStyle}>
            Vegetable Joint monitors seller dispute rates as part of our
            verified seller program. Sellers maintaining a dispute rate above 5%
            of monthly orders receive quality warnings and face probation.
            Sellers who deliberately sell rotten produce or defraud buyers are
            permanently banned from the platform.
          </p>
        </section>

        {/* Section 9 */}
        <section id="contact-support">
          <h2 style={sectionHeadingStyle}>9. Dispute Support &amp; Contact</h2>
          <p style={paragraphStyle}>
            Need assistance with an active order or unresolved seller dispute?
            Reach out to our dedicated resolution desk:
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
              <strong>Dispute Mediation Desk</strong>
            </div>
            <div>Vegetable Joint Marketplace</div>
            <div>
              Email:{' '}
              <a
                href="mailto:support@vegetablejoint.ng"
                style={{ color: '#15803d', fontWeight: 600 }}
              >
                support@vegetablejoint.ng
              </a>
            </div>
            <div>Helpline: +234 800 000 0000</div>
            <div>
              Operating Hours: Monday – Saturday, 8:00 AM – 6:00 PM (WAT)
            </div>
          </div>
        </section>
      </div>
    </PolicyLayout>
  );
}

export default RefundPolicy;
