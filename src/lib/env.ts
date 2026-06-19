export const env = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    adminEmail: process.env.ADMIN_EMAIL ?? "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.5",
    openaiEndPoint: process.env.OPENAI_END_POINT ?? "https://api.openai.com/v1/responses",
    githubApiKey: process.env.GITHUB_API_KEY ?? process.env.GITHUB_TOKEN ?? "",
    githubModel: process.env.GITHUB_MODEL ?? "gpt-5.5",
    githubEndPoint: process.env.GITHUB_END_POINT ?? "https://models.github.ai/inference/chat/completions",
};

export function hasSupabaseEnv() {
    return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
