import type { Metadata } from "next";
import Link from "next/link";
import {
  PolicyLayout,
  policyStyles as styles,
} from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Refund & Streaming Policy",
  description:
    "Refund eligibility and streaming verification for Mysteries in Motion Online purchases.",
};

const sections = [
  { id: "rule", label: "The refund rule" },
  { id: "streaming", label: "How streaming is determined" },
  { id: "eligible", label: "Eligible requests" },
  { id: "not-eligible", label: "Requests that are not eligible" },
  { id: "request", label: "How to request review" },
  { id: "processing", label: "Review and payment processing" },
  { id: "law", label: "Rights required by law" },
];

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      eyebrow="Purchase protection"
      title="Refund & Streaming Policy"
      summary="The refund rule is based on whether the purchased show began streaming to the customer account."
      sections={sections}
    >
      <section className={styles.section} id="rule">
        <h2>1. The refund rule</h2>
        <div className={styles.policyCallout}>
          <strong>
            A refund is available only when our available records establish
            that streaming of the purchased show did not begin.
          </strong>
          Once any portion of the purchased show begins streaming, the purchase
          is not refundable, except where applicable law requires otherwise.
        </div>
        <p>
          This policy applies separately to each $10 show purchase. Starting a
          different show does not affect the eligibility of the show under
          review.
        </p>
        <p>
          A show must normally be started within one year of purchase. Its
          first successful stream opens the 48-hour replay window described in
          the <Link href="/terms">Terms of Use</Link>. The end of that window is
          not refundable because the window starts only after streaming begins.
          Expiration of unused access does not create an automatic refund;
          records must still establish that no portion of that purchased show
          streamed.
        </p>
      </section>

      <section className={styles.section} id="streaming">
        <h2>2. How streaming is determined</h2>
        <p>
          We may review application, account, session, and Cloudflare delivery
          records associated with the purchase and reported play attempt. These
          records can include:
        </p>
        <ul>
          <li>the show and account entitlement involved;</li>
          <li>the date and time playback was requested;</li>
          <li>
            whether Introduction, Act One, Intermission video, or Act Two media
            began delivery or playback;
          </li>
          <li>saved playback position and gameplay progress;</li>
          <li>unlocked clues, intermission entry, or submitted answers; and</li>
          <li>technical error and content-delivery logs.</li>
        </ul>
        <p>
          Opening a show&apos;s briefing page by itself is not proof that video
          streamed. A video-delivery or playback record showing that any portion
          of purchased show media began is evidence that streaming took place.
        </p>
      </section>

      <section className={styles.section} id="eligible">
        <h2>3. Eligible requests</h2>
        <p>
          A purchase is eligible when our available records reasonably confirm
          that no portion of the purchased show began streaming. Examples can
          include:
        </p>
        <ul>
          <li>
            the customer purchased the wrong show but did not begin streaming
            it;
          </li>
          <li>
            a verified account or service error prevented video delivery before
            playback began; or
          </li>
          <li>
            a duplicate transaction occurred and the duplicate entitlement was
            never used to begin streaming.
          </li>
        </ul>
      </section>

      <section className={styles.section} id="not-eligible">
        <h2>4. Requests that are not eligible</h2>
        <p>
          Unless applicable law requires otherwise, a refund is not available
          when records show that any portion of the show began streaming,
          including when:
        </p>
        <ul>
          <li>the customer changed their mind after playback began;</li>
          <li>
            the customer did not like the story, performance, difficulty,
            questions, score, or detective level;
          </li>
          <li>
            playback began but the customer later experienced a device,
            browser, internet, or audio problem;
          </li>
          <li>
            the customer paused, exited, refreshed, or did not finish the show;
          </li>
          <li>
            the purchase&apos;s 48-hour replay window ended after streaming
            began;
          </li>
          <li>
            another person used the customer&apos;s account to begin playback;
            or
          </li>
          <li>the customer has already replayed or completed the show.</li>
        </ul>
        <p>
          Support may still help recover progress or troubleshoot playback even
          when a purchase is not refundable.
        </p>
      </section>

      <section className={styles.section} id="request">
        <h2>5. How to request review</h2>
        <p>
          Use the contact method on the{" "}
          <Link href="/support">Customer Support page</Link> and provide:
        </p>
        <ul>
          <li>the email address used to purchase;</li>
          <li>the mystery title;</li>
          <li>the approximate purchase and attempted-playback time;</li>
          <li>a short description of what happened; and</li>
          <li>any error message or screenshot that may help investigation.</li>
        </ul>
        <p>
          Do not send a full payment-card number, sign-in code, or password.
        </p>
      </section>

      <section className={styles.section} id="processing">
        <h2>6. Review and payment processing</h2>
        <p>
          We may verify the requester&apos;s control of the purchasing account
          and compare the request with application and content-delivery records.
          Approved refunds will be returned through the original payment method
          when possible. The payment processor and card issuer control when the
          credit appears.
        </p>
        <p>
          Refunding, reversing, or disputing a purchase removes or may suspend
          access associated with that transaction. We may request additional
          information when available records are incomplete or inconsistent.
        </p>
      </section>

      <section className={styles.section} id="law">
        <h2>7. Rights required by law</h2>
        <p>
          Nothing in this policy limits a refund, cancellation right, warranty,
          or other consumer remedy that cannot lawfully be limited. This draft
          should be reviewed for the locations where the Service will be sold
          before international sales are enabled.
        </p>
      </section>
    </PolicyLayout>
  );
}
