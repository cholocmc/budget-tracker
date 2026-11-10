export function Footer({ className = "site-foot" }: { className?: string }) {
  return (
    <footer className={className}>
      Made by{" "}
      <a href="https://www.cholocmc.com" target="_blank" rel="noopener">
        CholoCMC
      </a>
    </footer>
  );
}
