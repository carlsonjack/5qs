const postgres = require("postgres");

async function checkFeedbackTable() {
  const sql = postgres(process.env.POSTGRES_URL_NON_POOLING);

  try {
    console.log("Checking if feedback table exists...");

    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback'
      );
    `;

    console.log("Feedback table exists:", result[0].exists);

    if (result[0].exists) {
      console.log("Checking feedback table structure...");
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'feedback'
        ORDER BY ordinal_position;
      `;

      console.log("Columns:");
      columns.forEach((col) => {
        console.log(
          `  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
        );
      });
    }
  } catch (error) {
    console.error("Error checking feedback table:", error);
  } finally {
    await sql.end();
  }
}

checkFeedbackTable();
