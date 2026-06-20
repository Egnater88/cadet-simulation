export const metadata = {
  title: "SDR Decision Training — Rabdan Academy",
  description: "Military Decision-Making Training Simulation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0a0f0a" }}>
        {children}
      </body>
    </html>
  );
}
