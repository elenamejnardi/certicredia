import { pool } from '../config/database.js';
import bcrypt from 'bcrypt';
import logger from './logger.js';

const SALT_ROUNDS = 12;

/**
 * Seed demo users
 */
async function seedUsers(client) {
  logger.info('🌱 Seeding demo users...');

  const demoUsers = [
    {
      email: 'admin@certicredia.it',
      password: 'Admin123',
      name: 'Admin CertiCredia',
      role: 'admin',
      company: 'CertiCredia Italia S.r.l.',
      phone: '+39 02 1234567'
    },
    {
      email: 'mario.rossi@example.com',
      password: 'Password123',
      name: 'Mario Rossi',
      role: 'user',
      company: 'Acme Corporation S.r.l.',
      phone: '+39 333 1234567'
    },
    {
      email: 'giulia.bianchi@tech.it',
      password: 'Password123',
      name: 'Giulia Bianchi',
      role: 'user',
      company: 'TechSolutions S.p.A.',
      phone: '+39 340 9876543'
    },
    {
      email: 'luca.verdi@security.com',
      password: 'Password123',
      name: 'Luca Verdi',
      role: 'user',
      company: 'SecurIT Consulting',
      phone: '+39 347 5551234'
    },
    {
      email: 'anna.ferrari@consulting.it',
      password: 'Password123',
      name: 'Anna Ferrari',
      role: 'user',
      company: 'Ferrari & Partners',
      phone: '+39 335 8887777'
    }
  ];

  const createdUsers = [];

  for (const user of demoUsers) {
    // Check if user exists
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [user.email]
    );

    if (existing.rows.length === 0) {
      const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, role, company, phone, email_verified, active)
         VALUES ($1, $2, $3, $4, $5, $6, true, true)
         RETURNING id, email, name, role`,
        [user.email, passwordHash, user.name, user.role, user.company, user.phone]
      );

      createdUsers.push(result.rows[0]);
      logger.info(`  ✅ User created: ${user.email} (password: ${user.password})`);
    } else {
      createdUsers.push(existing.rows[0]);
      logger.info(`  ⏭️  User already exists: ${user.email}`);
    }
  }

  return createdUsers;
}

/**
 * Seed demo orders
 */
async function seedOrders(client, users) {
  logger.info('🌱 Seeding demo orders...');

  // Get some products
  const productsResult = await client.query('SELECT id, name, price FROM products LIMIT 6');
  const products = productsResult.rows;

  if (products.length === 0) {
    logger.warn('  ⚠️  No products found. Skipping orders seed.');
    return;
  }

  const demoOrders = [
    {
      userIndex: 1, // Mario Rossi
      status: 'completed',
      payment_status: 'paid',
      productIndices: [0, 1], // First 2 products
      billing_address: 'Via Roma 123',
      billing_city: 'Milano',
      billing_postal_code: '20100',
      billing_country: 'Italia'
    },
    {
      userIndex: 2, // Giulia Bianchi
      status: 'processing',
      payment_status: 'paid',
      productIndices: [2], // Third product
      billing_address: 'Corso Italia 45',
      billing_city: 'Roma',
      billing_postal_code: '00100',
      billing_country: 'Italia'
    },
    {
      userIndex: 3, // Luca Verdi
      status: 'confirmed',
      payment_status: 'pending',
      productIndices: [0, 3], // First and fourth product
      billing_address: 'Piazza Duomo 1',
      billing_city: 'Firenze',
      billing_postal_code: '50100',
      billing_country: 'Italia'
    },
    {
      userIndex: 4, // Anna Ferrari
      status: 'pending',
      payment_status: 'pending',
      productIndices: [4, 5], // Fifth and sixth product
      billing_address: 'Via Garibaldi 78',
      billing_city: 'Torino',
      billing_postal_code: '10100',
      billing_country: 'Italia'
    }
  ];

  let orderCount = 0;

  for (const order of demoOrders) {
    const user = users[order.userIndex];
    if (!user) continue;

    // Calculate total
    let total = 0;
    const orderProducts = order.productIndices.map(idx => {
      const product = products[idx];
      if (product) {
        total += parseFloat(product.price);
        return product;
      }
      return null;
    }).filter(p => p !== null);

    if (orderProducts.length === 0) continue;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        user_id, order_number, status, total_amount, payment_method, payment_status,
        billing_name, billing_email, billing_phone, billing_address, billing_city,
        billing_postal_code, billing_country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        user.id, orderNumber, order.status, total, 'bank_transfer', order.payment_status,
        user.name, user.email, users.find(u => u.id === user.id)?.phone || '+39 333 1234567',
        order.billing_address, order.billing_city, order.billing_postal_code, order.billing_country
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Create order items
    for (const product of orderProducts) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_description, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, 1, $5, $5)`,
        [orderId, product.id, product.name, `Demo order for ${product.name}`, product.price]
      );
    }

    orderCount++;
    logger.info(`  ✅ Order created: ${orderNumber} (${order.status})`);
  }

  logger.info(`  ✅ Created ${orderCount} demo orders`);
}

