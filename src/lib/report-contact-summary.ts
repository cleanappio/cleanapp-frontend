type OrganizationSource = { organization?: string; organization_name?: string; website?: string };
type ContactSummary = {
  escalation_targets?: OrganizationSource[];
  contact_observations?: OrganizationSource[];
};

/** Public organization context never substitutes for proof that a notification was sent. */
export function reportOrganizations(strategy: ContactSummary | null): string[] {
  const organizations = new Set<string>();
  const sources = [...(strategy?.escalation_targets || []), ...(strategy?.contact_observations || [])];
  for (const source of sources) {
    const organization = (source.organization || source.organization_name || "").trim();
    if (organization && !organization.includes("@")) {
      organizations.add(organization);
      continue;
    }
    if (source.website) {
      try {
        const url = new URL(source.website);
        if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) {
          organizations.add(url.hostname.replace(/^www\./, ""));
        }
      } catch { /* An invalid website does not establish an organization. */ }
    }
  }
  return [...organizations];
}
