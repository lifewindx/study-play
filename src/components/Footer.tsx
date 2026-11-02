export function Footer({ auth = false }: { auth?: boolean }) {
  return (
    <footer className={`${auth ? "absolute bottom-0 left-0 right-0 px-5 sm:px-8" : "mt-auto pt-16"}`}>
      <div className="border-t py-3 text-center text-[10px]" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)", opacity: 0.35 }}>
        © {new Date().getFullYear()} LOOPIN
      </div>
    </footer>
  );
}
