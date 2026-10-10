export default function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#0f172a", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>base44 code</h1>
      <p style={{ opacity: 0.8 }}>Sandbox bridge scaffold — terminal &lt;-&gt; app sandbox</p>
      <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>
        The dev automation endpoint lives at <code>POST /__exec__</code> (see src/term-plugin.js).
      </p>
    </div>
  );
}
