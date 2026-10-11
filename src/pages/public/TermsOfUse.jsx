import { PolicyLayout } from './PolicyLayout';

const TOC = [
  { id: 'introduction', title: '1. Introduction & Marketplace Model' },
  { id: 'accounts', title: '2. User Accounts & Registration Eligibility' },
  { id: 'seller-standards', title: '3. Seller Listing & Produce Standards' },
  { id: 'ordering-fulfillment', title: '4. Order Placement & Fulfillment' },
  { id: 'payments-settlement', title: '5. Pricing & Settlement' },
  { id: 'buyer-responsibilities', title: '6. Buyer Responsibilities' },
  {
    id: 'prohibited-conduct',
    title: '7. Prohibited Conduct & Marketplace Integrity',
  },
  { id: 'intellectual-property', title: '8. Intellectual Property' },
  {
    id: 'liability-disclaimers',
    title: '9. Limitation of Liability & Agricultural Disclaimers',
  },
  { id: 'governing-law', title: '10. Governing Law & Dispute Resolution' },
];

/**
 * TermsOfUse — Platform Terms of Use Page
 * SRS Reference: Section 4.1.2 (Static policy pages), Task FE-053
 */
export function TermsOfUse() {
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
      title="Terms of Use"
      subtitle="These Terms of Use govern your access to and use of Vegetable Joint, a multi-vendor digital vegetable marketplace connecting Nigerian farmers, vegetable sellers, and buyers."
      lastUpdated="February 2026"
      badge="Legal Agreement"
      tableOfContents={TOC}
    >
      <div className="terms-of-use-document" data-testid="terms-of-use-page">
        {/* Section 1 */}
        <section id="introduction">
          <h2 style={sectionHeadingStyle}>
            1. Introduction & Marketplace Model
          </h2>
          <p style={paragraphStyle}>
            Welcome to <strong>Vegetable Joint</strong> (&quot;the
            Platform&quot;), operated by TriNova Technologies (&quot;we&quot;,
            &quot;our&quot;, or &quot;us&quot;). Vegetable Joint is an
            electronic agricultural commerce platform designed to bridge the gap
            between fresh vegetable producers—including smallholder farmers,
            cooperative associations, and commercial agricultural vendors—and
            buyers across Nigeria, such as households, caterers, food vendors,
            restaurants, and retailers.
          </p>
          <p style={paragraphStyle}>
            By accessing, browsing, registering for, or transacting on the
            Platform, you acknowledge that you have read, understood, and agreed
            to be bound by these Terms of Use, our Privacy Notice, and our
            Refund &amp; Dispute Policy. If you do not agree with any provision
            of these terms, you must cease using the Platform immediately.
          </p>
        </section>

        {/* Section 2 */}
        <section id="accounts">
          <h2 style={sectionHeadingStyle}>
            2. User Accounts &amp; Registration Eligibility
          </h2>
          <p style={paragraphStyle}>
            The Platform provides role-based access for two distinct user types:{' '}
            <strong>Buyers</strong> and <strong>Sellers</strong>, alongside
            administrative oversight by platform operators:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Eligibility:</strong> You must be at least 18 years of age
              and legally competent to enter into binding contracts under
              Nigerian law to register an account.
            </li>
            <li>
              <strong>Account Accuracy:</strong> You agree to provide true,
              accurate, current, and complete personal and business information
              during registration (including full name, phone number, email
              address, and farm/vendor location) and to maintain such
              information accurately.
            </li>
            <li>
              <strong>Account Security:</strong> You are solely responsible for
              safeguarding your login credentials (email and password). Any
              activities, orders, or transactions conducted through your account
              are deemed authorized by you.
            </li>
            <li>
              <strong>Seller Onboarding &amp; Approval:</strong> Seller
              registrations are subject to administrative review. Sellers may
              not publish product listings to the public marketplace until their
              seller profile has been verified and approved by administrators
              (pursuant to SRS SEL-01 and ADM-03).
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section id="seller-standards">
          <h2 style={sectionHeadingStyle}>
            3. Seller Listing &amp; Produce Standards
          </h2>
          <p style={paragraphStyle}>
            Sellers are entrusted with providing high-quality, authentic
            agricultural produce to buyers. By listing vegetables on the
            Platform, sellers agree to:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Produce Authenticity:</strong> List exclusively edible,
              safe, fresh vegetable produce and related agricultural crops (such
              as tomatoes, peppers, leafy greens, onions, cucumbers, and
              legumes).
            </li>
            <li>
              <strong>Accurate Specifications:</strong> Provide truthful
              descriptions, authentic crop photos, and clear pricing stated in
              Nigerian Naira (₦) with standardized units (e.g. basket, bunch,
              bag, kilogram, piece, crate).
            </li>
            <li>
              <strong>Real-Time Stock Inventory:</strong> Maintain accurate
              stock quantities. When a product listing is depleted, the seller
              must promptly update the inventory or mark it as out-of-stock to
              prevent order failure (SRS SEL-08).
            </li>
            <li>
              <strong>Administrative Moderation:</strong> Vegetable Joint
              reserves the right to unpublish, edit, or remove listings that
              fail quality checks, misrepresent produce, or violate fair pricing
              standards (SRS ADM-04).
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="ordering-fulfillment">
          <h2 style={sectionHeadingStyle}>
            4. Order Placement &amp; Fulfillment
          </h2>
          <p style={paragraphStyle}>
            When a buyer adds produce to their cart and completes checkout:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Multi-Vendor Order Separation:</strong> Because sellers
              operate independently across different farms and market hubs (e.g.
              Ketu Mile 12, Gombe, Kano, Plateau), checkout automatically groups
              line items into separate orders per seller (SRS CHK-05).
            </li>
            <li>
              <strong>Order Confirmation:</strong> Upon order submission, the
              seller receives immediate notification to review, confirm,
              process, and prepare the ordered produce for delivery or pickup
              (SRS SEL-10, SEL-11).
            </li>
            <li>
              <strong>Fulfillment Commitment:</strong> Confirmed orders
              constitute a binding commercial commitment by the seller to
              harvest, package, and provide the stated produce within the
              mutually agreed timeline.
            </li>
            <li>
              <strong>Stock Deduction &amp; Cancellation:</strong> Stock is
              reserved upon order placement. If an order is cancelled prior to
              dispatch, available stock is automatically restored to the seller
              inventory (SRS ORD-03).
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section id="payments-settlement">
          <h2 style={sectionHeadingStyle}>5. Pricing &amp; Settlement</h2>
          <p style={paragraphStyle}>In Release 1.0 (MVP) of Vegetable Joint:</p>
          <ul style={listStyle}>
            <li>
              <strong>Currency:</strong> All prices displayed on the platform
              are in Nigerian Naira (₦) and include applicable produce costs.
              Delivery arrangements and transportation fees are agreed upon
              transparently during checkout.
            </li>
            <li>
              <strong>Settlement Model:</strong> Payment settlement is
              coordinated directly between buyer and seller upon produce
              inspection, via cash on delivery, verified bank transfer, or
              agreed direct vendor settlement.
            </li>
            <li>
              <strong>Price Integrity:</strong> Sellers may not inflate prices
              or demand additional unagreed fees after an order has been
              confirmed by the buyer.
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section id="buyer-responsibilities">
          <h2 style={sectionHeadingStyle}>6. Buyer Responsibilities</h2>
          <p style={paragraphStyle}>
            Buyers play an integral role in ensuring successful fresh produce
            deliveries:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Accurate Delivery Coordinates:</strong> Provide a valid
              delivery address, landmark, recipient name, and reachable phone
              number to facilitate timely delivery.
            </li>
            <li>
              <strong>Immediate Inspection:</strong> Perishable vegetables
              deteriorate quickly in ambient Nigerian heat. Buyers are required
              to inspect delivered vegetables immediately upon drop-off or
              pickup.
            </li>
            <li>
              <strong>Order Acceptance:</strong> Honor confirmed orders promptly
              upon delivery, avoiding arbitrary rejections when produce meets
              the agreed specifications.
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section id="prohibited-conduct">
          <h2 style={sectionHeadingStyle}>
            7. Prohibited Conduct &amp; Marketplace Integrity
          </h2>
          <p style={paragraphStyle}>
            Users shall not engage in any activity that undermines the trust,
            safety, or legal integrity of the marketplace, including:
          </p>
          <ul style={listStyle}>
            <li>
              Listing non-agricultural, counterfeit, toxic, or illegal items.
            </li>
            <li>
              Submitting fraudulent orders or repeatedly failing to collect
              confirmed orders.
            </li>
            <li>
              Harassing, threatening, or defrauding other platform participants.
            </li>
            <li>
              Attempting unauthorized access to administrative systems,
              accounts, or APIs.
            </li>
            <li>
              Scraping platform data or interfering with server infrastructure.
            </li>
          </ul>
          <p style={paragraphStyle}>
            Violations will result in immediate suspension, listing forfeiture,
            and potential referral to relevant law enforcement authorities in
            Nigeria.
          </p>
        </section>

        {/* Section 8 */}
        <section id="intellectual-property">
          <h2 style={sectionHeadingStyle}>8. Intellectual Property</h2>
          <p style={paragraphStyle}>
            All rights, titles, and interests in the Vegetable Joint
            platform—including brand assets, logos, design tokens, software
            code, UI designs, and database schemas—are owned by TriNova
            Technologies. Users are granted a limited, revocable, non-exclusive
            license to access the platform for legitimate vegetable shopping and
            vending purposes.
          </p>
        </section>

        {/* Section 9 */}
        <section id="liability-disclaimers">
          <h2 style={sectionHeadingStyle}>
            9. Limitation of Liability &amp; Agricultural Disclaimers
          </h2>
          <p style={paragraphStyle}>
            Vegetable Joint serves as an agricultural marketplace facilitator
            connecting independent sellers and buyers. While we enforce strict
            seller moderation and produce standards:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Agricultural Nature:</strong> Vegetables are natural
              commodities subject to seasonal variations in shape, size, color,
              and shelf life. Natural cosmetic variations that do not affect
              culinary safety do not constitute defective goods.
            </li>
            <li>
              <strong>Transit &amp; Weather Factors:</strong> Unforeseen transit
              delays caused by regional road closures, adverse weather, or civil
              disruptions are managed through mutual buyer-seller communication
              and dispute mediation.
            </li>
            <li>
              <strong>Liability Cap:</strong> To the maximum extent permitted by
              Nigerian law, our liability arising from any transaction is
              limited to facilitating dispute mediation between the parties.
            </li>
          </ul>
        </section>

        {/* Section 10 */}
        <section id="governing-law">
          <h2 style={sectionHeadingStyle}>
            10. Governing Law &amp; Dispute Resolution
          </h2>
          <p style={paragraphStyle}>
            These Terms of Use shall be governed by, construed, and enforced in
            accordance with the laws of the Federal Republic of Nigeria. In the
            event of any claim, dispute, or controversy arising from these terms
            or marketplace transactions, the parties agree to first seek
            amicable resolution through Vegetable Joint customer support
            mediation before resorting to formal courts of competent
            jurisdiction in Nigeria.
          </p>
        </section>
      </div>
    </PolicyLayout>
  );
}

export default TermsOfUse;
