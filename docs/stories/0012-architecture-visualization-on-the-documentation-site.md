---
status: planned
date: 2026-11-02
issue: https://github.com/mgasca/calendar/issues/178
pr:
  - https://github.com/mgasca/calendar/pull/179
adrs: ["0000", "0010", "0017", "0022", "0023", "0025", "0028", "0039"]
---

# 0012 Architecture visualization on the documentation site

## Story

> As a contributor, whether a person or another agent, I need an **Architecture** section on the documentation site that shows the system's parts, how they connect, the business flows that cross them and the non-functional controls they carry, each linked to the ADRs behind it, so that I can understand the system from one place and trust that the pictures match the code and the decisions.

Tracked in issue #178. Card PR: [#179](https://github.com/mgasca/calendar/pull/179).

## Background

The documentation site ([ADR-0022](../decisions/0022-astro-starlight-documentation-ui.md), [ADR-0023](../decisions/0023-static-adr-log-publication.md)) publishes the ADR log and, since [ADR-0028](../decisions/0028-publish-user-stories-on-the-documentation-site.md), the story cards. Pull requests from this repository get a preview of the site ([ADR-0025](../decisions/0025-github-pages-pr-previews.md)). Nothing on the site shows the system as a whole: which components exist, how the web app, the API, the database, the Azure resources and CI relate, or where the 39 decisions apply. `AGENTS.md` describes the architecture in prose, and readers reconstruct the picture from the code and the ADRs every time.

The system is small enough to draw completely (a web app and an API in one container, a PostgreSQL database, a migrator, Google Identity, the Azure resources of one environment, GitHub Actions and the docs site), and its non-functional requirements are already written down: the session-cookie rules in [ADR-0027](../decisions/0027-google-oidc-bff-session.md), the least-privilege database roles in [ADR-0014](../decisions/0014-postgresql-database-engine.md) and [ADR-0031](../decisions/0031-azure-postgresql-flexible-server.md), the client-defined day in [ADR-0021](../decisions/0021-client-supplied-date-and-time-zone-define-the-day.md), the single read snapshot in [ADR-0020](../decisions/0020-aggregate-day-agenda-endpoint-as-read-model.md), the limits and concurrency rules in the story cards, and the performance rules in `AGENTS.md`. A model that carries those requirements next to the components makes them visible instead of scattered.

A first machine-readable model of the whole system was drafted locally in FINOS CALM (nodes, relationships, controls for the non-functional requirements, seven business flows and every ADR linked) while this story was being written. It is a candidate input, not a decision: the tooling is chosen by [ADR-0039](../decisions/0039-architecture-model-and-visualization-tooling.md), which this story's first PR drafts for review.

### Agreed scope

* **A model file under `docs/` is the source of truth.** Every diagram on the site is derived from it at build time. Nothing is drawn by hand and left to drift from the code or the decisions.
* **An Architecture section on the documentation site,** built from the model and published with the ADRs and the stories, including the pull-request previews. It holds:
  * a system-context view: the people, the calendar system, Google Identity, GitHub and Azure;
  * a container and deployment view: web app, API, database, migrator, the single container image, the Container Apps environment, the Key Vaults, the registry, monitoring and the docs site;
  * sequence diagrams of a few business flows: Google sign-in, viewing today, adding an event, ticking a task off, overdue triage, applying database migrations and publishing the decision log;
  * the non-functional controls (authentication, least-privilege data access, time correctness, read consistency, concurrency, request limits, observability, secrets, durability, query and client performance, accessibility) shown on the elements they apply to;
  * a link from every element to the ADRs it depends on, using the stable `adr/NNNN/` routes, and from each flow to its story card.
* **Validation is a gate.** The model is validated in `just check` and in CI, and the docs build fails on an invalid model (a schema error, a dangling reference, an ADR number that does not exist). The tool is pinned like the rest of the toolchain ([ADR-0010](../decisions/0010-toolchain-version-pins.md)); if it is a separate binary, `just doctor` checks it.
* **An ADR chooses the tooling.** [ADR-0039](../decisions/0039-architecture-model-and-visualization-tooling.md) weighs at least FINOS CALM, C4 with the Structurizr DSL, hand-written Mermaid in Markdown, LikeC4 and PlantUML or D2 against four drivers: a validatable model rather than pictures, traceability to ADRs and non-functional requirements, fit with the pinned toolchain, and rendering inside the Starlight site. It is drafted as a neutral comparison and becomes `accepted` when the maintainer approves it, in that same PR before it merges.

### Not in this story

* **Generating the model from the code** (reverse engineering). The model is written by hand and reviewed like an ADR.
* **Diagrams of cost, capacity or runtime telemetry.** The section describes structure, flows and requirements, not operations.
* **Changing the ADR or story-card formats,** or how they are published. The Architecture section is added next to them.
* **A pattern library or reuse of the model outside this repository.** If the chosen tool supports patterns or a shared hub, that is a later story.
* **Keeping the model and the ADR index in step automatically.** The model lists the ADRs it links; a test that every linked ADR exists is in scope, a tool that updates the model when an ADR changes status is not.

### Dependencies

* [ADR-0039](../decisions/0039-architecture-model-and-visualization-tooling.md) must be `accepted` before the model and the rendering are merged (PR 1). The card and the ADR travel together in PR 0.

### Acceptance criteria

