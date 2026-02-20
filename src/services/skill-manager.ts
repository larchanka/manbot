import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { getConfig } from "../shared/config.js";

export interface SkillInfo {
    name: string;
    description: string;
}

export class SkillManager {
    private readonly skillsDir: string;

    constructor(skillsDir?: string) {
        const config = getConfig();
        const baseDir = skillsDir ?? config.skills.skillsDir;
        // Resolve relative to process.cwd() if not absolute
        this.skillsDir = resolve(process.cwd(), baseDir);
    }

    /**
     * List all available skills from CONFIG.md.
     */
    public listSkills(): SkillInfo[] {
        const configPath = join(this.skillsDir, "CONFIG.md");
        if (!existsSync(configPath)) return [];

        try {
            const content = readFileSync(configPath, "utf-8");
            return this.parseConfig(content);
        } catch (err) {
            console.error("Failed to load skills config:", err);
            return [];
        }
    }

    /**
     * Load the skill prompt (SKILL.md) for a given skill.
     */
    public getSkillPrompt(name: string): string | null {
        const skillPath = join(this.skillsDir, name, "SKILL.md");
        if (!existsSync(skillPath)) return null;

        try {
            return readFileSync(skillPath, "utf-8");
        } catch (err) {
            console.error(`Failed to load skill prompt for ${name}:`, err);
            return null;
        }
    }

    /**
     * Simple markdown table/list parser for CONFIG.md.
     */
    private parseConfig(content: string): SkillInfo[] {
        const lines = content.split("\n");
        const skills: SkillInfo[] = [];

        for (const line of lines) {
            // Handle table rows: | name | description |
            if (line.includes("|")) {
                const parts = line.split("|").map(p => p.trim()).filter(p => p !== "");
                if (parts.length >= 2 && parts[0] && parts[1]) {
                    const name = parts[0];
                    const desc = parts[1];
                    if (name.toLowerCase() !== "name" && !name.startsWith("---")) {
                        skills.push({
                            name,
                            description: desc
                        });
                    }
                }
            }
            // Handle list items: - name: description or names: description
            else if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
                const clean = line.trim().substring(1).trim();
                const colonIndex = clean.indexOf(":");
                if (colonIndex !== -1) {
                    const name = clean.substring(0, colonIndex).trim();
                    const description = clean.substring(colonIndex + 1).trim();
                    if (name && description) {
                        skills.push({ name, description });
                    }
                }
            }
        }
        return skills;
    }
}
