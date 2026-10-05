# TaskNest: ανάλυση & σχέδιο ανακατασκευής

Πηγή: Replit app **TaskNest Planner** (`@kostasgi92/TaskNest-Planner`), pnpm monorepo
(`artifacts/api-server`, `artifacts/tasknest`, `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`).

---

## 1. Τι κάνει η εφαρμογή σήμερα

### Ροή χρήστη
1. **Landing** (`/`, χωρίς σύνδεση): hero «Keep your day in its place.» με κουμπιά *Create your nest* → `/sign-up` και *Sign in* → `/sign-in`.
2. **Auth**: Clerk (`<SignIn/>`, `<SignUp/>` με custom theme). Με το πρώτο `GET /categories` ο server δημιουργεί αυτόματα την κατηγορία **Personal** (`#e5b94f`).
3. **My tasks** (`/`): heading, StatRibbon (To do / Today / Done / Overdue), λίστα ενεργών tasks με υποεργασίες, **Widget preview** δεξιά (tasks με λήξη σήμερα, έως 6), ενότητα «Completed · N» και κουμπί *Clear done*.
4. **Κατηγορία** (`/category/:id`): ίδια σελίδα φιλτραρισμένη· αν δεν υπάρχει η κατηγορία, εμφανίζεται κατάσταση «Category not found» με *Back to my tasks*.
5. **Task composer** (modal, bottom sheet σε κινητό): title, category, «Nest under» (γονικό task, μόνο top-level), importance (high/medium/low), deadline, reminder (`datetime-local`), λίστα items (bullet points), notes.
   - Το draft αποθηκεύεται στο `localStorage` (`tasknest:draft:{userId}:{taskId|new}:{categoryId|all}`).
   - Το ότι ήταν ανοιχτό το modal «new» αποθηκεύεται στο `sessionStorage` και ανοίγει ξανά μετά από refresh.
6. **TaskRow**: toggle complete, toggle ανά bullet item, menu (Edit / Delete με `confirm`), badge importance, χρώμα κατηγορίας, due label («Today · 14:00», «Tomorrow · …», «Oct 5»), κόκκινο αν έχει λήξει, εικονίδιο καμπάνας αν έχει reminder.
7. **Settings** (`/settings`): CRUD κατηγοριών (όνομα + 6 χρώματα), διαγραφή με cascade των tasks, δύο διακόπτες (*Home screen widget*, *Gentle reminders*) που αποθηκεύονται μόνο στο `localStorage`.
8. **Shell**: sidebar σε desktop (brand, nav, έως 6 κατηγορίες με μετρητή ενεργών, ένδειξη sync μέσω `/healthz`), drawer + bottom nav σε κινητό, account avatar που κάνει sign-out.
9. Η cache του React Query καθαρίζει όταν αλλάζει ο χρήστης· τα query keys περιέχουν το `userId`.

### Μοντέλο δεδομένων (PostgreSQL / Drizzle)
| Πίνακας | Στήλες |
|---|---|
| `categories` | `id serial PK`, `user_id text` (default `'legacy'`), `name text`, `color text` (default `#5E61E8`) |
| `tasks` | `id serial PK`, `user_id text`, `category_id int FK → categories ON DELETE CASCADE`, `parent_id int` (**χωρίς FK**), `title`, `notes`, `bullet_points text[]`, `bullet_point_completed boolean[]`, `importance text` (low/medium/high), `due_at timestamptz`, `reminder_at timestamptz`, `completed bool`, `created_at`, `completed_at` |

### API (`/api`, όλα εκτός από το healthz απαιτούν Clerk)
| Method | Path | Σημειώσεις |
|---|---|---|
| GET | `/healthz` | `{status:"ok"}` |
| GET | `/categories` | με `taskCount`, `completedCount`· seed «Personal» |
| POST | `/categories` | `{name, color?}` → 201 |
| PATCH | `/categories/:id` | `{name?, color?}` |
| DELETE | `/categories/:id` | cascade tasks → 204 |
| GET | `/tasks?categoryId&status=active\|completed\|all&due=today\|upcoming\|all` | sort: completed, dueAt, createdAt |
| POST | `/tasks` | ελέγχει category/parent ownership |
| PATCH | `/tasks/:id` | trim/filter bullets, κανονικοποίηση `bulletPointCompleted`, `completedAt` |
| DELETE | `/tasks/:id` | αναδρομική διαγραφή υποδέντρου |
| DELETE | `/tasks/completed?categoryId` | καθαρισμός ολοκληρωμένων |
| GET | `/summaries/dashboard` | active/completed/dueToday/overdue/categoryCount |
| GET | `/summaries/widget` | `dateLabel` + έως 5 tasks που λήγουν σήμερα |

