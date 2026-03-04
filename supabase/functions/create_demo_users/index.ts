import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DemoUser {
  email: string;
  password: string;
  role: string;
}

const demoUsers: DemoUser[] = [
  {
    email: "admin@test.com",
    password: "admin@123",
    role: "admin",
  },
  {
    email: "manager@test.com",
    password: "manager@123",
    role: "manager",
  },
  {
    email: "machineman@test.com",
    password: "machine@123",
    role: "machineman",
  },
  {
    email: "printer@test.com",
    password: "printer@123",
    role: "printer_operator",
  },
  {
    email: "laminator@test.com",
    password: "laminator@123",
    role: "laminator",
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2.57.4");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = [];

    for (const user of demoUsers) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            role: user.role,
            full_name: user.role.charAt(0).toUpperCase() + user.role.slice(1),
          },
        });

        if (error) {
          results.push({
            email: user.email,
            success: false,
            error: error.message,
          });
        } else if (data.user?.id) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: user.role,
              full_name: user.role.charAt(0).toUpperCase() + user.role.slice(1),
            })
            .eq('id', data.user.id);

          if (updateError) {
            results.push({
              email: user.email,
              success: false,
              error: `User created but profile update failed: ${updateError.message}`,
              userId: data.user.id,
            });
          } else {
            results.push({
              email: user.email,
              password: user.password,
              role: user.role,
              success: true,
              userId: data.user.id,
            });
          }
        }
      } catch (err) {
        results.push({
          email: user.email,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
