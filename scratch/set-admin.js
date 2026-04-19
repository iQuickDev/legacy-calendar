const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_aVG0iwWqURQ5@ep-snowy-mountain-alsq8p4v-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function main() {
    await client.connect();
    
    // List users
    const res = await client.query('SELECT id, username, "isAdmin" FROM "User"');
    console.log('Current users:', res.rows);
    
    if (res.rows.length > 0) {
        // Set the first user as admin
        const userId = res.rows[0].id;
        await client.query('UPDATE "User" SET "isAdmin" = true WHERE id = $1', [userId]);
        console.log(`User ${res.rows[0].username} (ID: ${userId}) is now an admin.`);
    } else {
        console.log('No users found to promote.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => client.end());
