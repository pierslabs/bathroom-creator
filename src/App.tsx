import { BathroomScene } from "./scene/BathroomScene";
import { PlanEditor } from "./plan/PlanEditor";
import { CatalogPanel } from "./catalog/CatalogPanel";
import { TexturePanel } from "./textures/TexturePanel";
import { useDesignStore } from "./state/designStore";
import { floorArea } from "./domain/geometry";
import "./App.css";

function App() {
  // El HUD lee del store y muestra el dominio en vivo. floorArea es la misma
  // función pura que ya está cubierta por tests.
  const design = useDesignStore((s) => s.design);
  const area = floorArea(design);

  return (
    <div className="app">
      <header className="hud">
        <strong>Bed Creator</strong>
        <span>
          {design.points.length} paredes · piso {area.toFixed(2)} m²
        </span>
      </header>
      <BathroomScene />
      <CatalogPanel />
      <PlanEditor />
      <TexturePanel />
    </div>
  );
}

export default App;
