import type { Metadata } from "next";
import Link from "next/link";
import {
  PolicyLayout,
  policyStyles as styles,
} from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Mysteries in Motion Online collects, uses, shares, protects, and retains customer information.",
};

const sections = [
  { id: "scope", label: "Scope" },
  { id: "collect", label: "Information we collect" },
  { id: "use", label: "How we use information" },
  { id: "providers", label: "Service providers" },
  { id: "ai", label: "AI-assisted grading" },
  { id: "cookies", label: "Cookies and browser storage" },
  { id: "sharing", label: "When information is disclosed" },
  { id: "retention", label: "Retention" },
  { id: "security", label: "Security" },
  { id: "rights", label: "Your choices and rights" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Policy changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  return (
    <PolicyLayout
      eyebrow="Your information"
      title="Privacy Policy"
      summary="This policy explains the information needed to run customer accounts, deliver purchased mysteries, save game history, and provide support."
      sections={sections}
    >
      <section className={styles.section} id="scope">
        <h2>1. Scope</h2>
        <p>
          This policy applies to Mysteries in Motion Online, operated by
          Grapevine Escape, including the current site at{" "}
          <strong>online-mystery.onrender.com</strong> and the intended future
          site at <strong>play.inmotionmysteries.com</strong>.
        </p>
        <p>
          It does not govern a third party&apos;s separate website or service.
          When a provider processes information for this Service, its own terms
          and privacy commitments also apply.
        </p>
      </section>

      <section className={styles.section} id="collect">
        <h2>2. Information we collect</h2>
        <h3>Account and authentication information</h3>
        <ul>
          <li>Email address and email-verification status</li>
          <li>Account role and, if added, display name</li>
          <li>
            Hashed session identifiers, session dates, and sign-in security
            records
          </li>
          <li>
            Short-lived email sign-in codes, which expire ten minutes after
            issuance
          </li>
        </ul>

        <h3>Purchase and entitlement information</h3>
        <ul>
          <li>Show purchased, price, currency, status, and transaction dates</li>
          <li>
            Payment-processor references and records needed for access,
            refunds, disputes, fraud prevention, and accounting
          </li>
          <li>
            Complimentary access, refund, dispute, or access-revocation status
          </li>
          <li>
            The deadline to begin a show and the start and end of its 48-hour
            replay window
          </li>
        </ul>
        <p>
          When Square payments are activated, payment-card information will be
          collected by Square. We do not need to store a customer&apos;s full
          card number in the application database.
        </p>

        <h3>Gameplay information</h3>
        <ul>
          <li>
            Show progress, current stage, playback position, and unlocked clues
          </li>
          <li>Accusation answers, selected choices, and written responses</li>
          <li>
            Scoring method, grading result, points, percentage, detective level,
            and completion date
          </li>
          <li>
            Playthrough history, including the number and dates of submissions
          </li>
          <li>
            Technical evidence needed to determine whether show media began
            streaming for a refund request
          </li>
        </ul>

        <h3>Technical and support information</h3>
        <ul>
          <li>
            IP address, browser/device information, request time, requested
            page, error details, and security logs produced by our hosting,
            content-delivery, and payment providers
          </li>
          <li>
            Support messages and any screenshots or troubleshooting details you
            choose to provide
          </li>
        </ul>
        <p>
          Please do not send full payment-card numbers, passwords, or unrelated
          sensitive information in written answers or support requests.
        </p>
      </section>

      <section className={styles.section} id="use">
        <h2>3. How we use information</h2>
        <p>We use information to:</p>
        <ul>
          <li>create and secure accounts and deliver sign-in codes;</li>
          <li>process purchases and confirm access to the selected show;</li>
          <li>
            operate playback, clue unlocks, intermission, scoring, replay, and
            play-history features;
          </li>
          <li>grade submitted answers and award detective levels;</li>
          <li>
            provide customer support and evaluate streaming-based refund
            eligibility;
          </li>
          <li>diagnose errors, protect the Service, and prevent misuse;</li>
          <li>comply with legal, tax, accounting, and payment obligations; and</li>
          <li>maintain and improve the reliability of the Service.</li>
        </ul>
        <p>
          As of this effective date, the application does not intentionally
          include a separate behavioral-advertising tracker.
        </p>
      </section>

      <section className={styles.section} id="providers">
        <h2>4. Service providers</h2>
        <p>
          We provide only the information reasonably needed for each provider
          to perform its role:
        </p>
        <ul className={styles.serviceList}>
          <li>
            <strong>Render</strong>
            Hosts the application and PostgreSQL database. It may process
            account, gameplay, transaction-reference, and technical log data.{" "}
            <a href="https://render.com/privacy">Render Privacy Policy</a>
          </li>
          <li>
            <strong>Resend</strong>
            Delivers email sign-in codes and may process the recipient email,
            message content, delivery status, and email-delivery logs.{" "}
            <a href="https://resend.com/legal/privacy-policy">
              Resend Privacy Policy
            </a>
          </li>
          <li>
            <strong>Cloudflare Stream and R2</strong>
            Deliver show videos, clue files, images, and audio. Cloudflare may
            process IP addresses, request metadata, and delivery/security logs.{" "}
            <a href="https://www.cloudflare.com/privacypolicy/">
              Cloudflare Privacy Policy
            </a>
          </li>
          <li>
            <strong>OpenAI</strong>
            Processes the limited question and answer information described in
            the AI section when AI-assisted grading is configured.{" "}
            <a href="https://platform.openai.com/docs/models/default-usage-policies-by-endpoint">
              OpenAI API Data Controls
            </a>
          </li>
          <li>
            <strong>Square — planned, not yet active</strong>
            Will process checkout, payment, fraud-prevention, refund, and
            dispute information when purchasing is launched.{" "}
            <a href="https://squareup.com/us/en/legal/general/privacy">
              Square Privacy Notice
            </a>
          </li>
        </ul>
      </section>

      <section className={styles.section} id="ai">
        <h2>5. AI-assisted grading</h2>
        <p>
          AI processing occurs only for a written-answer question configured by
          an administrator as <strong>AI Assisted</strong>. The Service sends
          OpenAI:
        </p>
        <ul>
          <li>the question;</li>
          <li>the configured accepted answers;</li>
          <li>the optional grading rubric; and</li>
          <li>the player&apos;s written answer.</li>
        </ul>
        <p>
          The grading request does not intentionally include the player&apos;s
          account email or payment information. We request that OpenAI not store
          the response as application state. OpenAI&apos;s published API data
          controls state that API data is not used to train models unless the
          API account opts in, and that abuse-monitoring logs may ordinarily be
          retained for up to 30 days.
        </p>
        <p>
          We store the answer, result, grading method, and a short grading reason
          with the playthrough so the customer can receive a score and the
          result can be investigated. If AI is unavailable, configured
          accepted-answer matching may be used instead.
        </p>
      </section>

      <section className={styles.section} id="cookies">
        <h2>6. Cookies and browser storage</h2>
        <p>
          The Service uses an essential, secure session cookie to keep a
          customer signed in. The cookie is not an advertising cookie. An
          authenticated session can last up to 30 days unless the customer
          signs out or the session is invalidated.
        </p>
        <p>
          Browser storage may be used for temporary interface or playback
          state. Disabling essential cookies can prevent account and gameplay
          features from working.
        </p>
      </section>

      <section className={styles.section} id="sharing">
        <h2>7. When information is disclosed</h2>
        <p>
          We do not sell customer personal information for money. We may
          disclose information:
        </p>
        <ul>
          <li>to the service providers described above;</li>
          <li>when you direct or authorize us to do so;</li>
          <li>
            to comply with law, court orders, subpoenas, or valid governmental
            requests;
          </li>
          <li>
            to investigate fraud, payment disputes, security incidents,
            prohibited content use, or threats to users and the Service;
          </li>
          <li>
            to establish, exercise, or defend legal rights and enforce
            agreements; or
          </li>
          <li>
            as part of a merger, financing, sale, or transfer of the relevant
            business, subject to appropriate safeguards.
          </li>
        </ul>
      </section>

      <section className={styles.section} id="retention">
        <h2>8. Retention</h2>
        <p>
          We retain account, purchase entitlement, and play-history information
          while needed to provide account access, replay, and result-history
          features. Transaction and refund/dispute records may be retained
          longer when reasonably necessary for accounting, tax, fraud
          prevention, legal compliance, or dispute resolution.
        </p>
        <p>
          Login codes stop working after ten minutes. Sessions expire after no
          more than 30 days under the current configuration. Related security
          and delivery records may remain temporarily for fraud prevention,
          troubleshooting, and service integrity.
        </p>
        <p>
          Support records are retained for as long as reasonably needed to
          resolve the request and document the outcome. Provider logs are
          retained according to the provider&apos;s settings and policies. We
          may retain de-identified or aggregated information that no longer
          identifies a customer.
        </p>
      </section>

      <section className={styles.section} id="security">
        <h2>9. Security</h2>
        <p>
          We use measures designed to protect customer information, including
          hashed session tokens, HTTP-only secure cookies in production,
          time-limited sign-in codes, access checks for purchased shows, and
          established hosting and content-delivery providers.
        </p>
        <p>
          No online system can guarantee absolute security. Customers should
          protect access to their email account, avoid sharing sign-in codes,
          sign out on shared devices, and notify support of suspected
          unauthorized access.
        </p>
      </section>

      <section className={styles.section} id="rights">
        <h2>10. Your choices and privacy rights</h2>
        <p>
          Depending on where you live, you may have rights to request access,
          correction, deletion, or a portable copy of personal information, or
          to object to or restrict certain processing. We may need to verify
          that a request concerns your own account.
        </p>
        <p>
          Some information cannot be deleted immediately when it must be kept
          for a transaction, tax record, fraud investigation, legal claim, or
          other legal obligation. Deleting account information can remove
          access to purchased shows and play history.
        </p>
        <p>
          The Texas Attorney General publishes an overview of the{" "}
          <a href="https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/texas-data-privacy-and-security-act">
            Texas Data Privacy and Security Act
          </a>
          , including access, correction, deletion, portability, and certain
          opt-out rights where the law applies.
        </p>
        <p>
          Use the <Link href="/support">Customer Support page</Link> to submit a
          privacy request once the monitored support address is published.
        </p>
      </section>

      <section className={styles.section} id="children">
        <h2>11. Children</h2>
        <p>
          The Service is designed for an adult account holder to purchase and
          supervise a private play session. It is not intended to collect
          personal information directly from children. A parent or guardian who
          believes a child submitted personal information should contact us so
          the request can be reviewed.
        </p>
      </section>

      <section className={styles.section} id="changes">
        <h2>12. Changes to this policy</h2>
        <p>
          We may update this policy when features or providers change. We will
          update the effective date and provide reasonable additional notice
          when a material change warrants it.
        </p>
      </section>

      <section className={styles.section} id="contact">
        <h2>13. Contact</h2>
        <p>
          Privacy and account requests can be submitted through the contact
          method listed on the <Link href="/support">Customer Support page</Link>.
        </p>
        <div className={styles.contactPlaceholder}>
          <strong>Owner action required before payment launch</strong>
          Add a monitored privacy/support email address. No address has been
          inserted into this draft because one has not been verified.
        </div>
      </section>
    </PolicyLayout>
  );
}
