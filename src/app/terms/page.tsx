import type { Metadata } from "next";
import Link from "next/link";
import {
  PolicyLayout,
  policyStyles as styles,
} from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms governing Mysteries in Motion Online accounts, purchases, streaming, replay, scoring, and content use.",
};

const sections = [
  { id: "service", label: "The service" },
  { id: "accounts", label: "Accounts and team play" },
  { id: "purchases", label: "Purchases and access" },
  { id: "gameplay", label: "Gameplay, scoring, and AI" },
  { id: "content", label: "Content-use rules" },
  { id: "availability", label: "Availability and changes" },
  { id: "conduct", label: "Acceptable use" },
  { id: "disclaimers", label: "Disclaimers and responsibility" },
  { id: "termination", label: "Suspension and termination" },
  { id: "changes", label: "Changes to these terms" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <PolicyLayout
      eyebrow="Customer agreement"
      title="Terms of Use"
      summary="These terms describe the rules for purchasing and playing a Mysteries in Motion Online show."
      sections={sections}
    >
      <section className={styles.section} id="service">
        <h2>1. The service</h2>
        <p>
          Mysteries in Motion Online is a digital entertainment service
          operated by Grapevine Escape. In these terms, “we,” “us,” and “our”
          refer to Grapevine Escape, and “Service” means the website, customer
          accounts, streamed shows, clues, questions, scoring, and related
          features.
        </p>
        <p>
          The Service currently operates at{" "}
          <strong>online-mystery.onrender.com</strong>. The intended future
          customer address is <strong>play.inmotionmysteries.com</strong>.
        </p>
      </section>

      <section className={styles.section} id="accounts">
        <h2>2. Accounts and team play</h2>
        <ul>
          <li>
            You must sign in with an email address you control before purchasing
            or playing a show.
          </li>
          <li>
            You are responsible for activity under your account and for keeping
            sign-in codes and active sessions private.
          </li>
          <li>
            One account may display a purchased show for a private,
            noncommercial household or team play session.
          </li>
          <li>
            You may not publish your sign-in code, lend the account as a shared
            library, resell access, or provide access to unrelated groups.
          </li>
          <li>
            The account holder must be able to enter a binding agreement. A
            minor may participate only under the supervision of a parent,
            guardian, or other responsible adult account holder.
          </li>
        </ul>
      </section>

      <section className={styles.section} id="purchases">
        <h2>3. Purchases and access</h2>
        <p>
          Each show costs <strong>$10.00</strong>, before any tax that we are
          required to collect. A purchase unlocks only the selected show for the
          purchasing account.
        </p>
        <p>
          A purchase is a limited, personal, nonexclusive, nontransferable
          license to stream and replay that show through the Service during the
          access periods described below, while the Service and show remain
          available. It does not transfer ownership of the video, script,
          artwork, clues, music, software, or other content, and it does not
          include a right to download or publicly perform the show.
        </p>
        <ul>
          <li>
            <strong>Time to begin:</strong> The purchased show must be started
            within one year after its purchase date.
          </li>
          <li>
            <strong>48-hour replay window:</strong> The first successful stream
            of purchased show media starts a continuous 48-hour access window.
            During that window, the account may start and replay the show as
            many times as desired.
          </li>
          <li>
            <strong>One active game:</strong> Only one unfinished game for that
            show may be active on the account at a time.
          </li>
          <li>
            <strong>Game already in progress:</strong> If the 48-hour window
            ends while a game is active, that same game may be resumed and
            completed. Once it is completed, another game cannot begin under
            that purchase.
          </li>
          <li>
            <strong>Repurchase:</strong> After the applicable period ends and
            no protected active game remains, the show must be purchased again
            to begin another game.
          </li>
        </ul>
        <p>
          Each submitted playthrough can create a separate dated result in the
          account&apos;s play history, including the detective level earned.
          Ending an access period does not remove that history.
        </p>
        <p>
          Payment processing is planned through Square. Payment-card details
          will be entered into Square&apos;s payment interface and handled
          under Square&apos;s terms and privacy notice. We will retain the
          transaction identifiers and status needed to confirm access,
          investigate support requests, record refunds, and respond to
          disputes.
        </p>
        <p>
          Refund eligibility is governed by the{" "}
          <Link href="/refund-policy">Refund &amp; Streaming Policy</Link>,
          except where applicable law requires a different result.
        </p>
      </section>

      <section className={styles.section} id="gameplay">
        <h2>4. Gameplay, scoring, and AI-assisted answers</h2>
        <p>
          The Service records gameplay information such as playthrough dates,
          progress, unlocked clues, submitted accusations, answer results,
          scores, and detective levels. Submitted accusations are final for
          that playthrough. A customer may start a new playthrough only while
          the applicable purchase still permits a new game.
        </p>
        <p>
          Choice questions are compared with answers configured by the show
          administrator. Written answers may use exact matching, normalized
          matching, or AI-assisted semantic grading. When AI assistance is
          enabled, the question, accepted answers, grading instructions, and
          player&apos;s written answer may be sent to OpenAI to assess whether
          the response communicates the same essential answer.
        </p>
        <p>
          AI-assisted grading can be imperfect. It is used only to score an
          entertainment experience and does not make decisions involving
          employment, credit, housing, education, insurance, legal rights, or
          similarly significant matters. If AI grading is unavailable, the
          Service may use its configured accepted-answer matching instead.
        </p>
      </section>

      <section className={styles.section} id="content">
        <h2>5. Content-use rules</h2>
        <p>
          The Service and its mysteries are protected creative works. Unless we
          give written permission, you may not:
        </p>
        <ul>
          <li>record, download, copy, or redistribute a streamed show;</li>
          <li>
            post solutions, clue files, scripts, answer keys, or substantial
            portions of the experience publicly;
          </li>
          <li>
            charge others to watch, publicly perform the show, or use it for a
            commercial event;
          </li>
          <li>
            bypass playback, access, authentication, or content-protection
            controls; or
          </li>
          <li>
            reproduce or adapt our branding, artwork, characters, software, or
            mystery content.
          </li>
        </ul>
        <p>
          You may take personal notes and discuss the case within your private
          team.
        </p>
      </section>

      <section className={styles.section} id="availability">
        <h2>6. Availability and changes</h2>
        <p>
          Streaming depends on internet access, a supported browser, your
          device, and third-party infrastructure. We work to provide a reliable
          experience, but uninterrupted or error-free access cannot be
          guaranteed.
        </p>
        <p>
          We may repair, update, secure, replace, or discontinue parts of the
          Service. Show availability can also change because of licensing,
          security, legal, technical, or business requirements. We will use
          reasonable efforts to avoid disrupting an active playthrough and to
          provide notice when a material planned change affects purchased
          access.
        </p>
      </section>

      <section className={styles.section} id="conduct">
        <h2>7. Acceptable use</h2>
        <p>You may not use the Service to:</p>
        <ul>
          <li>violate law or another person&apos;s rights;</li>
          <li>probe, attack, overload, or disrupt the Service;</li>
          <li>use bots, scraping, or automation to obtain protected content;</li>
          <li>submit malware, harmful code, or abusive content;</li>
          <li>
            impersonate another person or provide false information in a
            payment, refund, or support request; or
          </li>
          <li>help another person do any prohibited activity.</li>
        </ul>
      </section>

      <section className={styles.section} id="disclaimers">
        <h2>8. Disclaimers and responsibility</h2>
        <p>
          The Service is an entertainment product. Scores, rankings, clue
          interpretations, and AI-assisted grading are not professional advice
          or assessments of a person&apos;s ability.
        </p>
        <p>
          To the fullest extent permitted by applicable law, the Service is
          provided “as available.” Nothing in these terms excludes a warranty,
          remedy, or consumer right that cannot lawfully be excluded. The final
          limitations-of-liability and Texas governing-law language should be
          reviewed by qualified counsel before launch.
        </p>
      </section>

      <section className={styles.section} id="termination">
        <h2>9. Suspension and termination</h2>
        <p>
          We may restrict or suspend access when reasonably necessary to
          investigate fraud, chargebacks, security threats, account sharing,
          content theft, or material violations of these terms. When practical,
          we will explain the restriction and provide a way to contact support.
        </p>
        <p>
          A refunded, reversed, fraudulent, or disputed transaction may cause
          access associated with that transaction to be removed.
        </p>
      </section>

      <section className={styles.section} id="changes">
        <h2>10. Changes to these terms</h2>
        <p>
          We may update these terms as the Service changes. The page will show
          the effective date. If a change materially affects existing purchased
          access, we will provide reasonable notice through the Service or the
          account email when appropriate.
        </p>
      </section>

      <section className={styles.section} id="contact">
        <h2>11. Contact</h2>
        <p>
          Questions about these terms or an account can be submitted using the
          instructions on the <Link href="/support">Customer Support page</Link>.
        </p>
        <div className={styles.contactPlaceholder}>
          <strong>Owner action required before payment launch</strong>
          Add the monitored customer-support email address and confirm the legal
          business name and governing-law/venue language.
        </div>
      </section>
    </PolicyLayout>
  );
}
