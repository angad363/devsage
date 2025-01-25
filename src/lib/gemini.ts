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
        const code = doc.pageContent.slice(0, 50000);

        const response = await model.generateContent([
            `You are an intelligent senior software engineer who specializes in onboarding junior software engineers onto projects.`,
            `You are onboarding a junior software engineer and explaining to them the purpose of the ${doc.metadata.source} file.`,
            `Here is the code:
                ---
                ${code}
                ---

                Give a summary no more than 100 words of the code above.`
        ]);
        console.log(response.response.text())
        return response.response.text()
    } catch (error) {
        return ""
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