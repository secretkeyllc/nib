/** Only approved localized summaries cross into remote-host UI; never raw stderr. */
export function remoteHostErrorKey(error: unknown): string {
  let code: unknown;
  if (error && typeof error === "object") {
    code = "errorCode" in error ? error.errorCode : "code" in error ? error.code : undefined;
  }
  switch (code) {
    case "REMOTE_PATH_NOT_FOUND": return "remote:pathUnavailable";
    case "REMOTE_PATH_FORBIDDEN": return "remote:pathForbidden";
    case "HOST_VERSION_MISMATCH": return "remote:upgradeRequired";
    case "HOST_AUTH_FAILED":
    case "SSH_AUTH_FAILED":
    case "TOKEN_INVALID":
    case "PAIRING_FAILED": return "remote:authenticationRequired";
    case "HOST_DISCONNECTED":
    case "REMOTE_CONNECTION_FAILED":
    case "AGENT_UNAVAILABLE": return "remote:connectionUnavailable";
    case "REMOTE_MUTATION_OUTCOME_UNKNOWN": return "remote:mutationUncertain";
    /*
      These are the failures a folder picker actually hits, and each names a
      different next step. Falling through to "the remote operation failed"
      left the user with no way to tell a missing path from a Host that cannot
      be upgraded, which is exactly the state this picker was reported in.
    */
    case "HOST_BOOTSTRAP_FAILED": return "remote:bootstrapFailed";
    case "HOST_UNAVAILABLE":
    case "HOST_START_FAILED": return "remote:hostUnavailable";
    case "INVALID_ARGUMENT": return "remote:REMOTE_ABSOLUTE_PATH_REQUIRED";
    case "NOT_FOUND": return "remote:pathUnavailable";
    case "UNSUPPORTED": return "remote:upgradeRequired";
    default: return "remote:operationFailed";
  }
}
