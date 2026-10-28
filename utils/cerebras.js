import Cerebras from "@cerebras/cerebras_cloud_sdk";

const client = new Cerebras({
    "apiKey": process.env.CEREBRAS_API_KEY,
    "maxRetries": 8
});

async function askCerebras(content,
                           response_format = null,
                           temperature = 0.2,
                           max_completion_tokens = 8192) {
    try {
        const response = await client.chat.completions.create({
            model: process.env.CEREBRAS_MODEL,
            max_completion_tokens: max_completion_tokens,
            temperature: temperature,
            stream: false,
            response_format: response_format,
            reasoning_effort: "medium",
            messages: [
                {
                    role: "user",
                    content: content
                }
            ]
        });

        return response;

    } catch (error) {
        console.error("Error: ", error.status, error.name, error.message);
        throw error;
    }
}


export const analyze = async (instruction, midiData, verbose=false) => {
    // generate the content for asking cerebras

    // TODO: fix up schema
    //       - description: text
    //       - midiSequence: triples of (midiNote, onset, duration)
    //       - chordProgression: pairs of (chordName, function in key, onset, duration)

    const midiString = midiData.notes.map(
        (n, i) => `(${n}, ${midiData.onsets[i].toFixed(1)}, ${midiData.durations[i].toFixed(1)})`
    ).join(", ");

    const prompt = `
        The following melody is in the key of ${midiData.key}.  
        
        It is expressed as a sequence of triples of midi notes, onset times in seconds and note durations in seconds:
        
        ${midiString}
        
        Please compose ${instruction}.
        
        Your response must use the provided JSON schema.
        
        For midiSequence, use the same format of 
        [integer midi note, floating point onset time in seconds, floating point duration in seconds].
        Each onset time MUST be greater than the previous onset time.
        
        For chordProgression provide a chord progression that underlies your composition.
        
        Include an explanation of your composition in the description field.
    `;

    const response_format = {
        "type": "json_schema",
        "json_schema": {
            "name": "composition",
            "schema": {
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string",
                        "description": "Description of the composition."
                    },
                    "midiSequence": {
                        "type": "array",
                        "description": "Array of [integer, float, float] pairs, e.g. [[52, 13.4, 0.8], [48, 18.2, 0.8]]",
                        "items": {
                            "type": "array",
                            "items": { "type": "number" },
                            "minItems": 3,
                            "maxItems": 3
                        }
                    },
                    "chordProgression": {
                        "type": "array",
                        "description": 'Chord progression with onsets, e.g. [{"chord": "F major", "onset": 13.4}]',
                        "items": {
                            "type": "object",
                            "properties": {
                                "chord": {"type": "string"},
                                "onset": {"type": "number"}
                            },
                            "required": ["chord", "onset"],
                            "additionalProperties": false
                        }
                    }
                },
                "required": ["description", "midiSequence", "chordProgression"],
                "additionalProperties": false
            },
            "strict": true
        }
    };

    if (verbose) console.log(prompt);

    return await askCerebras(prompt, response_format);
}
