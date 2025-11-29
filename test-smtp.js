import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import net from 'net';

dotenv.config();

console.log('\n🔍 SMTP Diagnostic Test\n');
console.log('Configuration:');
console.log('- Host:', process.env.SMTP_HOST);
console.log('- Port:', process.env.SMTP_PORT);
console.log('- User:', process.env.SMTP_USER);
console.log('- Secure:', process.env.SMTP_SECURE);
console.log('\n---\n');

// Test 1: TCP Connection
console.log('Test 1: Testing raw TCP connection...');
const socket = net.createConnection({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ TCP connection successful!');
  socket.end();
  testSMTP();
});

socket.on('timeout', () => {
  console.log('❌ TCP connection timeout');
  console.log('⚠️  Render firewall potrebbe bloccare la porta', process.env.SMTP_PORT);
  console.log('\nSuggerimenti:');
  console.log('1. Prova porta 465 con SMTP_SECURE=true');
  console.log('2. Usa un servizio SMTP esterno (SendGrid, Mailgun)');
  console.log('3. Contatta Render support per sbloccare porte SMTP');
  socket.destroy();
  process.exit(1);
});

socket.on('error', (err) => {
  console.log('❌ TCP connection error:', err.message);
  console.log('\nPossibili cause:');
  console.log('- Firewall blocca connessioni SMTP outbound');
  console.log('- Host SMTP non raggiungibile');
  console.log('- Porta errata');
  process.exit(1);
});

// Test 2: SMTP Auth
function testSMTP() {
  console.log('\nTest 2: Testing SMTP authentication...');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 3000,
    socketTimeout: 5000,
    debug: true, // Enable debug output
    logger: true  // Log to console
  });

  transporter.verify((error, success) => {
    if (error) {
      console.log('\n❌ SMTP verification failed:', error.message);
      if (error.code === 'EAUTH') {
        console.log('⚠️  Credenziali SMTP errate');
      }
    } else {
      console.log('\n✅ SMTP authentication successful!');
      console.log('✅ Server pronto per inviare email');
    }
    process.exit(error ? 1 : 0);
  });
}
