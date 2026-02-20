# My Project Board

## To Do

## In Progress

## Done

### DB-06 Verification and Polish
  - tags: [done, qa]
  - defaultExpanded: false
    ```md
    Final polish, bug fixes, and manual verification of all features.
    
    Source: DB-06_VERIFICATION.md
    ```

### DB-05 Final Assembly and Integration
  - tags: [done, ui]
  - defaultExpanded: false
    ```md
    Combine the data layer, visualization engine, and UI theme into the final request handler.
    
    Source: DB-05_ASSEMBLY.md
    ```

### DB-04 UI Design and Theming
  - tags: [done, ui]
  - defaultExpanded: false
    ```md
    Implement the CSS design system and base HTML template for the dashboard.
    
    Source: DB-04_UI_THEMING.md
    ```

### DB-03 SVG Visualization Engine
  - tags: [done, ui]
  - defaultExpanded: false
    ```md
    Implement helper functions to generate SVG chart strings from data arrays.
    
    Source: DB-03_SVG_ENGINE.md
    ```

### DB-02 SQLite and Log Data Extraction
  - tags: [done, data]
  - defaultExpanded: false
    ```md
    Implement the logic to extract data from the SQLite databases and the NDJSON log file.
    
    Source: DB-02_DATA_LAYER.md
    ```

### DB-01 Initial Setup and Basic Server
  - tags: [done, infra]
  - defaultExpanded: false
    ```md
    Initialize the /stats directory and create the basic Node.js HTTP server.
    
    Source: DB-01_INITIAL_SETUP.md
    ```

### SK-RS-05 E2E Verification of Research Skill
  - tags: [done, qa]
  - defaultExpanded: false
    ```md
    Perform end-to-end testing of the web research capability.
    
    Source: SK-RS-05_E2E_VERIFICATION.md
    ```

### SK-RS-04 Update Planner with Research Guidance
  - tags: [done, planner]
  - defaultExpanded: false
    ```md
    Add research-focused few-shot examples to the planner prompt.
    
    Source: SK-RS-04_PLANNER_GUIDANCE.md
    ```

### SK-RS-03 Register Research Skill in Manifest
  - tags: [done, skill]
  - defaultExpanded: false
    ```md
    Add the research skill to skills/CONFIG.md.
    
    Source: SK-RS-03_REGISTER_SKILL.md
    ```

### SK-RS-02 Create Research Skill Prompt
  - tags: [done, skill]
  - defaultExpanded: false
    ```md
    Create the SKILL.md instruction file for web research using lynx and DuckDuckGo.
    
    Source: SK-RS-02_RESEARCH_PROMPT.md
    ```

### SK-RS-01 Verify Lynx Dependency in Orchestrator
  - tags: [done, core]
  - defaultExpanded: false
    ```md
    Implement a startup check in orchestrator.ts to ensure lynx is installed on the host.
    
    Source: SK-RS-01_VERIFY_LYNX.md
    ```

### SK-09 Planner Dependency Rule for Skills
  - tags: [done]
  - defaultExpanded: false
    ```md
    Instruct the planner to provide tool outputs to skills that need them, preventing hallucinations.
    
    Source: SK-09_PLANNER_SKILL_DEPENDENCIES.md
    ```

### SK-10 Refine Skill Prompts for Tool Dependencies
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update skill prompts (like the 'time' skill) to expect data from tools rather than claiming to run them.
    
    Source: SK-10_REFINE_SKILL_PROMPTS.md
    ```

### SK-11 Active Skill Research and Implementation
  - tags: [done]
  - defaultExpanded: false
    ```md
    Investigate and implement a way for 'skill' nodes to perform their own tool calls if the model supports it.
    
    Source: SK-11_ACTIVE_SKILL_EXECUTION.md
    ```

### SK-08 Prioritize Skill Usage in Planner
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update the planner prompts to ensure that skills are given higher priority than raw tool usage, making skill nodes mandatory when a match is found.
    
    Source: SK-08_PRIORITISE_SKILLS.md
    ```

### SK-07 Project Compilation
  - tags: [done]
  - defaultExpanded: false
    ```md
    Ensure the project builds successfully with the new Skills system changes. Verified with 'npm run build'.
    
    Source: SK-07_PROJECT_COMPILATION.md
    ```

### SK-06 Create Demo Skill
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create a sample skill in skills/demo/ to verify the system end-to-end and provide a template for future skills.
    
    Source: SK-06_DEMO_SKILL.md
    ```

### SK-05 Support Skill Nodes in ExecutorAgent
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update the executor to recognize 'skill' node types and dispatch them to model-router with the skill's specific system prompt.
    
    Source: SK-05_EXECUTOR_SKILL_NODES.md
    ```

### SK-04 Integrate SkillManager into PlannerAgent
  - tags: [done]
  - defaultExpanded: false
    ```md
    Integrate SkillManager into the planning loop to load and inject available skills into the LLM context.
    
    Source: SK-04_INTEGRATE_PLANNER.md
    ```

