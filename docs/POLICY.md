# YogaFlow Product & Content Policy

> **Status:** Final draft for human review (2026-11-05).
> **Sources:** [SDD v1.0 Final Design](planning/Lab_HW1_YogaFlow_SDD_Final.docx), [Implementation Plan v1.4](planning/Lab3_YogaFlow_Plan.docx), GitHub Issues #6–#24 and the [YogaFlow Development Project](https://github.com/users/iimpandeyy/projects/1).
> **Precedence:** The SDD is authoritative (DD-06). This policy cannot add product scope. Changes need a documented human decision.

## 1. Users, roles, and permissions

| Role | What they can do | Source |
|---|---|---|
| **App user** (beginner or regular wellness user; assumed adult) | Browse, search, and filter practices. Open practice details. Save and remove Favorites. Add and remove Routine items. **There is no sign-in, and no account exists.** Saved items stay in that user's browser only. | SDD §1.2, §3; ASSUMPTION-01; OQ-01 |
| **Project owner** (human) | Approves product decisions and scope changes. **The only role that may approve changes to production practice content** and turn a placeholder into reviewed content. Changes an Issue's Human Review from Pending to Reviewed after verification. Owns the Supabase and Vercel accounts and credentials. | SDD §1.2; Plan §1.4, §5, §7 |
| **Content administrator** (SDD stakeholder) | In the MVP this role is exercised by the project owner through repository seed/migration/data files. **There is no in-app content-editing role or admin UI.** | SDD §1.2; Plan §1.4 |
| **AI coding agents** | Implement only human-reviewed Issues, within this policy and the SDD. **May propose content changes as repository files**, but may not approve or publish them to production Supabase. May not change Human Review to Reviewed, expand scope, or add features silently. | Plan §1.3, §1.4, §6; RC-12; RISK-02 |

Yoga instructors and wellness coaches are stakeholders only. They have no in-app role (SDD §1.2).

## 2. Wellness and general-information boundary

