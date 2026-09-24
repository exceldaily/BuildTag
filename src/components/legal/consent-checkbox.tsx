/**
 * An unticked, required consent checkbox with a large tap target. The server
 * action re-checks the value; `required` is only a convenience.
 */
export function ConsentCheckbox({
  name,
  children,
  error,
  note,
  checked,
  onChange,
}: {
  name: string;
  children: React.ReactNode;
  error?: string;
  /** Small print under the checkbox, e.g. a disclosure. */
  note?: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const errorId = `${name}_error`;
  return (
    <div>
      <label htmlFor={name} className="flex cursor-pointer items-start gap-3 rounded-sm border border-line p-3 text-sm leading-relaxed text-foreground/85">
        <input
          id={name}
          name={name}
          type="checkbox"
          required
          {...(onChange ? { checked: Boolean(checked), onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked) } : {})}
          className="mt-0.5 size-5 shrink-0 accent-[var(--signal)]"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <span>{children}</span>
      </label>
      {note && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note}</p>}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
