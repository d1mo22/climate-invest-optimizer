// src/pages/Home.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState<string>("");

  const parsedBudget = useMemo(() => {
    const n = parseFloat(budget.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [budget]);

  const formattedBudget = useMemo(() => {
    if (!budget.trim()) return "";
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(parsedBudget);
    } catch {
      return "";
    }
  }, [budget, parsedBudget]);

  const canContinue = useMemo(() => {
    // Si está vacío -> permitido (guardamos 0)
    if (!budget.trim()) return true;
    // Si escribe algo, exigimos que sea número >= 0
    return Number.isFinite(parsedBudget) && parsedBudget >= 0;
  }, [budget, parsedBudget]);

  const goToMap = () => {
    const safe = Number.isFinite(parsedBudget) ? Math.max(0, parsedBudget) : 0;
    localStorage.setItem("budget", String(safe));
    navigate("/map", { state: { budget: safe } });
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
          "radial-gradient(900px 520px at 15% 10%, rgba(0,255,136,0.18), transparent 60%)," +
          "radial-gradient(840px 520px at 85% 25%, rgba(75,107,253,0.22), transparent 55%)," +
          "linear-gradient(180deg, #0b0b0f 0%, #07070a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* glow sutil */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -120,
          background:
            "radial-gradient(500px 320px at 30% 20%, rgba(0,255,136,0.12), transparent 65%)," +
            "radial-gradient(520px 340px at 70% 55%, rgba(75,107,253,0.14), transparent 68%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 980, position: "relative" }}>
        <div
          style={{
            borderRadius: 24,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 22px 70px rgba(0,0,0,0.45)",
            overflow: "hidden",
          }}
        >
          {/* header */}
          <div
            style={{
              padding: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(0,0,0,0.10)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg, rgba(0,255,136,0.95), rgba(75,107,253,0.95))",
                  boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              />
              <div style={{ lineHeight: 1.1 }}>
                <div
                  style={{
                    fontWeight: 950,
                    letterSpacing: 0.6,
                    fontSize: 18,
                    textTransform: "uppercase",
                  }}
                >
                  DEVNOVATION
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
                  Mapa · Tiendas · Inversión
                </div>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.78)",
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "rgba(0,255,136,0.95)",
                  boxShadow: "0 0 18px rgba(0,255,136,0.35)",
                }}
              />
              Entrada al mapa
            </div>
          </div>

          {/* body */}
          <div
            style={{
              padding: 22,
              display: "grid",
              gridTemplateColumns: "1.25fr 0.75fr",
              gap: 18,
              alignItems: "stretch",
            }}
          >
            {/* left */}
            <div
              style={{
                borderRadius: 22,
                padding: 18,
                background: "rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.08)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: -80,
                  background:
                    "radial-gradient(420px 260px at 25% 30%, rgba(0,255,136,0.14), transparent 65%)," +
                    "radial-gradient(420px 280px at 70% 55%, rgba(75,107,253,0.16), transparent 68%)",
                  filter: "blur(6px)",
                  pointerEvents: "none",
                }}
              />

              <div style={{ position: "relative" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 40,
                    lineHeight: 1.05,
                    letterSpacing: -0.6,
                    fontWeight: 950,
                  }}
                >
                  Define tu presupuesto{" "}
                  <span
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(0,255,136,1), rgba(75,107,253,1))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    para invertir
                  </span>
                </h1>

                <p
                  style={{
                    margin: "12px 0 16px",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.72)",
                    maxWidth: 560,
                    lineHeight: 1.55,
                  }}
                >
                  Introduce tu presupuesto disponible y pasa al mapa para analizar
                  tiendas, priorizar inversión y abrir dashboards.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    alignItems: "end",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      Presupuesto (€)
                    </div>

                    <div style={{ position: "relative" }}>
                      <input
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && canContinue) goToMap();
                        }}
                        placeholder="Ej: 250000"
                        inputMode="decimal"
                        style={{
                          width: "100%",
                          padding: "12px 44px 12px 12px",
                          borderRadius: 14,
                          outline: "none",
                          border: canContinue
                            ? "1px solid rgba(255,255,255,0.12)"
                            : "1px solid rgba(255,80,80,0.45)",
                          background: "rgba(0,0,0,0.35)",
                          color: "#fff",
                          boxSizing: "border-box",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                        }}
                      />
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.55)",
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        €
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: canContinue
                          ? "rgba(255,255,255,0.55)"
                          : "rgba(255,120,120,0.85)",
                        minHeight: 16,
                      }}
                    >
                      {!canContinue
                        ? "Introduce un número válido (>= 0) o déjalo vacío."
                        : formattedBudget
                        ? `Vista previa: ${formattedBudget}`
                        : "Tip: puedes dejarlo vacío (se guardará como 0)."}
                    </div>
                  </div>

                  <button
                    onClick={goToMap}
                    disabled={!canContinue}
                    style={{
                      cursor: canContinue ? "pointer" : "not-allowed",
                      borderRadius: 14,
                      padding: "12px 16px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: canContinue
                        ? "linear-gradient(135deg, rgba(0,255,136,0.95), rgba(75,107,253,0.95))"
                        : "rgba(255,255,255,0.10)",
                      color: canContinue ? "#0b0b0f" : "rgba(255,255,255,0.55)",
                      fontWeight: 950,
                      boxShadow: canContinue
                        ? "0 14px 45px rgba(0,0,0,0.40)"
                        : "none",
                      whiteSpace: "nowrap",
                      height: 44,
                      transition: "transform 120ms ease, filter 120ms ease",
                    }}
                    title="Aceptar y abrir mapa"
                    onMouseDown={(e) => {
                      if (!canContinue) return;
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translateY(1px)";
                    }}
                    onMouseUp={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translateY(0px)";
                    }}
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>

            {/* right (info compacta, sin duplicar funcionalidades) */}
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  borderRadius: 22,
                  padding: 16,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 16px 50px rgba(0,0,0,0.35)",
                }}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
                  Lo que verás en el mapa
                </div>

                <ul
                  style={{
                    margin: "10px 0 0",
                    paddingLeft: 16,
                    color: "rgba(255,255,255,0.78)",
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  <li>Países con pan/zoom suave.</li>
                  <li>Listado de tiendas y acceso a dashboard.</li>
                  <li>
                    Marcadores por prioridad: <b>rojo</b> → <b>verde</b>.
                  </li>
                </ul>
              </div>

              <div
                style={{
                  borderRadius: 22,
                  padding: 16,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
                  Nota
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.72)",
                    lineHeight: 1.55,
                  }}
                >
                  El presupuesto se guarda para usarlo luego en el mapa/dashboards.
                </div>
              </div>
            </div>
          </div>

          {/* footer */}
          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
              background: "rgba(0,0,0,0.10)",
            }}
          >
            <div>© {new Date().getFullYear()} devnovation</div>
            <div style={{ opacity: 0.85 }}>Entrada rápida al mapa</div>
          </div>
        </div>

        {/* responsive */}
        <style>
          {`
            @media (max-width: 920px) {
              .home-wrap-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}
        </style>
      </div>

      {/* Si tu navbar es “fixed” y se superpone, esto la oculta solo en Home */}
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
