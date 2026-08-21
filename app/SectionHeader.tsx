"use client";

import { useEffect, useState } from "react";
import PublicationsPanel, {
  prefetchPublications,
} from "./PublicationsPanel";
import TopicTreeMenu from "./TopicTreeMenu";
import OpenDataResources from "./OpenDataResources";

export type SiteDestination =
  | "home"
  | "ene"
  | "informality"
  | "ipc"
  | "ipp"
  | "births"
  | "fertility"
  | "deaths"
  | "mortality"
  | "unions"
  | "enusc"
  | "police"
  | "permits"
  | "energy"
  | "industry"
  | "commerce"
  | "tourism"
  | "supermarkets";

type ResourceTab =
  | "analysis"
  | "publications"
  | "documentation"
  | "databases"
  | "resources";

const resourceTabs: { id: ResourceTab; label: string; title: string }[] = [
  { id: "analysis", label: "Análisis de resultados", title: "Análisis de resultados" },
  { id: "publications", label: "Publicaciones", title: "Publicaciones" },
  { id: "documentation", label: "Documentación", title: "Documentación" },
  { id: "databases", label: "Bases de datos", title: "Bases de datos" },
  { id: "resources", label: "Centro de recursos", title: "Centro de recursos" },
];

const destinationTitles: Record<Exclude<SiteDestination, "home">, string> = {
  ene: "Ocupación y Desocupación",
  informality: "Informalidad Laboral",
  ipc: "Índice de Precios al Consumidor",
  ipp: "Índice de Precios al Productor",
  births: "Nacimientos",
  fertility: "Fecundidad",
  deaths: "Defunciones",
  mortality: "Mortalidad",
  unions: "Matrimonios y Acuerdos de Unión Civil",
  enusc: "Encuesta Nacional Urbana de Seguridad Ciudadana",
  police: "Estadísticas Policiales",
  permits: "Permisos de Edificación",
  energy: "Producción de Electricidad, Gas y Agua",
  industry: "Índice de Producción Industrial",
  commerce: "Comercio",
  tourism: "Turismo",
  supermarkets: "Supermercados",
};

const destinationOperationCodes: Record<
  Exclude<SiteDestination, "home">,
  string
> = {
  ene: "ocupacion_y_desocupacion",
  informality: "informalidad_laboral",
  ipc: "indice_de_precios_al_consumidor",
  ipp: "indice_de_precios_al_productor",
  births: "nacimientos",
  fertility: "fecundidad",
  deaths: "defunciones",
  mortality: "mortalidad",
  unions: "matrimonios_y_acuerdos_de_union_civil",
  enusc: "enusc",
  police: "estadisticas_policiales",
  permits: "permisos_de_edificacion",
  energy: "produccion_de_electricidad_gas_y_agua",
  industry: "indice_de_produccion_industrial",
  commerce: "comercio",
  tourism: "turismo",
  supermarkets: "supermercados",
};

