import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { getConfig } from "../shared/config.js";
import { TELEGRAM_HTML_FORMAT_INSTRUCTION } from "../agents/prompts/telegram-html.js";

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
     * List all available skills by scanning the skills directory.
     * Each skill is a subdirectory containing a SKILL.md file.
     * The description is extracted from the first line of SKILL.md.
     */
    public listSkills(): SkillInfo[] {
        if (!existsSync(this.skillsDir)) return [];

        try {
            const entries = readdirSync(this.skillsDir, { withFileTypes: true });
            const skills: SkillInfo[] = [];

            for (const entry of entries) {
                // Ignore hidden directories
                if (entry.isDirectory() && !entry.name.startsWith(".")) {
                    const skillMdPath = join(this.skillsDir, entry.name, "SKILL.md");
                    if (existsSync(skillMdPath)) {
                        try {
                            const content = readFileSync(skillMdPath, "utf-8");
                            const lines = content.split("\n").filter(l => l.trim() !== "");
                            const firstLine = lines[0]?.trim();
                            if (!firstLine) continue;
                            
                            let description = firstLine;
                            if (firstLine.toLowerCase().startsWith("description:")) {
                                description = firstLine.substring("description:".length).trim();
                            }
                            
                            if (description) {
                                skills.push({
                                    name: entry.name,
                                    description: description
                                });
                            }
                        } catch (err) {
                            console.error(`Failed to read SKILL.md for ${entry.name}:`, err);
                        }
                    }
                }
            }
            return skills;
        } catch (err) {
            console.error("Failed to list skills by scanning directory:", err);
            return [];
        }
    }

    /**
     * Load the skill prompt (SKILL.md) for a given skill.
     * Appends Telegram HTML formatting instructions so skill output
     * always uses Telegram-supported HTML instead of Markdown.
     */
    public getSkillPrompt(name: string): string | null {
        const skillPath = join(this.skillsDir, name, "SKILL.md");
        if (!existsSync(skillPath)) return null;

        try {
            const content = readFileSync(skillPath, "utf-8");
            return `${content}\n\n## OUTPUT FORMATTING\n${TELEGRAM_HTML_FORMAT_INSTRUCTION}\n\nYou MUST format your final response using only the Telegram HTML tags listed above. Never use Markdown (replace will allowed HTML tags).`;
        } catch (err) {
            console.error(`Failed to load skill prompt for ${name}:`, err);
            return null;
        }
    }


}
