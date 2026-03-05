"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@velocityuikit/velocityui";
import "./docs.css";

type SidebarLink = {
  label: string;
  href: string;
};

type SidebarSection = {
  heading: string;
  links: SidebarLink[];
};

const SIDEBAR: SidebarSection[] = [
  {
    heading: "Overview",
    links: [
      { label: "Getting Started", href: "/docs" },
      { label: "Why StatusForge?", href: "/docs#why" }
    ]
  },
  {
    heading: "Reference",
    links: [
      { label: "API", href: "/docs/api" },
      { label: "Adapters", href: "/docs/adapters" }
    ]
  },
  {
    heading: "Links",
    links: [
      { label: "Playground", href: "/#playground" },
      { label: "npm", href: "https://www.npmjs.com/package/@npmforge/statusforge" },
      { label: "GitHub", href: "https://github.com/clow99/getstatusforge.com" }
    ]
  }
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          <Image src="/logo.png" alt="StatusForge logo" width={34} height={34} priority />
          <span>StatusForge</span>
        </Link>
        <nav className="header-nav">
          <Link className="header-nav-link" href="/#why">
            Why
          </Link>
          <Link className="header-nav-link" href="/#schema">
            Schema
          </Link>
          <Link className="header-nav-link" href="/#playground">
            Playground
          </Link>
          <Link className="header-nav-link header-nav-link--active" href="/docs">
            Docs
          </Link>
        </nav>
        <div className="header-actions">
          <a
            href="https://www.npmjs.com/package/@npmforge/statusforge"
            target="_blank"
            rel="noreferrer"
            className="header-npm"
          >
            npm i @npmforge/statusforge
          </a>
          <a href="https://github.com/clow99/getstatusforge.com" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              GitHub
            </Button>
          </a>
        </div>
      </header>

      <div className="docs-shell">
        <aside className="docs-sidebar">
          {SIDEBAR.map((section) => (
            <div className="sidebar-section" key={section.heading}>
              <div className="sidebar-heading">{section.heading}</div>
              {section.links.map((link) => {
                const isExternal = link.href.startsWith("http");
                const isActive = pathname === link.href || pathname === link.href.replace(/\/$/, "");
                const className = `sidebar-link${isActive ? " sidebar-link--active" : ""}`;

                if (isExternal) {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={className}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                  );
                }

                return (
                  <Link key={link.href} href={link.href} className={className}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>

        <main className="docs-content">{children}</main>
      </div>
    </>
  );
}