/**
 * Seed demo contacts
 */
async function seedContacts(client) {
  logger.info('🌱 Seeding demo contacts...');

  const demoContacts = [
    {
      user_type: 'COMPANY',
      name: 'Roberto Conti',
      email: 'r.conti@fintech.it',
      company: 'FinTech Solutions S.r.l. - P.IVA 12345678901',
      message: 'Vorrei informazioni sulla certificazione CPF3:2026 Enterprise per la mia azienda con 350 dipendenti.',
      status: 'new'
    },
    {
      user_type: 'SPECIALIST',
      name: 'Elena Marino',
      email: 'elena.marino@gmail.com',
      linkedin: 'https://linkedin.com/in/elena-marino',
      message: 'Sono interessata al percorso di accreditamento Specialist. Ho 8 anni di esperienza in cybersecurity.',
      status: 'contacted'
    },
    {
      user_type: 'COMPANY',
      name: 'Marco Esposito',
      email: 'marco.esposito@healthcare.it',
      company: 'HealthCare Italia S.p.A. - P.IVA 98765432109',
      message: 'Cerchiamo una certificazione NIS2 compliant per il nostro ospedale. Budget disponibile circa 15k.',
      status: 'contacted'
    },
    {
      user_type: 'SPECIALIST',
      name: 'Francesca Lombardi',
      email: 'f.lombardi@security.com',
      linkedin: 'https://linkedin.com/in/francesca-lombardi',
      message: 'Ho visto il corso Auditor. È riconosciuto a livello internazionale? Include certificazione finale?',
      status: 'closed'
    },
    {
      user_type: 'COMPANY',
      name: 'Alessandro Ricci',
      email: 'a.ricci@manufacturing.it',
      company: 'Ricci Manufacturing S.r.l. - P.IVA 11223344556',
      message: 'Abbiamo necessità di formazione GDPR per 50 dipendenti. È possibile personalizzare il corso?',
      status: 'new'
    },
    {
      user_type: 'SPECIALIST',
      name: 'Chiara Santoro',
      email: 'chiara.s@protonmail.com',
      linkedin: 'https://linkedin.com/in/chiarasantoro',
      message: 'Sono una psicologa del lavoro. Il framework CPF3 sarebbe adatto al mio background?',
      status: 'new'
    }
  ];

  let contactCount = 0;

  for (const contact of demoContacts) {
    await client.query(
      `INSERT INTO contacts (user_type, name, email, company, linkedin, message, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')`,
      [
        contact.user_type,
        contact.name,
        contact.email,
        contact.company || null,
        contact.linkedin || null,
        contact.message,
        contact.status
      ]
    );

    contactCount++;
    logger.info(`  ✅ Contact created: ${contact.name} (${contact.user_type})`);
  }

  logger.info(`  ✅ Created ${contactCount} demo contacts`);
}

/**
 * Main seed function
 */
async function seedDemoData() {
  const client = await pool.connect();

  try {
    logger.info('🌱 Starting demo data seeding...');

    await client.query('BEGIN');

    // Seed in order
    const users = await seedUsers(client);
    await seedOrders(client, users);
    await seedContacts(client);

    await client.query('COMMIT');

    logger.info('✅ Demo data seeding completed!');
    logger.info('');
    logger.info('📋 Demo Credentials:');
    logger.info('   Admin: admin@certicredia.it / Admin123');
    logger.info('   User:  mario.rossi@example.com / Password123');
    logger.info('   User:  giulia.bianchi@tech.it / Password123');
    logger.info('');

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDemoData;
