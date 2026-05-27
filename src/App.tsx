import { useEffect, useState } from "react";
import LeadPortal from "./LeadPortal";

function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const parts = path.split("/").filter(Boolean);
    const t = parts[0] ?? null;
    setToken(t);
  }, []);

  if (!token) {
    return (
      <div className="error-screen">
        <p>Invalid link.</p>
      </div>
    );
  }

  return <LeadPortal token={token} />;
}

export default App;
