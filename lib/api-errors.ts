export function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    return "This record already exists.";
  }

  if (error instanceof Error && error.message) {
    const message = error.message.toLowerCase();
    if (
      message.includes("ssl routines") ||
      message.includes("tlsv1 alert") ||
      message.includes("ssl alert number 80") ||
      message.includes("mongodb") ||
      message.includes("certificate") ||
      message.includes("server selection")
    ) {
      return "Unable to connect to the database right now. Please try again in a moment.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