- YogaFlow provides **general educational wellness information only**. It must not claim to diagnose, treat, cure, or prevent any medical condition, and it must not present itself as a substitute for professional medical advice (RC-01).
- No diagnosis or self-diagnosis prompts, no health questionnaires, no condition-based filtering, no personalized medical recommendations, and no rehabilitation programs (DD-05; SDD §2.3).
- A **visible general-wellness disclaimer** appears across the app and is reinforced on practice detail pages (US-10; #14). Its wording follows the SDD: general wellness information, not medical advice. It must not make stronger medical claims (Plan §1.4).
- YogaFlow does not replace a qualified yoga teacher, a medical professional, or individualized health advice (SDD §2.1).

## 3. Safety language

- Use neutral, non-alarmist, beginner-appropriate language. It must not imply medical authority (RC-02; Plan §6).
- Include brief caution guidance wherever a reasonable beginner could benefit from it (RC-02).
- On Practice Details, place the **Safety & Caution** section **before** the step-by-step instructions, and make it visually prominent (SDD §6.3; #13, #14).
- Caution text tells users to **stop if they experience pain or concerning symptoms** (RC-02).
- Do not convey caution by color alone. Use a heading or icon plus text (RC-06; #14).

## 4. Privacy and data minimization

- Collect no personal health information and no personal data (RC-03).
- Favorites and Routine store **only practice identifiers**, in the user's own browser (`localStorage`). They are never sent to Supabase or any server (OQ-01; #15).
- There are no accounts, sign-in, emails, or profiles in the MVP. Account-backed persistence needs explicit owner approval and a plan revision (OQ-01).
- Add no third-party analytics, tracking scripts, or paid add-ons without owner approval (#23).
- Secrets never appear in source code, the repository (which is public), or browser code. Only the Supabase public anonymous key may reach the browser (RC-04; D6).
- Supabase production credentials and service-role keys are never stored in the repository or browser code (RC-04; Plan §1.4).
- Automated tests never touch the production/main Supabase database. They use only the separate test environment, with least-privilege credentials kept in secure environment variables or GitHub Actions secrets, never committed (Plan §1.4).

## 5. Content terminology and vocabularies

- User-facing section labels are exactly **Yoga**, **Breathwork**, **Meditation**, **Favorites**, and **Routine**. Technical or database terms never appear in user-facing copy (RC-10).
- **Difficulty:** Beginner, Intermediate, Advanced.
- **Body focus:** Full Body, Back, Hips, Legs, Shoulders, Core.
- Never force a practice into an inaccurate category. Difficulty or body focus may be omitted where it does not apply. These values change only through a documented human decision (Plan §1.4).

## 6. Content sourcing and attribution

- Externally sourced instructions or images need permission, a license, or attribution (RC-11).
- Do not scrape or copy third-party instructions or images (#8).
- AI-written instructional text or imagery that a human has not reviewed, or that is unlicensed, must be **clearly marked as placeholder/draft** (`is_placeholder`) until a human reviews it (D4; OQ-02).
- Keep the library small and curated, with a consistent schema and terminology (DD-02; RISK-03). The MVP seed is 6 Yoga, 3 Breathwork, and 3 Meditation practices.
- Images are static repository assets. Supabase Storage is not used (Plan §1.4).

### Content governance (Plan §1.4)

- Prepare content changes as version-controlled seed/migration/data files in the repository. Review them before they are applied to production Supabase.
- Only the project owner approves production content changes. AI agents may propose changes but never approve or publish them.
- A placeholder becomes reviewed content only after human review.

### Content at course release (Plan §1.4, §3.5)

- **All instructional text and safety/caution content in the course MVP must be human-reviewed.**
- Clearly marked placeholder images may remain in the course demo if final licensed imagery is not available.
- Never present unlicensed third-party images as final assets.
- Document any unresolved licensing or content-source limitation (OQ-02; #24).

## 6a. Accessibility

Core YogaFlow screens and interactions target **WCAG 2.2 AA** (Plan §1.4; RC-06; #19). This covers:
- text contrast;
- keyboard accessibility where practical;
- visible focus states;
- meaning that never depends on color alone.

## 7. Allowed and prohibited product behavior

| Allowed (MVP) | Prohibited without an SDD update or documented human decision |
|---|---|
| Browse the Yoga, Breathwork, and Meditation libraries | Sign-in, accounts, profiles, Supabase Authentication |
| Keyword search and difficulty/body-focus filters on Yoga | Search or filters beyond Yoga |
| Practice details with caution, instructions, and benefits/purpose | Medical claims, diagnosis, treatment, or personalized advice |
| Save/remove Favorites; add/remove Routine items (no duplicates) | Routine reordering or drag-and-drop (OQ-03); multiple named routines |
| Clear empty, loading, and failure states | Sharing, social features, comments, messaging |
| General-wellness disclaimer | Video classes, live coaching, timers or audio guidance (#13, #18) |
| Static images with attribution or placeholder labels | Unlicensed or scraped content; Supabase Storage |
| AI agents proposing content changes as repository files | AI agents approving or publishing content to production |

## 8. Non-goals (SDD §2.3)

Live video classes and one-to-one coaching · AI-generated medical or injury diagnosis or treatment recommendations · personalized medical or rehabilitation programs · wearable-device integration · payments, subscriptions, or marketplace features · social networking, messaging, comments, or public profiles · native iOS and Android apps · real-time instructor scheduling or booking · large-scale user-generated content uploads · automated pose correction by camera or computer vision · full multilingual localization.

## 9. Open policy questions (do not guess)

None of the policy questions are open. They were resolved by the owner decisions recorded in Plan v1.4 §1.4.

The final licensing model for images (OQ-02) remains unresolved by design. The release-content rule in §6 governs it until a later human decision.
