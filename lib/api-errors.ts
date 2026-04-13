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
    return error.message;
  }

  return fallback;
}
