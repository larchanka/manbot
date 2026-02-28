# LM-05: Model Lifecycle and Prewarming Refactor

## Description
Update `ModelManagerService` to manage model lifecycles via the Lemonade `warmup` endpoint.

## Status
- [x] Refactor `ModelManagerService` to use Lemonade's warmup logic.
- [x] Update constructor and tier-to-model mapping for Lemonade.
- [x] Update model manager and integration tests.
- [x] Verify sequential prewarming logic at startup.

## Context
Ensures efficient model loading and memory management in Lemonade.