### Design system
- Παλέτα: ζεστό χαρτί (`hsl(39 35% 94%)`), navy primary (`218 27% 24%`), mustard accent (`43 91% 66%`), sage για τα completed (`#6e9b89`)· υπάρχει πλήρες dark theme.
- Γραμματοσειρές: **Newsreader** (serif headings), **Manrope** (UI), **DM Mono** (eyebrows/labels).
- Μεγάλα radius (1.15rem, modals 28px), grain overlay, animations `tasknest-rise` / `tasknest-pop`, safe-area για mobile.
- Χρώματα κατηγοριών: `#e5b94f #d17e62 #6e9b89 #7895b2 #9b82ab #c38d56`.
- Το Playwright e2e βασίζεται σε `data-testid`, που θα διατηρηθούν **αυτούσια**.

---

## 2. Προβλήματα που βρέθηκαν

### Bugs (επηρεάζουν τον χρήστη)
1. **Το «Clear done» μάλλον δεν δουλεύει.** Το `DELETE /tasks/:id` δηλώνεται *πριν* από το `DELETE /tasks/completed`, οπότε το Express ταιριάζει πρώτα το `:id="completed"`, η επικύρωση αποτυγχάνει και επιστρέφει 400.
2. **Η ώρα μετατοπίζεται στην επεξεργασία.** Το composer κάνει `initialTask.dueAt.slice(0,16)` σε ISO **UTC** και το περνάει σε `datetime-local`, που ερμηνεύεται ως **τοπική** ώρα. Σε Ελλάδα (UTC+3) κάθε αποθήκευση πάει το deadline/reminder 3 ώρες πίσω.
3. **Αόρατες υποεργασίες.** Οι λίστες active/completed χωρίζονται πριν φτιαχτεί το δέντρο. Μια ολοκληρωμένη υποεργασία ενεργού γονέα (ή το αντίστροφο) δεν εμφανίζεται πουθενά, αφού δεν είναι root.
4. **Ορφανά tasks.** Το `parent_id` δεν έχει FK και το «Clear done» δεν σβήνει τα παιδιά των ολοκληρωμένων γονέων. Μένουν στη βάση, μετριούνται στα stats, αλλά δεν εμφανίζονται.
5. **«Σήμερα» με τη ζώνη ώρας του server.** Τα `dayBounds()` / `dateLabel` υπολογίζονται με τη ζώνη ώρας του server και όχι του χρήστη.
6. **Hardcoded eyebrow** «Thursday, October 24» στη σελίδα My tasks.
7. Το Delete task δεν κάνει invalidate το widget query. Το widget preview σε σελίδα κατηγορίας δείχνει τον τίτλο της κατηγορίας, αλλά tasks από όλες τις κατηγορίες.

### Αρχιτεκτονική / ποιότητα
- Όλο το frontend βρίσκεται σε ένα `App.tsx` 585 γραμμών· το `src/components/ui` (shadcn) σχεδόν δεν χρησιμοποιείται.
- Business logic μέσα στους route handlers (ownership checks, `dayBounds` αντιγραμμένο σε δύο αρχεία).
- Τα counts υπολογίζονται φορτώνοντας όλα τα tasks στη μνήμη, όχι με SQL aggregates.
- Το seed «Personal» γίνεται ως side-effect ενός GET.
- `drizzle push` αντί για migrations· δεν υπάρχουν indexes σε `user_id`, `category_id`, `parent_id`.
- Οι ρυθμίσεις widget/reminder δεν έχουν καμία λειτουργία (μόνο localStorage), και δεν στέλνονται πραγματικές υπενθυμίσεις.
- Replit-specific κομμάτια: Clerk proxy middleware, `@replit/vite-plugin-*`, `mockup-sandbox`, ετικέτα «Samsung ready».

---

## 3. Προτεινόμενη αρχιτεκτονική

