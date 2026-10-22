import express from "express";
import { analyze } from "../utils/cerebras.js";
import { parseFromLLM } from "json-llm-repair";

const router = express.Router();


router.post("/compose", async (req, res) => {
    console.log(req.body);

    const instruction = "a bass harmony sequence to complement the melody"

    try {

        const rawAIResponse = await analyze(instruction, req.body.midiData, true);
        console.log(rawAIResponse);
        const content = rawAIResponse.choices[0].message.content;
        console.log(content);
        // sanitize the response (in case there are unescaped tabs, which happens)
        const processed = parseFromLLM(content, {"mode": "repair"});
        console.log(processed);

        return res.json({
            "cerebras": processed
        });

    } catch (err) {
        if (err.status === 429) {
            console.error(err);
        } else {
            console.error(err);
        }
        return res.status(err.status === 429 ? 429 : 500).json({
            "cerebras": null,
            "error": err.message
        });
    }

});

export default router;
