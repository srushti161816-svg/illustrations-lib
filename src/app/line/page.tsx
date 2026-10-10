import type { Metadata } from "next";
import { Bell, Cone, Molecule, Nested, Orbits, Polar, Spiral, Triad, Tubes, Tunnel, Venn, Virus, Wave } from "./figures";
import "./line.css";
import { Tile } from "./tile";
import { Coil, Globe, Hourglass, Hyperbola, Plane, Radar, Rings, Sphere, Stack, Tetra, Torus, Wormhole } from "./wireframes";

export const metadata: Metadata = {
  title: "Line",
  description: "Geometric line illustrations in constant, quiet motion: diagrams, science icons and turning wireframes.",
};

// Read row by row: plane geometry, graphs, science, then solids.
const figures = [
  { name: "venn", Figure: Venn },
  { name: "nested", Figure: Nested },
  { name: "light cone", Figure: Cone },
  { name: "golden spiral", Figure: Spiral },
  { name: "radar", Figure: Radar },
  { name: "sine", Figure: Wave },
  { name: "hyperbola", Figure: Hyperbola },
  { name: "polar", Figure: Polar },
  { name: "orbits", Figure: Orbits },
  { name: "triad", Figure: Triad },
  { name: "molecule", Figure: Molecule },
  { name: "virus", Figure: Virus },
  { name: "distributions", Figure: Bell },
  { name: "test tubes", Figure: Tubes },
  { name: "tunnel", Figure: Tunnel },
  { name: "rings", Figure: Rings },
  { name: "stack", Figure: Stack },
  { name: "globe", Figure: Globe },
  { name: "coil", Figure: Coil },
  { name: "plane", Figure: Plane },
  { name: "sphere", Figure: Sphere },
  { name: "wormhole", Figure: Wormhole },
  { name: "torus", Figure: Torus },
  { name: "hourglass", Figure: Hourglass },
  { name: "tetrahedron", Figure: Tetra },
];

export default function Line() {
  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-10 md:px-10">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="text-lg font-medium tracking-tight text-neutral-900">Line</h1>
        <p className="text-sm text-neutral-500">Geometric figures in a single hairline stroke, each in quiet, constant motion.</p>
      </header>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-neutral-800 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {figures.map(({ name, Figure }, i) => (
          <Tile key={name} name={name} index={i}>
            <Figure />
          </Tile>
        ))}
      </div>
    </main>
  );
}
