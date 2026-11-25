# Intern-Bridge
It is a website that helps to interconnect the intern seeker campus students with the companies those provides intern.

## Backend configuration
Copy `backend/.env.example` to `backend/.env` and set the database, JWT, email, Google, and `CORS_ALLOWED_ORIGINS` values for your environment. Separate multiple allowed origins with commas. Keep `.env` private; uploaded resumes are stored under the ignored `uploads/resumes/` directory.

## Database and tests
`database.sql` is the project schema, including portfolio and privilege tables. Run it against MySQL before starting the backend. Run `npm test` from the repository root for the backend authentication and privilege-policy tests.
