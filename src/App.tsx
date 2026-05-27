import LeadPortal from "./LeadPortal";

function App() {
  const path = window.location.pathname;
  const token = path.split("/").filter(Boolean)[0] ?? null;

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