# ADR: Remote workspace attachment copies

- Status: Accepted for implementation
- Scope: Local-Agent remote workspace mode
- Amends: [Local Agent remote workspace tools](local-agent-remote-workspace-tools.md)

## Context

Desktop imports attachments into its local session scratch. Workspace tools for a
remote project run on the paired Host, so a Desktop path such as `C:\Users\...`
is not readable by the remote Linux runner. Vision images can already travel as
inline model input, which masked the missing file transfer for text attachments.

## Decision

Keep the Agent, model requests, credentials, and transcript on Desktop. Upload
attachment copies to the selected Host before model dispatch through the optional,
owner-only `workspaceAttachments` RACP service. Sequential bounded chunks carry
bytes only; completion checks the declared size and SHA-256 before publication.

The Host stores ready copies outside the project, mirroring the Desktop storage
layout 1:1 so a local path maps onto the remote path with no renaming: pasted
sources land at `~/.nib/scratch/<hostSessionId>/pasted/<fileName>` under the raw
Desktop session id (no device hash, no digest prefix), and content-addressed
blobs land at `~/.nib/attachments/<sha256>` exactly as on the Desktop. The
upload request carries the Desktop `directory` kind and omits the workspace path
whenever the session has no bound project — a connected host alone is enough to
upload, because the Desktop derives the host key from its
`remote:<hostKey>:<hostSessionId>` session id and sends the bare host session
id, so the mirrored scratch directory equals the one the local scratch rule
names. The Rust runner derives the attachment root from its own data directory
and the same raw session id; clients cannot supply another allowed root. Only
Read, Glob, and Grep gain the session scratch root. Bash retains its existing
remote-user OS permissions and may use the returned absolute path for
processing; this does not introduce a shell sandbox. When a bound project path
is supplied, the project-overlap guard still applies. The Composer stays silent
about uploads (the local flow is equally silent); upload failures surface as
ordinary turn errors.

Keep the local attachment `ref` for Desktop preview and resend. Persist a separate
`remoteRef` with Host key, workspace identity, and verified Host path. Runtime
history projection uses it only for the matching Host/workspace. Images retain
inline model delivery while also gaining a remote file copy.

Incomplete uploads are connection-owned and cleaned after abort, disconnect, or
Incomplete uploads are connection-owned and cleaned after abort, disconnect, or
expiry. Ready copies remain for historical reads until explicit Host storage
cleanup. Removing a local transcript or pairing does not silently delete files on
the remote machine. Unsupported Hosts fail with an upgrade error rather than
sending an unusable Desktop path to the model.
## Alternatives

- Local attachment tool routing would create a second filesystem authority inside
  a remote tool session and would not make attachments available to remote scripts.
- Writing attachments into the project would pollute Git working trees and risks
  colliding with user files.
- Moving the Agent to the Host is a separate execution-mode feature. It requires
  independent session, credential, reconnect, and migration design and is deferred.

## Validation

The isolated local-Agent acceptance script transfers a multi-chunk text file over
real RACP, retries the same content, persists its reference through a real local
Rust Host restart, and has a model fixture read the remote copy using real Rust
tools. Unit tests cover digest/size failures, connection ownership, scratch
containment, and existing image behavior. Real Windows/macOS-to-Linux SSH release
qualification remains separate from loopback acceptance.
