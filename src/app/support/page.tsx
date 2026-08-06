import type { Metadata } from "next";
import Link from "next/link";
import {
  PolicyLayout,
  policyStyles as styles,
} from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "Customer Support",
  description:
    "Playback troubleshooting, account help, refund review, and privacy request guidance for Mysteries in Motion Online.",
};

const sections = [
  { id: "urgent", label: "Before leaving the game" },
  { id: "playback", label: "Playback troubleshooting" },
  { id: "account", label: "Account and sign-in help" },
  { id: "progress", label: "Progress and scoring help" },
  { id: "refunds", label: "Refund review" },
  { id: "privacy", label: "Privacy requests" },
  { id: "contact", label: "Contact support" },
];

export default function SupportPage() {
  return (
    <PolicyLayout
      eyebrow="Help desk"
      title="Customer Support"
      summary="Use these steps to protect your playthrough and collect the information needed to investigate an account, playback, scoring, or refund issue."
      sections={sections}
    >
      <section className={styles.section} id="urgent">
        <h2>1. Before leaving the game</h2>
        <ul className={styles.plainList}>
          <li>
            <strong>Do not purchase the same show again.</strong> A second
            purchase is not needed to recover an active playthrough, even if
            its 48-hour replay window ended while that game was in progress.
          </li>
          <li>
            <strong>Take a screenshot of any error.</strong> Include the whole
            browser window when possible, but do not expose sign-in codes or
            payment details.
          </li>
          <li>
            <strong>Record the approximate time and current stage.</strong> Note
            whether you were in Introduction, Act One, Intermission, Act Two, or
            the Situation Room.
          </li>
          <li>
            <strong>Try one refresh.</strong> The recovery system should return
            you to the saved stage without requiring another purchase.
          </li>
        </ul>
      </section>

      <section className={styles.section} id="playback">
        <h2>2. Playback troubleshooting</h2>
        <ol>
          <li>Confirm the device still has a working internet connection.</li>
          <li>Pause briefly, then press Play again.</li>
          <li>
            Refresh the page once. Avoid repeatedly refreshing while a response
            is being submitted.
          </li>
          <li>
            If the problem continues, try the latest Chrome, Edge, Safari, or
            Firefox without private/incognito browsing.
          </li>
          <li>
            Temporarily disable a content blocker or restrictive browser
            extension for this site.
          </li>
          <li>
            Confirm the browser tab and device are not muted and that the
            correct audio output is selected.
          </li>
        </ol>
        <p>
          Include the mystery title, stage, approximate timestamp, browser, and
          device when reporting a video problem.
        </p>
      </section>

      <section className={styles.section} id="account">
        <h2>3. Account and sign-in help</h2>
        <ul>
          <li>
            Request a new code if the previous code is more than ten minutes
            old.
          </li>
          <li>
            Check spam, junk, promotions, and filtered folders for the sign-in
            message.
          </li>
          <li>
            Make sure the email address exactly matches the address used for the
            purchase.
          </li>
          <li>
            Never send a sign-in code to support. Support does not need it to
            investigate delivery.
          </li>
        </ul>
      </section>

      <section className={styles.section} id="progress">
        <h2>4. Progress, clues, and scoring help</h2>
        <p>
          A useful report includes the mystery, account email, playthrough date,
          stage, clue or question involved, what you expected, and what
          appeared. For a written-answer scoring concern, include the answer you
          entered and the accepted solution displayed in the Situation Room.
        </p>
        <p>
          A purchased show must be started within one year. Its first successful
          stream opens 48 hours for new games and replays. If that window ends
          during an active game, refresh or sign in again to resume the same
          game; it remains available until completed. A new game requires
          another purchase after the window ends.
        </p>
        <p>
          Do not post mystery answers or screenshots publicly. They can spoil
          the experience for other customers.
        </p>
      </section>

      <section className={styles.section} id="refunds">
        <h2>5. Refund review</h2>
        <p>
          Refunds are available only when our available records establish that
          the purchased show did not begin streaming, except where law requires
          otherwise. Review the complete{" "}
          <Link href="/refund-policy">Refund &amp; Streaming Policy</Link>{" "}
          before submitting a request.
        </p>
      </section>

      <section className={styles.section} id="privacy">
        <h2>6. Privacy requests</h2>
        <p>
          Requests to access, correct, or delete account information should
          identify the request type and be sent from the account email when
          possible. We may use a separate verification step before disclosing
          or changing account data.
        </p>
        <p>
          Review the <Link href="/privacy">Privacy Policy</Link> for information
          about records that may need to be retained.
        </p>
      </section>

      <section className={styles.section} id="contact">
        <h2>7. Contact support</h2>
        <div className={styles.contactPlaceholder}>
          <strong>Support email to be confirmed before payment launch</strong>
          A monitored customer-support address has not yet been verified, so
          this draft intentionally does not publish one. Add it here and in the
          Terms and Privacy pages before enabling purchases.
        </div>
        <h3>Include in your message</h3>
        <ul>
          <li>account email;</li>
          <li>mystery title;</li>
          <li>date and approximate time;</li>
          <li>device and browser;</li>
          <li>stage or video timestamp; and</li>
          <li>error message or screenshot, if available.</li>
        </ul>
        <p>
          Never send a password, sign-in code, full card number, card security
          code, or unrelated sensitive information.
        </p>
      </section>
    </PolicyLayout>
  );
}
