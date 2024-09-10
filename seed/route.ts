import { db } from "@vercel/postgres";
import contact from '../lib/placeholder-data'

const client = await db.connect();

async function seedContact() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email_address TEXT NOT NULL UNIQUE,
      phone_number VARCHAR(20) NOT NULL,
      services TEXT NOT NULL,
      message VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      update_at TIMESTAMPTZ DEFAULT NOW(),
      sended_at TIMESTAMPTZ DEFAULT NOW()
    );`;
  const dateNow = new Date()
  const dateString = dateNow.toString()
  const insertedContacts = await Promise.all(
    contact.map(async (user) => {
      return client.sql`
        INSERT INTO contacts (first_name, last_name, email_address, phone_number, services, message, created_at, update_at, sended_at)
        VALUES (${user.first_name}, ${user.last_name},${user.email_address},${user.phone_number},${user.services},${user.message},${dateString},${dateString},${dateString} )
        ON CONFLICT (id) DO NOTHING;
      `;
    })
  );

  return insertedContacts;
}


export async function GET() {
  try {
    await client.sql`BEGIN`;
    await seedContact();
    await client.sql`COMMIT`;

    return Response.json({ message: "Database seeded successfully" });
  } catch (error) {
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
