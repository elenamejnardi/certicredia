-- Simple demo data for CertiCredia Dashboard
-- This script adds more demo data to test the dashboard functionalities

-- Insert additional organizations
INSERT INTO organizations (name, type, vat_number, address, city, postal_code, country, status, contact_email)
VALUES
  ('TechCorp Italia SpA', 'corporate', 'IT12345678901', 'Via Roma 123', 'Milano', '20100', 'IT', 'active', 'info@techcorp.it'),
  ('Finance Bank SRL', 'corporate', 'IT98765432109', 'Corso Vittorio 45', 'Roma', '00100', 'IT', 'active', 'contact@financebank.it'),
  ('HealthSys Italia', 'corporate', 'IT11223344556', 'Via Torino 78', 'Torino', '10100', 'IT', 'active', 'info@healthsys.it'),
  ('Retail Group SpA', 'corporate', 'IT66778899001', 'Piazza Maggiore 12', 'Bologna', '40100', 'IT', 'active', 'contact@retailgroup.it'),
  ('Energy Plus SRL', 'corporate', 'IT55443322110', 'Via Napoli 34', 'Napoli', '80100', 'IT', 'suspended', 'info@energyplus.it'),
  ('Ministero Difesa', 'government', 'IT00000000001', 'Via XX Settembre 8', 'Roma', '00187', 'IT', 'active', 'dip@difesa.it'),
  ('Regione Lombardia', 'government', 'IT11111111112', 'Piazza Città di Lombardia 1', 'Milano', '20124', 'IT', 'active', 'info@regione.lombardia.it'),
  ('Università Bologna', 'non_profit', 'IT22222222223', 'Via Zamboni 33', 'Bologna', '40126', 'IT', 'active', 'info@unibo.it'),
  ('Croce Rossa Italiana', 'non_profit', 'IT33333333334', 'Via Ramazzini 22', 'Roma', '00151', 'IT', 'active', 'info@cri.it'),
  ('StartupInnovation SRL', 'corporate', 'IT44444444445', 'Via Startup 1', 'Milano', '20100', 'IT', 'pending', 'hello@startup.it')
ON CONFLICT (vat_number) DO NOTHING;

-- Insert more products/certifications
INSERT INTO products (name, slug, description, price, category, duration, active)
VALUES
  ('ISO 27001 Foundation', 'iso-27001-foundation', 'Corso introduttivo ISO 27001 per comprendere i fondamenti della sicurezza delle informazioni', 1500, 'ISO', '3 giorni', true),
  ('GDPR Compliance', 'gdpr-compliance', 'Corso completo sulla conformità GDPR e protezione dei dati personali', 1800, 'Privacy', '2 giorni', true),
  ('Ethical Hacking Advanced', 'ethical-hacking-advanced', 'Corso avanzato di ethical hacking con laboratori pratici', 3200, 'Security', '5 giorni', true),
  ('Cloud Security AWS', 'cloud-security-aws', 'Sicurezza su piattaforma AWS con certificazione finale', 2900, 'Cloud', '4 giorni', true),
  ('Incident Response', 'incident-response', 'Gestione e risposta agli incidenti di sicurezza informatica', 2600, 'Security', '4 giorni', true)
ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Insert more contacts
INSERT INTO contacts (name, email, phone, company, type, message, status)
VALUES
  ('Mario Rossi', 'mario.rossi@example.com', '+39 333 1234567', 'TechCorp Italia', 'COMPANY', 'Vorrei informazioni sui corsi ISO 27001 per la mia azienda', 'new'),
  ('Giulia Bianchi', 'giulia.bianchi@example.com', '+39 333 2345678', 'Finance Bank', 'COMPANY', 'Siamo interessati a un corso GDPR per tutto il team', 'contacted'),
  ('Luca Verdi', 'luca.verdi@security.it', '+39 333 3456789', NULL, 'SPECIALIST', 'Vorrei diventare uno specialista certificato CertiCredia', 'new'),
  ('Anna Ferrari', 'anna.ferrari@retail.it', '+39 333 4567890', 'Retail Group', 'COMPANY', 'Necessità di assessment ISO 27001 completo', 'new'),
  ('Marco Russo', 'marco.russo@energy.it', '+39 333 5678901', 'Energy Plus', 'COMPANY', 'Richiesta preventivo per corso cloud security', 'closed')
ON CONFLICT DO NOTHING;

-- Update statistics for testing
-- This is just to make sure we have varied data
UPDATE organizations SET updated_at = NOW() WHERE status = 'active';

-- Note: For users, we can't easily insert hashed passwords via SQL
-- The existing seedDemoData.js script should be used for that
-- Or users can be created via the registration endpoint

VACUUM ANALYZE;
