# Ανέβασμα online (δωρεάν)

**Κόστος: 0 €/μήνα.** Η εφαρμογή χωράει άνετα στα δωρεάν πλάνα:

| Υπηρεσία | Τι κάνει | Δωρεάν πλάνο (σημειώσεις) |
|---|---|---|
| **Vercel** (Hobby) | Σερβίρει το site και τρέχει το API ως serverless function, στο ίδιο domain | Για προσωπική, μη εμπορική χρήση. Δίνει δωρεάν διεύθυνση `*.vercel.app` και HTTPS. |
| **Neon** (Free) | PostgreSQL | 0,5 GB ανά project: χιλιάδες εργασίες. «Κοιμάται» όταν δεν χρησιμοποιείται· το πρώτο αίτημα μετά από ώρα αργεί λίγο (περίπου 0,5–1 s). |
| **Clerk** (Free) | Λογαριασμοί, σύνδεση, email/Google | Το δωρεάν πλάνο καλύπτει πολύ περισσότερους χρήστες απ' όσους χρειάζεται μια προσωπική εφαρμογή. |

Προαιρετικά, ένα δικό σας domain (π.χ. `tasknest.gr`) κοστίζει περίπου 10–15 €/χρόνο. Δεν είναι απαραίτητο.

> Γιατί όχι μόνο «website version»: η εφαρμογή **ήδη** είναι website (ανοίγει σε κάθε browser,
> σε υπολογιστή και κινητό). Επειδή η πλήρης έκδοση με λογαριασμούς και βάση στήνεται δωρεάν, δεν
> χρειάστηκε να κοπεί τίποτα. Στο κινητό (π.χ. Samsung/Chrome) ανοίγετε το site, πατάτε ⋮ →
> **Προσθήκη στην αρχική οθόνη** και ανοίγει σαν κανονική εφαρμογή, με δικό της εικονίδιο.

---

## 1. Clerk (λογαριασμοί)

1. Ανοίξτε λογαριασμό στο <https://clerk.com> → **Create application** → ονομασία «TaskNest», ενεργοποιήστε Email (και, αν θέλετε, Google).
2. **Configure → API keys**: κρατήστε το **Publishable key** (`pk_…`) και το **Secret key** (`sk_…`).

## 2. Neon (βάση δεδομένων)

1. Ανοίξτε λογαριασμό στο <https://neon.tech> → **New project**, region **AWS Europe Central 1 (Frankfurt)**, Postgres 16 ή 17.
2. **Connect** → ενεργοποιήστε το **Connection pooling** → αντιγράψτε το connection string
   (`postgresql://…-pooler…/neondb?sslmode=require`).

## 3. Vercel (φιλοξενία)

1. Ανοίξτε λογαριασμό στο <https://vercel.com> με το GitHub σας → **Add New → Project** → επιλέξτε το repo `task-planner`.
2. Το Framework Preset μείνει **Other**: οι ρυθμίσεις έρχονται από το `vercel.json`.
3. Στο **Environment Variables** προσθέστε:

   | Όνομα | Τιμή |
   |---|---|
   | `DATABASE_URL` | το connection string του Neon (βήμα 2) |
   | `CLERK_SECRET_KEY` | `sk_…` |
   | `CLERK_PUBLISHABLE_KEY` | `pk_…` |
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_…` (το ίδιο) |

4. **Deploy**. Το build τρέχει πρώτα τα migrations της βάσης, οπότε οι πίνακες και οι κανόνες
   απομόνωσης (RLS) δημιουργούνται αυτόματα.
5. Όταν τελειώσει, ανοίξτε το `https://<όνομα>.vercel.app`.
6. (Συνιστάται) Προσθέστε `CLERK_AUTHORIZED_PARTIES` = `https://<όνομα>.vercel.app` και κάντε **Redeploy**.
   Έτσι το API δέχεται session tokens μόνο από το δικό σας site.

> Το function τρέχει στη Φρανκφούρτη (`fra1`), δίπλα στη βάση. Αν διαλέξατε άλλη περιοχή στο Neon,
> ορίστε `VERCEL_FUNCTION_REGION` (π.χ. `iad1` για us-east-1).

## 4. Clerk: production

Όσο χρησιμοποιείτε τα κλειδιά `pk_test`/`sk_test`, το Clerk δείχνει την ένδειξη «Development mode».
Για να φύγει:

1. Clerk → **Create production instance**.
2. Αν έχετε δικό σας domain, ακολουθήστε τις οδηγίες DNS του Clerk. Τα production κλειδιά του Clerk
   απαιτούν δικό σας domain· με σκέτο `*.vercel.app` μένετε στα development κλειδιά, που δουλεύουν
   κανονικά για προσωπική χρήση.
3. Αντικαταστήστε τα τρία `*_KEY` στο Vercel με τα `pk_live`/`sk_live` και κάντε Redeploy.

## 5. Πρώτη χρήση

Κάντε εγγραφή στη νέα εφαρμογή. Η κατηγορία «Personal» δημιουργείται αυτόματα και μπορείτε να
ξεκινήσετε να προσθέτετε εργασίες.

## Ενημερώσεις

Κάθε `git push` στο `main` κάνει αυτόματα deploy. Τα branches/PRs παίρνουν δικό τους preview URL.

> Τα preview deploys χρησιμοποιούν την **ίδια** βάση. Για πλήρη απομόνωση, στο Neon φτιάξτε ένα
> branch «preview» και ορίστε στο Vercel διαφορετικό `DATABASE_URL` για το Preview environment.