### SK-03 Update Planner Prompts for Skills
  - tags: [done]
  - defaultExpanded: false
    ```md
    Enhance the planner system prompt to handle dynamic skills and instruct the model on using 'skill' nodes.
    
    Source: SK-03_UPDATE_PLANNER_PROMPTS.md
    ```

### SK-02 Implement SkillManager Service
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create a dedicated service to dynamically discover and load skill manifests (CONFIG.md) and prompts from disk.
    
    Source: SK-02_IMPLEMENT_SKILL_MANAGER.md
    ```

### SK-01 Add Skills Configuration
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add skills section to central configuration system and support environment variable overrides.
    
    Source: SK-01_ADD_SKILLS_CONFIG.md
    ```

### P8-01 Refine LLM Analysis Prompts for Natural Language Output
  - tags: [done]
  - defaultExpanded: false
    ```md
    Enhance the system to synthesize tool outputs into natural language using a dedicated analyzer prompt and a "Narrative Rule" in the planner.
    
    Source: P8-01_PROMPT_ANALYSER.md
    ```

### M2-04 Manual Verification and Documentation
  - tags: [done]
  - defaultExpanded: false
    ```md
    Perform manual verification of model states and update project documentation.
    
    Source: M2-04_MANUAL_VERIFICATION.md
    Note: README.md updated with Model Management section, keep-alive table, and ollama ps monitoring guide.
    ```

### M2-03 Integration Testing for Inference Flow
  - tags: [done]
  - defaultExpanded: false
    ```md
    Integration test to verify that inference requests correctly trigger model loading.
    
    Source: M2-03_INTEGRATION_TESTS.md
    ```

### M2-02 Implement Startup Prewarming in Orchestrator
  - tags: [done]
  - defaultExpanded: false
    ```md
    Trigger the prewarming of small and medium models during application startup.
    
    Source: M2-02_STARTUP_PREWARMING.md
    ```

### M2-01 Integrate ModelManager into GeneratorService
  - tags: [done]
  - defaultExpanded: false
    ```md
    Update GeneratorService to call the ModelManagerService before performing any inference.
    
    Source: M2-01_GENERATOR_INTEGRATION.md
    ```

### M1-04 Unit Tests for ModelManagerService
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create comprehensive unit tests for the ModelManagerService.
    
    Source: M1-04_MODEL_MANAGER_TESTS.md
    ```

### M1-03 Implement ModelManagerService Core
  - tags: [done]
  - defaultExpanded: false
    ```md
    Create the ModelManagerService to manage tiered model lifecycles and ensure model availability.
    
    Source: M1-03_MODEL_MANAGER_CORE.md
    ```

### M1-02 Add Model Manager Configuration
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add configuration settings for the model manager, including keep-alive durations and warmup prompts.
    
    Source: M1-02_CONFIG.md
    ```

### M1-01 Enhance OllamaAdapter with Warmup Support
  - tags: [done]
  - defaultExpanded: false
    ```md
    Add a warmup method to OllamaAdapter that uses the /api/chat endpoint with a minimal prompt and supports the keep_alive parameter.
    
    Source: M1-01_OLLAMA_WARMUP.md
    ```

### S5-05 End-to-End Integration Test
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test complete flow from planner to executor using shell tool for file operations in real scenarios.
    
    Source: S5-05_E2E_INTEGRATION_TEST.md
    Note: Automated tests cover these scenarios (S1-04). Manual E2E testing recommended for final verification.
    ```

### S5-04 Manual Testing - Error Handling
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test error handling for various failure scenarios including invalid commands and file errors.
    
    Source: S5-04_MANUAL_TESTING_ERROR_HANDLING.md
    Note: Covered by automated tests (S1-04). Manual verification recommended.
    ```

### S5-03 Manual Testing - Process Management
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test shell tool with process management commands to verify system command execution and output capture.
    
    Source: S5-03_MANUAL_TESTING_PROCESSES.md
    Note: Covered by automated tests (S1-04). Manual verification recommended.
    ```

### S5-02 Manual Testing - Sandbox Enforcement
  - tags: [done]
  - defaultExpanded: false
    ```md
    Test that sandbox restrictions are properly enforced and commands outside sandbox are rejected.
    
    Source: S5-02_MANUAL_TESTING_SANDBOX.md
    Note: Covered by automated tests (S1-04). Manual verification recommended.
    ```

### S5-01 Manual Testing - File Operations
  - tags: [done]
  - defaultExpanded: false
    ```md
    Manually test file read/write operations using shell tool to verify functionality and sandbox restrictions.
    
    Source: S5-01_MANUAL_TESTING_FILE_OPS.md
    Note: Covered by automated tests (S1-04). Manual verification recommended.
    ```
