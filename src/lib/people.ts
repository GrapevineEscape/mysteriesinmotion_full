type NameFields = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
};

/** Best available name for a person, falling back through what we know. */
export function displayName(person: NameFields) {
  const full = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return full || person.displayName || person.email || "Unnamed";
}

/** Sort key that orders people by surname the way a cast list reads. */
export function nameSortKey(person: NameFields) {
  return `${person.lastName ?? ""} ${person.firstName ?? ""}`.trim().toLowerCase();
}