export function ResourceTabs({
  current,
}: {
  current: Exclude<SiteDestination, "home">;
}) {
  const [activeTab, setActiveTab] = useState<ResourceTab>("analysis");
  const active = resourceTabs.find((tab) => tab.id === activeTab)!;
  const operationCode = destinationOperationCodes[current];

  useEffect(() => {
    prefetchPublications(operationCode);
    prefetchPublications(operationCode, "documentacion");
    prefetchPublications(operationCode, "bases_de_datos");
  }, [operationCode]);

  return (
    <section
      className="resource-tabs"
      data-active={activeTab}
      aria-label={`Secciones de ${destinationTitles[current]}`}
    >
      <div className="resource-tabs-scroll">
        <div className="resource-tabs-list wrap" role="tablist">
          {resourceTabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${current}-${tab.id}`}
              className={activeTab === tab.id ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${current}-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => {
                setActiveTab(tab.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {activeTab !== "analysis" && (
        <div
          className="resource-tab-panel"
          id={`panel-${current}-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${current}-${activeTab}`}
        >
          <section className="hero wrap">
            <div>
              <span className="eyebrow">{active.label}</span>
              <h1>{active.title} de {destinationTitles[current]}</h1>
            </div>
          </section>
          {["publications", "documentation", "databases"].includes(activeTab) && (
            <section className="publications-content wrap">
              <PublicationsPanel
                operationCode={operationCode}
                familyCode={
                  activeTab === "documentation"
                    ? "documentacion"
                    : activeTab === "databases"
                      ? "bases_de_datos"
                      : "publicaciones"
                }
              />
            </section>
          )}
          {activeTab === "resources" && <OpenDataResources current={current} />}
        </div>
      )}
    </section>
  );
}

export function IneLogo({ inverse = false }: { inverse?: boolean }) {
  // Se reutiliza el mismo activo institucional presente en Mercado Laboral.
  return (
    <a
      className={`ine-logo ${inverse ? "inverse-logo" : ""}`}
      href="https://www.ine.gob.cl"
      target="_blank"
      rel="noreferrer"
      aria-label="Instituto Nacional de Estadísticas de Chile"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ine-logo.jpg"
        alt="Logo del Instituto Nacional de Estadísticas de Chile"
      />
    </a>
  );
}

export function HomeNavLink({ active = false }: { active?: boolean }) {
  return (
    <a
      className={`topics-home-link ${active ? "active" : ""}`}
      href="/"
      aria-label="Ir al inicio"
      aria-current={active ? "page" : undefined}
      title="Inicio"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.5 12 3.7l8.5 6.8M5.7 9.2v10.1h12.6V9.2M9.5 19.3v-6.1h5v6.1" />
      </svg>
    </a>
  );
}

export default function SectionHeader({
  current,
  onNavigate,
}: {
  current: SiteDestination;
  onNavigate: (destination: SiteDestination) => void;
}) {
  return (
    <>
    <header className="ine-institutional-header"><nav className="ine-main-nav" aria-label="Navegación institucional"><a className="ine-mark" href="https://www.ine.gob.cl" aria-label="Instituto Nacional de Estadísticas"><img src="/ine-logo.jpg" alt="INE" /></a><a href="/">› Estadísticas por tema</a><span className="ine-navdrop">› Herramientas <i>▼</i><span className="ine-mega"><a href="https://www.ine.gob.cl/herramientas">Agenda estadística ↗</a><a href="https://www.ine.gob.cl/herramientas">Sistema de Información de Mercado Laboral - SIMEL ↗</a><a href="https://bancodatosene.ine.cl">Banco de datos ENE ↗</a><a href="https://calculadoraipc.ine.cl">Calculadora IPC ↗</a><a href="https://redatam-ine.ine.cl">Redatam ↗</a><a href="https://www.ine.gob.cl/herramientas">Portal de Mapas ↗</a><a href="https://stat.ine.cl">INE.Stat ↗</a></span></span><span className="ine-navdrop">› Acerca del INE <i>▼</i><span className="ine-dropdown"><a href="https://www.ine.gob.cl/institucional/">Nuestra institución</a></span></span><span className="ine-navdrop">› Regiones <i>▼</i><span className="ine-dropdown"><a href="https://regiones.ine.gob.cl/">Direcciones regionales</a></span></span><span className="ine-navdrop">› Acceso Informantes <i>▼</i><span className="ine-dropdown"><a href="https://www.ine.gob.cl/acceso-informantes">Información para personas y empresas</a></span></span><span className="ine-search">⌕</span><span className="ine-language">EN</span></nav><nav className="topics topic-explorer" aria-label="Navegación estadística"><HomeNavLink active={current === "home"} /><TopicTreeMenu onNavigate={onNavigate} /></nav></header>
    {current !== "home" && <ResourceTabs current={current} />}
    </>
  );
}
