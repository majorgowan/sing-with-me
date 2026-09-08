import express from "express";
import path from "path";
import s3Client from "../utils/s3.js";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = express.Router();


/**
 * 1. GET /api/audio/upload-url
 * Returns a URL the frontend can use to PUT (upload) a file directly to S3.
 * Expects query param: ?fileName=sound123.mp3
 */
router.get("/upload-url", async (req, res) => {
    const { fileName } = req.query;

    if (!fileName) {
        return res.status(400).json({ error: "fileName is required" });
    }

    const safeFileName = path.basename(fileName);
    const key = `recordings/${safeFileName}`; // Store in a 'recordings' folder

    const command = new PutObjectCommand({
        "Bucket": process.env.S3_BUCKET_NAME,
        "Key": key,
        "ContentType": "audio/webm"
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return res.json({ url });
});

/**
 * 2. GET /api/audio/playback-url
 * Returns a URL the frontend can use to GET (play) the file.
 * Expects query param: ?key=user-123/recording-001.mp3
 */
router.get("/playback-url", async (req, res) => {
    const { key } = req.query;

    if (!key) {
        return res.status(400).json({ error: "key is required" });
    }

    const safeKey = path.basename(key);
    const finalKey = `recordings/${safeKey}`;

    const command = new GetObjectCommand({
        "Bucket": process.env.S3_BUCKET_NAME,
        "Key": finalKey
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return res.json({ url });
});


router.get("/delete-url", async (req, res) => {
    const { fileName } = req.query;

    if (!fileName) {
        return res.status(400).json({ error: "fileName is required" });
    }

    const safeFileName = path.basename(fileName);
    const key = `recordings/${safeFileName}`; // Store in a 'recordings' folder

    const command = new DeleteObjectCommand({
        "Bucket": process.env.S3_BUCKET_NAME,
        "Key": key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return res.json({ url });
});


export default router;
