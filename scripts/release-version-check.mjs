export function resolveReleaseDocumentCheck(currentVersion, requestedVersion) {
  const documentVersion = requestedVersion ?? currentVersion;
  const isPrereleasePreview =
    requestedVersion !== undefined &&
    currentVersion !== documentVersion &&
    currentVersion.startsWith(`${documentVersion}-`);

  return {
    documentVersion,
    surfaceVersion: isPrereleasePreview ? currentVersion : documentVersion,
    isPrereleasePreview,
  };
}

export function isModelsDevProviderCatalog(value) {
  const providers = value?.providers ?? value;
  return Boolean(
    providers &&
      typeof providers === "object" &&
      !Array.isArray(providers) &&
      Object.values(providers).some(
        (provider) => provider && typeof provider === "object" && provider.models,
      ),
  );
}
