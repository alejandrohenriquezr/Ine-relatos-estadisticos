"use client";

import { useState } from "react";

export type SiteDestination =
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

type MenuId =
  | "labor"
  | "prices"
  | "demography"
  | "living"
  | "industry"
  | "services";

type Menu = {
  id: MenuId;
  label: string;
  destinations: SiteDestination[];
  items: { label: string; destination: SiteDestination }[];
};

const menus: Menu[] = [
  {
    id: "labor",
    label: "Mercado laboral",
    destinations: ["ene", "informality"],
    items: [
      { label: "Ocupación y desocupación", destination: "ene" },
      { label: "Informalidad laboral", destination: "informality" },
    ],
  },
  {
    id: "prices",
    label: "Precios",
    destinations: ["ipc", "ipp"],
    items: [
      { label: "Índice de Precios al Consumidor", destination: "ipc" },
      { label: "Índice de Precios al Productor", destination: "ipp" },
    ],
  },
  {
    id: "demography",
    label: "Demografía y población",
    destinations: ["births", "fertility", "deaths", "mortality", "unions"],
    items: [
      { label: "Nacimientos", destination: "births" },
      { label: "Fecundidad", destination: "fertility" },
      { label: "Defunciones", destination: "deaths" },
      { label: "Mortalidad", destination: "mortality" },
      { label: "Matrimonios y AUC", destination: "unions" },
    ],
  },
  {
    id: "living",
    label: "Condiciones de vida",
    destinations: ["enusc", "police"],
    items: [
      { label: "ENUSC", destination: "enusc" },
      { label: "Policías", destination: "police" },
    ],
  },
  {
    id: "industry",
    label: "Industria, Energía y Construcción",
    destinations: ["permits", "energy", "industry"],
    items: [
      { label: "Permisos de Edificación", destination: "permits" },
      { label: "Energía", destination: "energy" },
      { label: "Industria", destination: "industry" },
    ],
  },
  {
    id: "services",
    label: "Servicios",
    destinations: ["commerce", "tourism", "supermarkets"],
    items: [
      { label: "Comercio", destination: "commerce" },
      { label: "Turismo", destination: "tourism" },
      { label: "Supermercados", destination: "supermarkets" },
    ],
  },
];

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

export default function SectionHeader({
  current,
  onNavigate,
}: {
  current: SiteDestination;
  onNavigate: (destination: SiteDestination) => void;
}) {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);

  // Cierra el menú antes de cambiar de relato para evitar paneles persistentes.
  const navigate = (destination: SiteDestination) => {
    setOpenMenu(null);
    onNavigate(destination);
  };

  return (
    <header>
      <div className="topbar">
        <div className="brand">
          <IneLogo />
          <b>
            INE <em>|</em> Relatos Estadísticos
          </b>
        </div>
        <nav className="utility">
          <a href="https://www.ine.gob.cl/institucional/">Acerca del INE</a>
        </nav>
      </div>
      <nav className="topics econ-topics" aria-label="Temas estadísticos">
        {menus.map((menu) => {
          const isOpen = openMenu === menu.id;
          const isActive = menu.destinations.includes(current);
          return (
            <div
              key={menu.id}
              className={`topic-dropdown ${isOpen ? "open" : ""}`}
              onMouseEnter={() => setOpenMenu(menu.id)}
              onMouseLeave={() => setOpenMenu(null)}
              onFocus={() => setOpenMenu(menu.id)}
            >
              <button
                className={isActive ? "active" : ""}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                onClick={() => setOpenMenu(isOpen ? null : menu.id)}
              >
                {menu.label}
              </button>
              <div className="topic-submenu" role="menu">
                {menu.items.map((item) => (
                  <button
                    key={item.destination}
                    role="menuitem"
                    aria-current={
                      current === item.destination ? "page" : undefined
                    }
                    onClick={() => navigate(item.destination)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </header>
  );
}
