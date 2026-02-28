# LM-02: Migrate FileProcessorService to Lemonade

## Description
Update `FileProcessorService` to use `LemonadeAdapter` for image processing and OCR task via the `qwen3-vl` model.

## Status
- [x] Update `FileProcessorService` constructor and imports.
- [x] Refactor `processImage` to use `lemonade.chatWithImage`.
- [x] Integrate `qwen3-vl` for OCR and description.
- [x] Unit tests for `FileProcessorService` with Lemonade mock.

## Context
Enables vision capability using Lemonade's multimodal support.