**Κρατάμε** το stack (είναι ήδη σύγχρονο): TypeScript, React 19 + Vite, TanStack Query, Tailwind v4,
Express 5, Drizzle + PostgreSQL, Clerk, OpenAPI → Orval (zod + hooks).
**Αλλάζουμε** τη δομή: contract-first, layered backend, feature-based frontend, migrations, tests σε κάθε επίπεδο.

```
task-planner/
├─ package.json                 # pnpm workspaces, scripts: dev, build, typecheck, lint, test
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ biome.json                   # lint + format (ή eslint/prettier)
├─ .env.example                 # DATABASE_URL, CLERK_*, VITE_CLERK_PUBLISHABLE_KEY
├─ docker-compose.yml           # τοπική Postgres
│
├─ packages/
│  ├─ contracts/                # ΜΟΝΑΔΙΚΗ πηγή αλήθειας για το API
│  │  ├─ openapi.yaml
│  │  ├─ orval.config.ts
│  │  └─ src/generated/{zod,client}/   # παράγονται, δεν επεξεργάζονται με το χέρι
│  ├─ db/
│  │  ├─ drizzle.config.ts
│  │  ├─ migrations/            # drizzle-kit generate (όχι push)
│  │  └─ src/
│  │     ├─ client.ts
│  │     ├─ schema/{categories,tasks,index}.ts
│  │     └─ seed.ts
│  └─ domain/                   # pure TS, χωρίς I/O, κοινό σε web & api
│     └─ src/
│        ├─ dates.ts            # dayBounds(tz), formatDue, toLocalInput/fromLocalInput
│        ├─ tasks.ts            # buildTaskTree, normalizeBullets, isOverdue
│        ├─ constants.ts        # importance, categoryColors, DEFAULT_CATEGORY
│        └─ *.test.ts
│
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ server.ts           # listen
│  │  │  ├─ app.ts              # createApp(deps): middleware + routers
│  │  │  ├─ config/env.ts       # zod-validated env
│  │  │  ├─ middleware/{auth,error-handler,request-context}.ts
│  │  │  ├─ lib/{logger,http-errors}.ts
│  │  │  └─ modules/
│  │  │     ├─ health/health.routes.ts
│  │  │     ├─ categories/
│  │  │     │  ├─ categories.routes.ts      # HTTP ⇄ zod contracts
│  │  │     │  ├─ categories.service.ts     # κανόνες (seed Personal, cascade)
│  │  │     │  └─ categories.repository.ts  # Drizzle queries + SQL aggregates
│  │  │     ├─ tasks/{tasks.routes,tasks.service,tasks.repository}.ts
│  │  │     └─ summaries/{summaries.routes,summaries.service}.ts
│  │  └─ test/                  # vitest + supertest σε πραγματική Postgres (testcontainers)
│  │
│  └─ web/
│     ├─ index.html, vite.config.ts, public/logo.svg
│     ├─ e2e/                   # Playwright, ίδια data-testid
│     └─ src/
│        ├─ main.tsx
│        ├─ app/
│        │  ├─ App.tsx           # providers μόνο
│        │  ├─ providers.tsx     # Clerk, QueryClient, Tooltip, Toaster
│        │  ├─ router.tsx        # wouter routes + auth gate
│        │  └─ query-keys.ts     # accountQueryKey, invalidateTaskViews()
│        ├─ styles/{tokens.css,globals.css}   # ίδια παλέτα, γραμματοσειρές, animations
│        ├─ components/
│        │  ├─ ui/              # shadcn (dialog, select, switch, dropdown-menu...)
│        │  └─ layout/{AppShell,Sidebar,MobileDrawer,BottomNav,Brand,AccountMenu,PageHeading}.tsx
│        ├─ features/
│        │  ├─ auth/{LandingPage,SignInPage,SignUpPage,useUserCacheReset}.tsx
│        │  ├─ tasks/
│        │  │  ├─ api.ts          # wrappers γύρω από τα generated hooks + invalidation
│        │  │  ├─ pages/TaskPage.tsx
│        │  │  ├─ components/{TaskList,TaskRow,TaskComposer,ItemEditor,StatRibbon,EmptyState,SkeletonList}.tsx
│        │  │  └─ hooks/{useTaskComposerDraft,useComposerOpenState}.ts
│        │  ├─ categories/{api.ts, components/CategoryForm.tsx, components/CategoryList.tsx}
│        │  ├─ widget/{WidgetPreview.tsx}
│        │  └─ settings/{SettingsPage.tsx, PreferenceRow.tsx, usePreferences.ts}
│        └─ lib/{storage.ts, cn.ts}
│
└─ docs/rebuild-plan.md
```

