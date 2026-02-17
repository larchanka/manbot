# Task: P5-01 Configure GitHub Actions Workflow

## Description
Set up the initial GitHub Actions infrastructure for the repository to enable automated workflows.

## Requirements
- Create the directory structure: `.github/workflows/`.
- Create a `ci.yml` file within that directory.
- Configure the workflow to trigger on `push` and `pull_request` events targeting the `main` branch.
- Define a base environment using `ubuntu-latest`.

## Definition of Done
- `.github/workflows/ci.yml` exists in the repository.
- Workflow triggers correctly on push to `main` (visible in GitHub Actions tab).
