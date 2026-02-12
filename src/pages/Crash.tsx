export default function Crash() {
  // Intentionally crash to verify ErrorBoundary works in e2e.
  throw new Error("Intentional crash test route");
}
