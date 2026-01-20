export function modelSelector(req, res, next) {
  const path = req.path || "";

  // DEMO ahorra
  if (path.startsWith("/api/demo")) {
    req.model = "gpt-4o-mini";
  }
  // Comunicación y otros módulos premium
  else if (path.startsWith("/api/modules/comunica")) {
    req.model = "gpt-4o";
  }
  // Ventas (tú decides cuál usar)
  else if (path.startsWith("/api/modules/ventas")) {
    req.model = "gpt-4o";  // o "gpt-4o-mini" si quieres ahorrar aquí también
  }
  else {
    // Default seguro
    req.model = "gpt-4o";
  }

  next();
}
