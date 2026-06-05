/**
 * Primary submit button with the gold plywood fill and an inline spinner while
 * the server action is pending. Drive `pending` from `useActionState`'s third
 * tuple value.
 */
export function AuthSubmit({
  pending,
  label,
  pendingLabel,
  id,
}: {
  pending: boolean
  label: string
  pendingLabel: string
  id?: string
}) {
  return (
    <button
      className="a-btn a-btn--primary"
      type="submit"
      id={id}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? <span className="a-spin" aria-hidden="true" /> : null}
      <span className="a-btn-label">{pending ? pendingLabel : label}</span>
    </button>
  )
}

/** The "or" rule between the email form and the Google button. */
export function OrDivider() {
  return (
    <div className="a-or">
      <span>or</span>
    </div>
  )
}
