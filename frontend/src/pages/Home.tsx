import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const goToApp = () => {
    localStorage.setItem("budget", "0");
    navigate("/map");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px",
        boxSizing: "border-box",
        background:
          "radial-gradient(800px 500px at 20% 15%, rgba(0,255,136,0.16), transparent 60%)," +
          "radial-gradient(760px 480px at 80% 20%, rgba(75,107,253,0.20), transparent 55%)," +
          "linear-gradient(180deg, #0b0b0f 0%, #07070a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -120,
          background:
            "radial-gradient(520px 320px at 30% 25%, rgba(0,255,136,0.12), transparent 65%)," +
            "radial-gradient(520px 320px at 70% 55%, rgba(75,107,253,0.14), transparent 68%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 720,
          borderRadius: 24,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 22px 70px rgba(0,0,0,0.50)",
          padding: "32px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 18,
          }}
        >
          <img
            src="/data/logo3.png"
            alt="RiskGuard"
            style={{ width: 140, height: 140, objectFit: "contain" }}
          />

          <div>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 15,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.6,
                maxWidth: 520,
              }}
            >
              Optimiza tu presupuesto cumpliendo normativa y taxonomía europea. 
              Prioriza medidas, calcula impacto y decide en tiempo real con datos claros.
            </p>
          </div>

          <button
            onClick={goToApp}
            style={{
              cursor: "pointer",
              borderRadius: 14,
              padding: "14px 20px",
              border: "1px solid rgba(255,255,255,0.14)",
              background:
                "linear-gradient(135deg, rgba(0,255,136,0.95), rgba(75,107,253,0.95))",
              color: "#0b0b0f",
              fontWeight: 900,
              boxShadow: "0 16px 45px rgba(0,0,0,0.40)",
              whiteSpace: "nowrap",
              height: 48,
              minWidth: 220,
              fontSize: 15,
              transition: "transform 120ms ease, filter 120ms ease",
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0px)";
            }}
          >
            Entrar a la aplicación
          </button>
        </div>
      </div>

      <style>
        {`
          nav, .navbar, #navbar, .ant-layout-header {
            display: none !important;
          }
        `}
      </style>
    </div>
  );
}
