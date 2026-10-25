<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/pomelo_white.svg">
    <img alt="Pomelo" src="public/pomelo_black.svg" width="250">
  </picture>
  <p>Self-hosted coding contest and assessment platform.</p>
</div>

## Description
Pomelo is a self-hosted platform designed to manage programming contests, technical assessments, and hackathons. It integrates a Next.js frontend, an Express backend, and the Citron sandboxed code execution engine to provide a complete environment for coding events. The platform is designed for privacy and control, allowing organizers to retain full data sovereignty while operating their own infrastructure.

The system utilizes an automated deployment model via a custom daemon and CLI, simplifying the provisioning of underlying services such as Docker containers and reverse proxies. It provides an administrative interface for managing application state, environment configurations, and container health.


## Installation

Run the following command to download and execute the installation script with root privileges:

```bash
curl -fsSL pomelo.sosc.org.in/install.sh | sudo bash
```

## Usage

Interact with the platform using the global command-line interface.

```bash
pomelo start
pomelo stop
pomelo status
pomelo logs
pomelo ui
```

The administrative interface is accessible via a web browser on port 8462.


## Candidate feedback

After submitting a test, candidates can optionally rate its difficulty and their
platform experience from 1 to 5, with a comment of up to 2,000 characters. They can
skip feedback without affecting their submission or score. Each completed attempt
can receive feedback once, including after the test closes. Organizers can view
response counts, average ratings, and labeled 1-5 distribution charts on the dedicated
`/admin/tests/[id]/feedback` page, linked from test details and results. Reviews
include ratings without written comments and can be filtered by difficulty and
experience or sorted by date and either rating. Charts and averages always cover
all responses; filters and pagination apply to the review list.

Run the feedback integration checks against a development MongoDB instance:

```bash
FEEDBACK_TEST_MONGODB_URI=mongodb://127.0.0.1:27017 pnpm --filter @pomelo/server test:integration
```

The suite creates and removes its own uniquely named test database. Use your local
MongoDB port if different. Unit tests run with `pnpm test`.

## Documentation

For more detailed information, please refer to the official documentation:

- [Documentation](https://pomelo.sosc.org.in/docs/)
- [User Guide](https://pomelo.sosc.org.in/guide/)
- [Troubleshooting](https://pomelo.sosc.org.in/docs/#troubleshooting)

## Contributing
Refer to CONTRIBUTING.md for local development instructions and contribution guidelines.

## License
This project is licensed under the GNU General Public License v3.0 (GPLv3). See the [LICENSE](LICENSE) file for details.