### Βασικές αρχές
- **Contract-first**: αλλαγή στο API ⇒ αλλάζει το `openapi.yaml` ⇒ `pnpm codegen`. Ο server επικυρώνει με τα generated zod schemas και ο client χρησιμοποιεί τα generated hooks.
- **Layers στο API**: `routes` (HTTP μόνο) → `service` (κανόνες, ownership) → `repository` (SQL). Τα errors γίνονται `HttpError` και τα χειρίζεται ένας κεντρικός error handler.
- **Ζώνη ώρας**: ο client στέλνει header `X-Timezone` (IANA) και ο server υπολογίζει «σήμερα» με αυτήν.
- **Βάση**: FK `tasks.parent_id → tasks.id ON DELETE CASCADE`, `CHECK importance IN (...)`, indexes `(user_id)`, `(user_id, category_id)`, `(parent_id)`. Η αναδρομική διαγραφή γίνεται από τη βάση.
- **Frontend**: κάθε feature είναι αυτόνομο, χωρίς inline mega-components. Τα modals γίνονται shadcn `Dialog`/`Drawer`, που προσφέρουν focus trap και Esc. Η επιβεβαίωση γίνεται με `AlertDialog` αντί για `window.confirm`.

---

## 4. Βήματα υλοποίησης

| # | Βήμα | Παραδοτέο / έλεγχος |
|---|---|---|
| 0 | **Scaffold**: pnpm workspace, tsconfig refs, Biome, `.env.example`, docker-compose Postgres, CI workflow (typecheck + lint + test) | `pnpm typecheck` πράσινο |
| 1 | **`packages/db`**: schema 1:1 με το σημερινό + FK/indexes/check, πρώτο migration, seed | `pnpm db:migrate` σε καθαρή βάση |
| 2 | **`packages/contracts`**: μεταφορά `openapi.yaml` αυτούσιου, Orval → zod + react-query client | generated κώδικας κάνει compile |
| 3 | **`packages/domain`**: dates/tz, tree building, bullets normalization + unit tests | vitest πράσινο |
| 4 | **`apps/api`**: health → categories → tasks → summaries (με σωστή σειρά routes για `/tasks/completed`), Clerk auth, error handler, logger | integration tests ανά endpoint, ίδια JSON shapes |
| 5 | **`apps/web` θεμέλια**: providers, router, auth gate, tokens/fonts/animations, AppShell (sidebar, drawer, bottom nav) | landing + sign-in/up + κενό shell |
| 6 | **Tasks feature**: TaskPage, StatRibbon, TaskList/TaskRow, TaskComposer (draft + open-state persistence), clear done, delete | ίδια ροή με το Replit· διορθωμένο tz στο edit |
| 7 | **Categories & Settings**: CRUD, color picker, preferences | ίδια ροή |
| 8 | **Widget preview** | ίδια εμφάνιση |
| 9 | **E2E**: μεταφορά Playwright specs (`task-composer.spec.ts`, real-clerk) | e2e πράσινο |
| 10 | **Data migration** από τη Replit Postgres: `pg_dump --data-only` → import, και επαλήθευση counts | ίδια δεδομένα ανά χρήστη |
| 11 | **Deploy** (π.χ. Fly/Render/Railway για API, Vercel/Netlify για web, Neon/Supabase Postgres) | production URL |

---

## 5. Αποφάσεις που χρειάζονται έγκριση
1. **Bugs της §2**: η πρόταση είναι να διορθωθούν (η ροή χρήστη μένει ίδια, αλλάζει μόνο η λανθασμένη συμπεριφορά).
2. **Auth**: παραμένει το Clerk (πρόταση)· φεύγει το Replit Clerk proxy.
3. **Διακόπτες widget/reminders**: θα μείνουν ως έχουν (μόνο localStorage) ή θα αποθηκεύονται ανά χρήστη στη βάση; Οι πραγματικές ειδοποιήσεις (Web Push / email) είναι εκτός scope της ανακατασκευής.
4. **Hosting** στόχος μετά το Replit.
