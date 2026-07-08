import { loadCharacter } from "@/lib/data";
import {
  loadMail,
  claimMail,
  claimAllMail,
  deleteMail,
  hasReward,
  describeReward,
} from "@/lib/mail";
import { ActionButton } from "@/components/ActionButton";

/**
 * The Crown Postal Service — a self-contained inbox panel. Loads the current
 * hero and their mail, then renders each letter with its reward chips and
 * per-message Claim/Discard controls, plus a "Claim all" button. Rewards are
 * granted server-side by the mail actions; these buttons just call them.
 */
export default async function MailPanel() {
  const character = await loadCharacter();
  if (!character) return null;

  const inbox = await loadMail(character.id);
  const anyClaimable = inbox.mail.some((m) => !m.claimed && hasReward(m));

  return (
    <section className="panel mt-6 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-black text-gold">📬 The Crown Postal Service</h3>
        {inbox.unclaimed > 0 && (
          <span className="rounded-full bg-good px-2.5 py-0.5 text-xs font-bold text-[#10240a]">
            {inbox.unclaimed} unread
          </span>
        )}
      </div>
      <p className="mb-3 text-sm text-muted">
        By order of the Crown: gifts, tidings, and the occasional apology,
        delivered to your satchel.
      </p>

      {anyClaimable && (
        <div className="mb-4 flex justify-end">
          <ActionButton action={claimAllMail} className="bg-gold text-[#2b1d12]">
            Claim all
          </ActionButton>
        </div>
      )}

      {inbox.mail.length === 0 ? (
        <p className="text-sm text-muted">
          Your satchel is empty. The post rider will return anon.
        </p>
      ) : (
        <ul className="space-y-2">
          {inbox.mail.map((mail) => {
            const rewarded = hasReward(mail);
            const claimable = !mail.claimed && rewarded;
            return (
              <li
                key={mail.id}
                className="rounded-lg bg-surface p-4"
                style={{ opacity: mail.claimed ? 0.72 : 1 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      <span>{mail.claimed ? "📭" : "✉️"}</span>
                      <span className="truncate">{mail.subject}</span>
                    </div>
                    {mail.body && (
                      <p className="mt-1 text-sm leading-snug text-muted">
                        {mail.body}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {rewarded && (
                        <span
                          className="rounded-md bg-surface-2 px-2 py-0.5 font-semibold"
                          style={{ color: "var(--gold)" }}
                        >
                          {describeReward(mail)}
                        </span>
                      )}
                      {mail.claimed && (
                        <span className="text-good">✓ Claimed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {claimable && (
                      <ActionButton
                        action={claimMail.bind(null, mail.id)}
                        className="bg-good text-[#10240a]"
                      >
                        Claim
                      </ActionButton>
                    )}
                    {(mail.claimed || !rewarded) && (
                      <ActionButton
                        action={deleteMail.bind(null, mail.id)}
                        className="bg-surface-2 text-xs text-muted hover:text-bad"
                      >
                        Discard
                      </ActionButton>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
