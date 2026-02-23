import {
    createClient
} from "@supabase/supabase-js";

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({
                error: "Supabase env vars not set on server"
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const {
            title,
            language,
            code,
            flow
        } = req.body || {};
        if (!title || !language || typeof code !== "string") {
            return res.status(400).json({
                error: "Missing required fields: title, language, code"
            });
        }

        const payload = {
            title,
            language,
            code,
            flow: Array.isArray(flow) ? flow : [],
            updated_at: new Date().toISOString()
        };

        const {
            data,
            error
        } = await supabase
            .from("codeflow")
            .insert(payload)
            .select("id")
            .single();

        if (error) return res.status(500).json({
            error: error.message
        });

        return res.status(200).json({
            ok: true,
            id: data.id
        });
    } catch (err) {
        return res.status(500).json({
            error: err?.message || "Unknown error"
        });
    }
}