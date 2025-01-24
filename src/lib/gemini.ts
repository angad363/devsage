import {GoogleGenerativeAI} from '@google/generative-ai'
import { Document } from '@langchain/core/documents'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash'
})

export const summarizeCommit = async(diff: string) => {
    const response = await model.generateContent([
        `You are an expert programmer, and you are trying to summarize a git diff.
        Reminders about git diff format:
        For every file, there are a few metadata lines, like (for example):
        \`\`\`
        diff --git a/lib/index.js b/lib/index.js
        index aadf691..bfef603 100644
        --- a/lib/index.js
        +++ b/lib/index.js
        \`\`\`
        This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
        Then there is a specifier for the lines that were modified.
        A line starting with \`+\` means that the line was deleted.
        A line that starts with neither \`+\` nor \`-\` is code given for context and better understanding.
        It is not part of the diff.
        [...]
        EXAMPLE SUMMARY COMMENTS:
        \`\`\`
        * Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts], [packages/server/constants.ts]
        * Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
        * Moved the \`octokit\` initialization to a separate file [src/octokit.ts], [src/index.ts]
        * Added an OpenAI API for completions [packages/utils/apis/openai.ts]
        * Lowered numeric tolerance for the test files
        \`\`\`
        Most commits will have less comments than this example lists
        The last comment doesnot include file names, because there were more than two relevant files in the hypothetical commit.
        Do not include parts of the example in your summary.
        It is given only as an example of approppriate comments.

         Please provide a concise summary in bullet points of the changes made, in a neat manner and **do not include the diff text in the summary**.

         Diff to summarize:
        \`\`\`diff
        ${diff}
        \`\`\`

        `,
    ]);
    // console.log(response.response.text())
    return response.response.text()
}

export async function summarizeCode(doc: Document){
    console.log("Getting summary for", doc.metadata.source);
    try {

        // Validate input
        if (!doc.pageContent) {
            console.error(`No content for file: ${doc.metadata.source}`);
            return '';
        }
        const code = doc.pageContent.slice(0, 10000);

        // Additional checks for code length
        if (code.trim() === '') {
            console.warn(`Empty file content: ${doc.metadata.source}`);
            return '';
        }

        const response = await model.generateContent([
            `You are a senior software engineer specializing in technical documentation and code comprehension.`,

            `Task: Generate a precise, professional code file summary for a new developer joining the project.`,

            `Summary Requirements:
            - Purpose: Explain the core responsibility and function of this file
            - Technical Depth: Highlight key classes, functions, or algorithms
            - Context: Describe how this file fits into the broader project architecture
            - Audience: Write for a junior to mid-level developer with basic programming knowledge

            Formatting Guidelines:
            - Length: Between 75-125 words
            - Tone: Clear, technical, and informative
            - Avoid marketing language or excessive praise
            - Use technical terminology appropriately

            Specific Instructions for ${doc.metadata.source}:
            - Identify the primary programming language
            - Note any significant design patterns or architectural approaches
            - Mention critical dependencies or imported libraries
            - Explain the file's role in the overall system workflow

            Additional Context:
            Code Content:
            ---
            ${code}
            ---

            Provide a comprehensive yet concise summary that would help a new developer quickly understand this file's purpose and functionality.`
        ]);
        console.log(response.response.text())
        return response.response.text()

    } catch (error) {
        return ''
    }
}

export async function generateEmbedding(summary: string){
    const model = genAI.getGenerativeModel({
        model: "text-embedding-004"
    })
    const result = await model.embedContent(summary)
    const embedding = result.embedding
    return embedding.values
}