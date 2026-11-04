import "dotenv/config";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import csrf from "@dr.pogodin/csurf";
import cookieParser from "cookie-parser";
import routes from "./routes/routes.js";
import s3Routes from "./routes/s3_routes.js";
import authRoutes from "./routes/auth_routes.js";
import apiRoutes from "./routes/api_routes.js";
import { connectToDatabase } from "./utils/db.js";
import { handleGlobalError, handleCsrfError, handleMongoError } from "./routes/errors.js";

const app = express();

const csrfProtection = csrf({ cookie: true });

app.set("view engine", "ejs");

// parse cookies
app.use(cookieParser(process.env.COOKIE_SECRET));

// database instance for session storage
const { client } = await connectToDatabase(process.env.DB_NAME);
await client.db(process.env.DB_NAME).command({ ping: 1 });
console.log('Mongo connected: true');

// Use session-based authentication
if (process.env.NODE_ENV === "production" || process.env.USE_PROXY === "true") {
    app.set("trust_proxy", 1);
}

const isSecure = app.get("trust_proxy") === 1;

app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: true,
    rolling: true,
    cookie: {
        secure: isSecure,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,        // ✅ Highly Recommended (prevents XSS)
        sameSite: "lax"        // ✅ Highly Recommended (prevents CSRF)
    },
    store: MongoStore.create({
        client: client,
        dbName: process.env.DB_NAME,
        collectionName: "sessions",
    })
}));

// Parse JSON bodies
app.use(express.json());

// Parse form data
app.use(express.urlencoded({extended: true}));

// CSRF protection
app.use(csrfProtection);

// Expose static files in public folder
app.use(express.static("public"));

// note all requests in the console
app.use((req, res, next) => {
    console.log("HIT:", req.method, req.url);
    next();
});

// Routes
app.use("/", routes);
app.use("/s3", s3Routes);
app.use("/", authRoutes);
app.use("/api", apiRoutes);

// Error handlers
app.use(handleCsrfError);
app.use(handleMongoError);
app.use(handleGlobalError);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
