import {
    createClient
} from "@supabase/supabase-js";

export default async function handler(req, res) {
    try {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({
                error: "Supabase env vars not set on server"
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const {
            data,
            error
        } = await supabase
            .from("codeflow")
            .select("id,title,language,updated_at")
            .order("updated_at", {
                ascending: false
            })
            .limit(50);

        if (error) return res.status(500).json({
            error: error.message
        });

        return res.status(200).json({
            codeflow: data || []
        });
    } catch (err) {
        return res.status(500).json({
            error: err?.message || "Unknown error"
        });
    }
}