1. **Given** the published documentation site, **when** I open the **Architecture** section, **then** I see a system-context view, a container and deployment view, sequence diagrams of the business flows listed in the scope, and the controls on the elements they apply to.
2. **Given** any element or flow in the Architecture section, **when** I look for the decisions behind it, **then** it links to the ADRs it depends on at their `adr/NNNN/` routes, and a flow links to its story card.
3. **Given** a pull request from this repository that changes the model, **when** CI runs, **then** the model is validated and the pull-request preview shows the regenerated diagrams.
4. **Given** a model with a schema error, a dangling reference or an ADR number that does not exist, **when** `just check` runs, **then** it fails and names the problem.
5. **Given** the chosen tool, **when** `just doctor` runs on a machine where the pinned version is missing or different, **then** it says so, unless the tool is a workspace dependency installed by `pnpm install`.
6. **Given** the Architecture section, **when** it is read on a phone or with a screen reader, **then** every diagram has a text alternative (a table or list of the same elements and relationships), and the pages pass the site's existing accessibility lint.
7. **Given** [ADR-0039](../decisions/0039-architecture-model-and-visualization-tooling.md), **when** the maintainer approves the decision, **then** it is `accepted` in that same PR before it merges, and the implementation PR references it.
8. **Given** the change is complete, **when** I run `just check`, **then** it passes, including the model validation.

## Design decisions

### Architecture Decision Records

| ADR | Decision | Why it matters for this story |
| --- | --- | --- |
| [0000](../decisions/0000-use-markdown-architectural-decision-records.md) | MADR ADRs in `docs/decisions`, validated by `just adr-check` | The model links ADRs by number, so it depends on the numbering and the index staying valid. |
| [0010](../decisions/0010-toolchain-version-pins.md) | Pin toolchain versions | The chosen tool is pinned the same way, and `just doctor` checks a separate binary. |
| [0017](../decisions/0017-dotnet-file-based-apps-for-repo-tooling.md) | Repo tooling scripts are .NET file-based apps | Any glue outside the docs app's own build is a .NET file-based app, not a shell or Node script. |
| [0022](../decisions/0022-astro-starlight-documentation-ui.md) | Astro and Starlight for the documentation UI | The Architecture section is rendered by the Starlight site, not by a second site. |
| [0023](../decisions/0023-static-adr-log-publication.md) | Static site built from the canonical Markdown, published from `main` | The model lives in the repository and the site is built from it; the `adr/NNNN/` routes are the link targets. |
| [0025](../decisions/0025-github-pages-pr-previews.md) | Pull-request previews of the site | A model change is reviewed on its preview. |
| [0028](../decisions/0028-publish-user-stories-on-the-documentation-site.md) | Stories published with the ADRs | Flows link to story cards at `stories/NNNN/`. |
| [0039](../decisions/0039-architecture-model-and-visualization-tooling.md) | Architecture model and visualization tooling | Chooses the tool this story implements; drafted in PR 0, accepted on approval. |

[ADR-0039](../decisions/0039-architecture-model-and-visualization-tooling.md) is the new ADR this story needs. It is drafted with the `adr-draft` skill in the same PR as this card.

### Other decisions (not ADR-worthy)

* **The model lives in `docs/architecture/`,** next to `docs/decisions/` and `docs/stories/`, because it is documentation that reviewers read and the site builds from, not product code.
* **Diagrams are generated at build time, never committed as images.** The model is reviewable text; a committed image would be a second source of truth. If the chosen tool renders through a headless browser, the render step runs in the docs build so that previews and production use the same output.
* **Every diagram has a text alternative.** The same generation step emits a table or list of the diagram's elements, so the section is usable without the picture.
* **The Architecture section lists the ADRs it links in one place,** so a reader (and a test) can see which decisions the model covers and which it does not.

## Implementation notes

*Planned. This section is completed as the story is built.*

### Where things live

| Area | Location |
| --- | --- |
| Architecture model and its schemas | `docs/architecture/` |
| Rendering into the site | `frontend/apps/docs/` (content loader and pages, alongside the ADR and story loaders in `src/lib/`) |
| Validation recipe and doctor check | `justfile`, `tools/doctor/doctor.sh` |
| CI gate | `.github/workflows/ci.yml` (Frontend job, with the docs build) |

### API

No changes.

### Testing

* Docs-site tests (Vitest) for the loader: the model parses, every linked ADR and story exists, every flow references existing relationships, and the generated pages contain the expected elements and links.
* The tool's own validation in `just check`, with a test that a deliberately broken fixture fails it.
* The existing docs build checks at the root path and at a project subpath cover the new pages' links.

### Lessons learned, known issues and follow-ups

* Filled in on delivery.

## User guide

*Planned behaviour. This section is finalised when the story is implemented.*

### Reading the architecture

Open the documentation site and choose **Architecture** in the sidebar. The overview shows who uses the calendar and which outside services it depends on. Choose **Containers** to see the parts that run (the web app and API in their container, the database, the migrator and the Azure resources) and how they connect. Choose a **flow**, such as **Google sign-in** or **Triage all overdue tasks**, to follow one activity step by step across those parts. Each part lists the **controls** it must satisfy, such as the sign-in rules or the limits on a request, and links to the **decisions** (ADRs) that explain why. Every diagram has a table beneath it with the same information, so it can be read without the picture.
