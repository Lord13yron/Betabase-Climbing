'use client'

import { useEffect, useRef } from 'react'

// Brand "concrete slate" confirm dialog. Styled with the global tokens from
// app/globals.css (--color-slate-*, --hairline, radii) so it matches the dark
// app surfaces (manage page, route detail) without depending on any page CSS.
const BTN =
  'inline-flex h-[42px] items-center justify-center rounded-[var(--radius-md)] px-[18px] ' +
  'font-[family-name:var(--font-ui)] text-sm font-semibold transition-colors disabled:opacity-50'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onClick={(e) => {
        if (e.target === ref.current) onCancel()
      }}
      className="m-auto w-full max-w-[420px] rounded-[var(--radius-lg)] border border-[var(--hairline-soft)] bg-[var(--color-slate-700)] p-0 text-[var(--fg)] shadow-[0_18px_48px_rgba(20,14,10,0.46)] backdrop:bg-[rgba(8,11,14,0.66)] backdrop:backdrop-blur-[4px]"
    >
      <div className="px-6 pt-6 pb-2">
        <h2 className="font-[family-name:var(--font-display)] text-[26px] font-bold leading-[1.1] text-[var(--color-chalk-50)]">
          {title}
        </h2>
        <p className="mt-2.5 font-[family-name:var(--font-ui)] text-[15px] leading-[1.6] text-[var(--color-slate-300)]">
          {message}
        </p>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-[var(--hairline-soft)] px-6 pt-[18px] pb-[22px]">
        <button
          type="button"
          onClick={onCancel}
          className={`${BTN} border border-[var(--hairline)] text-[var(--color-chalk-100)] hover:border-[var(--color-slate-400)] hover:bg-[var(--color-slate-600)]`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`${BTN} bg-[var(--color-hold-red)] text-white hover:bg-[#c23c33]`}
        >
          {pending ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
