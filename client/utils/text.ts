export function capitalizeFirstLetter(value: string | null | undefined) {
  if (!value) return "";

  const leadingWhitespaceMatch = value.match(/^\s*/);
  const leadingWhitespace = leadingWhitespaceMatch?.[0] || "";
  const trimmedStart = value.slice(leadingWhitespace.length);

  if (!trimmedStart) return value;

  return (
    leadingWhitespace +
    trimmedStart.charAt(0).toUpperCase() +
    trimmedStart.slice(1)
  );
}
