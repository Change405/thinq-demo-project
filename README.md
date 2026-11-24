# Fizz & Co. — demo soda site

A small SvelteKit app with two pages, packaged as a Docker container.

- `/` — homepage with the flavor lineup
- `/order` — order form (flavor, pack size, quantity, name, email). The server-side form action checks the input and returns a confirmation. Nothing is saved and no payment is taken; each order is logged to stdout.

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:3000. See orders with `docker compose logs -f web`.

`ORIGIN` must match the URL people use in the browser, or SvelteKit rejects form posts (CSRF check). Change it in `compose.yaml` if you deploy somewhere other than localhost:3000.

## Run locally without Docker

```bash
npm install
npm run dev
```
