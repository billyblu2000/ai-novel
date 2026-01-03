// 测试数据库连接
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testConnection() {
  console.log("🔄 Testing Supabase connection...\n");
  console.log("URL:", supabaseUrl);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 测试基本连接 - 查询 auth 配置
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Connection failed:", error.message);
      return;
    }

    console.log("✅ Supabase connection successful!");
    console.log("   Session:", data.session ? "Active" : "No active session");

    // 测试数据库表是否存在
    console.log("\n🔄 Checking database tables...");

    const tables = ["profiles", "projects", "nodes", "entities", "mentions", "node_versions"];

    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select("id").limit(1);

      if (tableError) {
        if (tableError.code === "42P01") {
          console.log(`   ⚠️  Table '${table}' does not exist - run schema.sql first`);
        } else if (tableError.code === "PGRST116") {
          console.log(`   ✅ Table '${table}' exists (empty)`);
        } else {
          console.log(`   ❌ Table '${table}': ${tableError.message}`);
        }
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    }

    console.log("\n✨ Database test completed!");
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

testConnection();
