type ToastProps = {
  cleared: boolean;
};

export function Toast({ cleared }: ToastProps) {
  return (
    <div className={`toast ${cleared ? 'is-visible' : ''}`} aria-live="polite">
      CLEAR!
    </div>
  );
}
