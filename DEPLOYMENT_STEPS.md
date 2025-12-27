# 🚀 Guida al Deployment della Dashboard Gestionale

## ✅ Verifica Pre-Deployment

Tutti i moduli del server sono stati verificati e funzionano correttamente:
- ✅ evidenceService
- ✅ assessmentTemplateService
- ✅ workflowService
- ✅ reviewService
- ✅ pdfService
- ✅ Tutti i routes (organizations, specialists, assessments, evidence, workflow, reports)

## 📋 Step 1: Verifica Branch su Render

1. Accedi al tuo account Render
2. Vai alle impostazioni del servizio "certicredia"
3. Verifica che il **Branch** sia impostato su:
   - `claude/complete-dashboard-features-S2VLq` (branch con tutte le modifiche)
   - OPPURE `main` (se è stato fatto il merge)

4. Se il branch è sbagliato, cambialo e salva (questo triggerera un redeploy automatico)

## 📋 Step 2: Verifica Log di Deployment

1. Su Render, vai alla sezione "Logs"
2. Cerca errori durante il deployment
3. Il server dovrebbe partire senza errori di moduli mancanti

**Errori comuni da cercare:**
- ❌ `Cannot find module` → Se vedi questo, il branch non è aggiornato
- ❌ `does not provide an export named` → Branch non aggiornato
- ✅ `Server running on port 3000` → Tutto OK!

## 📋 Step 3: Seed Database con Dati Demo

### Opzione A: Via Neon.tech SQL Editor (Consigliato)

1. Accedi a [Neon.tech](https://console.neon.tech)
2. Seleziona il database `certicrediadb`
3. Vai su "SQL Editor"
4. **IMPORTANTE**: Prima resetta le tabelle accreditation:

```bash
# Dalla tua macchina locale con DATABASE_URL configurato
DATABASE_URL='postgresql://certicredia_owner:npg_SMH18TKfIrFt@ep-cold-wind-ag7yerv6-pooler.c-2.eu-central-1.aws.neon.tech/certicrediadb?sslmode=require&channel_binding=require' node scripts/resetAccreditationTables.js
```

5. Poi seed i dati demo:

```bash
DATABASE_URL='postgresql://certicredia_owner:npg_SMH18TKfIrFt@ep-cold-wind-ag7yerv6-pooler.c-2.eu-central-1.aws.neon.tech/certicrediadb?sslmode=require&channel_binding=require' node scripts/seedSimpleDemo.js
```

**Output atteso:**
```
🌱 Seeding simple demo data...
🏢 Creating organizations...
✅ Created organizations
📦 Creating products...
✅ Created products
📧 Creating contacts...
✅ Created 5 contacts
✅ Simple demo data seeding completed!
```

### Opzione B: Via Render Shell (se hai accesso)

1. Su Render, vai al servizio "certicredia"
2. Clicca su "Shell" nel menu
3. Esegui:

```bash
node scripts/resetAccreditationTables.js
node scripts/seedSimpleDemo.js
```

## 📋 Step 4: Verifica Dashboard

1. Naviga su `https://tuo-dominio.onrender.com/admin.html`
2. Fai login con credenziali admin
3. Nella sidebar sinistra, sotto "Moduli Accreditamento", clicca su "Organizzazioni"
4. Dovresti vedere la pagina `/dashboard-organizations.html` con:
   - ✅ 10 organizzazioni nella tabella
   - ✅ Filtri funzionanti (nome, tipo, status, città)
   - ✅ Pulsante "+ Nuova Organizzazione"
   - ✅ Icone Edit/View/Delete per ogni organizzazione

## 📋 Step 5: Test CRUD Organizzazioni

### Test Create:
1. Clicca "+ Nuova Organizzazione"
2. Compila il form:
   - Nome: Test Organization
   - Tipo: Private Company
   - VAT: IT12345678900
   - Email: test@test.it
   - Indirizzo, Città, CAP, Paese
   - Status: Active
3. Clicca "Salva"
4. Dovresti vedere un messaggio di successo (toast verde)
5. La nuova organizzazione appare nella tabella

### Test Read/View:
1. Clicca l'icona "occhio" su una organizzazione
2. Dovresti vedere il modal con tutti i dettagli

### Test Update:
1. Clicca l'icona "matita" su una organizzazione
2. Modifica alcuni campi
3. Clicca "Salva"
4. Verifica che le modifiche siano salvate

### Test Delete:
1. Clicca l'icona "cestino" su una organizzazione di test
2. Conferma l'eliminazione
3. L'organizzazione scompare dalla tabella

### Test Filters:
1. Digita un nome nella barra di ricerca → filtra in tempo reale
2. Seleziona un tipo → mostra solo quel tipo
3. Seleziona uno status → mostra solo quel status
4. Digita una città → filtra per città

## 📋 Step 6: Test Logout (senza alert!)

1. Clicca il pulsante "Logout" in alto a destra
2. **NON** dovrebbe apparire nessun alert/confirm
3. Dovresti essere reindirizzato alla homepage

---

## 🐛 Troubleshooting

### Problema: "Non vedo le organizzazioni"
**Soluzione:**
- Verifica che il seed sia stato eseguito con successo
- Controlla i log del browser (F12 → Console) per errori API
- Verifica che l'endpoint `/api/organizations` risponda correttamente

### Problema: "Errore 404 su /api/organizations"
**Soluzione:**
- Il server non ha le routes registrate
- Verifica che il branch deployato sia quello corretto
- Controlla i log di Render per errori di import

### Problema: "CORS error"
**Soluzione:**
- Verifica che `CORS_ORIGIN=*` sia impostato nelle variabili d'ambiente di Render
- Oppure imposta `CORS_ORIGIN=https://tuo-dominio.onrender.com`

### Problema: "Unauthorized" su tutte le chiamate API
**Soluzione:**
- Il token JWT non è valido
- Rilogga come admin
- Verifica che `JWT_SECRET` sia impostato su Render

---

## 📊 Dati Demo Inclusi

### 10 Organizzazioni:
- 5x Private Companies (TechCorp, Finance Bank, HealthSys, Retail Group, Energy Plus, StartupInnovation)
- 2x Public Entities (Ministero Difesa, Regione Lombardia)
- 2x Non-Profit (Università Bologna, Croce Rossa Italiana)
- Mix di status: active, suspended, pending

### 5 Products:
- Corso ISO 27001 Implementation (€2,500 - 3 giorni)
- Workshop GDPR Compliance (€1,500 - 2 giorni)
- Corso Ethical Hacking (€3,200 - 5 giorni)
- Cloud Security Assessment (€2,800 - 4 giorni)
- Incident Response Training (€2,200 - 3 giorni)

### 5 Contacts:
- Mix di tipologie: COMPANY, SPECIALIST
- Stati diversi: new, contacted, closed

---

## ✅ Checklist Finale

- [ ] Branch corretto deployato su Render
- [ ] Server parte senza errori (check logs)
- [ ] Database resetato e seedato
- [ ] `/admin.html` accessibile
- [ ] Link "Organizzazioni" visibile in sidebar
- [ ] `/dashboard-organizations.html` mostra 10 organizzazioni
- [ ] CRUD completo funziona (Create, Read, Update, Delete)
- [ ] Filtri funzionano correttamente
- [ ] Logout senza alert
- [ ] Nessun errore in console browser

---

Se hai seguito tutti gli step e continua a non funzionare, controlla:
1. Log di Render per errori di deployment
2. Console browser (F12) per errori JavaScript o API
3. Che il DATABASE_URL sia corretto nelle env vars di Render
