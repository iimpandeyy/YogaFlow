# YogaFlow Roadmap

> **Status:** Final draft for human review (2026-11-05).
> **Sources:** [Implementation Plan v1.5](planning/Lab3_YogaFlow_Plan.docx) and [SDD v1.0 Final Design](planning/Lab_HW1_YogaFlow_SDD_Final.docx).
>
> **GitHub Issues and the [YogaFlow Development Project](https://github.com/users/iimpandeyy/projects/1) are authoritative for detailed tasks, sequencing, status, and work tracking.** This roadmap gives the high-level direction only. If it ever disagrees with the Project, the Project wins for task details, and the SDD wins for requirements.

## Direction

YogaFlow will be built as a responsive Next.js/TypeScript/Tailwind web app hosted on Vercel.
- Practice content is served from Supabase PostgreSQL.
- Favorites and Routine are kept in local browser storage.

The build preserves the approved SDD and Figma prototype rather than redesigning them, and it stays within the course MVP (see [POLICY.md](POLICY.md) and [ARCHITECTURE.md](ARCHITECTURE.md)).

## Phases

| Phase | Goal | Major outcomes | Depends on | Issues |
|---|---|---|---|---|
| **1. Foundation** | A stable, testable base that every feature builds on | Design sources and guardrails in the repo; app with CI; content model, Supabase content store, and seed content; responsive shell, navigation, and Home; shared card and detail components | — | #6–#10 |
| **2. Yoga Discovery & Safe Practice Details** | The core discovery path, made safe and understandable | Yoga Library; search and filters with clear feedback; Practice Details; prominent Safety & Caution and the wellness disclaimer | Phase 1 | #11–#14 |
| **3. Favorites & Routine** | Personal organization with clear state feedback | Browser storage layer; Favorites; Routine (no duplicates, no reordering) | Phase 1, plus Practice Details from Phase 2 | #15–#17 |
| **4. Breathwork, Meditation & Experience Quality** | The remaining categories, and consistent quality across the app | Breathwork and Meditation libraries; responsive and accessibility hardening to WCAG 2.2 AA; performance and attribution audit | Phases 1–2 to start the Breathwork/Meditation library and detail work, which may proceed alongside Phase 3. Their Favorites/Routine integration is verified, and #18 closed, only after #16 and #17. All screens are needed for hardening. | #18–#20 |
| **5. Integrated Validation & Release** | A verified, deployed course demonstration | Automated end-to-end tests for the three verified flows; SDD validation report; Vercel deployment; defect fixes and known limitations; all instructional and safety text human-reviewed for release | Phases 1–4 | #21–#24 |

## Key dependencies

- **Supabase project (owner action).** The production Supabase project and its public configuration are needed to complete the content store (#8). This is recorded and does not block Lab 3 setup.
- **Supabase test environment (owner action).** A separate seeded test environment, with least-privilege credentials in GitHub Actions secrets, is needed before the end-to-end tests (#21). Automated tests never use the production database.
- **Content review before release.** The project owner must review all instructional and safety/caution text before the course release. Content changes reach production only with owner approval. Clearly marked placeholder images may remain, with any licensing limitations documented.
- **Practice Details comes before Favorites and Routine.** Saved collections start from the detail page and reference stable practice IDs.
- **Breathwork/Meditation integration needs Phase 3.** Their library and detail pages can be built alongside Phase 3. Saving them to Favorites/Routine can be verified, and #18 closed, only after #16 and #17 are complete.
- **Hardening and validation come last.** They need every core screen to exist.
- **Deployment is a later release step.** Preview deployments are optional and are not a prerequisite for earlier phases.

## Ground rules

- Every new Issue starts as Human Review = Pending. Work moves to Ready only after human review and once its prerequisites are complete.
- No scope beyond the SDD MVP without a documented human decision (RC-12).
