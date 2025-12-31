# Fix: "Nessuna organizzazione associata a questo utente"

## Problema

Quando un utente con ruolo `organization_admin` o `organization_operator` tenta di accedere al proprio dashboard organization (`/api/organizations/me`), riceve l'errore:

```json
{
  "success": false,
  "message": "Nessuna organizzazione associata a questo utente"
}
```

## Causa Root

Il problema si verifica quando:

1. **Utente creato** - Un utente viene creato con ruolo `organization_admin` (es. da `seedDemoUsers.js`)
2. **Organizzazione mancante** - NON viene creata un'organizzazione corrispondente
3. **Associazione mancante** - NON viene creata entry in tabella `organization_users`

Il risultato è che l'utente ha il ruolo corretto, ma il database non sa a quale organizzazione appartiene.

## Come Funziona il Sistema

### Schema Database

```sql
-- Utente con ruolo organization_admin
users (
  id: 123,
  email: 'admin@example.com',
  role: 'organization_admin'  ← Ruolo corretto
)

-- Organizzazione
organizations (
  id: 456,
  name: 'Example Corp',
  email: 'admin@example.com'
)

-- CRITICO: Associazione many-to-many
organization_users (
  organization_id: 456,  ← Link all'organizzazione
  user_id: 123,          ← Link all'utente
  role: 'admin'
)
```

### Endpoint `/api/organizations/me`

Il codice in `organizationController.js:256-282`:

```javascript
export const getMyOrganizationHandler = async (req, res) => {
  const organization = await getOrganizationByUserId(req.user.id);

  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Nessuna organizzazione associata a questo utente'
    });
  }

  res.json({ success: true, data: organization });
};
```

E la query in `organizationService.js:428-448`:

```javascript
export const getOrganizationByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT o.*
     FROM organizations o
     INNER JOIN organization_users ou ON o.id = ou.organization_id
     WHERE ou.user_id = $1   ← Cerca nella tabella junction
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};
```

**Se non c'è entry in `organization_users`, la query ritorna `null` → errore 404.**

## Soluzione

### Opzione 1: Fix Automatico (Consigliato)

Esegui lo script di fix che crea automaticamente organizzazioni e associazioni:

```bash
# 1. Installa dipendenze se necessario
npm install

# 2. Verifica lo stato attuale (opzionale)
node scripts/verify-organization-users.js

# 3. Applica il fix automatico
node scripts/fix-organization-users.js
```

Lo script:
- ✅ Trova tutti gli utenti `organization_admin/operator` senza organizzazione
- ✅ Crea un'organizzazione per ciascuno (se non esiste)
- ✅ Crea l'associazione in `organization_users`
- ✅ Mostra un riepilogo delle operazioni

### Opzione 2: Fix Manuale (SQL)

Se preferisci fare il fix manualmente:

```sql
-- 1. Trova utenti senza organizzazione
SELECT u.id, u.email, u.name, u.company
FROM users u
WHERE u.role IN ('organization_admin', 'organization_operator')
AND NOT EXISTS (
  SELECT 1 FROM organization_users ou WHERE ou.user_id = u.id
);

-- 2. Crea organizzazione (esempio per organization@certicredia.test)
INSERT INTO organizations (
  name, organization_type, email, status, verified,
  address, city, postal_code, country
)
VALUES (
  'Enterprise SRL',           -- Nome organizzazione
  'PRIVATE_COMPANY',          -- Tipo
  'organization@certicredia.test',  -- Email
  'active',                   -- Status
  true,                       -- Verified
  'Via Po 234', 'Torino', '10124', 'Italia'
)
RETURNING id;  -- Annota l'ID restituito (es. 999)

-- 3. Crea associazione (usa l'ID dell'organizzazione appena creata)
INSERT INTO organization_users (organization_id, user_id, role)
SELECT 999, u.id, 'admin'
FROM users u
WHERE u.email = 'organization@certicredia.test';
```

### Opzione 3: Usa seedEnhancedDemoData.js

Il seed completo crea già tutto correttamente:

```bash
node scripts/seedEnhancedDemoData.js
```

Questo crea:
- Utenti: `admin@techcorp.it`, `admin@financebank.it`, ecc.
- Organizzazioni: TechCorp S.p.A., Finance Bank Italia, ecc.
- Associazioni: Tutte le entries in `organization_users`

## Verifica

Dopo il fix, verifica che funzioni:

```bash
# 1. Avvia il server
npm start

# 2. Login come organization user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organization@certicredia.test","password":"Org123!@#"}'

# Copia il token dalla risposta

# 3. Test endpoint /api/organizations/me
curl http://localhost:3000/api/organizations/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Dovrebbe restituire:
# {
#   "success": true,
#   "data": {
#     "id": 999,
#     "name": "Enterprise SRL",
#     ...
#   }
# }
```

## Prevenzione

Per evitare questo problema in futuro:

1. **Usa sempre transazioni** quando crei utenti organization_admin:
   ```javascript
   await client.query('BEGIN');
   // 1. Crea utente
   // 2. Crea organizzazione
   // 3. Crea associazione organization_users
   await client.query('COMMIT');
   ```

2. **Usa il handler `registerOrganizationHandler`** in `organizationController.js:289-419` che fa tutto atomicamente

3. **Controlla sempre** con lo script di verifica dopo aver fatto seed del database

## File Coinvolti

- `scripts/verify-organization-users.js` - Script di verifica
- `scripts/fix-organization-users.js` - Script di fix automatico
- `modules/organizations/controllers/organizationController.js` - Endpoint handler
- `modules/organizations/services/organizationService.js` - Query database
- `core/database/schema/accreditation_schema.sql` - Definizione tabelle

## Riferimenti

- Issue: Dashboard Organization non funziona
- Tabella: `organization_users` (lines 84-95 in `accreditation_schema.sql`)
- Endpoint: `GET /api/organizations/me` (line 75 in `organizationRoutes.js`)
- Handler: `getMyOrganizationHandler` (lines 256-282 in `organizationController.js`)
- Service: `getOrganizationByUserId` (lines 428-448 in `organizationService.js`)
