# cloudexplorer

A visualisation of resources and IAM resources in the Public Cloud. Inspired by the Wiz security graph.

Currently only supports Azure, but designed with the other public clouds in mind (custom adapters would be required).

![Example Dashboard](./docs/example_dashboard.png)

## Technology used

![System Architecture](./docs/architecture-dark.svg#gh-dark-mode-only)
![System Architecture](./docs/architecture-light.svg#gh-light-mode-only)

- **Next.js**:
  Fairly popular, enough docs around, batteries included.

- **Neo4j**:
  Cloud infrastructure and IAM resources are inherently a graph structure. There's plenty of choice in databases out there.

- **D3.js**:
  Main rendering engine for the graph visualisations. _Why not?_

### Why is the API in TypeScript?

The backend only needs to communicate with Neo4j and Azure, both have supported SDKs for JavaScript/TypeScript. Allows majority of project to be in a single language.

On a _personal note_, I could have chosen any language here (probably would have chosen Python/FastAPI combo) but wanted to get a better feel for TypeScript.

Future: I am also aiming for an architecture where everything happens client side in the browser with no need for a server - auth/database/visualisation.

## Quick start locally using Docker Compose

The `docker-compose.yml` brings up:

- **neo4j** database (bolt + HTTP)
- **web** service for the Next.js application

1. Copy the `.env.example` to `.env` and populate:

   ```sh
   cp .env.example .env
   ```

   > NOTE: If a service principal is not configured via the environment variables in `.env`, pay attention to the terminal output of the web container. It will request you to login to Azure via the Azure CLI. Follow the prompts and sign in.

2. Launch everything:

   ```sh
   docker compose up --build
   ```

   - Neo4j will be available on `http://localhost:7474` (bolt `bolt://localhost:7687`)
   - The Next.js app runs on `http://localhost:3000`

3. To tear down the environment run:

   ```sh
   docker compose down
   ```

### Configuring a service principal

Permissions required if using a [Service Principal](https://azure.github.io/azure-service-operator/guide/authentication/credential-format/#service-principal-using-a-client-secret)

1. RBAC `Reader` permissions on subscriptions
2. `Microsoft.Graph` `Directory.ReadAll` permission for on type `Application`
