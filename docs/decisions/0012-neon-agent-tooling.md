# ADR-0012: Use the installed Neon VS Code plugin for Neon agent tooling

- Status: Accepted
- Date: 2026-11-16

## Problem

The project needs current Neon Postgres guidance and access to Neon tools in
the IDE, without duplicating user-level MCP credentials or overwriting other
agent configuration.

## Available Alternatives

- Use the Neon VS Code plugin and its bundled agent guidance/MCP integration.
- Add project-local Neon skills and a separate project MCP config.
- Configure a global MCP server manually for every project.

## Selected Approach

Use the Neon plugin installed by `neon init` at user scope for VS Code, and
retain the Neon skills/MCP configuration the CLI installed for supported
agents. Do not create a second project-local MCP entry for the same VS Code
agent. Keep the project's `.neon` link and `neon.ts` policy as the
project-specific Neon configuration.

## Reason for Selection

The Neon setup guidance says not to install both the plugin and separate
`neon mcp`/`neon skills` entries for the same agent. User-level plugin
configuration applies to this workspace and avoids duplicating OAuth/key
configuration in repository files. Existing user-level Neon skills were
updated after the CLI reported them outdated.

## Advantages

- Avoids duplicate MCP registrations and credentials.
- Keeps OAuth and other user-level agent configuration outside Git.
- The project remains linked to its own Neon project/branch through `.neon`.

## Disadvantages

- A fresh developer machine must install the Neon plugin or run `neon init`.
- Project-only automation cannot assume every contributor has the global
  plugin installed.

## Performance Implications

Agent tooling does not affect application runtime or database query
performance.

## Future Limitations

If the team requires repository-managed agent setup, document a supported
onboarding flow and use a project-level OAuth MCP config only for agents that
do not already receive the Neon plugin. Never commit API keys or connection
strings.
