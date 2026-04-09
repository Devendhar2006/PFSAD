export function notFound(req, res) {
  return res.status(404).json({ message: "Endpoint not found" });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  return res.status(statusCode).json({ message: error.message || "Server error" });
}
